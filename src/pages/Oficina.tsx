import React from 'react';
import { Wrench } from 'lucide-react';

export default function Oficina() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 animate-in fade-in duration-500">
      <div className="bg-gray-100 p-8 rounded-full">
        <Wrench size={48} />
      </div>
      <p className="font-black uppercase tracking-widest text-sm text-center">
        Oficina<br/>
        <span className="text-[10px] font-bold opacity-50">Módulo em Desenvolvimento</span>
      </p>
    </div>
  );
}
