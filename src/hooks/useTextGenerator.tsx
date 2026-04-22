import { useEffect, useRef, useState } from "react";
import { pipeline, env } from "@huggingface/transformers";

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
        env.localModelPath = "/_models/";
        env.allowLocalModels = true;
        env.allowRemoteModels = false;

        // Debug logs
        console.log("env.localModelPath:", env.localModelPath);
        console.log("env.allowLocalModels:", env.allowLocalModels);
        console.log("env.allowRemoteModels:", env.allowRemoteModels);
        console.log("navigator.gpu:", navigator.gpu);
        console.log(
          "Expected config URL:",
          `${env.localModelPath}Xenova/distilgpt2/config.json`,
        );
        console.log("Starting pipeline load...");

        // generatorRef.current = await pipeline("text-generation", "distilgpt2", {
        //   device: "webgpu",
        //   dtype: "q4",
        //   model_file_name: "model_quantized",
        // });

        // Temporarily remove all env config and use remote
        generatorRef.current = await pipeline("text-generation", "distilgpt2", {
          device: "webgpu",
          dtype: "q8",
        });

        console.log("Pipeline loaded successfully:", generatorRef.current);
        setStatus("ready");
      } catch (err) {
        console.error("Model load error:", err);
        console.error("Error name:", (err as Error).name);
        console.error("Error message:", (err as Error).message);
        console.error("Error stack:", (err as Error).stack);
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
      const outputs = await generatorRef.current(
        `You are Acorn, a helpful assistant with American Sign Language Learning. User: ${prompt}\nAcorn:`,
        {
          max_new_tokens: 150,
          do_sample: true,
          temperature: 0.7,
        },
      );

      return outputs[0].generated_text ?? "No response generated.";
    } catch (err) {
      console.error("Generation error:", err);
      return "Something went wrong. Please try again.";
    } finally {
      setStatus("ready");
    }
  }

  return { status, errorMessage, generate };
}
