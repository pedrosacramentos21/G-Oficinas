import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Plus, LayoutGrid, Calendar as CalendarIcon, Info, Layers, CheckCircle2, Trash2 } from 'lucide-react';
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
    return {
      id: String(a.id),
      title: a.local_setor,
      start: `${a.data_montagem}T${a.hora_inicio}`,
      end: `${a.data_montagem}T${a.hora_fim}`,
      backgroundColor: isSelected ? '#f97316' : (a.status === 'aprovado' ? '#dcfce7' : '#fef9c3'),
      borderColor: isSelected ? '#ea580c' : (a.status === 'aprovado' ? '#22c55e' : '#eab308'),
      textColor: isSelected ? '#ffffff' : '#1e293b',
      extendedProps: a
    };
  });

  const pointsPerArea = AREAS.map(area => ({
    name: area,
    points: andaimes
      .filter(a => a.area === area && a.status === 'aprovado')
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
    <div className="h-full flex flex-col gap-6 p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
            <Layers className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Andaimes</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Gestão de Montagem e Desmontagem de Andaimes</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <button 
              onClick={navigateToNextPending}
              className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all active:scale-95"
            >
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Solicitações pendentes:</span>
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingAndaimes.length}
              </span>
            </button>
          </div>

          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={cn(
              "font-black px-4 py-3 rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest text-xs border",
              isSelectionMode ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {isSelectionMode ? 'Sair da Seleção' : 'Selecionar Vários'}
          </button>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={() => setActiveTab('calendario')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] transition-all",
                activeTab === 'calendario' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <CalendarIcon size={14} />
              CALENDÁRIO
            </button>
            <button 
              onClick={() => setActiveTab('backlog')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] transition-all",
                activeTab === 'backlog' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid size={14} />
              BACKLOG
            </button>
          </div>

          <button 
            onClick={openNewRequest}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95 uppercase tracking-widest text-xs"
          >
            <Plus size={18} />
            Nova Solicitação
          </button>
        </div>
      </div>

      {activeTab === 'calendario' ? (
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 overflow-hidden flex flex-col custom-calendar">
          <FullCalendar
            ref={(ref) => { (window as any).fullCalendarAndaime = ref; }}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptBrLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay'
            }}
            events={events}
            slotMinTime="00:00:00"
            slotMaxTime="23:59:59"
            initialScrollTime="08:00:00"
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
                  <div className="p-2 h-full flex flex-col justify-between overflow-hidden relative">
                    {isSelectionMode && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all",
                          isSelected ? "bg-white border-white" : "bg-white/50 border-slate-300"
                        )}>
                          {isSelected && <CheckCircle2 size={12} className="text-orange-600" />}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                          data.status === 'aprovado' ? (isSelected ? "bg-white/20 text-white" : "bg-green-500 text-white") : (isSelected ? "bg-white/20 text-white" : "bg-yellow-500 text-white")
                        )}>
                          {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                          isSelected ? "bg-white/20 text-white" : (isMontagem ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600")
                        )}>
                          {data.tipo_servico}
                        </span>
                        <span className={cn("text-[8px] font-black uppercase", isSelected ? "text-white/80" : "text-slate-600")}>
                          {data.quantidade_pontos} PTS
                        </span>
                      </div>
                      <div className={cn("font-black text-[11px] uppercase leading-tight line-clamp-2 drop-shadow-sm", isSelected ? "text-white" : "text-slate-900")}>
                        {eventInfo.event.title}
                      </div>
                    </div>
                    
                    <div className={cn("mt-auto pt-1 border-t", isSelected ? "border-white/20" : "border-slate-200")}>
                      <div className={cn("text-[9px] font-black uppercase truncate", isSelected ? "text-white/80" : "text-orange-600")}>
                        {data.area}
                      </div>
                      <div className={cn("text-[9px] font-bold uppercase truncate", isSelected ? "text-white/60" : "text-slate-700")}>
                        {data.solicitante}
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-8 z-[150] animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Selecionados</span>
            <span className="text-xl font-black leading-none mt-1">{selectedIds.length}</span>
          </div>
          
          <div className="h-8 w-px bg-slate-700" />
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBatchDelete}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <Trash2 size={14} />
              Excluir Lote
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
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

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-calendar .fc {
          --fc-border-color: #f1f5f9;
          --fc-today-bg-color: #fff7ed;
          font-family: 'Inter', sans-serif;
        }
        .custom-calendar .fc-col-header-cell {
          padding: 16px 0;
          background: #fff;
          border: none !important;
        }
        .custom-calendar .fc-col-header-cell-cushion {
          text-transform: uppercase;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: #64748b;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .custom-calendar .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
          color: #f25c05;
        }
        .custom-calendar .fc-timegrid-slot {
          height: 45px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .custom-calendar .fc-timegrid-slot-label-cushion {
          font-weight: 700;
          font-size: 12px;
          color: #94a3b8;
        }
        .custom-calendar .fc-event {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(242, 92, 5, 0.08);
          transition: all 0.2s;
          border-width: 0 0 0 4px !important;
          margin: 2px !important;
        }
        .custom-calendar .fc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(242, 92, 5, 0.12);
          z-index: 50;
        }
        .custom-calendar .fc-toolbar-title {
          font-weight: 900 !important;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          color: #1e293b;
          font-size: 1.25rem !important;
        }
        .custom-calendar .fc-button {
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
          color: #64748b !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          border-radius: 12px !important;
          padding: 10px 20px !important;
          box-shadow: none !important;
        }
        .custom-calendar .fc-button-active {
          background: #f25c05 !important;
          border-color: #f25c05 !important;
          color: #fff !important;
        }
        .custom-calendar .fc-theme-standard td, .custom-calendar .fc-theme-standard th {
          border-color: #f1f5f9;
        }
      `}} />
    </div>
  );
}
