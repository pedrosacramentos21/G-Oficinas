import React from 'react';
import { NavLink } from 'react-router-dom';
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
  LayoutDashboard
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

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#1e293b] text-white flex flex-col shadow-2xl z-50">
      <div className="p-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Construction className="text-orange-500" />
          G-Oficinas
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        {menuItems.map((group) => (
          <div key={group.group} className="mb-8 px-4">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 px-2">
              {group.group}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group",
                    isActive 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 translate-x-1" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon size={18} className={cn(
                    "transition-colors",
                    "group-hover:text-orange-500"
                  )} />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-xs">
            <p className="font-bold text-gray-400 uppercase tracking-tighter">ONLINE</p>
            <p className="text-[10px] text-gray-500">v4.5</p>
          </div>
        </div>
      </div>
    </div>
  );
}
