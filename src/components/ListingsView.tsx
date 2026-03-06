import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, SearchFilters } from '../services/aiService';
import { 
  ExternalLink, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Info,
  Tag,
  Clock,
  MapPin,
  Sparkles,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ListingsViewProps {
  listings: Listing[];
  isLoading: boolean;
  onSearch: (filters?: SearchFilters) => void;
  hasSearched: boolean;
}

export function ListingsView({ listings, isLoading, onSearch, hasSearched }: ListingsViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sellerType: 'all',
    sortBy: 'relevance'
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchClick = () => {
    onSearch(filters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
            <Search size={20} />
          </div>
          <h2 className="text-xl font-black tracking-tight">Annunci Simili</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            showFilters ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-accent text-muted-foreground hover:bg-accent/80'
          }`}
        >
          <Filter size={16} />
          Filtri
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-xl space-y-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Prezzo Min (€)</label>
                  <input
                    type="number"
                    placeholder="Es. 5000"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={filters.priceMin || ''}
                    onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Prezzo Max (€)</label>
                  <input
                    type="number"
                    placeholder="Es. 20000"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={filters.priceMax || ''}
                    onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Km Max</label>
                  <input
                    type="number"
                    placeholder="Es. 100000"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={filters.mileageMax || ''}
                    onChange={(e) => handleFilterChange('mileageMax', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Venditore</label>
                  <select
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                    value={filters.sellerType}
                    onChange={(e) => handleFilterChange('sellerType', e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="private">Privati</option>
                    <option value="dealer">Concessionari</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSearchClick}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <Search size={18} />
                Applica Filtri e Cerca
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasSearched && !isLoading && (
        <div className="bg-card p-10 rounded-[2.5rem] border border-border/50 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16" />
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-primary" size={32} />
          </div>
          <h3 className="text-xl font-black mb-3 tracking-tight">Trova la tua prossima auto</h3>
          <p className="text-muted-foreground text-sm mb-8 px-4 leading-relaxed font-medium">
            Analizziamo i principali portali di vendita (AutoScout24, Subito.it, ecc.) per trovare i migliori annunci corrispondenti.
          </p>
          <button
            onClick={handleSearchClick}
            className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mx-auto"
          >
            Cerca Annunci Ora
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card p-6 rounded-3xl border border-border/50 animate-pulse flex gap-4">
              <div className="w-24 h-24 bg-muted rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSearched && !isLoading && listings.length === 0 && (
        <div className="text-center py-16 bg-card/50 rounded-3xl border border-border/50">
          <AlertCircle className="mx-auto text-muted-foreground/30 mb-4" size={48} />
          <h3 className="text-lg font-bold">Nessun annuncio trovato</h3>
          <p className="text-muted-foreground text-sm mt-1">Prova a modificare i filtri di ricerca.</p>
        </div>
      )}

      <div className="space-y-4">
        {listings.map((listing, index) => (
          <motion.a
            key={index}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="block bg-card rounded-[2rem] border border-border/50 shadow-lg hover:shadow-2xl hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
            
            {listing.imageUrl && listing.imageUrl !== "" && (
              <div className="w-full h-48 bg-muted relative overflow-hidden border-b border-border/50">
                <img 
                  src={listing.imageUrl} 
                  alt={listing.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-6 flex flex-col flex-grow relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{listing.source}</span>
                <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              
              <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors truncate mb-2">
                {listing.title}
              </h3>

              {listing.price && (
                <div className="text-2xl font-black text-primary tracking-tighter mb-3">
                  {listing.price}
                </div>
              )}

              <p className="text-muted-foreground text-xs font-medium line-clamp-2 leading-relaxed mb-4">
                {listing.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    <Clock size={12} />
                    Oggi
                  </div>
                  {listing.mileage && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      <MapPin size={12} />
                      {listing.mileage}
                    </div>
                  )}
                </div>
                <Tooltip content="Vedi annuncio" position="top">
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Apri <ArrowRight size={12} />
                  </div>
                </Tooltip>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
