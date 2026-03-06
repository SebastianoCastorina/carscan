import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraCapture } from './components/CameraCapture';
import { CarDetailsCard } from './components/CarDetailsCard';
import { ListingsView } from './components/ListingsView';
import { analyzeCarImage, analyzeLicensePlate, findSimilarCars, CarDetails, Listing, SearchFilters } from './services/aiService';
import { compressImage } from './utils/imageUtils';
import { Camera, AlertCircle, RefreshCcw, Search, Car, History, Bookmark, BookmarkCheck, Trash2, LogIn, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-background text-foreground font-sans pb-12 transition-colors duration-300 car-grid-pattern">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setActiveTab('scanner'); handleReset(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20">
              <Camera size={22} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-extrabold tracking-tight leading-none glow-text">AutoScanner</h1>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">AI Powered</span>
            </div>
          </motion.div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            
            {user ? (
              <div className="flex items-center gap-1">
                <Tooltip content="Il tuo Garage" position="bottom">
                  <button
                    onClick={handleGarageClick}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'garage' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-accent'}`}
                    aria-label="Garage"
                  >
                    <Bookmark size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={`Esci (${user.name})`} position="bottom">
                  <button
                    onClick={() => { logout(); setActiveTab('scanner'); }}
                    className="text-muted-foreground hover:text-destructive p-2.5 rounded-xl hover:bg-destructive/10 transition-all"
                    aria-label="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip content="Accedi" position="bottom">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-muted-foreground hover:text-foreground p-2.5 rounded-xl hover:bg-accent transition-all"
                  aria-label="Login"
                >
                  <LogIn size={18} />
                </button>
              </Tooltip>
            )}

            {activeTab === 'scanner' && (image || carDetails) && (
              <Tooltip content="Nuova scansione" position="bottom">
                <button
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground p-2.5 rounded-xl hover:bg-accent transition-all"
                  aria-label="Nuova scansione"
                >
                  <RefreshCcw size={18} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-destructive/10 text-destructive p-4 rounded-2xl flex items-start gap-3 border border-destructive/20 backdrop-blur-sm"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-semibold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'garage' ? (
            <motion.div 
              key="garage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary/10 text-primary p-4 rounded-2xl shadow-inner">
                  <Bookmark size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Il tuo Garage</h2>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Auto salvate: {savedSearches.length}</p>
                </div>
              </div>

              {savedSearches.length === 0 ? (
                <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-3xl border border-border shadow-xl">
                  <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Car size={40} className="text-muted-foreground/30" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Nessuna auto salvata</h3>
                  <p className="text-muted-foreground text-sm px-8">
                    Scansiona una targa o un'auto e clicca sull'icona del segnalibro per salvarla qui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedSearches.map((car, index) => (
                    <motion.div 
                      key={index} 
                      layoutId={`car-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card p-5 rounded-3xl border border-border shadow-lg relative group cursor-pointer hover:border-primary/50 hover:shadow-primary/5 transition-all overflow-hidden"
                      onClick={() => handleOpenSavedSearch(car)}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveCar(car);
                        }}
                        className="absolute top-4 right-4 text-destructive opacity-0 group-hover:opacity-100 transition-all p-2.5 hover:bg-destructive/10 rounded-xl z-10"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                          <Car className="text-primary/60" size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg truncate">{car.make} {car.model}</h3>
                          <p className="text-muted-foreground text-xs font-bold uppercase tracking-tight">{car.series} • {car.year}</p>
                          {car.licensePlate && (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20 uppercase tracking-widest">
                              <Sparkles size={10} />
                              {car.licensePlate}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {!image && !carDetails && !isAnalyzing && (
                <div className="space-y-8">
                  <CameraCapture onCapture={handleCapture} />
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-border/50"></div>
                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">OPPURE</span>
                    <div className="flex-grow border-t border-border/50"></div>
                  </div>

                  <motion.form 
                    onSubmit={handlePlateSearch} 
                    className="bg-card p-8 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-border/50 space-y-6 relative overflow-hidden"
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                    
                    <div className="flex items-center gap-3 text-foreground mb-2">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Search size={20} />
                      </div>
                      <h2 className="font-black text-lg tracking-tight">Ricerca Targa</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center bg-background border-2 border-primary/20 focus-within:border-primary rounded-2xl overflow-hidden shadow-inner h-20 transition-all">
                        <div className="bg-primary text-primary-foreground h-full px-3 flex flex-col items-center justify-center w-14 shrink-0">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg" alt="EU" className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-black tracking-tighter">I</span>
                        </div>
                        <input
                          type="text"
                          value={manualPlate}
                          onChange={(e) => setManualPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          placeholder="AB123CD"
                          className="w-full h-full px-4 font-mono text-4xl text-center uppercase focus:outline-none bg-transparent font-bold tracking-[0.15em] placeholder:text-muted-foreground/20"
                          maxLength={7}
                        />
                        <div className="bg-primary text-primary-foreground h-full px-3 flex flex-col items-center justify-center w-14 shrink-0">
                          <div className="w-6 h-6 rounded-full border-2 border-yellow-400/50 mb-1"></div>
                        </div>
                      </div>
                      
                      <motion.button
                        type="submit"
                        disabled={manualPlate.length < 5 || isAnalyzing}
                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-6 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 uppercase tracking-widest text-sm"
                        whileTap={{ scale: 0.98 }}
                      >
                        <Search size={20} />
                        Analizza Veicolo
                      </motion.button>
                    </div>
                    
                    {recentSearches.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-4">
                          <History size={14} />
                          <h3 className="text-[10px] font-black uppercase tracking-widest">Recenti</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((plate, index) => (
                            <Tooltip key={index} content="Cerca di nuovo" position="top">
                              <motion.button
                                type="button"
                                onClick={() => performPlateSearch(plate)}
                                disabled={isAnalyzing}
                                className="px-4 py-2.5 bg-accent hover:bg-primary hover:text-primary-foreground border border-border rounded-xl text-xs font-mono font-black transition-all disabled:opacity-50"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {plate}
                              </motion.button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.form>
                </div>
              )}

              <AnimatePresence>
                {(image || isAnalyzing || carDetails) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                  >
                    {image && (
                      <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50 group">
                        <img src={image} alt="Auto scansionata" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-md flex flex-col items-center justify-center text-white">
                            <div className="scanner-line" />
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6" />
                              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={24} />
                            </div>
                            <p className="font-black text-xl tracking-tight uppercase glow-text">Analisi AI...</p>
                            <p className="text-xs font-bold text-white/70 mt-2 uppercase tracking-widest">Identificazione Modello</p>
                          </div>
                        )}
                      </div>
                    )}

                    {!image && isAnalyzing && (
                      <div className="w-full aspect-video bg-card/50 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center text-foreground shadow-2xl border border-border/50 relative overflow-hidden">
                        <div className="scanner-line" />
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
                        <p className="font-black text-xl tracking-tight uppercase">Ricerca Targa...</p>
                        <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Recupero Dati Tecnici</p>
                      </div>
                    )}

                    {carDetails && (
                      <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <div className="relative">
                          <CarDetailsCard details={carDetails} />
                          <div className="absolute top-6 right-6">
                            <Tooltip content={isCarSaved(carDetails) ? "Rimuovi" : "Salva"} position="left">
                              <motion.button
                                onClick={() => toggleSaveCar(carDetails)}
                                className={`p-3 rounded-2xl shadow-xl transition-all ${
                                  isCarSaved(carDetails) 
                                    ? 'bg-primary text-primary-foreground shadow-primary/20' 
                                    : 'bg-card text-muted-foreground hover:text-primary hover:bg-accent border border-border'
                                }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {isCarSaved(carDetails) ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
                              </motion.button>
                            </Tooltip>
                          </div>
                        </div>
                        
                        <ListingsView
                          listings={listings}
                          isLoading={isSearching}
                          onSearch={handleSearch}
                          hasSearched={hasSearched}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
