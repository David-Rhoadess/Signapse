import { Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import squirrel1 from "@/assets/cheerful.png";
import squirrel2 from "@/assets/confused.png";
import squirrel3 from "@/assets/embarrassed.png";
import squirrel4 from "@/assets/encouraged.png";
import squirrel5 from "@/assets/focused.png";
import squirrel6 from "@/assets/surprised.png";

const emotionToImage: Record<string, string> = {
  cheerful: squirrel1,
  confused: squirrel2,
  embarrassed: squirrel3,
  encouraged: squirrel4,
  focused: squirrel5,
  surprised: squirrel6,
};

interface VideoCallProps {
  emotion: string;
}

export function VideoCall({ emotion }: VideoCallProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentImage = emotionToImage[emotion] ?? emotionToImage.cheerful;

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setCameraError(true);
      }
    };

    if (isVideoOn) {
      startWebcam();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative">
        {isVideoOn && !cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            {cameraError ? (
              <>
                <p className="text-sm mb-1">Camera access denied</p>
                <p className="text-xs text-gray-500">
                  Please allow camera access in your browser
                </p>
              </>
            ) : (
              <p className="text-sm">Camera Off</p>
            )}
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
          You
        </div>

        {/* Squirrel — now driven by emotion prop */}
        <div className="absolute bottom-4 right-4 w-48 h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
          <img
            src={currentImage}
            alt={`Acorn feeling ${emotion}`}
            className="w-full h-full object-contain bg-white"
          />
          <div className="absolute top-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
            Acorn
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-2 rounded-full transition-colors ${
            isMicOn
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
          aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-2 rounded-full transition-colors ${
            isVideoOn
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
          aria-label={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
      </div>
    </div>
  );
}
