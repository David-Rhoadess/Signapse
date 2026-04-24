import { useEffect, useRef, useState } from "react";
import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
} from "@huggingface/transformers";
import { systemPrompt } from "../constants/systemPrompt";

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
      if (!navigator.gpu) {
        setStatus("error");
        setErrorMessage("WebGPU is not supported. Please use Chrome or Edge.");
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const model_id = "onnx-community/Qwen3.5-0.8B-ONNX";

        processorRef.current = await AutoProcessor.from_pretrained(model_id);

        modelRef.current =
          await Qwen3_5ForConditionalGeneration.from_pretrained(model_id, {
            dtype: {
              embed_tokens: "q4f16",
              // vision_encoder: ,
              decoder_model_merged: "q4f16",
            },
            device: "webgpu",
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

  async function generate(prompt: string): Promise<string> {
    if (!modelRef.current || !processorRef.current) {
      return "Model is not ready yet.";
    }

    if (status !== "ready") {
      return "Model is still loading.";
    }

    setStatus("generating");
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      role: "user",
      content: prompt,
    };

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
        userMessage,
      ];

      const text = processorRef.current.apply_chat_template(messages, {
        add_generation_prompt: true,
      });

      const inputs = await processorRef.current(text);

      const outputIds = await modelRef.current.generate({
        ...inputs,
        max_new_tokens: 512,
        temperature: 1.0,
        top_k: 20,
        do_sample: true,
      });

      const newTokens = outputIds.slice(null, [
        inputs.input_ids.dims.at(-1),
        null,
      ]);

      const reply =
        processorRef.current.batch_decode(newTokens, {
          skip_special_tokens: true,
        })[0] ?? "No response generated.";

      conversationHistory.current = [
        ...conversationHistory.current,
        userMessage,
        { role: "assistant", content: reply },
      ];

      setStatus("ready");
      return reply;
    } catch (err) {
      console.error("Generation error:", err);

      setStatus("error");
      setErrorMessage("Failed to generate response.");

      return "Something went wrong. Please try again.";
    }
  }

  function resetHistory() {
    conversationHistory.current = [];
    setErrorMessage(null);
    setStatus("ready");
  }

  return { status, errorMessage, generate, resetHistory };
}
