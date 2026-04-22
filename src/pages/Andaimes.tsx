import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  addMonths, 
  subMonths,
  getDaysInMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, LayoutGrid, Calendar as CalendarIcon, Info, Layers, CheckCircle2, Trash2, ChevronLeft, ChevronRight, User, Clock, CheckCircle, ChevronDown, BarChart3, Construction } from 'lucide-react';
import AndaimeModal from '../components/AndaimeModal';
import PasswordModal from '../components/PasswordModal';
import DeleteChoiceModal from '../components/DeleteChoiceModal';
import AndaimeBacklog from './AndaimeBacklog';
import { cn, formatDate } from '../lib/utils';

const AREAS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades',
  'Meio Ambiente'
];

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

export default function Andaimes() {
  const calendarRef = useRef<FullCalendar>(null);
  const { andaimes, fetchAndaimes, approveAndaime, deleteAndaime, batchDeleteAndaimes, batchApproveAndaimes, updateStatusExecucaoAndaime } = useStore();
  const [activeTab, setActiveTab] = useState<'calendario' | 'backlog' | 'panorama'>('calendario');
  const [currentView, setCurrentView] = useState<string>(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAndaime, setSelectedAndaime] = useState<any>(null);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, id: number | null, ids?: number[], action: 'approve' | 'delete' | 'batch-delete' | 'batch-approve' | 'adjust-backlog', deleteChoice?: 'backlog-only' | 'both' }>({
    isOpen: false,
    id: null,
    action: 'approve'
  });
  const [deleteChoiceModal, setDeleteChoiceModal] = useState<{ isOpen: boolean, id: number | null, ids: number[] | null }>({
    isOpen: false,
    id: null,
    ids: null
  });

  useEffect(() => {
    fetchAndaimes();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchAndaimes]);

  const pendingAndaimes = React.useMemo(() => andaimes.filter(a => a.status === 'pendente'), [andaimes]);

  const toggleSelection = React.useCallback((id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (activeTab === 'backlog') {
      setDeleteChoiceModal({ isOpen: true, id: null, ids: selectedIds });
    } else {
      setPasswordModal({ isOpen: true, id: null, ids: selectedIds, action: 'batch-delete' });
    }
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    setPasswordModal({ isOpen: true, id: null, ids: selectedIds, action: 'batch-approve' });
  };

  const handleAction = async (password: string) => {
    setIsSubmitting(true);
    try {
      if (passwordModal.action === 'adjust-backlog') {
        if (password === 'Itf2026') {
          setPasswordModal({ ...passwordModal, isOpen: false });
          setSelectedAndaime({ somente_backlog: true });
          setIsModalOpen(true);
          return;
        } else {
          throw new Error('Senha incorreta');
        }
      } else if (passwordModal.action === 'batch-delete') {
        if (passwordModal.deleteChoice === 'backlog-only') {
          // Update each to hidden instead of deleting
          for (const id of passwordModal.ids || []) {
            const { updateAndaime } = useStore.getState();
            await updateAndaime(id, { esconder_no_backlog: true }, password);
          }
        } else {
          await batchDeleteAndaimes(passwordModal.ids || selectedIds, password);
        }
        setSelectedIds([]);
        setIsSelectionMode(false);
      } else if (passwordModal.action === 'batch-approve') {
        await batchApproveAndaimes(passwordModal.ids || selectedIds, password);
        setSelectedIds([]);
        setIsSelectionMode(false);
      } else if (passwordModal.id !== null) {
        if (passwordModal.action === 'approve') {
          await approveAndaime(passwordModal.id, password);
        } else if (passwordModal.action === 'delete') {
          if (passwordModal.deleteChoice === 'backlog-only') {
            const { updateAndaime } = useStore.getState();
            await updateAndaime(passwordModal.id, { esconder_no_backlog: true }, password);
          } else {
            await deleteAndaime(passwordModal.id, password);
          }
        }
      }
      setPasswordModal({ ...passwordModal, isOpen: false, deleteChoice: undefined });
      setIsModalOpen(false);
      fetchAndaimes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteChoice = (choice: 'backlog-only' | 'both') => {
    const isBatch = deleteChoiceModal.ids !== null;
    setDeleteChoiceModal({ ...deleteChoiceModal, isOpen: false });
    setPasswordModal({ 
      isOpen: true, 
      id: deleteChoiceModal.id, 
      ids: deleteChoiceModal.ids || undefined,
      action: isBatch ? 'batch-delete' : 'delete',
      deleteChoice: choice
    });
  };

  const pointsPerArea = React.useMemo(() => AREAS.map(area => ({
    name: area,
    points: andaimes
      .filter(a => a.area === area && a.status === 'aprovado' && a.tipo_servico !== 'Desmontagem')
      .reduce((sum, a) => sum + a.quantidade_pontos, 0)
  })), [andaimes]);

  const events = React.useMemo(() => {
    return andaimes
      .filter(a => !a.somente_backlog)
      .map(a => {
        const isSelected = selectedIds.includes(a.id);
        const isDesmontagem = a.tipo_servico === 'Desmontagem';
        const isExcedente = a.excedeu_limite;
        const date = a.data_montagem || new Date().toISOString().split('T')[0];
        const datePart = date.split('T')[0];
        
        let backgroundColor = isSelected ? '#005596' : (a.status === 'aprovado' ? '#22c55e' : '#FFD100');
        let borderColor = isSelected ? '#003d6b' : (a.status === 'aprovado' ? '#16a34a' : '#eab308');
        
        if (isExcedente && a.status === 'pendente') {
          backgroundColor = isSelected ? '#005596' : '#ef4444';
          borderColor = isSelected ? '#003d6b' : '#dc2626';
        } else if (isDesmontagem) {
          backgroundColor = isSelected ? '#005596' : (a.status === 'aprovado' ? '#94a3b8' : '#cbd5e1');
          borderColor = isSelected ? '#003d6b' : (a.status === 'aprovado' ? '#64748b' : '#94a3b8');
        }

        return {
          id: String(a.id),
          title: a.local_setor,
          start: `${datePart}T${a.hora_inicio || '08:00'}`,
          end: `${datePart}T${a.hora_fim || '17:00'}`,
          backgroundColor,
          borderColor,
          textColor: (a.status === 'pendente' || isExcedente) && !isSelected && !isDesmontagem ? '#ffffff' : '#ffffff',
          className: `event-status-${a.status} ${isDesmontagem ? 'event-desmontagem' : ''} ${isExcedente ? 'event-excedente' : ''}`,
          extendedProps: a
        };
      });
  }, [andaimes, selectedIds]);

  const navigateToNextPending = () => {
    if (pendingAndaimes.length === 0) return;
    
    // If modal is open and we are looking at a pending one, move to next
    let nextIdx = pendingIndex;
    if (isModalOpen && selectedAndaime && selectedAndaime.status === 'pendente') {
      nextIdx = (pendingIndex + 1) % pendingAndaimes.length;
    } else {
      // Find current index or start from 0
      nextIdx = selectedAndaime ? pendingAndaimes.findIndex(a => a.id === selectedAndaime.id) : 0;
      if (nextIdx === -1) nextIdx = 0;
    }
    
    setPendingIndex(nextIdx);
    const andaime = pendingAndaimes[nextIdx];
    
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(andaime.data_montagem);
    }
  };

  const navigateToPrevPending = () => {
    if (pendingAndaimes.length === 0) return;
    
    let nextIdx = pendingIndex;
    if (isModalOpen && selectedAndaime && selectedAndaime.status === 'pendente') {
      nextIdx = (pendingIndex - 1 + pendingAndaimes.length) % pendingAndaimes.length;
    } else {
      nextIdx = selectedAndaime ? pendingAndaimes.findIndex(a => a.id === selectedAndaime.id) : 0;
      if (nextIdx === -1) nextIdx = 0;
    }
    
    setPendingIndex(nextIdx);
    const andaime = pendingAndaimes[nextIdx];
    
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(andaime.data_montagem);
    }
  };

  const totalPoints = pointsPerArea.reduce((sum, a) => sum + a.points, 0);

  const openNewRequest = () => {
    setSelectedAndaime(null);
    setIsModalOpen(true);
  };

  const openEditRequest = (andaime: any) => {
    setSelectedAndaime(andaime);
    setIsModalOpen(true);
  };

  const handleAdjustBacklog = () => {
    setPasswordModal({ isOpen: true, id: null, action: 'adjust-backlog' });
  };

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
    <div className="flex flex-col gap-2 p-2 h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Compact Header & Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-ambev-blue p-2 rounded-lg shadow-sm shadow-ambev-blue/20 shrink-0">
              <Layers className="text-ambev-gold w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">Andaimes</h1>
              <p className="text-slate-400 font-bold mt-0.5 uppercase tracking-widest text-[7px]">Gestão de Montagem e Desmontagem</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div 
              className="flex items-center bg-ambev-blue/5 rounded-lg border border-ambev-blue/10 overflow-hidden"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); navigateToPrevPending(); }}
                className="p-1.5 hover:bg-ambev-blue/10 text-ambev-blue transition-all active:scale-90 border-r border-ambev-blue/10"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={navigateToNextPending}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-ambev-blue/10 transition-all group"
              >
                <span className="text-[8px] font-black text-ambev-blue uppercase tracking-widest">Pendentes:</span>
                <span className="bg-ambev-blue text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingAndaimes.length}
                </span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateToNextPending(); }}
                className="p-1.5 hover:bg-ambev-blue/10 text-ambev-blue transition-all active:scale-90 border-l border-ambev-blue/10"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                onClick={() => setActiveTab('calendario')}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md font-black text-[8px] sm:text-[9px] transition-all",
                  activeTab === 'calendario' ? "bg-white text-ambev-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <CalendarIcon size={12} className="hidden xs:block" />
                CALENDÁRIO
              </button>
              <button 
                onClick={() => setActiveTab('backlog')}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md font-black text-[8px] sm:text-[9px] transition-all",
                  activeTab === 'backlog' ? "bg-white text-ambev-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid size={12} className="hidden xs:block" />
                BACKLOG
              </button>
              <button 
                onClick={() => setActiveTab('panorama')}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md font-black text-[8px] sm:text-[9px] transition-all",
                  activeTab === 'panorama' ? "bg-white text-ambev-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <BarChart3 size={12} className="hidden xs:block" />
                PANORAMA
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={cn(
                  "font-black px-2 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest text-[8px] sm:text-[9px] border",
                  isSelectionMode ? "bg-ambev-blue text-white border-ambev-blue" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {isSelectionMode ? 'Sair' : 'Selecionar'}
              </button>

              <button 
                onClick={openNewRequest}
                className="bg-ambev-blue hover:bg-ambev-blue/90 text-white font-black px-3 sm:px-4 py-1.5 rounded-lg shadow-sm shadow-ambev-blue/20 transition-all flex items-center gap-1.5 active:scale-95 uppercase tracking-widest text-[8px] sm:text-[9px]"
              >
                <Plus size={14} />
                <span className="hidden xs:inline">Nova Solicitação</span>
                <span className="xs:hidden">Novo</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 ml-auto sm:ml-1">
              <button 
                onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')} 
                className="px-1.5 sm:px-2 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
              >
                Semana
              </button>
              <button 
                onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')} 
                className="px-1.5 sm:px-2 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
              >
                Dia
              </button>
              <div className="w-px h-3 bg-slate-100 mx-0.5" />
              <button onClick={() => calendarRef.current?.getApi().today()} className="px-1.5 sm:px-2 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all">
                Hoje
              </button>
              <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
                <ChevronLeft size={12} />
              </button>
              <button onClick={() => calendarRef.current?.getApi().next()} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'panorama' ? (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mensal</p>
                <p className="text-2xl font-black text-slate-900">{andaimes.filter(a => {
                  const d = parseISO(a.data_montagem);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length} <span className="text-xs text-slate-400">Andaimes</span></p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacidade (Pontos)</p>
                <p className="text-2xl font-black text-ambev-blue">{andaimes.reduce((sum, a) => sum + (a.quantidade_pontos || 0), 0)} <span className="text-xs text-slate-400">Total</span></p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
                <p className="text-2xl font-black text-amber-500">{andaimes.filter(a => a.status === 'pendente').length}</p>
             </div>
          </div>
          
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Cronograma de Próximas Atividades</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listagem Geral</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {Array.from(new Set(andaimes.map(a => a.data_montagem))).sort().map(dateStr => {
                  const dayAndaimes = andaimes.filter(a => a.data_montagem === dateStr);
                  if (dayAndaimes.length === 0) return null;
                  const date = parseISO(dateStr);

                  return (
                    <div key={dateStr} className="flex gap-4">
                       <div className="min-w-[60px] flex flex-col items-center pt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{format(date, 'EEE', { locale: ptBR })}</span>
                          <span className="text-xl font-black text-slate-800 tracking-tighter mt-1">{format(date, 'dd/MM')}</span>
                       </div>
                       <div className="flex-1 space-y-2">
                          {dayAndaimes.map(a => (
                            <div 
                              key={a.id} 
                              onClick={() => openEditRequest(a)}
                              className={cn(
                                "p-3 rounded-xl border border-dashed flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                                a.status === 'aprovado' ? "border-green-200 bg-green-50/20" : "border-amber-200 bg-amber-50/20"
                              )}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg border",
                                    a.status === 'aprovado' ? "bg-green-100 text-green-600 border-green-200" : "bg-amber-100 text-amber-600 border-amber-200"
                                  )}>
                                     <Construction size={16} />
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{a.area}</span>
                                        <span className={cn(
                                          "text-[7px] font-black px-1.5 rounded-full uppercase border",
                                          a.status === 'aprovado' ? "bg-green-500 text-white border-green-600" : "bg-amber-500 text-white border-amber-600"
                                        )}>{a.status}</span>
                                     </div>
                                     <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5">{a.quantidade_pontos} PTS - {a.local_setor}</h4>
                                     <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                           <User size={10} className="text-slate-300" />
                                           {a.solicitante}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                           <Clock size={10} className="text-slate-300" />
                                           {a.hora_inicio} - {a.hora_fim}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                               <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-ambev-blue">
                                  <Info size={16} />
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      ) : activeTab === 'calendario' ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-0.5 flex flex-col custom-calendar high-slots min-h-0 !overflow-visible">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            locale={ptBrLocale}
            headerToolbar={false}
            events={events}
            scrollTime="08:00:00"
            allDaySlot={false}
            height="100%"
            expandRows={activeTab === 'calendario'}
            stickyHeaderDates={true}
            slotDuration="01:00:00"
            dayMaxEvents={false}
            eventMaxStack={2}
            handleWindowResize={!isMobile}
            showNonCurrentDates={false}
            fixedWeekCount={false}
            rerenderDelay={10}
            datesSet={(arg) => {
                setCurrentView(arg.view.type);
                // Force a small delay to ensure rendering completion
                setTimeout(() => {
                  window.dispatchEvent(new Event('resize'));
                }, 100);
            }}
            eventClick={(info) => {
              if (isSelectionMode) {
                toggleSelection(parseInt(info.event.id));
                return;
              }
              const andaime = info.event.extendedProps;
              openEditRequest(andaime);
            }}
            eventContent={(eventInfo) => {
                const data = eventInfo.event.extendedProps;
                const isMontagem = data.tipo_servico === 'Montagem';
                const isSelected = selectedIds.includes(data.id);
                const isWeekView = eventInfo.view.type === 'timeGridWeek';
                const isMobile = window.innerWidth < 640;
                const isDesmontagem = data.tipo_servico === 'Desmontagem';
                const isExcedente = data.excedeu_limite;
                
                return (
                    <div 
                      onClick={(e) => {
                        if (isSelectionMode) {
                          e.stopPropagation();
                          toggleSelection(data.id);
                        }
                      }}
                      className={cn(
                        "p-1 h-full flex flex-col gap-0.5 overflow-visible border-2 rounded-md relative transition-all",
                        isExcedente && data.status === 'pendente' ? "border-red-500 bg-red-50/40" :
                        isDesmontagem ? (data.status === 'aprovado' ? "border-slate-500 bg-slate-50/40" : "border-slate-300 bg-slate-50/40") :
                        (data.status === 'aprovado' ? "border-green-500 bg-green-50/40" : "border-yellow-500 bg-yellow-50/40"),
                        isSelected && "ring-2 ring-sky-500 ring-offset-0",
                        (isWeekView && isMobile) && "p-0.5 gap-0"
                      )}
                    >
                    {/* Execution Status Button */}
                    <div className="absolute -top-1 -right-1 z-20 flex flex-col items-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === data.id ? null : data.id);
                        }}
                        className="bg-white border border-slate-200 rounded p-0.5 shadow-sm hover:bg-slate-50 transition-all text-slate-400"
                      >
                        <ChevronDown size={10} className={cn("transition-transform", openDropdownId === data.id && "rotate-180")} />
                      </button>
                      
                      {openDropdownId === data.id && (
                        <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 w-36 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                          {STATUS_EXECUCAO_OPTIONS.map(status => (
                            <button
                              key={status}
                              onClick={(e) => handleStatusChange(e, data.id, status)}
                              className={cn(
                                "text-left px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all hover:bg-slate-50",
                                STATUS_COLORS[status]
                              )}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSelectionMode && (
                      <div className="absolute top-0.5 right-0.5">
                        {isSelected ? (
                          <CheckCircle2 size={isMobile ? 6 : 8} className="text-sky-500" />
                        ) : (
                          <div className={cn("border border-slate-300 rounded-sm", isMobile ? "w-1.5 h-1.5" : "w-2 h-2")} />
                        )}
                      </div>
                    )}
                    
                    {data.status_execucao && (
                      <div className="flex mb-0.5">
                        <span className={cn("text-[5px] font-black px-1 rounded-full border uppercase tracking-widest leading-none", STATUS_COLORS[data.status_execucao])}>
                          {data.status_execucao}
                        </span>
                      </div>
                    )}
                    
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[6px] font-black uppercase tracking-tighter truncate px-1 rounded border",
                          data.area === 'Processo cerveja' ? "text-amber-700 bg-amber-50 border-amber-200" :
                          data.area === 'Packaging, Bblend e Xaroparia' ? "text-blue-700 bg-blue-50 border-blue-200" :
                          data.area === 'Utilidades' ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                          "text-purple-700 bg-purple-50 border-purple-200",
                          (isWeekView && isMobile) && "text-[5px] px-0.5"
                        )}>
                          {data.area}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={cn("text-[6px] font-black bg-slate-900 text-white px-1 rounded-sm shrink-0", (isWeekView && isMobile) && "text-[5px] px-0.5")}>
                            {data.quantidade_pontos} PTS
                          </span>
                          {isExcedente && (
                            <span className="text-[6px] font-black bg-red-600 text-white px-1 rounded-sm shrink-0 animate-pulse">
                              ! LIMITE
                            </span>
                          )}
                          {!isMobile && (
                            <span className={cn(
                              "text-[5px] font-black px-0.5 rounded uppercase text-white shrink-0",
                              data.status === 'aprovado' ? "bg-green-500" : (isExcedente ? "bg-red-500" : "bg-yellow-500")
                            )}>
                              {data.status === 'aprovado' ? 'APROVADO' : (isExcedente ? 'EXCEDENTE' : 'PENDENTE')}
                            </span>
                          )}
                        </div>
                      </div>

                    <div className={cn("font-black text-[9px] text-slate-900 uppercase leading-none line-clamp-1 flex items-center gap-1", (isWeekView && isMobile) && "text-[7px]")}>
                      {isDesmontagem && <Trash2 size={isMobile ? 8 : 10} className="text-slate-500 shrink-0" />}
                      {eventInfo.event.title}
                    </div>

                    {!(isWeekView && isMobile) && (
                      <div className="flex items-center gap-1">
                        <User size={6} className="text-slate-400" />
                        <span className="text-[7px] text-slate-500 font-bold line-clamp-1">
                          {data.solicitante}
                        </span>
                      </div>
                    )}

                    {!(isWeekView && isMobile) && (
                      <div className="details-on-hover">
                        <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded uppercase text-white",
                            data.status === 'aprovado' ? "bg-green-500" : "bg-yellow-500"
                          )}>
                            {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                          </span>
                          <span className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {eventInfo.event.title}
                          </span>
                        </div>

                      <div className="info-grid">
                        <div>
                          <span className="label">Área</span>
                          <p>{data.area}</p>
                        </div>
                        <div>
                          <span className="label">Local/Setor</span>
                          <p>{data.local_setor}</p>
                        </div>
                        <div>
                          <span className="label">Solicitante</span>
                          <p>{data.solicitante}</p>
                        </div>
                        <div>
                          <span className="label">Tipo Andaime</span>
                          <p>{data.tipo_andaime}</p>
                        </div>
                        <div>
                          <span className="label">Tipo Serviço</span>
                          <p>{data.tipo_servico}</p>
                        </div>
                        <div>
                          <span className="label">Pontos</span>
                          <p className="text-ambev-blue font-black">{data.quantidade_pontos}</p>
                        </div>
                        <div>
                          <span className="label">Montagem</span>
                          <p>{formatDate(data.data_montagem_original || data.data_montagem)}</p>
                        </div>
                        <div>
                          <span className="label">Desmontagem</span>
                          <p>{formatDate(data.data_desmontagem)}</p>
                        </div>
                        <div>
                          <span className="label">Horário</span>
                          <p>{data.hora_inicio} - {data.hora_fim}</p>
                        </div>
                      </div>
                      <div>
                        <span className="label">Descrição Detalhada</span>
                        <p className="text-slate-600 italic">{data.descricao_local || 'Sem descrição'}</p>
                      </div>
                    </div>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <span className={cn(
                        "text-[5px] font-black px-0.5 rounded uppercase text-white",
                        isMontagem ? "bg-ambev-blue" : "bg-blue-500"
                      )}>
                        {data.tipo_servico}
                      </span>
                      <div className="flex items-center gap-0.5 text-slate-400">
                        <Clock size={6} />
                        <span className="text-[6px] font-bold">{data.hora_inicio}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
      ) : (
        <AndaimeBacklog onCardClick={openEditRequest} onAdjustBacklog={handleAdjustBacklog} />
      )}

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-4 md:gap-8 z-[150] animate-in slide-in-from-bottom-8 duration-300 w-[95%] md:w-auto justify-between md:justify-start">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Selecionados</span>
            <span className="text-lg md:text-xl font-black leading-none mt-1">{selectedIds.length}</span>
          </div>
          
          <div className="h-8 w-px bg-slate-700 hidden md:block" />
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleBatchApprove}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">{isSubmitting ? 'Processando...' : 'Aprovar Lote'}</span>
              <span className="sm:hidden">{isSubmitting ? '...' : 'Aprovar'}</span>
            </button>
            <button 
              onClick={handleBatchDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">{isSubmitting ? 'Processando...' : 'Excluir Lote'}</span>
              <span className="sm:hidden">{isSubmitting ? '...' : 'Excluir'}</span>
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all px-2 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <AndaimeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        andaime={selectedAndaime}
        isBacklog={activeTab === 'backlog'}
      />
      <PasswordModal 
        isOpen={passwordModal.isOpen} 
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        onConfirm={handleAction}
        onDelete={() => setPasswordModal(prev => ({ ...prev, action: 'delete' }))}
      />
    </div>
  );
}
