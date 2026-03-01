import React, { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { CarDetailsCard } from './components/CarDetailsCard';
import { ListingsView } from './components/ListingsView';
import { analyzeCarImage, analyzeLicensePlate, findSimilarCars, CarDetails, Listing, SearchFilters } from './services/geminiService';
import { Camera, AlertCircle, RefreshCcw, Search, Car, History, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [carDetails, setCarDetails] = useState<CarDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<CarDetails[]>([]);

  useEffect(() => {
    const savedPlates = localStorage.getItem('recentPlates');
    if (savedPlates) {
      try {
        setRecentSearches(JSON.parse(savedPlates));
      } catch (e) {}
    }

    const savedCars = localStorage.getItem('savedCars');
    if (savedCars) {
      try {
        setSavedSearches(JSON.parse(savedCars));
      } catch (e) {}
    }
  }, []);

  const saveRecentSearch = (plate: string) => {
    if (!plate || plate === "Non disponibile") return;
    const upperPlate = plate.toUpperCase();
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p !== upperPlate);
      const updated = [upperPlate, ...filtered].slice(0, 3);
      localStorage.setItem('recentPlates', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleSaveCar = (car: CarDetails) => {
    setSavedSearches(prev => {
      const isSaved = prev.some(c => c.licensePlate === car.licensePlate && c.make === car.make);
      let updated;
      if (isSaved) {
        updated = prev.filter(c => !(c.licensePlate === car.licensePlate && c.make === car.make));
      } else {
        updated = [car, ...prev].slice(0, 10); // Keep last 10 saved cars
      }
      localStorage.setItem('savedCars', JSON.stringify(updated));
      return updated;
    });
  };

  const isCarSaved = (car: CarDetails | null) => {
    if (!car) return false;
    return savedSearches.some(c => c.licensePlate === car.licensePlate && c.make === car.make);
  };

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
      if (details.licensePlate) {
        saveRecentSearch(details.licensePlate);
      }
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante l'analisi dell'immagine. Riprova.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performPlateSearch = async (plate: string) => {
    setImage(null);
    setIsAnalyzing(true);
    setError(null);
    setCarDetails(null);
    setListings([]);
    setHasSearched(false);
    setManualPlate(plate);

    try {
      const details = await analyzeLicensePlate(plate);
      setCarDetails(details);
      saveRecentSearch(plate);
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante la ricerca della targa. Riprova.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlate.trim()) return;
    await performPlateSearch(manualPlate.toUpperCase());
  };

  const handleSearch = async (filters?: SearchFilters) => {
    if (!carDetails) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    
    try {
      const results = await findSimilarCars(carDetails.make, carDetails.model, carDetails.series, carDetails.year, filters);
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
              
              {recentSearches.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
                    <History size={16} />
                    <h3 className="text-sm font-medium">Ricerche recenti</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((plate, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => performPlateSearch(plate)}
                        disabled={isAnalyzing}
                        className="px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700 rounded-lg text-sm font-mono font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {plate}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 text-center mt-4">
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
                <div className="relative">
                  <CarDetailsCard details={carDetails} />
                  <button
                    onClick={() => toggleSaveCar(carDetails)}
                    className={`absolute top-4 right-4 p-2 rounded-full shadow-sm transition-colors ${
                      isCarSaved(carDetails) 
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                        : 'bg-white text-gray-400 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                    aria-label={isCarSaved(carDetails) ? "Rimuovi dai salvati" : "Salva veicolo"}
                  >
                    {isCarSaved(carDetails) ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
                  </button>
                </div>
                
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

        {!image && !carDetails && !isAnalyzing && savedSearches.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Bookmark size={20} />
              <h2 className="font-semibold">Veicoli salvati</h2>
            </div>
            <div className="space-y-3">
              {savedSearches.map((car, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900">{car.make} {car.model}</p>
                    <p className="text-xs text-gray-500 font-mono">{car.licensePlate || 'Targa non disp.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCarDetails(car);
                        setImage(null);
                        setListings([]);
                        setHasSearched(false);
                      }}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Vedi
                    </button>
                    <button
                      onClick={() => toggleSaveCar(car)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
