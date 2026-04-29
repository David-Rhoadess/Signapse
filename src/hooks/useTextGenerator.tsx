import { useEffect, useRef, useState } from "react";
import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
} from "@huggingface/transformers";
import { correctionPrompt, responsePrompt } from "../constants/systemPrompt";

type Status = "idle" | "loading" | "ready" | "generating" | "error";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CorrectionResult {
  valid: boolean;
  corrected: string | null;
  feedback: string | null;
}

export interface GenerateResult {
  valid: boolean;
  corrected: string | null; // corrected ASL gloss, null if input was valid
  feedback: string | null; // reason for correction, null if input was valid
  reply: string; // Acorn's response
  emotion: string; // one of the 6 emotions
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
        const model_id = "onnx-community/Qwen3.5-0.8B-ONNX";
        processorRef.current = await AutoProcessor.from_pretrained(model_id);
        modelRef.current =
          await Qwen3_5ForConditionalGeneration.from_pretrained(model_id, {
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
    });

    const inputs = await processorRef.current(text);

    const outputIds = await modelRef.current.generate({
      ...inputs,
      max_new_tokens: maxTokens,
      do_sample: false,
    });

    const newTokens = outputIds.slice(null, [
      inputs.input_ids.dims.at(-1),
      null,
    ]);

    return (
      processorRef.current.batch_decode(newTokens, {
        skip_special_tokens: true,
      })[0] ?? ""
    );
  }

  function parseJSON<T>(raw: string, fallback: T): T {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      console.warn("Failed to parse JSON:", raw);
      return fallback;
    }
  }

  async function generate(rawInput: string): Promise<GenerateResult> {
    if (!modelRef.current || !processorRef.current) {
      return {
        valid: false,
        corrected: null,
        feedback: null,
        reply: "Model is not ready yet.",
        emotion: "confused",
      };
    }
    if (status !== "ready") {
      return {
        valid: false,
        corrected: null,
        feedback: null,
        reply: "Model is still loading.",
        emotion: "confused",
      };
    }

    setStatus("generating");
    setErrorMessage(null);

    try {
      // Pipeline 1 — validate and correct ASL gloss
      const rawCorrection = await runPipeline(
        correctionPrompt,
        rawInput,
        [],
        128,
      );
      console.log("Pipeline 1 raw:", rawCorrection);

      const correctionResult = parseJSON<CorrectionResult>(rawCorrection, {
        valid: false,
        corrected: null,
        feedback: "Could not parse correction.",
      });
      console.log("Pipeline 1 parsed:", correctionResult);

      // Pipeline 2 — build input based on validation result
      const pipeline2Input = correctionResult.valid
        ? rawInput // valid: respond to original input
        : `Original: "${rawInput}"\nCorrected: "${correctionResult.corrected}"\nReason: ${correctionResult.feedback}`;

      const rawReply = await runPipeline(
        responsePrompt,
        pipeline2Input,
        correctionResult.valid ? conversationHistory.current : [],
        256,
      );
      console.log("Pipeline 2 raw:", rawReply);

      const replyResult = parseJSON<{ emotion: string; reply: string }>(
        rawReply,
        { emotion: "confused", reply: rawReply },
      );
      console.log("Pipeline 2 parsed:", replyResult);

      // Only save valid exchanges to history
      if (correctionResult.valid) {
        conversationHistory.current = [
          ...conversationHistory.current,
          { role: "user", content: rawInput },
          { role: "assistant", content: replyResult.reply },
        ];
      }

      setStatus("ready");
      return {
        valid: correctionResult.valid,
        corrected: correctionResult.corrected,
        feedback: correctionResult.feedback,
        reply: replyResult.reply,
        emotion: replyResult.emotion ?? "cheerful",
      };
    } catch (err) {
      console.error("Generation error:", err);
      setStatus("ready");
      setErrorMessage("Failed to generate response. Please try again.");
      return {
        valid: false,
        corrected: null,
        feedback: null,
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
