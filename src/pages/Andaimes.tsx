import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Plus, LayoutGrid, Calendar as CalendarIcon, Info, Layers, CheckCircle2, Trash2, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import AndaimeModal from '../components/AndaimeModal';
import PasswordModal from '../components/PasswordModal';
import AndaimeBacklog from './AndaimeBacklog';
import { cn } from '../lib/utils';

const AREAS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades e Meio Ambiente'
];

export default function Andaimes() {
  const { andaimes, fetchAndaimes, approveAndaime, deleteAndaime, batchDeleteAndaimes } = useStore();
  const [activeTab, setActiveTab] = useState<'calendario' | 'backlog'>('calendario');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAndaime, setSelectedAndaime] = useState<any>(null);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, id: number | null, action: 'approve' | 'delete' | 'batch-delete' }>({
    isOpen: false,
    id: null,
    action: 'approve'
  });

  useEffect(() => {
    fetchAndaimes();
  }, [fetchAndaimes]);

  const pendingAndaimes = andaimes.filter(a => a.status === 'pendente');

  const navigateToNextPending = () => {
    if (pendingAndaimes.length === 0) return;
    const nextIndex = (pendingIndex + 1) % pendingAndaimes.length;
    setPendingIndex(nextIndex);
    const andaime = pendingAndaimes[nextIndex];
    
    const calendarApi = (window as any).fullCalendarAndaime?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(andaime.data_montagem);
    }
    
    setSelectedAndaime(andaime);
    setIsModalOpen(true);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setPasswordModal({ isOpen: true, id: null, action: 'batch-delete' });
  };

  const handleAction = async (password: string) => {
    try {
      if (passwordModal.action === 'batch-delete') {
        await batchDeleteAndaimes(selectedIds, password);
        setSelectedIds([]);
        setIsSelectionMode(false);
      } else if (passwordModal.id !== null) {
        if (passwordModal.action === 'approve') {
          await approveAndaime(passwordModal.id, password);
        } else {
          await deleteAndaime(passwordModal.id, password);
        }
      }
      setPasswordModal({ ...passwordModal, isOpen: false });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const events = andaimes.map(a => {
    const isSelected = selectedIds.includes(a.id);
    const date = a.data_montagem || new Date().toISOString().split('T')[0];
    const datePart = date.split('T')[0];
    
    return {
      id: String(a.id),
      title: a.local_setor,
      start: `${datePart}T${a.hora_inicio || '08:00'}`,
      end: `${datePart}T${a.hora_fim || '17:00'}`,
      backgroundColor: isSelected ? '#005596' : (a.status === 'aprovado' ? '#22c55e' : '#FFD100'),
      borderColor: isSelected ? '#003d6b' : (a.status === 'aprovado' ? '#16a34a' : '#eab308'),
      textColor: a.status === 'pendente' && !isSelected ? '#1e293b' : '#ffffff',
      className: `event-status-${a.status}`,
      extendedProps: a
    };
  });

  console.log('Andaimes state:', andaimes);
  console.log('Andaimes events:', events);

  const pointsPerArea = AREAS.map(area => ({
    name: area,
    points: andaimes
      .filter(a => a.area === area && a.status === 'aprovado' && a.tipo_servico !== 'Desmontagem')
      .reduce((sum, a) => sum + a.quantidade_pontos, 0)
  }));

  const totalPoints = pointsPerArea.reduce((sum, a) => sum + a.points, 0);

  const openNewRequest = () => {
    setSelectedAndaime(null);
    setIsModalOpen(true);
  };

  const openEditRequest = (andaime: any) => {
    setSelectedAndaime(andaime);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Compact Header & Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-ambev-blue p-2 rounded-lg shadow-sm shadow-ambev-blue/20 shrink-0">
              <Layers className="text-ambev-gold w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">Andaimes</h1>
              <p className="text-slate-400 font-bold mt-0.5 uppercase tracking-widest text-[7px]">Gestão de Montagem e Desmontagem</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                onClick={() => setActiveTab('calendario')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md font-black text-[9px] transition-all",
                  activeTab === 'calendario' ? "bg-white text-ambev-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <CalendarIcon size={12} />
                CALENDÁRIO
              </button>
              <button 
                onClick={() => setActiveTab('backlog')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md font-black text-[9px] transition-all",
                  activeTab === 'backlog' ? "bg-white text-ambev-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid size={12} />
                BACKLOG
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <button 
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={cn(
                "font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest text-[9px] border",
                isSelectionMode ? "bg-ambev-blue text-white border-ambev-blue" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {isSelectionMode ? 'Sair' : 'Selecionar'}
            </button>

            <button 
              onClick={openNewRequest}
              className="bg-ambev-blue hover:bg-ambev-blue/90 text-white font-black px-4 py-1.5 rounded-lg shadow-sm shadow-ambev-blue/20 transition-all flex items-center gap-1.5 active:scale-95 uppercase tracking-widest text-[9px]"
            >
              <Plus size={14} />
              Nova Solicitação
            </button>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 ml-1">
              <button onClick={() => (window as any).fullCalendarAndaime?.getApi().today()} className="px-2 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all">
                Hoje
              </button>
              <button onClick={() => (window as any).fullCalendarAndaime?.getApi().prev()} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
                <ChevronLeft size={12} />
              </button>
              <button onClick={() => (window as any).fullCalendarAndaime?.getApi().next()} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'calendario' ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-0.5 flex flex-col custom-calendar high-slots min-h-0 !overflow-visible">
          <FullCalendar
            key={`calendar-${events.length}`}
            ref={(ref) => { (window as any).fullCalendarAndaime = ref; }}
            plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
            initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'}
            locale={ptBrLocale}
            headerToolbar={false}
            events={events}
            scrollTime="08:00:00"
            allDaySlot={false}
            height="100%"
            expandRows={true}
            stickyHeaderDates={true}
            slotDuration="01:00:00"
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
                        data.status === 'aprovado' ? "border-green-500 bg-green-50/40" : "border-yellow-500 bg-yellow-50/40",
                        isSelected && "ring-2 ring-sky-500 ring-offset-0"
                      )}
                    >
                    {isSelectionMode && (
                      <div className="absolute top-0.5 right-0.5">
                        {isSelected ? (
                          <CheckCircle2 size={8} className="text-sky-500" />
                        ) : (
                          <div className="w-2 h-2 border border-slate-300 rounded-sm" />
                        )}
                      </div>
                    )}
                    
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[6px] font-black uppercase tracking-tighter truncate px-1 rounded border",
                          data.area === 'Processo cerveja' ? "text-amber-700 bg-amber-50 border-amber-200" :
                          data.area === 'Packaging, Bblend e Xaroparia' ? "text-blue-700 bg-blue-50 border-blue-200" :
                          "text-emerald-700 bg-emerald-50 border-emerald-200"
                        )}>
                          {data.area}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[6px] font-black bg-slate-900 text-white px-1 rounded-sm shrink-0">
                            {data.quantidade_pontos} PTS
                          </span>
                          <span className={cn(
                            "text-[5px] font-black px-0.5 rounded uppercase text-white shrink-0",
                            data.status === 'aprovado' ? "bg-green-500" : "bg-yellow-500"
                          )}>
                            {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                          </span>
                        </div>
                      </div>

                    <div className="font-black text-[9px] text-slate-900 uppercase leading-none line-clamp-1">
                      {eventInfo.event.title}
                    </div>

                    <div className="flex items-center gap-1">
                      <User size={6} className="text-slate-400" />
                      <span className="text-[7px] text-slate-500 font-bold line-clamp-1">
                        {data.solicitante}
                      </span>
                    </div>

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
                          <p>{new Date(data.data_montagem).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="label">Desmontagem</span>
                          <p>{new Date(data.data_desmontagem).toLocaleDateString('pt-BR')}</p>
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
        <AndaimeBacklog onCardClick={openEditRequest} />
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
              onClick={handleBatchDelete}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all active:scale-95"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Excluir Lote</span>
              <span className="sm:hidden">Excluir</span>
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all px-2"
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
