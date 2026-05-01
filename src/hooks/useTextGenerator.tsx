import { useEffect, useRef, useState } from "react";
import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";
import {
  flagPrompt,
  reasonPrompt,
  correctPrompt,
  responsePrompt,
} from "../constants/systemPrompt";

type Status = "idle" | "loading" | "ready" | "generating" | "error";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FlagResult {
  valid: boolean;
  flagged: string[];
}

interface ReasonResult {
  reasons: { word: string; reason: string }[];
}

interface CorrectResult {
  corrections: { word: string; replacement: string | null }[];
}

export interface GenerateResult {
  valid: boolean;
  corrected: string | null;
  corrections: { word: string; replacement: string | null; reason: string }[];
  reply: string;
  emotion: string;
}

export function useTextGenerator() {
  const modelRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const conversationHistory = useRef<ChatMessage[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadModel() {
      const device = navigator.gpu ? "webgpu" : "wasm";
      setStatus("loading");
      setErrorMessage(null);

      try {
        const model_id = "onnx-community/Qwen3.5-2B-ONNX";
        processorRef.current = await AutoTokenizer.from_pretrained(model_id);
        modelRef.current = await AutoModelForCausalLM.from_pretrained(model_id, {
          dtype: {
            embed_tokens: device === "webgpu" ? "q4f16" : "q8",
            decoder_model_merged: device === "webgpu" ? "q4f16" : "q8",
          },
          device,
        });
        setStatus("ready");
      } catch (err) {
        console.error("Model load error:", err);
        setStatus("error");
        setErrorMessage("Failed to load model. Please refresh and try again.");
      }
    }

    loadModel();
  }, []);

  // ─── Free tensors immediately after each pipeline run ────────────────────────
  function disposeTensors(obj: any) {
    if (!obj) return;
    if (typeof obj.dispose === "function") { obj.dispose(); return; }
    if (typeof obj === "object") Object.values(obj).forEach(disposeTensors);
  }

  // ─── Cap history to last 3 exchanges to prevent context bloat ───────────────
  const MAX_HISTORY_TURNS = 3;
  function trimmedHistory(): ChatMessage[] {
    return conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
  }

  async function runPipeline(
    systemContent: string,
    userContent: string,
    history: ChatMessage[] = [],
    maxTokens = 256,
  ): Promise<string> {
    const messages = [
      { role: "system", content: systemContent },
      ...history,
      { role: "user", content: userContent },
    ];

    const text = processorRef.current.apply_chat_template(messages, {
      add_generation_prompt: true,
      tokenize: false,
    });

    const inputs = await processorRef.current(text, { return_tensors: "pt" });

    let outputIds: any;
    try {
      outputIds = await modelRef.current.generate({
        ...inputs,
        max_new_tokens: maxTokens,
        do_sample: false,
        temperature: 1.0,
        top_p: 1.0,
        top_k: 20,
        repetition_penalty: 1.0,
      });

      const newTokens = outputIds.slice(null, [inputs.input_ids.dims.at(-1), null]);
      return processorRef.current.batch_decode(newTokens, {
        skip_special_tokens: true,
      })[0] ?? "";
    } finally {
      // Always release tensors — even if generation throws
      disposeTensors(inputs);
      disposeTensors(outputIds);
    }
  }

  function parseJSON<T>(raw: string, fallback: T): T {
    try {
      const match = raw.match(/\{[\s\S]*\}(?=[^}]*$)/);
      if (!match) throw new Error("No JSON found");
      return JSON.parse(match[0]);
    } catch {
      console.warn("Failed to parse JSON:", raw);
      return fallback;
    }
  }

  function applyCorrections(
    gloss: string,
    corrections: { word: string; replacement: string | null }[],
  ): string {
    let result = gloss;
    for (const { word, replacement } of corrections) {
      result = replacement
        ? result.replace(new RegExp(`\\b${word}\\b`, "g"), replacement)
        : result.replace(new RegExp(`\\b${word}\\b\\s*`, "g"), "");
    }
    return result.trim().replace(/\s+/g, " ");
  }

  // processedInput → reversed + finger-spell-collapsed, used for Pipelines 1–3
  // originalInput  → what the user actually typed, used for Pipeline 4 + history
  async function generate(
    processedInput: string,
    originalInput: string,
  ): Promise<GenerateResult> {
    if (!modelRef.current || !processorRef.current) {
      return { valid: false, corrected: null, corrections: [], reply: "Model is not ready yet.", emotion: "confused" };
    }
    if (status !== "ready") {
      return { valid: false, corrected: null, corrections: [], reply: "Model is still loading.", emotion: "confused" };
    }

    setStatus("generating");
    setErrorMessage(null);

    try {
      // ── Pipeline 1: Flag ──────────────────────────────────────────
      const tokens = processedInput.trim().split(/\s+/);
      const tokenList = tokens.map((t, i) => `  ${i + 1}. ${t}`).join("\n");
      const tokenCount = tokens.length;
      const realFlagPrompt = flagPrompt(tokenList, tokenCount);
      console.log("flag prompt:", realFlagPrompt);

      const rawFlag = await runPipeline(realFlagPrompt, processedInput, [], 300);
      console.log("Pipeline 1 raw:", rawFlag);

      const flagResult = parseJSON<FlagResult>(rawFlag, { valid: true, flagged: [] });
      console.log("Pipeline 1 parsed:", flagResult);

      if (flagResult.valid || flagResult.flagged.length === 0) {
        // Valid — skip straight to response
        const rawReply = await runPipeline(
          responsePrompt,
          `The user signed: "${originalInput}"`,
          trimmedHistory(),   // ← capped, not full history
          256,
        );
        console.log("Pipeline 4 raw:", rawReply);

        const replyResult = parseJSON<{ emotion: string; reply: string }>(
          rawReply,
          { emotion: "cheerful", reply: rawReply },
        );

        conversationHistory.current = [
          ...conversationHistory.current,
          { role: "user", content: originalInput },
          { role: "assistant", content: replyResult.reply },
        ];

        setStatus("ready");
        return {
          valid: true,
          corrected: null,
          corrections: [],
          reply: replyResult.reply,
          emotion: replyResult.emotion ?? "cheerful",
        };
      }

      // ── Pipeline 2: Reason ────────────────────────────────────────
      const rawReason = await runPipeline(
        reasonPrompt(processedInput, flagResult.flagged),
        "",
        [],
        200,
      );
      console.log("Pipeline 2 raw:", rawReason);

      const reasonResult = parseJSON<ReasonResult>(rawReason, { reasons: [] });
      console.log("Pipeline 2 parsed:", reasonResult);

      // ── Pipeline 3: Correct ───────────────────────────────────────
      const rawCorrect = await runPipeline(
        correctPrompt(processedInput, reasonResult.reasons),
        "",
        [],
        200,
      );
      console.log("Pipeline 3 raw:", rawCorrect);

      const correctResult = parseJSON<CorrectResult>(rawCorrect, { corrections: [] });
      console.log("Pipeline 3 parsed:", correctResult);

      const corrections = correctResult.corrections.map((c) => ({
        word: c.word,
        replacement: c.replacement,
        reason: reasonResult.reasons.find((r) => r.word === c.word)?.reason ?? "",
      }));

      const correctedGloss = applyCorrections(processedInput, correctResult.corrections);

      // ── Pipeline 4: Respond ───────────────────────────────────────
      const p4Input = [
        `The user attempted: "${originalInput}"`,
        `Processed ASL gloss (reversed order): "${processedInput}"`,
        `Corrected ASL gloss: "${correctedGloss}"`,
        `Errors found:`,
        ...corrections.map((c) => `- "${c.word}": ${c.reason}`),
      ].join("\n");

      const rawReply = await runPipeline(
        responsePrompt,
        p4Input,
        trimmedHistory(),   // ← capped, not full history
        256,
      );
      console.log("Pipeline 4 raw:", rawReply);

      const replyResult = parseJSON<{ emotion: string; reply: string }>(
        rawReply,
        { emotion: "embarrassed", reply: rawReply },
      );

      conversationHistory.current = [
        ...conversationHistory.current,
        { role: "user", content: originalInput },
        { role: "assistant", content: replyResult.reply },
      ];

      setStatus("ready");
      return {
        valid: false,
        corrected: correctedGloss,
        corrections,
        reply: replyResult.reply,
        emotion: replyResult.emotion ?? "embarrassed",
      };
    } catch (err) {
      console.error("Generation error:", err);
      setStatus("ready");
      setErrorMessage("Failed to generate response. Please try again.");
      return {
        valid: false,
        corrected: null,
        corrections: [],
        reply: "Something went wrong. Please try again.",
        emotion: "confused",
      };
    }
  }

  function resetHistory() {
    conversationHistory.current = [];
    setErrorMessage(null);
    setStatus("ready");
  }

  return { status, errorMessage, generate, resetHistory };
}