import React from 'react';
import { CarDetails } from '../services/geminiService';
import { Car, Calendar, Settings, FileText, AlertTriangle, Hash } from 'lucide-react';

interface CarDetailsCardProps {
  details: CarDetails;
}

export function CarDetailsCard({ details }: CarDetailsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 w-full max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Car size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{details.make} {details.model}</h2>
          <p className="text-gray-500 font-medium">{details.series}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Calendar size={16} />
            <span>Anno stimato</span>
          </div>
          <p className="font-semibold text-gray-900">{details.year}</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Settings size={16} />
            <span>Motore</span>
          </div>
          <p className="font-semibold text-gray-900">{details.engine}</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FileText size={16} />
            <span>Bollo stimato</span>
          </div>
          <p className="font-semibold text-gray-900">{details.bollo}</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <AlertTriangle size={16} />
            <span>Superbollo</span>
          </div>
          <p className="font-semibold text-gray-900">{details.superbollo}</p>
        </div>
      </div>

      {details.licensePlate && details.licensePlate !== "Non disponibile" && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Hash size={16} />
            <span>Targa rilevata</span>
          </div>
          <div className="bg-yellow-400 text-black font-mono font-bold px-4 py-1 rounded-md border-2 border-black shadow-sm tracking-widest">
            {details.licensePlate.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
