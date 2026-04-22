import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { 
  Construction, 
  Wrench, 
  Cpu, 
  Thermometer, 
  Flame, 
  Zap, 
  Monitor, 
  ShieldCheck, 
  ShieldAlert,
  Truck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { group: 'OPERACIONAL', items: [
    { name: 'Oficina', path: '/oficina', icon: Wrench },
    { name: 'Andaimes', path: '/andaimes', icon: Construction },
    { name: 'PTAs', path: '/ptas', icon: Truck },
    { name: 'REC (Usinagem)', path: '/rec', icon: Cpu },
  ]},
  { group: 'ESPECIALIDADES', items: [
    { name: 'Refrigeração', path: '/refrigeracao', icon: Thermometer },
    { name: 'Armstrong (Vapor)', path: '/armstrong', icon: Flame },
    { name: 'Sala de Motores', path: '/sala-motores', icon: Zap },
    { name: 'Sala de Placas', path: '/sala-placas', icon: Monitor },
  ]},
  { group: 'SEGURANÇA (NRS)', items: [
    { name: 'Segurança NR10', path: '/nr10', icon: ShieldCheck },
    { name: 'Segurança NR13', path: '/nr13', icon: ShieldAlert },
  ]}
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onCloseMobile }: SidebarProps) {
  const { 
    andaimes, 
    ptas, 
    salaMotores, 
    refrigeracaoBacklog, 
    armstrongBacklog,
    fetchAndaimes,
    fetchPTAs,
    fetchSalaMotores,
    fetchRefrigeracao,
    fetchArmstrong
  } = useStore();

  useEffect(() => {
    fetchAndaimes();
    fetchPTAs();
    fetchSalaMotores();
    fetchRefrigeracao();
    fetchArmstrong();
  }, [fetchAndaimes, fetchPTAs, fetchSalaMotores, fetchRefrigeracao, fetchArmstrong]);

  const getPendingCount = (path: string) => {
    switch (path) {
      case '/andaimes':
        return andaimes.filter(a => a.status === 'pendente').length;
      case '/ptas':
        return ptas.filter(p => p.status === 'pendente').length;
      case '/sala-motores':
        return salaMotores.filter(s => s.status === 'pendente').length;
      case '/refrigeracao':
        return refrigeracaoBacklog.filter(b => b.status !== 'Concluída').length;
      case '/armstrong':
        return armstrongBacklog.filter(b => b.status !== 'Concluída').length;
      default:
        return 0;
    }
  };

  return (
    <div className={cn(
      "h-screen bg-ambev-blue text-white flex flex-col shadow-2xl transition-all duration-300 relative",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className={cn(
        "p-6 border-b border-white/10 flex items-center justify-between overflow-hidden relative bg-black/10",
        collapsed && "px-0 justify-center"
      )}>
        <h1 className={cn(
          "text-xl font-black text-white flex items-center gap-2 transition-all duration-300 tracking-tighter",
          collapsed ? "opacity-0 w-0" : "opacity-100"
        )}>
          <div className="w-8 h-8 bg-ambev-gold rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-ambev-gold/20">
            <Construction className="text-ambev-blue" size={20} />
          </div>
          <span className="truncate uppercase italic">Ambev <span className="text-ambev-gold">Ops</span></span>
        </h1>
        
        {/* Toggle Button - Desktop */}
        <button 
          onClick={onToggle}
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ambev-gold text-ambev-blue rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-50 hidden lg:flex",
            collapsed && "right-7"
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Close Button - Mobile */}
        <button 
          onClick={onCloseMobile}
          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        {menuItems.map((group) => (
          <div key={group.group} className={cn("mb-8 px-4", collapsed && "px-0")}>
            <h2 className={cn(
              "text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 px-2 transition-all duration-300",
              collapsed ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100"
            )}>
              {group.group}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative",
                    isActive 
                      ? "bg-ambev-gold text-ambev-blue shadow-lg shadow-ambev-gold/20 translate-x-1" 
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                    collapsed && "justify-center px-0 rounded-none translate-x-0"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon size={18} className={cn(
                    "transition-colors shrink-0",
                    "group-hover:text-ambev-gold"
                  )} />
                  <span className={cn(
                    "transition-all duration-300 truncate",
                    collapsed ? "opacity-0 w-0" : "opacity-100"
                  )}>
                    {item.name}
                  </span>
                  {getPendingCount(item.path) > 0 && (
                    <span className={cn(
                      "absolute bg-ambev-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-ambev-red/20 transition-all duration-300",
                      collapsed ? "right-2 top-2" : "right-4"
                    )}>
                      {getPendingCount(item.path)}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={cn(
        "p-6 border-t border-white/10 bg-black/20 transition-all duration-300",
        collapsed ? "items-center justify-center p-4" : ""
      )}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
          <div className={cn(
            "text-xs transition-all duration-300",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <p className="font-black text-white/50 uppercase tracking-tighter">SISTEMA ATIVO</p>
            <p className="text-[10px] text-ambev-gold font-bold">UNIDADE CERVEJARIA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
