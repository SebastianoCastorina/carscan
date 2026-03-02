import React, { useState } from 'react';
import { Listing, SearchFilters } from '../services/geminiService';
import { ExternalLink, Search, AlertCircle, ArrowRight, Filter, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Generazione link di ricerca...</p>
      </div>
    );
  }

  const FilterSection = () => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6">
      <Tooltip content="Mostra/Nascondi filtri" position="top">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between text-gray-700 font-semibold"
        >
          <div className="flex items-center gap-2">
            <Filter size={18} />
            <span>Filtri di ricerca</span>
          </div>
          {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </Tooltip>

      {showFilters && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prezzo Min (€)</label>
              <input 
                type="number" 
                placeholder="Es. 5000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prezzo Max (€)</label>
              <input 
                type="number" 
                placeholder="Es. 20000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chilometraggio Max (km)</label>
            <input 
              type="number" 
              placeholder="Es. 100000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              value={filters.mileageMax || ''}
              onChange={(e) => handleFilterChange('mileageMax', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Venditore</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                value={filters.sellerType}
                onChange={(e) => handleFilterChange('sellerType', e.target.value)}
              >
                <option value="all">Tutti</option>
                <option value="private">Privato</option>
                <option value="dealer">Concessionario</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ordina per</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="relevance">Rilevanza</option>
                <option value="price_asc">Prezzo crescente</option>
                <option value="price_desc">Prezzo decrescente</option>
                <option value="date_desc">Più recenti</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!hasSearched) {
    return (
      <div className="w-full max-w-md mx-auto">
        <FilterSection />
        <button
          onClick={handleSearchClick}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <Search size={20} />
          Cerca annunci simili sul web
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={32} className="text-gray-400" />
        <p className="text-gray-600 font-medium">Nessun portale trovato o errore nella ricerca.</p>
        <button
          onClick={handleSearchClick}
          className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <FilterSection />
      <div className="flex items-center justify-between px-2 mb-4">
        <h3 className="text-xl font-bold text-gray-900">Annunci sul web</h3>
        <Tooltip content="Aggiorna risultati" position="top">
          <button 
            onClick={handleSearchClick}
            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            <RefreshCcw size={14} /> Aggiorna
          </button>
        </Tooltip>
      </div>
      <p className="text-sm text-gray-500 px-2 mb-4">
        Annunci trovati sul web per veicoli simili.
      </p>
      <div className="space-y-4">
        {listings.map((listing, i) => (
          <a
            key={i}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 group overflow-hidden flex flex-col"
          >
            {listing.imageUrl && listing.imageUrl !== "" && (
              <div className="w-full h-56 bg-gray-100 relative overflow-hidden border-b border-gray-100">
                <img 
                  src={listing.imageUrl} 
                  alt={listing.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Nascondi l'immagine se fallisce il caricamento
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}
            
            <div className="p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-start gap-4 mb-3">
                <h4 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-xl leading-snug line-clamp-2">
                  {listing.title}
                </h4>
                <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 transition-colors shrink-0 border border-gray-100 group-hover:border-blue-200">
                  <ExternalLink size={18} className="text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>

              {(listing.price || listing.mileage) && (
                <div className="mb-3 flex flex-wrap items-baseline gap-3">
                  {listing.price && (
                    <span className="text-2xl font-black text-blue-600 tracking-tight">
                      {listing.price}
                    </span>
                  )}
                  {listing.mileage && (
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                      {listing.mileage}
                    </span>
                  )}
                </div>
              )}

              <p className="text-gray-600 text-sm mb-5 line-clamp-3">
                {listing.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${
                  listing.source.toLowerCase().includes('autoscout') ? 'bg-yellow-100 text-yellow-800' : 
                  listing.source.toLowerCase().includes('subito') ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {listing.source}
                </span>
                <Tooltip content="Apri annuncio" position="top">
                  <span className="text-sm text-blue-700 font-bold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Apri sito <ExternalLink size={14} />
                  </span>
                </Tooltip>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
