import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import squirrel1 from '@/assets/cheerful.png';
import squirrel2 from '@/assets/confused.png';
import squirrel3 from '@/assets/embarrassed.png';
import squirrel4 from '@/assets/encouraged.png';
import squirrel5 from '@/assets/focused.png';
import squirrel6 from '@/assets/surprised.png';
import { getSignRecognition } from '@/lib/signRecognition';

const squirrelImages = [squirrel1, squirrel2, squirrel3, squirrel4, squirrel5, squirrel6];

export function VideoCall() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
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
          audio: false 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (error) {
        console.error('Error accessing webcam:', error);
        setCameraError(true);
      }
    };

    if (isVideoOn) {
      startWebcam();
    } else {
      // Stop webcam when video is off
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOn]);

  // Attach the sign-recognition service once the webcam stream is playing.
  // The service is a singleton, so re-attaches after toggling video off/on are no-ops.
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
          console.log('recognized:', word, 'distance:', distance);
          setRecognizedWord(word);
        });

        const start = () => {
          if (cancelled) return;
          // Match the canvas pixel size to the video so landmark drawing aligns.
          canvas.width = video.videoWidth || canvas.clientWidth;
          canvas.height = video.videoHeight || canvas.clientHeight;
          service.attach(video, canvas);
        };

        if (video.readyState >= 1 && video.videoWidth > 0) {
          start();
        } else {
          video.addEventListener('loadedmetadata', start, { once: true });
        }
      } catch (err) {
        console.error('Failed to start sign recognition:', err);
      }
    };

    attachWhenReady();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isVideoOn, cameraError]);

  // Rotate squirrel images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % squirrelImages.length);
    }, 2000); // Rotate every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Your video - main camera box */}
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
            {/* Landmark overlay — mirrored to match the mirrored video preview. */}
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
                <p className="text-xs text-gray-500">Please allow camera access in your browser</p>
              </>
            ) : (
              <p className="text-sm">Camera Off</p>
            )}
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
          You
        </div>

        {/* Most recently recognized sign */}
        {recognizedWord && isVideoOn && !cameraError && (
          <div className="absolute top-2 right-2 bg-blue-600/80 text-white px-2 py-0.5 rounded text-xs">
            Sign: {recognizedWord}
          </div>
        )}

        {/* Squirrel video - corner picture-in-picture */}
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

      {/* Video controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-2 rounded-full transition-colors ${
            isMicOn 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-2 rounded-full transition-colors ${
            isVideoOn 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
      </div>
    </div>
  );
}
