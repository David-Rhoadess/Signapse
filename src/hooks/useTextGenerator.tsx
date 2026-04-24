import { useEffect, useRef, useState } from "react";
import { pipeline } from "@huggingface/transformers";
import { systemPrompt } from "../constants/systemPrompt";

type Status = "idle" | "loading" | "ready" | "generating" | "error";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useTextGenerator() {
  const generatorRef = useRef<any>(null);
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
        generatorRef.current = await pipeline(
          "text-generation",
          "onnx-community/gemma-3-1b-it-ONNX",
          { dtype: "q4f16", device: "webgpu" },
        );
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
    if (!generatorRef.current || status !== "ready") return "";

    setStatus("generating");

    try {
      // Add the new user message to history
      conversationHistory.current.push({
        role: "user",
        content: prompt,
      });

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current, // include full history
      ];

      const output = await generatorRef.current(messages, {
        max_new_tokens: 128,
      });

      const reply = output[0].generated_text.at(-1).content ?? "No response generated.";

      // Save the assistant's reply to history
      conversationHistory.current.push({
        role: "assistant",
        content: reply,
      });

      return reply;
    } catch (err) {
      console.error("Generation error:", err);
      // Remove the user message if generation failed
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