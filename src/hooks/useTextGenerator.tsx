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

      try {
        console.log("Start pipeline loading...");
        const model_id = "onnx-community/Qwen3.5-0.8B-ONNX";

        processorRef.current = await AutoProcessor.from_pretrained(model_id);
        modelRef.current =
          await Qwen3_5ForConditionalGeneration.from_pretrained(model_id, {
            dtype: {
              embed_tokens: "q4",
              vision_encoder: "fp16",
              decoder_model_merged: "q4",
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
    if (!modelRef.current || !processorRef.current || status !== "ready")
      return "";

    setStatus("generating");

    try {
      // Add user message to history
      conversationHistory.current.push({
        role: "user",
        content: prompt,
      });

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
      ];

      // Format messages for Qwen
      const text = processorRef.current.apply_chat_template(messages, {
        add_generation_prompt: true,
      });
      const inputs = await processorRef.current(text);

      // Run generation
      const outputIds = await modelRef.current.generate({
        ...inputs,
        max_new_tokens: 512,
        temperature: 1.0,
        top_k: 20,
        do_sample: true,
      });

      // Decode only the new tokens (strip the prompt)
      const newTokens = outputIds.slice(null, [
        inputs.input_ids.dims.at(-1),
        null,
      ]);
      const reply =
        processorRef.current.batch_decode(newTokens, {
          skip_special_tokens: true,
        })[0] ?? "No response generated.";

      // Save assistant reply to history
      conversationHistory.current.push({
        role: "assistant",
        content: reply,
      });

      return reply;
    } catch (err) {
      console.error("Generation error:", err);
      conversationHistory.current.pop();
      return "Something went wrong. Please try again.";
    } finally {
      setStatus("ready");
    }
  }

  function resetHistory() {
    conversationHistory.current = [];
  }

  return { status, errorMessage, generate, resetHistory };
}
