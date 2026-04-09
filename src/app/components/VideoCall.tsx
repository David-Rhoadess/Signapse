import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import squirrel1 from '@/assets/6d82f2931867b3c6d68b5649df47ec607898cf1a.png';
import squirrel2 from '@/assets/e5ab077641e3f6320814ea5e3159283b5acf12df.png';
import squirrel3 from '@/assets/f647707b8fe15358a52ae4e7c982648c87e330af.png';
import squirrel4 from '@/assets/29a51df8395533b40a76abdd3d64b989582fb1f8.png';
import squirrel5 from '@/assets/8458bca1bd470fa67e2ae839444a81b6dd3616a1.png';
import squirrel6 from '@/assets/ebd1431298e3a174f322b95ac2015419e5ef4aef.png';

const squirrelImages = [squirrel1, squirrel2, squirrel3, squirrel4, squirrel5, squirrel6];

export function VideoCall() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Rotate squirrel images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % squirrelImages.length);
    }, 2000); // Rotate every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col gap-2">
      {/* Your video - top half */}
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
      </div>

      {/* Squirrel video - bottom half */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
        <img
          src={squirrelImages[currentImageIndex]}
          alt="Nutty the Squirrel"
          className="w-full h-full object-contain bg-white"
        />
        <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
          Nutty the Squirrel
        </div>
      </div>

      {/* Video controls overlay */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
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