import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Plus, LayoutGrid, Calendar as CalendarIcon, Info, Layers } from 'lucide-react';
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
  const { andaimes, fetchAndaimes, approveAndaime, deleteAndaime } = useStore();
  const [activeTab, setActiveTab] = useState<'calendario' | 'backlog'>('calendario');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAndaime, setSelectedAndaime] = useState<any>(null);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, id: number, action: 'approve' | 'delete' }>({
    isOpen: false,
    id: 0,
    action: 'approve'
  });

  useEffect(() => {
    fetchAndaimes();
  }, []);

  const handleAction = async (password: string) => {
    try {
      if (passwordModal.action === 'approve') {
        await approveAndaime(passwordModal.id, password);
      } else {
        await deleteAndaime(passwordModal.id, password);
      }
      setPasswordModal({ ...passwordModal, isOpen: false });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const events = andaimes.map(a => ({
    id: String(a.id),
    title: a.local_setor,
    start: `${a.data_montagem}T${a.hora_inicio}`,
    end: `${a.data_montagem}T${a.hora_fim}`,
    backgroundColor: a.status === 'aprovado' ? '#fff7ed' : '#fff7ed',
    borderColor: a.status === 'aprovado' ? '#4caf50' : '#f25c05',
    textColor: '#1e293b',
    extendedProps: a
  }));

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
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Gestão de Montagem e Desmontagem</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptBrLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay'
            }}
            events={events}
            slotMinTime="07:00:00"
            slotMaxTime="19:00:00"
            allDaySlot={false}
            height="100%"
            eventClick={(info) => {
              const andaime = info.event.extendedProps;
              openEditRequest(andaime);
            }}
            eventContent={(eventInfo) => {
                const data = eventInfo.event.extendedProps;
                const isMontagem = data.tipo_servico === 'Montagem';
                
                return (
                  <div className="p-2 h-full flex flex-col justify-between overflow-hidden">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                          isMontagem ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {data.tipo_servico}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase">
                          {data.quantidade_pontos} PTS
                        </span>
                      </div>
                      <div className="font-black text-[10px] uppercase leading-tight text-slate-900 line-clamp-2">
                        {eventInfo.event.title}
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-1 border-t border-slate-100/50">
                      <div className="text-[8px] font-black text-orange-500 uppercase truncate">
                        {data.area}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase truncate">
                        {data.solicitante}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
      ) : (
        <AndaimeBacklog />
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
          height: 80px !important;
          border-bottom: 1px solid #f8fafc !important;
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
