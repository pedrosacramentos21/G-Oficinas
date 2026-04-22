import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Calendar, User, Clock, CheckCircle2, MapPin, Layers, ChevronDown, ListCheck, Settings2 } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

const COLUMNS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades',
  'Meio Ambiente'
];

const GET_LIMIT = (column: string) => {
  if (column.includes('Processo')) return 10;
  if (column.includes('Packaging')) return 4;
  if (column.includes('Utilidades')) return 3;
  if (column.includes('Meio Ambiente')) return 3;
  return 999;
};

const STATUS_EXECUCAO_OPTIONS = [
  'Pendente',
  'Em andamento',
  'Concluído'
] as const;

const STATUS_COLORS: Record<string, string> = {
  'Pendente': 'text-amber-600 bg-amber-50 border-amber-200',
  'Em andamento': 'text-orange-600 bg-orange-50 border-orange-200',
  'Concluído': 'text-green-600 bg-green-50 border-green-200'
};

interface Props {
  onCardClick?: (andaime: any) => void;
  onAdjustBacklog?: () => void;
}

export default function AndaimeBacklog({ onCardClick, onAdjustBacklog }: Props) {
  const { andaimes, fetchAndaimes, updateStatusExecucaoAndaime } = useStore();
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    fetchAndaimes();
  }, []);

  const handleStatusChange = async (e: React.MouseEvent, id: number, status: string) => {
    e.stopPropagation();
    try {
      await updateStatusExecucaoAndaime(id, status);
      setOpenDropdownId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-full h-auto flex flex-col gap-4 md:gap-6 lg:gap-8 animate-in fade-in duration-500 overflow-visible">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">BACKLOG DE ANDAIMES</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest">Gestão de solicitações por área operacional</p>
        </div>
        <button
          onClick={onAdjustBacklog}
          className="flex items-center gap-2 bg-ambev-blue text-white font-black px-4 py-2.5 rounded-xl shadow-lg shadow-ambev-blue/20 hover:bg-ambev-blue/90 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
        >
          <Settings2 size={16} />
          Ajustar Backlog
        </button>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
          const percentage = Math.min((points / limit) * 100, 100);
          
          return (
            <div key={column} className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight truncate">{column}</h3>
                  <div className="flex items-baseline gap-1">
                    <p className={cn(
                      "text-lg md:text-2xl font-black leading-none",
                      isOverLimit ? "text-red-600" : "text-slate-900"
                    )}>{points}</p>
                    <span className="text-[8px] md:text-[10px] font-bold text-slate-400">/ {limit}</span>
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  isOverLimit ? "bg-red-50" : "bg-blue-50"
                )}>
                  <MapPin className={cn(isOverLimit ? "text-red-500" : "text-ambev-blue")} size={14} />
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    isOverLimit ? "bg-red-500" : "bg-ambev-blue"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-[1000px] lg:min-w-0 h-full">
          {COLUMNS.map(column => (
            <div key={column} className="flex flex-col gap-3 md:gap-4 bg-gray-100/50 p-3 md:p-4 rounded-[1.25rem] md:rounded-[2rem] border border-gray-200/50 h-full min-h-[400px]">
            <div className="flex items-center justify-between px-2 md:px-4 py-1 md:py-2 shrink-0">
              <h2 className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] truncate mr-2">{column}</h2>
              <span className="bg-white text-gray-900 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-sm shrink-0">
                {andaimes.filter(a => {
                  if (a.esconder_no_backlog || a.tipo_servico === 'Desmontagem') return false;
                  if (column === 'Packaging, Bblend e Xaroparia') {
                    return a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia';
                  }
                  return a.area === column;
                }).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar space-y-2 md:space-y-4">
              {andaimes
                .filter(a => {
                  if (a.esconder_no_backlog || a.tipo_servico === 'Desmontagem') return false;
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
                      {/* Execution Status Button */}
                      <div className="absolute -top-2 -right-1 z-20 flex flex-col items-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                          }}
                          className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm hover:bg-slate-50 transition-all text-slate-400 group-hover:text-slate-600"
                        >
                          <ChevronDown size={14} className={cn("transition-transform", openDropdownId === item.id && "rotate-180")} />
                        </button>
                        
                        {openDropdownId === item.id && (
                          <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1 w-48 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                            {STATUS_EXECUCAO_OPTIONS.map(status => (
                              <button
                                key={status}
                                onClick={(e) => handleStatusChange(e, item.id, status)}
                                className={cn(
                                  "text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50",
                                  STATUS_COLORS[status]
                                )}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 md:w-1.5",
                      item.status === 'aprovado' ? "bg-green-500" : (item.excedeu_limite ? "bg-red-500" : "bg-ambev-blue")
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
                          <p>{formatDate(item.data_montagem)}</p>
                        </div>
                        <div>
                          <span className="label">Data Desmontagem</span>
                          <p>{item.data_desmontagem ? formatDate(item.data_desmontagem) : 'N/A'}</p>
                        </div>
                      </div>

                      {item.excedeu_limite && (
                        <div className="mt-2 pt-2 border-t border-red-100">
                          <span className="label text-red-600">Justificativa de Excesso</span>
                          <p className="text-[11px] italic text-red-500 leading-relaxed">"{item.justificativa_excesso}"</p>
                        </div>
                      )}

                      {item.descricao_local && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                          <span className="label">Descrição do Local</span>
                          <p className="text-[11px] italic text-slate-600 leading-relaxed">{item.descricao_local}</p>
                        </div>
                      )}
                    </div>

                      <div className="space-y-2 md:space-y-4">
                        <div className="flex items-start justify-between gap-2 overflow-visible">
                          <div className="space-y-0.5 md:space-y-1 min-w-0">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {item.status_execucao && (
                                <span className={cn("text-[6px] md:text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-widest leading-none", STATUS_COLORS[item.status_execucao])}>
                                  {item.status_execucao}
                                </span>
                              )}
                              {item.somente_backlog && (
                                <span className="text-[6px] md:text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-widest leading-none">
                                  Ajuste Backlog
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-gray-900 text-xs md:text-sm leading-tight group-hover:text-ambev-blue transition-colors uppercase truncate">
                              {item.local_setor}
                            </h3>
                          <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.tipo_servico}</p>
                        </div>
                        {item.status === 'aprovado' ? (
                          <CheckCircle2 size={14} className="text-green-500 shrink-0 md:w-4 md:h-4" />
                        ) : (
                          item.excedeu_limite ? (
                            <div className="bg-red-500 text-white text-[6px] font-black px-1 rounded-sm animate-pulse uppercase">Excedente</div>
                          ) : (
                            <Clock size={14} className="text-ambev-blue shrink-0 md:w-4 md:h-4" />
                          )
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <User size={10} className="md:w-3 md:h-3" />
                          <span className="truncate uppercase">{item.solicitante}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                          <Calendar size={10} className="md:w-3 md:h-3" />
                          <span>{formatDate(item.data_montagem)}</span>
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

                      {item.excedeu_limite && item.justificativa_excesso && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-[6px] md:text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">Justificativa:</p>
                          <p className="text-[7px] md:text-[9px] font-medium text-red-500 italic line-clamp-1">"{item.justificativa_excesso}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
