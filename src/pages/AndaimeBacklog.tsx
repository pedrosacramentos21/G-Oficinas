import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Calendar, User, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

const COLUMNS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades e Meio Ambiente'
];

export default function AndaimeBacklog() {
  const { andaimes, fetchAndaimes } = useStore();

  useEffect(() => {
    fetchAndaimes();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">BACKLOG DE ANDAIMES</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Gestão de solicitações por área operacional</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(column => {
          const points = andaimes
            .filter(a => a.area === column && a.status === 'aprovado')
            .reduce((sum, a) => sum + a.quantidade_pontos, 0);
          
          return (
            <div key={column} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{column}</h3>
                <p className="text-2xl font-black text-slate-900 leading-none">{points}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <MapPin className="text-orange-500" size={20} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {COLUMNS.map(column => (
          <div key={column} className="flex flex-col gap-4 bg-gray-100/50 p-4 rounded-[2rem] border border-gray-200/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{column}</h2>
              <span className="bg-white text-gray-900 text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                {andaimes.filter(a => a.area === column).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {andaimes
                .filter(a => a.area === column)
                .map(item => (
                  <div 
                    key={item.id} 
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1.5",
                      item.status === 'aprovado' ? "bg-green-500" : "bg-orange-500"
                    )} />
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-black text-gray-900 text-sm leading-tight group-hover:text-orange-500 transition-colors uppercase">
                            {item.local_setor}
                          </h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.tipo_servico}</p>
                        </div>
                        {item.status === 'aprovado' ? (
                          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        ) : (
                          <Clock size={16} className="text-orange-500 shrink-0" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <User size={12} />
                          <span className="truncate uppercase">{item.solicitante}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <Calendar size={12} />
                          <span>{item.data_montagem}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <Clock size={12} />
                          <span>{item.hora_inicio} - {item.hora_fim}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <MapPin size={12} />
                          <span className="truncate uppercase">Pts: {item.quantidade_pontos}</span>
                        </div>
                      </div>

                      {item.descricao_local && (
                        <p className="text-[10px] text-gray-500 font-medium line-clamp-2 bg-gray-50 p-2 rounded-lg italic">
                          "{item.descricao_local}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
