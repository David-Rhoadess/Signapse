import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useTextGenerator } from "../../hooks/useTextGenerator";

interface Message {
  id: string;
  text: string;
  sender: "user" | "system";
  timestamp: Date;
}

interface ChatbotProps {
  onEmotionChange: (emotion: string) => void;
}

const initMessage: Message = {
  id: "1",
  text: "Hi! I am Acorn, your ASL practice partner. Let's start easy! Can you sign HELLO?",
  sender: "system",
  timestamp: new Date(),
};

// ─── GLOSS PRE-PROCESSOR ─────────────────────────────────────────────────────
// Step 1 — Tokenise on whitespace.
// Step 2 — Collapse runs of single-letter tokens into hyphenated finger-spell
//           tokens: "N Y C" → "N-Y-C". A lone single letter (e.g. "I") that
//           has no adjacent single-letter neighbour is left as-is.
// Step 3 — Reverse the full token list so Pipeline 1 receives ASL word order.
//
// Returns:
//   processed → reversed, finger-spell-collapsed string sent to generate()
//   tokens    → same tokens as an array (for the "Interpreted as:" bubble)
function preprocessGloss(raw: string): { processed: string; tokens: string[] } {
  const words = raw.trim().split(/\s+/);
  const grouped: string[] = [];
  let i = 0;

  while (i < words.length) {
    const word = words[i];

    if (word.length === 1 && /[A-Za-z]/.test(word)) {
      // Start of a potential finger-spell run
      const run: string[] = [word.toUpperCase()];

      while (
        i + 1 < words.length &&
        words[i + 1].length === 1 &&
        /[A-Za-z]/.test(words[i + 1])
      ) {
        i++;
        run.push(words[i].toUpperCase());
      }

      // Only hyphenate if the run is more than one letter
      grouped.push(run.length > 1 ? run.join("-") : run[0]);
    } else {
      grouped.push(word);
    }

    i++;
  }

  const reversed = [...grouped].reverse();

  return {
    processed: reversed.join(" "),
    tokens: reversed,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export function Chatbot({ onEmotionChange }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([initMessage]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { status, errorMessage, generate, resetHistory } = useTextGenerator();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSend = async () => {
    if (!input.trim() || status !== "ready") return;

    // Keep the original text for the user's chat bubble
    const originalInput = input;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: originalInput,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Pre-process: finger-spell detection + reverse word order
    const { processed, tokens } = preprocessGloss(originalInput);

    setInput("");

    // Pass BOTH strings — processed for pipelines 1-3, original for history/display
    const { valid, corrected, corrections, reply, emotion } =
      await generate(processed, originalInput);

    onEmotionChange(emotion);

    setMessages((prev) => [
      ...prev,
      // Acorn's conversational reply
      {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: "system" as const,
        timestamp: new Date(),
      },
      // Always show how the input was interpreted so the user can verify
      {
        id: (Date.now() + 2).toString(),
        text: `Interpreted as: ${tokens.join(" ")}`,
        sender: "system" as const,
        timestamp: new Date(),
      },
      // If errors were found, surface the corrected gloss
      ...(!valid && corrected
        ? [
            {
              id: (Date.now() + 3).toString(),
              text: `Corrected: ${corrected}`,
              sender: "system" as const,
              timestamp: new Date(),
            },
          ]
        : []),
    ]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function handleClear() {
    setMessages([initMessage]);
    resetHistory();
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg min-h-0">
      <div className="p-2 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Chat with Assistant</h2>
        <button
          onClick={handleClear}
          disabled={status !== "ready"}
          className="text-xs text-gray-500 hover:text-blue-500 disabled:opacity-40 transition-colors"
        >
          New Chat
        </button>
      </div>

      {status === "loading" && (
        <div className="px-2 py-1 text-xs text-center bg-yellow-50 text-yellow-700 border-b">
          Loading AI model, please wait...
        </div>
      )}
      {status === "error" && (
        <div className="px-2 py-1 text-xs text-center bg-red-50 text-red-700 border-b">
          {errorMessage}
        </div>
      )}

      <ScrollArea className="flex-1 p-2 min-h-0 overflow-y-auto">
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-2 py-1 ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p className="text-xs">{message.text}</p>
              </div>
            </div>
          ))}
          {status === "generating" && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 rounded-lg px-2 py-1">
                <p className="text-xs">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <div className="flex gap-1">
          <Input
            id="chat-input"
            name="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              status === "loading"
                ? "Loading model..."
                : status === "generating"
                  ? "Acorn is thinking..."
                  : status === "error"
                    ? "Unavailable"
                    : "Type ASL gloss..."
            }
            disabled={status !== "ready"}
            className="flex-1 h-8 text-sm"
          />
          <Button
            onClick={handleSend}
            size="sm"
            className="h-8 w-8 p-0"
            disabled={status !== "ready" || !input.trim()}
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
