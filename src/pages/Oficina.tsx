import React from 'react';
import { Wrench } from 'lucide-react';

export default function Oficina() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 md:space-y-6 animate-in fade-in duration-500 p-4 bg-[#f4f7f9]">
      <div className="bg-ambev-blue p-6 md:p-8 rounded-full shadow-xl shadow-ambev-blue/20">
        <Wrench size={32} className="md:w-12 md:h-12 text-ambev-gold" />
      </div>
      <div className="text-center space-y-1 md:space-y-2">
        <p className="font-black uppercase tracking-widest text-xs md:text-sm text-slate-900">
          Oficina
        </p>
        <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Módulo em Desenvolvimento
        </p>
      </div>
    </div>
  );
}
