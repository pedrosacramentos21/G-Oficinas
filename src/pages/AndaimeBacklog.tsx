import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Calendar, User, Clock, CheckCircle2, MapPin, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

const COLUMNS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades e Meio Ambiente'
];

const GET_LIMIT = (column: string) => {
  if (column.includes('Processo')) return 10;
  if (column.includes('Packaging')) return 4;
  if (column.includes('Utilidades')) return 3;
  return 999;
};

interface Props {
  onCardClick?: (andaime: any) => void;
}

export default function AndaimeBacklog({ onCardClick }: Props) {
  const { andaimes, fetchAndaimes } = useStore();

  useEffect(() => {
    fetchAndaimes();
  }, []);

  return (
    <div className="min-h-full h-auto flex flex-col gap-4 md:gap-6 lg:gap-8 animate-in fade-in duration-500 overflow-visible">
      <div className="shrink-0">
        <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">BACKLOG DE ANDAIMES</h1>
        <p className="text-[10px] md:text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest">Gestão de solicitações por área operacional</p>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {COLUMNS.map(column => {
          const points = andaimes
            .filter(a => {
              if (a.esconder_no_backlog) return false;
              const isDesmontagem = a.tipo_servico === 'Desmontagem';
              if (isDesmontagem) return false;
              
              if (column === 'Packaging, Bblend e Xaroparia') {
                return (a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia') && a.status === 'aprovado';
              }
              return a.area === column && a.status === 'aprovado';
            })
            .reduce((sum, a) => sum + a.quantidade_pontos, 0);
          
          const limit = GET_LIMIT(column);
          const isOverLimit = points >= limit;
          
          return (
            <div key={column} className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 flex justify-between items-center">
              <div className="space-y-1 min-w-0">
                <h3 className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight truncate">{column}</h3>
                <p className={cn(
                  "text-lg md:text-2xl font-black leading-none",
                  isOverLimit ? "text-red-600" : "text-slate-900"
                )}>{points}</p>
              </div>
              <div className={cn(
                "p-2 md:p-3 rounded-lg md:rounded-xl shrink-0",
                isOverLimit ? "bg-red-50" : "bg-blue-50"
              )}>
                <MapPin className={cn(isOverLimit ? "text-red-500" : "text-ambev-blue", "md:w-[18px] md:h-[18px]")} size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-auto flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 custom-scrollbar">
        {COLUMNS.map(column => (
          <div key={column} className="flex flex-col gap-3 md:gap-4 bg-gray-100/50 p-3 md:p-4 rounded-[1.25rem] md:rounded-[2rem] border border-gray-200/50 min-h-[300px] lg:h-auto w-full lg:w-1/3 shrink-0 lg:shrink">
            <div className="flex items-center justify-between px-2 md:px-4 py-1 md:py-2 shrink-0">
              <h2 className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] truncate mr-2">{column}</h2>
              <span className="bg-white text-gray-900 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-sm shrink-0">
                {andaimes.filter(a => {
                  if (a.esconder_no_backlog) return false;
                  if (column === 'Packaging, Bblend e Xaroparia') {
                    return a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia';
                  }
                  return a.area === column;
                }).length}
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar space-y-2 md:space-y-4">
              {andaimes
                .filter(a => {
                  if (a.esconder_no_backlog) return false;
                  if (column === 'Packaging, Bblend e Xaroparia') {
                    return a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia';
                  }
                  return a.area === column;
                })
                .map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => onCardClick?.(item)}
                    className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all group relative overflow-visible cursor-pointer active:scale-[0.98]"
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 md:w-1.5",
                      item.status === 'aprovado' ? "bg-green-500" : "bg-ambev-blue"
                    )} />
                    
                    {/* Popover de Detalhes */}
                    <div className="details-on-hover">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                        <div className="bg-ambev-blue p-1.5 rounded-lg">
                          <Layers className="text-ambev-gold w-4 h-4" />
                        </div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Detalhes do Andaime</h3>
                      </div>

                      <div className="info-grid">
                        <div>
                          <span className="label">Quantidade de Pontos</span>
                          <p className="text-ambev-blue font-black text-lg">{item.quantidade_pontos}</p>
                        </div>
                        <div>
                          <span className="label">Local / Setor</span>
                          <p>{item.local_setor}</p>
                        </div>
                        <div>
                          <span className="label">Tipo de Serviço</span>
                          <p className="uppercase font-black text-[10px]">{item.tipo_servico}</p>
                        </div>
                        <div>
                          <span className="label">Solicitante</span>
                          <p>{item.solicitante}</p>
                        </div>
                        <div>
                          <span className="label">Data Montagem</span>
                          <p>{new Date(item.data_montagem).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="label">Data Desmontagem</span>
                          <p>{item.data_desmontagem ? new Date(item.data_desmontagem).toLocaleDateString('pt-BR') : 'N/A'}</p>
                        </div>
                      </div>

                      {item.descricao_local && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                          <span className="label">Descrição do Local</span>
                          <p className="text-[11px] italic text-slate-600 leading-relaxed">{item.descricao_local}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 md:space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 md:space-y-1 min-w-0">
                          <h3 className="font-black text-gray-900 text-xs md:text-sm leading-tight group-hover:text-ambev-blue transition-colors uppercase truncate">
                            {item.local_setor}
                          </h3>
                          <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.tipo_servico}</p>
                        </div>
                        {item.status === 'aprovado' ? (
                          <CheckCircle2 size={14} className="text-green-500 shrink-0 md:w-4 md:h-4" />
                        ) : (
                          <Clock size={14} className="text-ambev-blue shrink-0 md:w-4 md:h-4" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <User size={10} className="md:w-3 md:h-3" />
                          <span className="truncate uppercase">{item.solicitante}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <Calendar size={10} className="md:w-3 md:h-3" />
                          <span>{item.data_montagem}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <Clock size={10} className="md:w-3 md:h-3" />
                          <span>{item.hora_inicio} - {item.hora_fim}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <MapPin size={10} className="md:w-3 md:h-3" />
                          <span className="truncate uppercase">Pts: {item.quantidade_pontos}</span>
                        </div>
                      </div>

                      {item.descricao_local && (
                        <p className="text-[8px] md:text-[10px] text-gray-500 font-medium line-clamp-2 bg-gray-50 p-1.5 md:p-2 rounded-lg italic">
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
