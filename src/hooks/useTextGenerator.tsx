import { useEffect, useRef, useState } from "react";
import { pipeline } from "@huggingface/transformers";

type Status = "idle" | "loading" | "ready" | "generating" | "error";

export function useTextGenerator() {
  const generatorRef = useRef<any>(null);
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
          "onnx-community/Qwen2.5-0.5B-Instruct",
          { dtype: "q4", device: "webgpu" },
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
      const messages = [
        {
          role: "system",
          content:
            "You are Acorn, a helpful assistant specializing in American Sign Language learning.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const output = await generatorRef.current(messages, {
        max_new_tokens: 128,
      });

      // Extract the assistant's reply from the last message
      return (
        output[0].generated_text.at(-1).content ?? "No response generated."
      );
    } catch (err) {
      console.error("Generation error:", err);
      return "Something went wrong. Please try again.";
    } finally {
      setStatus("ready");
    }
  }

  return { status, errorMessage, generate };
}
