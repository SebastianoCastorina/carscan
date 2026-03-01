import React, { useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { CarDetailsCard } from './components/CarDetailsCard';
import { ListingsView } from './components/ListingsView';
import { analyzeCarImage, analyzeLicensePlate, findSimilarCars, CarDetails, Listing } from './services/geminiService';
import { Camera, AlertCircle, RefreshCcw, Search, Car } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [carDetails, setCarDetails] = useState<CarDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState("");

  const handleCapture = async (base64Image: string) => {
    setImage(base64Image);
    setIsAnalyzing(true);
    setError(null);
    setCarDetails(null);
    setListings([]);
    setHasSearched(false);
    setManualPlate("");

    try {
      const details = await analyzeCarImage(base64Image);
      setCarDetails(details);
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante l'analisi dell'immagine. Riprova.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlate.trim()) return;
    
    setImage(null);
    setIsAnalyzing(true);
    setError(null);
    setCarDetails(null);
    setListings([]);
    setHasSearched(false);

    try {
      const details = await analyzeLicensePlate(manualPlate.toUpperCase());
      setCarDetails(details);
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante la ricerca della targa. Riprova.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!carDetails) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    
    try {
      const results = await findSimilarCars(carDetails.make, carDetails.model, carDetails.series);
      setListings(results);
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante la ricerca degli annunci. Riprova.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setCarDetails(null);
    setListings([]);
    setHasSearched(false);
    setError(null);
    setManualPlate("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Camera size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AutoScanner</h1>
          </div>
          {(image || carDetails) && (
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Nuova scansione"
            >
              <RefreshCcw size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-8 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!image && !carDetails && !isAnalyzing && (
          <div className="space-y-8">
            <CameraCapture onCapture={handleCapture} />
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OPPURE</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handlePlateSearch} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Car size={20} />
                <h2 className="font-semibold">Ricerca manuale tramite targa</h2>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center bg-white border-2 border-blue-600 rounded-xl overflow-hidden shadow-sm h-16">
                  <div className="bg-blue-600 text-white h-full px-3 flex flex-col items-center justify-center w-12 shrink-0">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg" alt="EU" className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">I</span>
                  </div>
                  <input
                    type="text"
                    value={manualPlate}
                    onChange={(e) => setManualPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="AB123CD"
                    className="w-full h-full px-2 font-mono text-3xl text-center uppercase focus:outline-none text-gray-800 tracking-[0.2em] placeholder:text-gray-300"
                    maxLength={7}
                  />
                  <div className="bg-blue-600 text-white h-full px-3 flex flex-col items-center justify-center w-12 shrink-0">
                    <div className="w-5 h-5 rounded-full border-2 border-yellow-400/50 mb-1"></div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={manualPlate.length < 5 || isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <Search size={20} />
                  Cerca Veicolo
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                Inserisci la targa per identificare il veicolo e cercare annunci simili sul web.
              </p>
            </form>
          </div>
        )}

        {(image || isAnalyzing || carDetails) && (
          <div className="space-y-8">
            {image && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-gray-200">
                <img src={image} alt="Auto scansionata" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-medium text-lg">Analisi in corso...</p>
                    <p className="text-sm text-white/80 mt-1">Identificazione modello e targa</p>
                  </div>
                )}
              </div>
            )}

            {!image && isAnalyzing && (
              <div className="w-full aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-600 shadow-inner border border-gray-200">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-medium text-lg">Ricerca targa in corso...</p>
                <p className="text-sm text-gray-500 mt-1">Recupero informazioni dal web</p>
              </div>
            )}

            {carDetails && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CarDetailsCard details={carDetails} />
                
                <ListingsView
                  listings={listings}
                  isLoading={isSearching}
                  onSearch={handleSearch}
                  hasSearched={hasSearched}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
