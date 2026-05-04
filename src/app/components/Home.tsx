import { useState, useRef, useEffect } from "react";
import { PhoneOff, Video, VideoOff } from "lucide-react";
import { VideoCall } from "./VideoCall";
import { Chatbot } from "./Chatbot";
import { Button } from "./ui/button";
import {
  saveSession,
  formatDuration,
  formatDate,
  DEFAULT_SUMMARY,
  type StoredChatMessage,
} from "../../lib/chatStorage";

export interface LatestSign {
  word: string;
  /** Monotonically-increasing ID so Chatbot can detect the same word signed twice. */
  id: number;
}

export function Home() {
  const [callEnded, setCallEnded] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [emotion, setEmotion] = useState<string>("cheerful");
  const [latestSign, setLatestSign] = useState<LatestSign | null>(null);
  const signIdRef = useRef(0);

  const messagesRef = useRef<StoredChatMessage[]>([]);
  const sessionStartRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!callEnded) {
      sessionStartRef.current = new Date();
      messagesRef.current = [];
    }
  }, [callEnded]);

  const handleSignRecognized = (word: string) => {
    setLatestSign({ word, id: ++signIdRef.current });
  };

  const handleEndCallClick = () => {
    setShowEndCallModal(true);
  };

  const handleSaveAndEnd = () => {
    const durationMs = Date.now() - sessionStartRef.current.getTime();
    saveSession({
      id: crypto.randomUUID(),
      date: formatDate(sessionStartRef.current),
      duration: formatDuration(durationMs),
      summary: DEFAULT_SUMMARY,
      messages: messagesRef.current,
    });
    setShowEndCallModal(false);
    setCallEnded(true);
  };

  const handleEndWithoutSaving = () => {
    setShowEndCallModal(false);
    setCallEnded(true);
  };

  const handleCancelEnd = () => {
    setShowEndCallModal(false);
  };

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
      {/* Main content area */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Video call area */}
        <div className="flex-1 min-w-0">
          <VideoCall
            emotion={emotion}
            isVideoOn={isVideoOn}
            onSignRecognized={handleSignRecognized}
          />
        </div>

        {/* Chatbot sidebar */}
        <div className="w-80 flex-shrink-0">
          <Chatbot
            onEmotionChange={setEmotion}
            latestSign={latestSign}
            onMessagesChange={(msgs: StoredChatMessage[]) => {
              messagesRef.current = msgs;
            }}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex gap-2">
        <div className="flex-1 flex justify-center gap-2">
          <Button
            onClick={() => setIsVideoOn(!isVideoOn)}
            size="sm"
            className={`px-6 ${
              isVideoOn
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
          </Button>
          <Button
            onClick={handleEndCallClick}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white px-6"
          >
            <PhoneOff className="mr-1" size={16} />
            End Call
          </Button>
        </div>

        {/* Spacer matching the chatbot sidebar width */}
        <div className="w-80 flex-shrink-0" />
      </div>

      {/* End call confirmation modal */}
      {showEndCallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">💾</div>
              <h2 className="text-lg font-semibold text-gray-800">End Call</h2>
              <p className="text-sm text-gray-500 mt-1">
                Would you like to save this chat before leaving?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveAndEnd}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Chat &amp; End Call
              </Button>
              <Button
                onClick={handleEndWithoutSaving}
                size="sm"
                variant="outline"
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                End Without Saving
              </Button>
              <Button
                onClick={handleCancelEnd}
                size="sm"
                variant="ghost"
                className="w-full text-gray-500"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
