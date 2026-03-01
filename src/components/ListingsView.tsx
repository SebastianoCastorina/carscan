import React from 'react';
import { Listing } from '../services/geminiService';
import { ExternalLink, Search, AlertCircle, ArrowRight } from 'lucide-react';

interface ListingsViewProps {
  listings: Listing[];
  isLoading: boolean;
  onSearch: () => void;
  hasSearched: boolean;
}

export function ListingsView({ listings, isLoading, onSearch, hasSearched }: ListingsViewProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Generazione link di ricerca...</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="w-full max-w-md mx-auto">
        <button
          onClick={onSearch}
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
          onClick={onSearch}
          className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <h3 className="text-xl font-bold text-gray-900 px-2">Cerca sui portali</h3>
      <p className="text-sm text-gray-500 px-2 mb-4">
        I link diretti ti portano alle ricerche live, garantendo che gli annunci siano sempre attivi e aggiornati.
      </p>
      <div className="space-y-4">
        {listings.map((listing, i) => (
          <a
            key={i}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start gap-4 mb-2">
              <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg leading-tight">
                {listing.title}
              </h4>
              <ExternalLink size={20} className="text-gray-400 group-hover:text-blue-500 shrink-0 mt-0.5" />
            </div>

            <p className="text-gray-600 text-sm mb-4">
              {listing.description}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                listing.source === 'AutoScout24' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
              }`}>
                {listing.source}
              </span>
              <span className="text-sm text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
                Apri ricerca <ArrowRight size={16} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
