import { useState } from "react";
import { PhoneOff } from "lucide-react";
import { VideoCall } from "./VideoCall";
import { Chatbot } from "./Chatbot";
import { Button } from "./ui/button";

export function Home() {
  const [callEnded, setCallEnded] = useState(false);
  const [emotion, setEmotion] = useState<string>("cheerful");

  if (callEnded) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-2">👋</div>
          <h1 className="text-xl mb-1">Call Ended</h1>
          <p className="text-gray-600 text-sm mb-3">
            Thanks for chatting with Nutty!
          </p>
          <Button onClick={() => setCallEnded(false)} size="sm">
            Rejoin Call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-100 p-2 gap-2">
      <div className="flex-1 flex gap-2 min-h-0">
        <div className="flex-1 min-w-0">
          <VideoCall emotion={emotion} />
        </div>
        <div className="w-80 flex-shrink-0">
          <Chatbot onEmotionChange={setEmotion} />
        </div>
      </div>
      <div className="flex justify-center">
        <Button
          onClick={() => setCallEnded(true)}
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white px-6"
        >
          <PhoneOff className="mr-1" size={16} />
          End Call
        </Button>
      </div>
    </div>
  );
}
