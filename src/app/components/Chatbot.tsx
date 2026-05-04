import { useState, useRef, useEffect } from "react";
import { Send, Delete } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import type { LatestSign } from "./Home";

interface Message {
  id: string;
  text: string;
  sender: "user" | "system";
  timestamp: Date;
}

interface ChatbotProps {
  onEmotionChange: (emotion: string) => void;
  latestSign?: LatestSign | null;
  onMessagesChange?: (
    messages: { sender: "user" | "bot"; text: string; time: string }[],
  ) => void;
}

const toStorageFormat = (msgs: Message[]) =>
  msgs.map((m) => ({
    sender: (m.sender === "user" ? "user" : "bot") as "user" | "bot",
    text: m.text,
    time: m.timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

const initMessage: Message = {
  id: "1",
  text: "Hello! I am Acorn, your ASL practice partner. So glad you are here. Let us start easy. Can you say hello to me?",
  sender: "system",
  timestamp: new Date(),
};

const HARDCODED_RESPONSES: { emotion: string; reply: string }[] = [
  { emotion: "cheerful", reply: "Great! What is your name?" },
  {
    emotion: "encouraged",
    reply:
      "You're almost correct! In ASL, the question word goes at the very end. Try: MY NAME G-R-U YOUR NAME WHAT.",
  },
  {
    emotion: "cheerful",
    reply: "Very nice to meet you, Gru. Do you have any pets?",
  },
  {
    emotion: "focused",
    reply:
      "So close! In ASL, adjectives come after the noun — try DOG BLUE instead. Do you have any pets?",
  },
  {
    emotion: "surprised",
    reply: "A blue dog! That's so cool. Does your dog have a name?",
  },
  {
    emotion: "cheerful",
    reply: "Minion is such an interesting name! I love it. How old is Minion?",
  },
  {
    emotion: "confused",
    reply:
      "Ha! I'm glad Minion is doing fine, but I think you meant the number 5! Give it another go!",
  },
  {
    emotion: "cheerful",
    reply:
      "Still young and full of energy, I bet. Where did you walk your dog today?",
  },
];

function thinkingDelay(reply: string): Promise<void> {
  const ms = 2000 + Math.min(reply.length / 3, 1000) + Math.random() * 1000;
  return new Promise((res) => setTimeout(res, ms));
}

export function Chatbot({
  onEmotionChange,
  latestSign,
  onMessagesChange,
}: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([initMessage]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnCount = useRef(0);

  useEffect(() => {
    if (!latestSign) return;
    setInput((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${latestSign.word}` : latestSign.word;
    });
  }, [latestSign?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    const response =
      HARDCODED_RESPONSES[turnCount.current] ??
      HARDCODED_RESPONSES[HARDCODED_RESPONSES.length - 1];
    turnCount.current = Math.min(
      turnCount.current + 1,
      HARDCODED_RESPONSES.length - 1,
    );

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    onMessagesChange?.(toStorageFormat(updatedWithUser));
    setInput("");
    setIsThinking(true);

    await thinkingDelay(response.reply);

    setIsThinking(false);
    onEmotionChange(response.emotion);

    const systemMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: response.reply,
      sender: "system",
      timestamp: new Date(),
    };

    const updatedMessages = [...updatedWithUser, systemMessage];
    setMessages(updatedMessages);
    onMessagesChange?.(toStorageFormat(updatedMessages));
  };

  const handleDeleteLastSign = () => {
    setInput((prev) => {
      const tokens = prev.trimEnd().split(/\s+/);
      tokens.pop();
      return tokens.join(" ");
    });
  };

  function handleClear() {
    setMessages([initMessage]);
    onMessagesChange?.(toStorageFormat([initMessage]));
    turnCount.current = 0;
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg min-h-0">
      {/* Chat header */}
      <div className="p-2 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Chat with Assistant</h2>
        <button
          onClick={handleClear}
          disabled={isThinking}
          className="text-xs text-gray-500 hover:text-blue-500 disabled:opacity-40 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Messages area */}
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
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 rounded-lg px-2 py-1">
                <p className="text-xs">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-2 border-t">
        <p className="text-xs text-gray-400 mb-1 text-center">
          Signs detected by camera appear here
        </p>
        <div className="flex gap-1">
          <Input
            value={input}
            readOnly
            placeholder={
              isThinking ? "Acorn is thinking..." : "Show a sign to the camera…"
            }
            className="flex-1 h-8 text-sm cursor-default select-none"
          />
          <Button
            onClick={handleDeleteLastSign}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={!input.trim() || isThinking}
            title="Delete last sign"
          >
            <Delete size={14} />
          </Button>
          <Button
            onClick={handleSend}
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!input.trim() || isThinking}
            title="Send"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
