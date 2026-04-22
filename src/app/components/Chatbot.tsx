import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useTextGenerator } from "../../hooks/useTextGenerator";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I am Acorn, your ASL practice partner. So glad you are here. Let us start easy. Can you say hello to me?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Replace the botResponses array and setTimeout with this
  const { status, errorMessage, generate } = useTextGenerator();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || status !== "ready") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Call the LLM instead of random botResponses
    const reply = await generate(input);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg">
      {/* Chat header */}
      <div className="p-2 border-b">
        <h2 className="text-sm font-semibold">Chat with Assistant</h2>
      </div>

      {/* Model status banners */}
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

      {/* Messages area — unchanged */}
      <ScrollArea className="flex-1 p-2">
        <div ref={scrollRef} className="space-y-2">
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

          {/* Thinking indicator */}
          {status === "generating" && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 rounded-lg px-2 py-1">
                <p className="text-xs">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area — unchanged except disabled states */}
      <div className="p-2 border-t">
        <div className="flex gap-1">
          <Input
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
                    : "Type a message..."
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
