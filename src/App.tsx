import React, { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { CarDetailsCard } from './components/CarDetailsCard';
import { ListingsView } from './components/ListingsView';
import { analyzeCarImage, analyzeLicensePlate, findSimilarCars, CarDetails, Listing, SearchFilters } from './services/aiService';
import { compressImage } from './utils/imageUtils';
import { Camera, AlertCircle, RefreshCcw, Search, Car, History, Bookmark, BookmarkCheck, Trash2, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { Tooltip } from './components/Tooltip';
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ModeToggle } from './components/mode-toggle';

export default function App() {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'garage'>('scanner');
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
      // Compress image to avoid 413 Content Too Large on Vercel
      console.log("Original image size:", (base64Image.length / 1024).toFixed(2), "KB");
      const compressedImage = await compressImage(base64Image, 1200, 1200, 0.7);
      console.log("Compressed image size:", (compressedImage.length / 1024).toFixed(2), "KB");
      const details = await analyzeCarImage(compressedImage);
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

  const handleGarageClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setActiveTab('garage');
      handleReset();
    }
  };

  const handleOpenSavedSearch = (car: CarDetails) => {
    handleReset();
    setCarDetails(car);
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-12 transition-colors duration-300">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
      <header className="bg-card shadow-sm sticky top-0 z-10 border-b border-border">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('scanner'); handleReset(); }}>
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Camera size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AutoScanner</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            
            {user ? (
              <div className="flex items-center gap-2">
                <Tooltip content="Il tuo Garage" position="bottom">
                  <button
                    onClick={handleGarageClick}
                    className={`p-2 rounded-full transition-colors ${activeTab === 'garage' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-muted-foreground hover:bg-accent'}`}
                    aria-label="Garage"
                  >
                    <Bookmark size={20} />
                  </button>
                </Tooltip>
                <Tooltip content={`Esci (${user.name})`} position="bottom">
                  <button
                    onClick={() => { logout(); setActiveTab('scanner'); }}
                    className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-accent transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip content="Accedi" position="bottom">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-accent transition-colors"
                  aria-label="Login"
                >
                  <LogIn size={20} />
                </button>
              </Tooltip>
            )}

            {activeTab === 'scanner' && (image || carDetails) && (
              <Tooltip content="Nuova scansione" position="bottom">
                <button
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-accent transition-colors"
                  aria-label="Nuova scansione"
                >
                  <RefreshCcw size={20} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-8 space-y-8">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-start gap-3 border border-destructive/20">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {activeTab === 'garage' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 p-3 rounded-xl">
                <Bookmark size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Il tuo Garage</h2>
                <p className="text-muted-foreground text-sm">Auto salvate: {savedSearches.length}</p>
              </div>
            </div>

            {savedSearches.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border shadow-sm">
                <Car size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nessuna auto salvata</h3>
                <p className="text-muted-foreground text-sm">
                  Scansiona una targa o un'auto e clicca sull'icona del segnalibro per salvarla qui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedSearches.map((car, index) => (
                  <div 
                    key={index} 
                    className="bg-card p-4 rounded-xl border border-border shadow-sm relative group cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => handleOpenSavedSearch(car)}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveCar(car);
                      }}
                      className="absolute top-4 right-4 text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center shrink-0">
                        <Car className="text-muted-foreground" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{car.make} {car.model}</h3>
                        <p className="text-muted-foreground text-sm">{car.series} • {car.year}</p>
                        {car.licensePlate && (
                          <div className="inline-block mt-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded border border-blue-200 dark:border-blue-800">
                            {car.licensePlate}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
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
                      <Tooltip key={index} content="Cerca di nuovo questa targa" position="top">
                        <button
                          type="button"
                          onClick={() => performPlateSearch(plate)}
                          disabled={isAnalyzing}
                          className="px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700 rounded-lg text-sm font-mono font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {plate}
                        </button>
                      </Tooltip>
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
                  <div className="absolute top-4 right-4">
                    <Tooltip content={isCarSaved(carDetails) ? "Rimuovi dai salvati" : "Salva veicolo"} position="left">
                      <button
                        onClick={() => toggleSaveCar(carDetails)}
                        className={`p-2 rounded-full shadow-sm transition-colors ${
                          isCarSaved(carDetails) 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-white text-gray-400 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                        aria-label={isCarSaved(carDetails) ? "Rimuovi dai salvati" : "Salva veicolo"}
                      >
                        {isCarSaved(carDetails) ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
                      </button>
                    </Tooltip>
                  </div>
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

          </>
        )}
      </main>
    </div>
  );
}
