import React from 'react';
import { Wrench } from 'lucide-react';

export default function Oficina() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 md:space-y-6 animate-in fade-in duration-500 p-4">
      <div className="bg-gray-100 p-6 md:p-8 rounded-full">
        <Wrench size={32} className="md:w-12 md:h-12" />
      </div>
      <div className="text-center space-y-1 md:space-y-2">
        <p className="font-black uppercase tracking-widest text-xs md:text-sm">
          Oficina
        </p>
        <p className="text-[8px] md:text-[10px] font-bold opacity-50 uppercase tracking-widest">
          Módulo em Desenvolvimento
        </p>
      </div>
    </div>
  );
}
