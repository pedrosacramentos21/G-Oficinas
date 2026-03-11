import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useStore } from '../store';
import { Plus, Calendar as CalendarIcon, User, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import PasswordModal from '../components/PasswordModal';

const EQUIPAMENTOS = [
  { id: 'articulada', name: 'Plataforma articulada 12 metros', color: '#3b82f6' },
  { id: 'tesoura', name: 'Plataforma tesoura 8 metros', color: '#a855f7' }
];

const AREAS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades e Meio Ambiente'
];

export default function PTAs() {
  const { ptas, fetchPTAs, addPTA, approvePTA, deletePTA } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    equipamento: EQUIPAMENTOS[0].name,
    area: AREAS[0],
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
    hora_inicio: '07:00',
    hora_fim: '08:00',
    descricao: '',
    prioridade: 'Normal'
  });

  useEffect(() => {
    fetchPTAs();
  }, [fetchPTAs]);

  const events = ptas.map(p => ({
    id: p.id.toString(),
    title: `${p.equipamento} - ${p.responsavel}`,
    start: `${p.data}T${p.hora_inicio}`,
    end: `${p.data}T${p.hora_fim}`,
    backgroundColor: p.status === 'aprovado' 
      ? (EQUIPAMENTOS.find(e => e.name === p.equipamento)?.color || '#f25c05')
      : '#eab308',
    borderColor: 'transparent',
    extendedProps: { ...p }
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPTA(formData);
    setIsModalOpen(false);
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (password: string) => {
    if (selectedEvent) {
      try {
        await approvePTA(Number(selectedEvent.id), password);
        setIsPasswordModalOpen(false);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedEvent) {
      // Password check happens in handlePasswordSubmit if we pass a flag, 
      // but for simplicity here we just use the same modal
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">PTAs</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Plataformas de Trabalho em Altura</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nova Solicitação
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptBrLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventClick={handleEventClick}
            height="calc(100vh - 300px)"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Legenda Equipamentos</h3>
            <div className="space-y-3">
              {EQUIPAMENTOS.map(e => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-xs font-bold text-gray-700">{e.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span className="text-xs font-bold text-gray-700">Pendente de Aprovação</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-500 p-6 rounded-[2rem] shadow-xl shadow-orange-500/20 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total de Reservas</h3>
            <p className="text-4xl font-black">{ptas.length}</p>
            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase">Aprovadas</span>
              <span className="font-black">{ptas.filter(p => p.status === 'aprovado').length}</span>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">NOVA SOLICITAÇÃO PTA</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Agendamento de Equipamento</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-colors">
                <Plus size={24} className="text-gray-400 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Equipamento</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    value={formData.equipamento}
                    onChange={e => setFormData({...formData, equipamento: e.target.value})}
                  >
                    {EQUIPAMENTOS.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Área</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    value={formData.area}
                    onChange={e => setFormData({...formData, area: e.target.value})}
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Nome do operador/responsável"
                    value={formData.responsavel}
                    onChange={e => setFormData({...formData, responsavel: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    value={formData.data}
                    onChange={e => setFormData({...formData, data: e.target.value})}
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Início</label>
                    <input 
                      type="time"
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                      value={formData.hora_inicio}
                      onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fim</label>
                    <input 
                      type="time"
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                      value={formData.hora_fim}
                      onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handlePasswordSubmit}
        onDelete={async () => {
          if (selectedEvent) {
            const password = prompt('Digite a senha para excluir:');
            if (password) {
              try {
                await deletePTA(Number(selectedEvent.id), password);
                setIsPasswordModalOpen(false);
              } catch (err: any) {
                alert(err.message);
              }
            }
          }
        }}
      />
    </div>
  );
}
