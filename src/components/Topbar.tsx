import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();
  
  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('andaimes')) return 'ANDAIMES';
    if (path.includes('oficina')) return 'OFICINA';
    if (path.includes('ptas')) return 'PTAs';
    if (path.includes('sala-motores')) return 'SALA DE MOTORES';
    if (path.includes('rec')) return 'REC (USINAGEM)';
    if (path.includes('refrigeracao')) return 'REFRIGERAÇÃO';
    if (path.includes('armstrong')) return 'ARMSTRONG (VAPOR)';
    if (path.includes('sala-placas')) return 'SALA DE PLACAS';
    if (path.includes('nr10')) return 'SEGURANÇA NR10';
    if (path.includes('nr13')) return 'SEGURANÇA NR13';
    return 'DASHBOARD';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 sticky top-0 z-40">
      <h2 className="text-sm font-black text-gray-900 tracking-[0.2em] uppercase">
        {getTitle()}
      </h2>
    </header>
  );
}
