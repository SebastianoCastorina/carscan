import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Zoom state
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const handleUserMedia = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    trackRef.current = track;
    
    try {
      const capabilities = track.getCapabilities();
      if (capabilities.zoom) {
        setZoomSupported(true);
        setZoomRange({
          min: capabilities.zoom.min || 1,
          max: capabilities.zoom.max || 10,
          step: capabilities.zoom.step || 0.1
        });
        
        const settings = track.getSettings();
        if (settings.zoom) {
          setZoom(settings.zoom);
        }
      } else {
        setZoomSupported(false);
      }
    } catch (e) {
      console.warn("Zoom non supportato dal dispositivo", e);
      setZoomSupported(false);
    }
  };

  const applyZoom = (newZoom: number) => {
    if (trackRef.current && zoomSupported) {
      const safeZoom = Math.max(zoomRange.min, Math.min(newZoom, zoomRange.max));
      trackRef.current.applyConstraints({
        advanced: [{ zoom: safeZoom }]
      }).then(() => {
        setZoom(safeZoom);
      }).catch(e => console.warn("Errore nell'applicazione dello zoom", e));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomSupported) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current !== null && zoomSupported) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const scale = distance / initialDistanceRef.current;
      const newZoom = initialZoomRef.current * scale;
      
      applyZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    initialDistanceRef.current = null;
  };

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
      <div 
        className="relative w-full aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden shadow-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {!isCameraActive ? (
          <div className="flex flex-col items-center justify-center p-6 text-center h-full w-full">
            <Tooltip content="Attiva fotocamera" position="bottom">
              <button 
                onClick={() => setIsCameraActive(true)}
                className="w-32 h-32 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors shadow-sm mb-6 group"
              >
                <Camera size={48} className="group-hover:scale-110 transition-transform duration-300" />
              </button>
            </Tooltip>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Scatta una foto</h3>
            <p className="text-gray-500 mb-8 text-sm px-4">
              Inquadra l'auto o la targa per identificarla automaticamente.
            </p>
            
            <Tooltip content="Carica immagine" position="bottom">
              <label className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all font-medium">
                <ImageIcon size={20} className="text-blue-500" />
                <span>Carica dalla galleria</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </Tooltip>
          </div>
        ) : (
          <>
            {/* @ts-ignore */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode }}
              onUserMedia={handleUserMedia}
              className="w-full h-full object-cover bg-black"
            />
            
            <Tooltip content="Cambia fotocamera" position="left">
              <button
                onClick={toggleCamera}
                className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-10"
                aria-label="Cambia fotocamera"
              >
                <RefreshCw size={20} />
              </button>
            </Tooltip>

            {zoomSupported && (
              <div className="absolute bottom-32 left-0 right-0 flex justify-center items-center gap-3 px-8 z-10">
                <ZoomOut size={20} className="text-white drop-shadow-md" />
                <input
                  type="range"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  value={zoom}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer backdrop-blur-sm accent-white"
                />
                <ZoomIn size={20} className="text-white drop-shadow-md" />
              </div>
            )}

            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 z-10">
              <Tooltip content="Carica immagine" position="top">
                <label className="p-4 bg-black/40 text-white rounded-full backdrop-blur-md cursor-pointer hover:bg-black/60 transition-colors">
                  <Upload size={24} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </Tooltip>
              
              <Tooltip content="Scatta foto" position="top">
                <button
                  onClick={capture}
                  className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                  aria-label="Scatta foto"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-gray-400" />
                </button>
              </Tooltip>
              
              <Tooltip content="Annulla" position="top">
                <button 
                  onClick={() => setIsCameraActive(false)}
                  className="w-14 h-14 flex items-center justify-center text-white/80 hover:text-white bg-black/40 rounded-full backdrop-blur-md transition-colors"
                  aria-label="Chiudi fotocamera"
                >
                  <span className="text-xs font-bold uppercase">Annulla</span>
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
