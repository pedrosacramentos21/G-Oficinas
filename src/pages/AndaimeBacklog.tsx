import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Calendar, User, Clock, CheckCircle2, MapPin, Layers, ChevronDown, ListCheck, Settings2 } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

import { AREAS, STATUS_EXECUCAO_OPTIONS, STATUS_COLORS, GET_LIMIT } from '../constants/andaimes';

const COLUMNS = AREAS;

interface Props {
  onCardClick?: (andaime: any) => void;
  onAdjustBacklog?: () => void;
  onMoveCard?: (id: number, newArea: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: number[];
  onToggleSelection?: (id: number) => void;
}

export default function AndaimeBacklog({ 
  onCardClick, 
  onAdjustBacklog,
  onMoveCard,
  isSelectionMode = false,
  selectedIds = [],
  onToggleSelection
}: Props) {
  const { andaimes, fetchAndaimes, updateStatusExecucaoAndaime } = useStore();
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    fetchAndaimes();
    const interval = setInterval(fetchAndaimes, 30000); // Add polling to backlog too
    return () => clearInterval(interval);
  }, [fetchAndaimes]);

  const handleStatusChange = async (e: React.MouseEvent, id: number, status: string) => {
    e.stopPropagation();
    try {
      await updateStatusExecucaoAndaime(id, status);
      setOpenDropdownId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDragStart = (id: number) => {
    if (isSelectionMode) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedId !== null && onMoveCard) {
      const item = andaimes.find(a => a.id === draggedId);
      if (item && item.area !== column) {
        onMoveCard(draggedId, column);
      }
    }
    setDraggedId(null);
  };

  const totalPoints = andaimes
    .filter(a => {
      if (a.esconder_no_backlog) return false;
      const isDesmontagem = a.tipo_servico === 'Desmontagem';
      if (isDesmontagem) return false;
      return a.status === 'aprovado' && a.status_execucao === 'Concluído';
    })
    .reduce((sum, a) => sum + (a.quantidade_pontos || 0), 0);

  const getDaysMountedText = (dataMontagem: string) => {
    if (!dataMontagem) return null;
    try {
      const datePart = dataMontagem.split('T')[0];
      const montagemDate = new Date(datePart + 'T00:00:00');
      const today = new Date();
      
      montagemDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - montagemDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        return {
          text: `Agendado em ${absDays} ${absDays === 1 ? 'dia' : 'dias'}`,
          color: 'text-sky-600 bg-sky-50/50 border-sky-100',
        };
      } else if (diffDays === 0) {
        return {
          text: 'Montado hoje',
          color: 'text-green-600 bg-green-50 border-green-200',
        };
      } else {
        return {
          text: `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} montado`,
          color: diffDays > 15 ? 'text-red-600 bg-red-50 border-red-200 font-extrabold animate-pulse' : 'text-slate-600 bg-slate-50 border-slate-200',
        };
      }
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="min-h-full h-auto flex flex-col gap-4 md:gap-6 lg:gap-8 animate-in fade-in duration-500 overflow-visible">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-8">
          <div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">BACKLOG DE ANDAIMES</h1>
            <p className="text-[9px] md:text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">Gestão de solicitações por área operacional</p>
          </div>
          
          {/* Somatório Total de Pontos Ativos/Montados (Green Rectangle region) */}
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 p-2 px-4 rounded-xl">
            <div className="bg-green-600 text-white p-1 rounded-lg shrink-0 shadow-sm">
              <Layers size={14} />
            </div>
            <div>
              <p className="text-[7px] font-black text-green-700 uppercase tracking-widest leading-none">Soma Total Pontos Montados</p>
              <p className="text-sm md:text-base font-black text-green-900 mt-1 leading-none">
                {totalPoints} <span className="text-[9px] font-bold text-green-600">PTS</span>
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={onAdjustBacklog}
          className="flex items-center justify-center gap-2 bg-ambev-blue text-white font-black px-4 py-2 rounded-xl shadow-lg shadow-ambev-blue/20 hover:bg-ambev-blue/90 transition-all active:scale-[0.98] uppercase tracking-widest text-[9px] cursor-pointer"
        >
          <Settings2 size={14} />
          Ajustar Backlog
        </button>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {COLUMNS.map(column => {
          const points = andaimes
            .filter(a => {
              if (a.esconder_no_backlog) return false;
              const isDesmontagem = a.tipo_servico === 'Desmontagem';
              if (isDesmontagem) return false;
              
              if (column === 'Packaging, Bblend e Xaroparia') {
                return (a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia') && a.status === 'aprovado' && a.status_execucao === 'Concluído';
              }
              return a.area === column && a.status === 'aprovado' && a.status_execucao === 'Concluído';
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

      {/* Legenda de Cores */}
      <div className="shrink-0 bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-2 rounded-xl text-slate-700">
            <ListCheck size={16} />
          </div>
          <div>
            <h4 className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Legenda de Cores</h4>
            <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase mt-1">Guia visual rápido para acompanhamento do backlog</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8 text-[8px] md:text-[9px] w-full lg:w-auto">
          {/* Grupo 1: Status de Execução */}
          <div className="flex flex-col gap-1.5">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[7px] md:text-[8px]">Status de Execução</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-1.5 py-0.5 rounded-full border text-[7px] md:text-[8px] font-black uppercase bg-amber-50 border-amber-200 text-amber-600">Pendente</span>
              <span className="px-1.5 py-0.5 rounded-full border text-[7px] md:text-[8px] font-black uppercase bg-orange-50 border-orange-200 text-orange-600">Em andamento</span>
              <span className="px-1.5 py-0.5 rounded-full border text-[7px] md:text-[8px] font-black uppercase bg-green-50 border-green-200 text-green-600">Concluído</span>
            </div>
          </div>

          {/* Grupo 2: Faixa Lateral */}
          <div className="flex flex-col gap-1.5">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[7px] md:text-[8px]">Aprovação & Capacidade (Faixa)</span>
            <div className="flex flex-wrap gap-2.5 items-center">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-3 rounded-sm bg-green-500 inline-block" />
                <span className="font-black text-slate-600 uppercase tracking-wide text-[7px] md:text-[8px]">Aprovado</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-3 rounded-sm bg-ambev-blue inline-block" />
                <span className="font-black text-slate-600 uppercase tracking-wide text-[7px] md:text-[8px]">Pendente Aprovação</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-3 rounded-sm bg-red-500 inline-block" />
                <span className="font-black text-slate-600 uppercase tracking-wide text-[7px] md:text-[8px]">Excedente</span>
              </span>
            </div>
          </div>

          {/* Grupo 3: Tempo de Uso */}
          <div className="flex flex-col gap-1.5">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[7px] md:text-[8px]">Tempo Montado (Dias)</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-1.5 py-0.5 rounded border text-[7px] md:text-[8px] font-black bg-sky-50/50 border-sky-100 text-sky-600">Agendado</span>
              <span className="px-1.5 py-0.5 rounded border text-[7px] md:text-[8px] font-black bg-green-50 border-green-200 text-green-600">Hoje</span>
              <span className="px-1.5 py-0.5 rounded border text-[7px] md:text-[8px] font-black bg-slate-50 border-slate-200 text-slate-600">&lt;= 15 d</span>
              <span className="px-1.5 py-0.5 rounded border text-[7px] md:text-[8px] font-black bg-red-50 border-red-200 text-red-600 font-extrabold animate-pulse">&gt; 15 d</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 min-w-[1250px] xl:min-w-0 h-fit">
          {COLUMNS.map((column, colIndex) => (
            <div 
              key={column} 
              onDragOver={(e) => handleDragOver(e, column)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column)}
              className={cn(
                "flex flex-col gap-3 md:gap-4 p-3 md:p-4 rounded-[1.25rem] md:rounded-[2rem] border transition-all h-fit min-h-[400px]",
                dragOverColumn === column ? "bg-ambev-blue/5 border-ambev-blue border-dashed ring-4 ring-ambev-blue/10 scale-[1.02]" : "bg-gray-100/50 border-gray-200/50"
              )}
            >
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

            <div className="flex-1 overflow-visible pr-1 md:pr-2 space-y-2 md:space-y-4">
              {andaimes
                .filter(a => {
                  if (a.esconder_no_backlog || a.tipo_servico === 'Desmontagem') return false;
                  if (column === 'Packaging, Bblend e Xaroparia') {
                    return a.area === 'Packaging' || a.area === 'Bblend' || a.area === 'Xaroparia' || a.area === 'Packaging, Bblend e Xaroparia';
                  }
                  return a.area === column;
                })
                .map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (isSelectionMode && onToggleSelection) {
                          onToggleSelection(item.id);
                        } else {
                          onCardClick?.(item);
                        }
                      }}
                      draggable={!isSelectionMode}
                      onDragStart={() => handleDragStart(item.id)}
                      className={cn(
                        "bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border transition-all group relative overflow-visible cursor-pointer active:scale-[0.98]",
                        isSelected ? "ring-2 ring-sky-500 border-sky-200" : "border-gray-200 hover:shadow-md",
                        draggedId === item.id && "opacity-40 grayscale scale-95"
                      )}
                    >
                      {/* Selection indicator */}
                      {isSelectionMode && (
                        <div className="absolute top-2 right-8 z-10">
                          {isSelected ? (
                            <CheckCircle2 size={16} className="text-sky-500" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-300 rounded-full bg-white/50" />
                          )}
                        </div>
                      )}
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
                    <div className={cn("details-on-hover", colIndex >= 3 ? "pop-left" : "pop-right")}>
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
                        {item.created_at && (
                          <div className="col-span-2 mt-1 pt-1 border-t border-slate-100">
                             <span className="label text-slate-400">Solicitado em</span>
                             <p className="text-[10px] text-slate-500 font-black">
                               {new Date(item.created_at).toLocaleString('pt-BR', { 
                                 day: '2-digit', 
                                 month: '2-digit', 
                                 year: 'numeric', 
                                 hour: '2-digit', 
                                 minute: '2-digit' 
                               })}
                             </p>
                          </div>
                        )}
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

                      {/* Display days mounted counter (Red Rectangle region) */}
                      {(() => {
                        const daysInfo = getDaysMountedText(item.data_montagem);
                        if (!daysInfo) return null;
                        return (
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] md:text-[9px] font-black uppercase tracking-wider mt-2 w-fit",
                            daysInfo.color
                          )}>
                            <Clock size={10} className="shrink-0" />
                            <span>{daysInfo.text}</span>
                          </div>
                        );
                      })()}

                      {item.excedeu_limite && item.justificativa_excesso && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-[6px] md:text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">Justificativa:</p>
                          <p className="text-[7px] md:text-[9px] font-medium text-red-500 italic line-clamp-1">"{item.justificativa_excesso}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}
