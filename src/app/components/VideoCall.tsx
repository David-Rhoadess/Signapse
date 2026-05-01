import { Video, VideoOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import squirrel1 from "@/assets/cheerful.png";
import squirrel2 from "@/assets/confused.png";
import squirrel3 from "@/assets/embarrassed.png";
import squirrel4 from "@/assets/encouraged.png";
import squirrel5 from "@/assets/focused.png";
import squirrel6 from "@/assets/surprised.png";
import { getSignRecognition } from "@/lib/signRecognition";

const squirrelImages = [
  squirrel1,
  squirrel2,
  squirrel3,
  squirrel4,
  squirrel5,
  squirrel6,
];

interface VideoCallProps {
  isVideoOn: boolean;
}

export function VideoCall({ isVideoOn }: VideoCallProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [recognizedWord, setRecognizedWord] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Set up webcam
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

  useEffect(() => {
    if (!isVideoOn || cameraError) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const attachWhenReady = async () => {
      try {
        const service = await getSignRecognition();
        if (cancelled) return;

        unsubscribe = service.subscribe(({ word, distance }) => {
          console.log("recognized:", word, "distance:", distance);
          setRecognizedWord(word);
        });

        const start = () => {
          if (cancelled) return;
          canvas.width = video.videoWidth || canvas.clientWidth;
          canvas.height = video.videoHeight || canvas.clientHeight;
          service.attach(video, canvas);
        };

        if (video.readyState >= 1 && video.videoWidth > 0) {
          start();
        } else {
          video.addEventListener("loadedmetadata", start, { once: true });
        }
      } catch (err) {
        console.error("Failed to start sign recognition:", err);
      }
    };

    attachWhenReady();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isVideoOn, cameraError]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % squirrelImages.length,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative">
        {isVideoOn && !cameraError ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
            />
          </>
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

        {recognizedWord && isVideoOn && !cameraError && (
          <div className="absolute top-2 right-2 bg-blue-600/80 text-white px-2 py-0.5 rounded text-xs">
            Sign: {recognizedWord}
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-48 h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
          <img
            src={squirrelImages[currentImageIndex]}
            alt="Acorn the Squirrel"
            className="w-full h-full object-contain bg-white"
          />
          <div className="absolute top-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
            Acorn
          </div>
        </div>
      </div>
    </div>
  );
}
