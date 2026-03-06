import React from 'react';
import { motion } from 'motion/react';
import { CarDetails } from '../services/aiService';
import { 
  Calendar, 
  Fuel, 
  Settings, 
  Zap, 
  Info, 
  ShieldCheck, 
  Car, 
  Activity,
  Euro,
  Palette,
  Hash,
  Sparkles,
  Gauge,
  FileText
} from 'lucide-react';

interface CarDetailsCardProps {
  details: CarDetails;
}

export function CarDetailsCard({ details }: CarDetailsCardProps) {
  const isNotAvailable = (val: string | null | undefined) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return lower.includes("non disponibile") || 
           lower.includes("non identificabile") || 
           lower.includes("non visibile") ||
           lower === "null";
  };

  const specs = [
    { icon: <Calendar size={18} />, label: 'Anno', value: details.year, color: 'text-blue-500', show: !isNotAvailable(details.year) },
    { icon: <Fuel size={18} />, label: 'Alimentazione', value: details.fuelType, color: 'text-emerald-500', show: !isNotAvailable(details.fuelType) },
    { icon: <Settings size={18} />, label: 'Cambio', value: details.transmission, color: 'text-orange-500', show: !isNotAvailable(details.transmission) },
    { icon: <Zap size={18} />, label: 'Potenza', value: details.horsepower, color: 'text-yellow-500', show: !isNotAvailable(details.horsepower) },
    { icon: <Gauge size={18} />, label: 'Motore', value: details.engine, color: 'text-purple-500', show: !isNotAvailable(details.engine) },
    { icon: <Activity size={18} />, label: 'Classe', value: details.euroClass, color: 'text-cyan-500', show: !isNotAvailable(details.euroClass) },
    { icon: <Palette size={18} />, label: 'Colore', value: details.color, color: 'text-pink-500', show: !isNotAvailable(details.color) },
    { icon: <FileText size={18} />, label: 'Bollo', value: details.bollo, color: 'text-indigo-500', show: !isNotAvailable(details.bollo) },
    { icon: <Euro size={18} />, label: 'Valore', value: details.estimatedValue, color: 'text-green-500', show: !isNotAvailable(details.estimatedValue) },
  ].filter(s => s.show);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Hero Section */}
      <div className="bg-card p-8 rounded-[2.5rem] shadow-2xl border border-border/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 flex items-center gap-1.5">
              <Sparkles size={10} />
              Analisi Completata
            </div>
            {details.licensePlate && !isNotAvailable(details.licensePlate) && (
              <div className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-border flex items-center gap-1.5">
                <Hash size={10} />
                {details.licensePlate.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-4xl font-black tracking-tighter leading-none mb-2 glow-text">
            {details.make} <span className="text-primary">{details.model}</span>
          </h2>
          <p className="text-muted-foreground text-lg font-bold tracking-tight mb-8">
            {details.series} {!isNotAvailable(details.year) && `• ${details.year}`}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {specs.map((spec, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-background/50 backdrop-blur-sm p-4 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group/item"
              >
                <div className={`${spec.color} mb-2 transition-transform group-hover/item:scale-110`}>
                  {spec.icon}
                </div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{spec.label}</div>
                <div className="font-bold text-sm truncate">{spec.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Info Bento */}
      <div className="grid grid-cols-1 gap-4">
        {details.technicalNotes && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card p-6 rounded-3xl border border-border/50 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4 text-primary">
              <Info size={20} />
              <h3 className="font-black text-sm uppercase tracking-widest">Note Tecniche</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {details.technicalNotes}
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 shadow-xl"
          >
            <div className="text-emerald-500 mb-3">
              <ShieldCheck size={24} />
            </div>
            <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Stato Revisione</div>
            <div className="font-black text-emerald-600">Regolare</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-primary/10 p-6 rounded-3xl border border-primary/20 shadow-xl"
          >
            <div className="text-primary mb-3">
              <Car size={24} />
            </div>
            <div className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1">Carrozzeria</div>
            <div className="font-black text-primary truncate">{details.bodyType || 'N/D'}</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
