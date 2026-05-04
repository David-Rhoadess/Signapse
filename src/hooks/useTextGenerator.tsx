import { useEffect, useRef, useState } from "react";
import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";
import { systemPrompt } from "../constants/systemPrompt";

type Status = "idle" | "loading" | "ready" | "generating" | "error";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ModelLoadProgress {
  loaded: number; // bytes downloaded so far across all files
  total: number; // expected total bytes; 0 until the first progress event
  percent: number; // 0-100
  currentFile: string | null;
}
export interface GenerateResult {
  reply: string; // Acorn's response
  emotion: string; // one of the 6 emotions
}

export function useTextGenerator() {
  const modelRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  // const conversationHistory = useRef<ChatMessage[]>([]);
  const turnCount = useRef(0);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<ModelLoadProgress | null>(null);

  useEffect(() => {
    // The model loads as several shards in parallel; HuggingFace fires a
    // progress event per shard. Track each shard's bytes here and sum them
    // for a single overall percentage. Throttle React updates so we don't
    // re-render hundreds of times per second during the download.
    const fileProgress = new Map<string, { loaded: number; total: number }>();
    let lastFlush = 0;

    function flush(currentFile: string | null, force = false) {
      const now = performance.now();
      if (!force && now - lastFlush < 100) return;
      lastFlush = now;

      let loaded = 0;
      let total = 0;
      for (const v of fileProgress.values()) {
        loaded += v.loaded;
        total += v.total;
      }
      const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;
      setProgress({ loaded, total, percent, currentFile });
    }

    function progressCallback(info: any) {
      if (info?.status === "progress" && typeof info.loaded === "number") {
        fileProgress.set(info.file, {
          loaded: info.loaded,
          total:
            typeof info.total === "number" && info.total > 0
              ? info.total
              : info.loaded,
        });
        flush(info.file);
      } else if (info?.status === "done" && info?.file) {
        const existing = fileProgress.get(info.file);
        if (existing) {
          fileProgress.set(info.file, {
            loaded: existing.total,
            total: existing.total,
          });
        }
        flush(info.file, true);
      }
    }

    async function loadModel() {
      const device = navigator.gpu ? "webgpu" : "wasm";

      setStatus("loading");
      setErrorMessage(null);
      setProgress(null);

      try {
        const model_id = "onnx-community/Qwen3.5-0.8B-ONNX";

        processorRef.current = await AutoTokenizer.from_pretrained(model_id, {
          progress_callback: progressCallback,
        } as any);

        modelRef.current = await AutoModelForCausalLM.from_pretrained(
          model_id,
          {
            dtype: {
              embed_tokens: device === "webgpu" ? "q4f16" : "q8",
              decoder_model_merged: device === "webgpu" ? "q4f16" : "q8",
            },
            device,
            progress_callback: progressCallback,
          } as any,
        );

        flush(null, true);
        setStatus("ready");
      } catch (err) {
        console.error("Model load error:", err);
        setStatus("error");
        setErrorMessage("Failed to load model. Please refresh and try again.");
      }
    }

    loadModel();
  }, []);

  function parseJSON<T>(raw: string, fallback: T): T {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      console.warn("Failed to parse JSON:", raw);
      return fallback;
    }
  }

  async function generate(prompt: string): Promise<GenerateResult> {
    if (!modelRef.current || !processorRef.current) {
      return { reply: "Model is not ready yet.", emotion: "confused" };
    }
    if (status !== "ready") {
      return { reply: "Model is still loading.", emotion: "confused" };
    }

    setStatus("generating");
    setErrorMessage(null);

    turnCount.current += 1; // ← increment on each user message

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: String(turnCount.current) }, // ← just the number
      ];

      const text = processorRef.current.apply_chat_template(messages, {
        add_generation_prompt: true,
        tokenize: false,
        enable_thinking: false,
      });

      const inputs = await processorRef.current(text, { return_tensors: "pt" });

      const outputIds = await modelRef.current.generate({
        ...inputs,
        max_new_tokens: 512,
        do_sample: false,
        temperature: 1.0,
        top_p: 1.0,
        top_k: 20,
        repetition_penalty: 1.0,
      });

      const newTokens = outputIds.slice(null, [
        inputs.input_ids.dims.at(-1),
        null,
      ]);
      const rawReply =
        processorRef.current.batch_decode(newTokens, {
          skip_special_tokens: true,
        })[0] ?? "No response generated.";

      console.log("Raw reply" + rawReply);

      const replyResult = parseJSON<{ emotion: string; reply: string }>(
        rawReply,
        {
          emotion: "confused",
          reply: rawReply,
        },
      );

      setStatus("ready");
      return replyResult;
    } catch (err) {
      console.error("Generation error:", err);
      setStatus("ready");
      setErrorMessage("Failed to generate response. Please try again.");
      return {
        reply: "Something went wrong. Please try again.",
        emotion: "confused",
      };
    }
  }

  function resetHistory() {
    // conversationHistory.current = [];
    turnCount.current = 0;
    setErrorMessage(null);
    setStatus("ready");
  }

  return { status, errorMessage, progress, generate, resetHistory };
}
