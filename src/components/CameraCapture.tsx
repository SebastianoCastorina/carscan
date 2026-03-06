import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, RefreshCw, Image as ImageIcon, ZoomIn, ZoomOut, X, Sparkles } from 'lucide-react';
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
      const capabilities = track.getCapabilities() as any;
      if (capabilities.zoom) {
        setZoomSupported(true);
        setZoomRange({
          min: capabilities.zoom.min || 1,
          max: capabilities.zoom.max || 10,
          step: capabilities.zoom.step || 0.1
        });
        
        const settings = track.getSettings() as any;
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
      <motion.div 
        className="relative w-full aspect-[3/4] bg-card rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50 flex flex-col items-center justify-center touch-none group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <AnimatePresence mode="wait">
          {!isCameraActive ? (
            <motion.div 
              key="inactive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-8 text-center h-full w-full relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              <Tooltip content="Attiva fotocamera" position="bottom">
                <motion.button 
                  onClick={() => setIsCameraActive(true)}
                  className="w-36 h-36 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-all shadow-xl shadow-primary/5 mb-8 group relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-20" />
                  <Camera size={56} className="group-hover:rotate-12 transition-transform duration-500" />
                </motion.button>
              </Tooltip>
              
              <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Scansiona Auto</h3>
              <p className="text-muted-foreground mb-10 text-sm px-8 font-medium leading-relaxed">
                Inquadra il veicolo o la targa per estrarre i dati tecnici istantaneamente.
              </p>
              
              <Tooltip content="Carica immagine" position="bottom">
                <label className="flex items-center gap-3 px-8 py-4 bg-card text-foreground rounded-2xl shadow-lg border border-border cursor-pointer hover:bg-accent hover:border-primary/30 transition-all font-bold text-sm uppercase tracking-widest">
                  <ImageIcon size={20} className="text-primary" />
                  <span>Dalla Galleria</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </Tooltip>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              <div className="scanner-line" />
              
              {/* @ts-ignore */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.8}
                videoConstraints={{ facingMode }}
                onUserMedia={handleUserMedia}
                className="w-full h-full object-cover bg-black"
              />

              <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-2 border-white/30 rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              </div>
              
              <div className="absolute top-6 right-6 flex flex-col gap-3">
                <Tooltip content="Cambia" position="left">
                  <button
                    onClick={toggleCamera}
                    className="p-3.5 bg-black/40 text-white rounded-2xl backdrop-blur-md hover:bg-primary transition-all shadow-xl"
                    aria-label="Cambia fotocamera"
                  >
                    <RefreshCw size={20} />
                  </button>
                </Tooltip>
                <Tooltip content="Chiudi" position="left">
                  <button
                    onClick={() => setIsCameraActive(false)}
                    className="p-3.5 bg-black/40 text-white rounded-2xl backdrop-blur-md hover:bg-destructive transition-all shadow-xl"
                    aria-label="Chiudi"
                  >
                    <X size={20} />
                  </button>
                </Tooltip>
              </div>

              {zoomSupported && (
                <div className="absolute bottom-36 left-0 right-0 flex justify-center items-center gap-4 px-10 z-10">
                  <ZoomOut size={18} className="text-white/70" />
                  <input
                    type="range"
                    min={zoomRange.min}
                    max={zoomRange.max}
                    step={zoomRange.step}
                    value={zoom}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer backdrop-blur-sm accent-primary"
                  />
                  <ZoomIn size={18} className="text-white/70" />
                </div>
              )}

              <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-10 z-10">
                <Tooltip content="Carica" position="top">
                  <label className="p-4 bg-white/10 text-white rounded-2xl backdrop-blur-xl cursor-pointer hover:bg-white/20 transition-all border border-white/10">
                    <Upload size={24} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </Tooltip>
                
                <Tooltip content="Scansiona" position="top">
                  <motion.button
                    onClick={capture}
                    className="w-24 h-24 bg-white rounded-full p-1.5 shadow-2xl relative group"
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className="w-full h-full rounded-full border-[6px] border-primary/20 flex items-center justify-center">
                      <div className="w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center">
                        <Sparkles className="text-white" size={24} />
                      </div>
                    </div>
                  </motion.button>
                </Tooltip>
                
                <div className="w-14 h-14" /> {/* Spacer for balance */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
