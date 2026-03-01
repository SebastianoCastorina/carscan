import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-lg">
        {/* @ts-ignore */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode }}
          className="w-full h-full object-cover"
        />
        
        <button
          onClick={toggleCamera}
          className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
          aria-label="Cambia fotocamera"
        >
          <RefreshCw size={20} />
        </button>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
          <label className="p-4 bg-white/20 text-white rounded-full backdrop-blur-md cursor-pointer hover:bg-white/30 transition-colors">
            <Upload size={24} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          
          <button
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
            aria-label="Scatta foto"
          >
            <div className="w-16 h-16 bg-white rounded-full border-2 border-gray-400" />
          </button>
          
          <div className="w-14" /> {/* Spacer to balance the layout */}
        </div>
      </div>
      
      <p className="text-sm text-gray-500 text-center px-4">
        Scatta una foto dell'auto (frontale, laterale o posteriore) o carica un'immagine dalla galleria.
      </p>
    </div>
  );
}
