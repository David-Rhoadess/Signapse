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

  // Internal helper — runs a single inference call with a given system prompt
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

  async function generate(rawInput: string): Promise<{
    corrected: string; // corrected ASL gloss from pipeline 1
    reply: string; // English response from pipeline 2
  }> {
    if (!modelRef.current || !processorRef.current) {
      return { corrected: "", reply: "Model is not ready yet." };
    }
    if (status !== "ready") {
      return { corrected: "", reply: "Model is still loading." };
    }

    setStatus("generating");
    setErrorMessage(null);

    try {
      // Pipeline 1 — correct the ASL gloss
      const corrected = await runPipeline(
        correctionPrompt,
        rawInput,
        [], // no history needed for correction
        128, // short output, just the corrected gloss
      );

      console.log("Pipeline 1 - Corrected gloss:", corrected);

      // Pipeline 2 — translate corrected gloss to English and respond
      const reply = await runPipeline(
        responsePrompt,
        corrected,
        conversationHistory.current, // pass history for context
        256,
      );

      console.log("Pipeline 2 - Reply:", reply);

      // Save to history using the corrected gloss as user turn
      conversationHistory.current = [
        ...conversationHistory.current,
        { role: "user", content: corrected },
        { role: "assistant", content: reply },
      ];

      setStatus("ready");
      return { corrected, reply };
    } catch (err) {
      console.error("Generation error:", err);
      setStatus("ready");
      setErrorMessage("Failed to generate response. Please try again.");
      return {
        corrected: "",
        reply: "Something went wrong. Please try again.",
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
