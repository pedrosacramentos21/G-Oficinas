import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useStore } from '../store';
import { Plus, Calendar as CalendarIcon, User, Clock, CheckCircle2, Trash2, Truck, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import PasswordModal from '../components/PasswordModal';

const EQUIPAMENTOS = [
  { id: 'articulada', name: 'Plataforma articulada 12 metros', color: '#3b82f6' },
  { id: 'tesoura', name: 'Plataforma tesoura 8 metros', color: '#a855f7' }
];

const HORARIOS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function PTAs() {
  const { ptas, fetchPTAs, addPTA, approvePTA, updatePTA, deletePTA, batchDeletePTAs } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedPTA, setSelectedPTA] = useState<any>(null);
  const [passwordAction, setPasswordAction] = useState<'approve' | 'delete' | 'batch-delete' | 'edit'>('approve');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const INITIAL_FORM_DATA = {
    equipamento: EQUIPAMENTOS[0].name,
    area: '',
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    hora_inicio: '08:00',
    hora_fim: '17:00',
    descricao: '',
    prioridade: 'Normal',
    recorrente: false
  };
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  useEffect(() => {
    fetchPTAs();
  }, [fetchPTAs]);

  const pendingPTAs = ptas.filter(p => p.status === 'pendente');

  const navigateToNextPending = () => {
    if (pendingPTAs.length === 0) return;
    const nextIndex = (pendingIndex + 1) % pendingPTAs.length;
    setPendingIndex(nextIndex);
    const pta = pendingPTAs[nextIndex];
    
    // Find the event in the calendar and scroll to it
    const calendarApi = (window as any).fullCalendarPTA?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(pta.data);
      // We can't easily scroll to a specific time in FullCalendar without a ref, 
      // but gotoDate gets us to the right day.
    }
    
    setSelectedPTA(pta);
    setIsDetailModalOpen(true);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setPasswordAction('batch-delete');
    setIsPasswordModalOpen(true);
  };

  const events = ptas.map(p => {
    const equip = EQUIPAMENTOS.find(e => e.name === p.equipamento);
    const isSelected = selectedIds.includes(p.id);
    
    // Defensive check for date
    const date = p.data || new Date().toISOString().split('T')[0];
    const datePart = date.split('T')[0];
    
    // Fallback for missing time fields
    const horaInicio = p.hora_inicio || '08:00';
    const horaFim = p.hora_fim || '17:00';
    
    return {
      id: p.id.toString(),
      title: p.responsavel,
      start: `${datePart}T${horaInicio}`,
      end: `${datePart}T${horaFim}`,
      backgroundColor: isSelected ? '#3b82f6' : (p.status === 'aprovado' ? (equip?.color || '#3b82f6') : '#f59e0b'),
      borderColor: isSelected ? '#1d4ed8' : (p.status === 'aprovado' ? (equip?.color || '#3b82f6') : '#d97706'),
      textColor: '#ffffff',
      className: `event-status-${p.status}`,
      extendedProps: { ...p }
    };
  });

  console.log('PTAs state:', ptas);
  console.log('Generated events:', events);

  const handleEventClick = (info: any) => {
    if (isSelectionMode) {
      toggleSelection(parseInt(info.event.id));
      return;
    }
    setSelectedPTA(info.event.extendedProps);
    setIsDetailModalOpen(true);
  };

  const [tempPassword, setTempPassword] = useState('');

  const handlePasswordSubmit = async (password: string) => {
    if (passwordAction === 'batch-delete') {
      try {
        await batchDeletePTAs(selectedIds, password);
        setSelectedIds([]);
        setIsSelectionMode(false);
        setIsPasswordModalOpen(false);
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    if (selectedPTA) {
      try {
        if (passwordAction === 'approve') {
          await approvePTA(selectedPTA.id, password);
          setIsPasswordModalOpen(false);
          setIsDetailModalOpen(false);
        } else if (passwordAction === 'delete') {
          await deletePTA(selectedPTA.id, password);
          setIsPasswordModalOpen(false);
          setIsDetailModalOpen(false);
        } else if (passwordAction === 'edit') {
          setTempPassword(password);
          setIsEditing(true);
          setFormData({
            equipamento: selectedPTA.equipamento,
            area: selectedPTA.area,
            responsavel: selectedPTA.responsavel,
            data: selectedPTA.data,
            data_fim: selectedPTA.data_fim || selectedPTA.data,
            hora_inicio: selectedPTA.hora_inicio,
            hora_fim: selectedPTA.hora_fim,
            descricao: selectedPTA.descricao || '',
            prioridade: selectedPTA.prioridade,
            recorrente: !!selectedPTA.data_fim && selectedPTA.data_fim !== selectedPTA.data
          });
          setIsPasswordModalOpen(false);
          setIsDetailModalOpen(false);
          setIsModalOpen(true);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleActualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedPTA) {
        await updatePTA(selectedPTA.id, formData, tempPassword);
      } else {
        const res = await addPTA(formData);
        if (res.message) {
          alert(res.message);
        }
      }
      setIsModalOpen(false);
      setIsEditing(false);
      setFormData(INITIAL_FORM_DATA);
      setTempPassword('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const [calendarView, setCalendarView] = useState(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');

  useEffect(() => {
    const handleResize = () => {
      setCalendarView(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-3 md:p-6 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-blue-500 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/20">
            <Truck className="text-white md:w-6 md:h-6" size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">PTAs</h1>
            <p className="text-slate-500 font-bold mt-0.5 md:mt-1 uppercase tracking-widest text-[8px] md:text-[10px]">Plataformas de Trabalho em Altura</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
          <div className="flex flex-col items-end flex-1 lg:flex-none">
            <button 
              onClick={navigateToNextPending}
              className="w-full lg:w-auto flex items-center justify-center gap-2 bg-blue-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
            >
              <span className="text-[7px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest">Solicitações pendentes:</span>
              <span className="bg-blue-500 text-white text-[7px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full">
                {pendingPTAs.length}
              </span>
            </button>
          </div>

          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={cn(
              "flex-1 lg:flex-none font-black px-2 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[8px] md:text-xs border",
              isSelectionMode ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {isSelectionMode ? 'Sair da Seleção' : 'Selecionar Vários'}
          </button>

          <button 
            onClick={() => {
              setIsEditing(false);
              setFormData(INITIAL_FORM_DATA);
              setIsModalOpen(true);
            }}
            className="flex-1 lg:flex-none bg-orange-500 hover:bg-orange-600 text-white font-black px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-[8px] md:text-xs"
          >
            <Plus size={14} className="md:w-[18px] md:h-[18px]" />
            Nova Solicitação
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl md:rounded-3xl shadow-sm border border-slate-100 p-1 md:p-4 overflow-hidden flex flex-col custom-calendar h-[850px]">
        <FullCalendar
          key={`calendar-${events.length}-${calendarView}`}
          ref={(ref) => { (window as any).fullCalendarPTA = ref; }}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={calendarView}
          viewClassNames={calendarView}
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: window.innerWidth < 768 ? 'multiMonthYear,timeGridDay' : 'multiMonthYear,timeGridWeek,timeGridDay'
          }}
          buttonText={{
            multiMonthYear: 'Mês'
          }}
          multiMonthMaxColumns={window.innerWidth < 1024 ? 1 : (window.innerWidth < 1400 ? 2 : 3)}
          events={events}
          slotMinTime="00:00:00"
          slotMaxTime="23:59:59"
          scrollTime="08:00:00"
          allDaySlot={false}
          height="100%"
          expandRows={true}
          stickyHeaderDates={true}
          slotDuration="01:00:00"
          eventClick={handleEventClick}
          eventContent={(eventInfo) => {
            const data = eventInfo.event.extendedProps;
            const equip = EQUIPAMENTOS.find(e => e.name === data.equipamento);
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
                  "p-1 md:p-2 h-full flex flex-col justify-between overflow-hidden border-l-2 md:border-l-4 transition-all relative",
                  data.status === 'aprovado' 
                    ? (equip?.id === 'articulada' ? "border-blue-500 bg-blue-50/50" : "border-purple-500 bg-purple-50/50")
                    : "border-yellow-500 bg-yellow-50/50",
                  isSelected && "ring-2 ring-blue-500 ring-offset-1 bg-blue-500"
                )}
              >
                {isSelectionMode && (
                  <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                    {isSelected ? (
                      <CheckCircle2 size={10} className="text-white md:w-3 md:h-3" />
                    ) : (
                      <div className="w-2.5 h-2.5 md:w-3 md:h-3 border border-slate-300 rounded-sm" />
                    )}
                  </div>
                )}
                <div className="space-y-0.5 md:space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "text-[7px] md:text-[8px] font-black uppercase tracking-tighter truncate px-1 rounded",
                      isSelected ? "text-white bg-white/20" : "text-blue-600 bg-blue-50"
                    )}>
                      {data.area}
                    </span>
                    <span className={cn(
                      "text-[6px] md:text-[7px] font-black px-0.5 md:px-1 rounded uppercase text-white shrink-0",
                      data.status === 'aprovado' ? "bg-green-500" : "bg-yellow-500"
                    )}>
                      {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                    </span>
                  </div>
                  <div className={cn(
                    "font-black text-[8px] md:text-[10px] uppercase leading-tight line-clamp-2",
                    isSelected ? "text-white" : "text-slate-900"
                  )}>
                    {data.responsavel}
                  </div>
                  <div className={cn(
                    "text-[7px] md:text-[9px] font-medium line-clamp-1",
                    isSelected ? "text-white/80" : "text-slate-500"
                  )}>
                    {data.equipamento}
                  </div>
                </div>
                
                <div className={cn(
                  "mt-0.5 md:mt-1 pt-0.5 md:pt-1 border-t hidden md:flex items-center justify-between gap-1",
                  isSelected ? "border-white/20" : "border-blue-100"
                )}>
                  <span className={cn(
                    "text-[7px] md:text-[8px] font-black uppercase tracking-tighter truncate px-1 rounded",
                    isSelected ? "text-white bg-white/10" : (equip?.id === 'articulada' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600")
                  )}>
                    {data.equipamento ? data.equipamento.split(' ')[1] : 'PTA'}
                  </span>
                  <span className={cn(
                    "text-[7px] md:text-[8px] font-black uppercase",
                    isSelected ? "text-white/60" : "text-slate-600"
                  )}>
                    {data.prioridade}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-4 md:gap-8 z-[150] animate-in slide-in-from-bottom-8 duration-300 w-[90%] md:w-auto justify-between md:justify-start">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Selecionados</span>
            <span className="text-lg md:text-xl font-black leading-none mt-1">{selectedIds.length}</span>
          </div>
          
          <div className="h-6 md:h-8 w-px bg-slate-700" />
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 md:gap-2 bg-red-500 hover:bg-red-600 text-white px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all active:scale-95"
            >
              <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
              Excluir Lote
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight uppercase">{isEditing ? 'EDITAR SOLICITAÇÃO PTA' : 'NOVA SOLICITAÇÃO PTA'}</h2>
                <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-1.5">{isEditing ? 'Alterar Agendamento' : 'Agendamento de Equipamento'}</p>
              </div>
              <button onClick={() => {
                setIsModalOpen(false);
                setIsEditing(false);
                setFormData(INITIAL_FORM_DATA);
              }} className="p-2 sm:p-3 hover:bg-gray-200 rounded-xl sm:rounded-2xl transition-colors">
                <Plus size={24} className="text-gray-400 rotate-45 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form id="pta-form" onSubmit={handleActualSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Equipamento</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all appearance-none text-sm sm:text-base"
                      value={formData.equipamento}
                      onChange={e => setFormData({...formData, equipamento: e.target.value})}
                    >
                      {EQUIPAMENTOS.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Área e Sub-área:</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      placeholder="Ex: Processo - Brassagem"
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      placeholder="Nome do operador/responsável"
                      value={formData.responsavel}
                      onChange={e => setFormData({...formData, responsavel: e.target.value})}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      value={formData.data}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>

                  <div className="sm:col-span-2 bg-blue-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-100">
                    <label className="flex items-center gap-3 sm:gap-4 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-blue-300 text-blue-500 focus:ring-blue-500"
                        checked={formData.recorrente}
                        onChange={e => setFormData({...formData, recorrente: e.target.checked})}
                      />
                      <span className="text-[10px] sm:text-xs font-black text-blue-700 uppercase tracking-widest">O agendamento se repete por mais de um dia?</span>
                    </label>
                  </div>

                  {formData.recorrente && (
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data Inicial</label>
                        <input 
                          type="date"
                          required
                          className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                          value={formData.data}
                          onChange={e => setFormData({...formData, data: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data Final</label>
                        <input 
                          type="date"
                          required
                          className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                          value={formData.data_fim}
                          onChange={e => setFormData({...formData, data_fim: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="sm:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Início</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all appearance-none text-sm sm:text-base"
                        value={formData.hora_inicio}
                        onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                      >
                        {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fim</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all appearance-none text-sm sm:text-base"
                        value={formData.hora_fim}
                        onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                      >
                        {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50/50 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setFormData(INITIAL_FORM_DATA);
                  }}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm order-2 sm:order-1"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  form="pta-form"
                  className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPTA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight uppercase">DETALHES DA SOLICITAÇÃO</h2>
                <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-1.5">Informações do Agendamento</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 sm:p-3 hover:bg-gray-200 rounded-xl sm:rounded-2xl transition-colors">
                <Plus size={24} className="text-gray-400 rotate-45 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="sm:col-span-2 bg-slate-50 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
                      selectedPTA.status === 'aprovado' ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
                    )}>
                      {selectedPTA.status === 'aprovado' ? 'APROVADO' : 'AGUARDANDO APROVAÇÃO'}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: #{selectedPTA.id}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight">{selectedPTA.responsavel}</h3>
                    <p className="text-sm sm:text-base font-bold text-blue-600 uppercase tracking-wider">{selectedPTA.equipamento}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área</label>
                  <p className="text-sm sm:text-lg font-bold text-slate-700 uppercase">{selectedPTA.area}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</label>
                  <p className="text-sm sm:text-lg font-bold text-slate-700 uppercase">{selectedPTA.prioridade}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                  <div className="flex items-center gap-2 text-sm sm:text-lg font-bold text-slate-700">
                    <CalendarIcon size={18} className="text-slate-400" />
                    {new Date(selectedPTA.data).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</label>
                  <div className="flex items-center gap-2 text-sm sm:text-lg font-bold text-slate-700">
                    <Clock size={18} className="text-slate-400" />
                    {selectedPTA.hora_inicio} - {selectedPTA.hora_fim}
                  </div>
                </div>

                {selectedPTA.descricao && (
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</label>
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 text-sm sm:text-base font-medium text-slate-600 italic">
                      "{selectedPTA.descricao}"
                    </div>
                  </div>
                )}

                {selectedPTA.status === 'pendente' && (
                  <div className="sm:col-span-2 bg-yellow-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-yellow-100 flex items-start gap-3 sm:gap-4">
                    <Info className="text-yellow-600 shrink-0 sm:w-6 sm:h-6" size={20} />
                    <p className="text-[10px] sm:text-xs font-bold text-yellow-700 leading-relaxed uppercase">
                      Já existe um agendamento para este período. Gentileza negociar priorização com o solicitante responsável e alinhar com Pedro Sacramento - ITF.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50/50 shrink-0">
              <button 
                onClick={() => {
                  setPasswordAction('delete');
                  setIsPasswordModalOpen(true);
                }}
                className="w-full sm:flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm order-3 sm:order-1"
              >
                <Trash2 size={18} />
                EXCLUIR
              </button>

              <button 
                onClick={() => {
                  setPasswordAction('edit');
                  setIsPasswordModalOpen(true);
                }}
                className="w-full sm:flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-black py-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm order-2 sm:order-2"
              >
                <Plus size={18} />
                EDITAR
              </button>
              
              {selectedPTA.status === 'pendente' && (
                <button 
                  onClick={() => {
                    setPasswordAction('approve');
                    setIsPasswordModalOpen(true);
                  }}
                  className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm order-1 sm:order-3"
                >
                  <CheckCircle2 size={18} />
                  APROVAR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handlePasswordSubmit}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-calendar .fc {
          --fc-border-color: #f1f5f9;
          --fc-today-bg-color: #eff6ff;
          font-family: 'Inter', sans-serif;
        }
        .custom-calendar .fc-col-header-cell {
          padding: 16px 0;
          background: #fff;
          border: none !important;
          border-bottom: 2px solid #f1f5f9 !important;
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
          color: #3b82f6;
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
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
          transition: all 0.2s;
          border-width: 0 0 0 4px !important;
          margin: 2px !important;
        }
        .custom-calendar .fc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.12);
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
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
          color: #fff !important;
        }
        .fc-multimonth {
          border: none !important;
          background: transparent !important;
        }
        .fc-multimonth-month {
          border: 1px solid #f1f5f9 !important;
          border-radius: 16px !important;
          margin: 4px !important;
          padding: 8px !important;
          background: #fff !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;
          flex: 1 1 300px !important;
          min-width: 280px !important;
        }
        .fc-multimonth-title {
          font-weight: 900 !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          color: #1e293b !important;
          margin-bottom: 4px !important;
          text-align: center !important;
        }
        .fc-multimonth-daygrid-table {
          font-size: 9px !important;
        }
        .fc-multimonth-daygrid-table th {
          font-weight: 800 !important;
          color: #94a3b8 !important;
          text-transform: uppercase !important;
          font-size: 7px !important;
          padding: 4px 0 !important;
        }
        /* Dot styles for Year View */
        .fc-multimonth .fc-daygrid-event {
          padding: 0 !important;
          margin: 0 !important;
          width: 9px !important;
          height: 9px !important;
          border-radius: 50% !important;
          border: none !important;
          font-size: 0 !important;
          display: inline-block !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
        }
        .fc-multimonth .event-status-aprovado {
          background-color: #22c55e !important;
        }
        .fc-multimonth .event-status-pendente {
          background-color: #eab308 !important;
        }
        .fc-multimonth .fc-event-title {
          display: none !important;
        }
        .fc-multimonth .fc-daygrid-event-h-hook {
          background: transparent !important;
        }
        .fc-multimonth .fc-daygrid-day-events {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          justify-content: center !important;
          padding-bottom: 6px !important;
          margin-top: auto !important;
          width: 100% !important;
        }
        .fc-multimonth .fc-daygrid-day-frame {
          min-height: 52px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 4px 0 !important;
        }
        .fc-multimonth .fc-daygrid-day-top {
          flex-direction: row !important;
          justify-content: center !important;
          margin-bottom: 0 !important;
          width: 100% !important;
          height: auto !important;
        }
        .fc-multimonth .fc-daygrid-day-number {
          font-weight: 800 !important;
          font-size: 13px !important;
          padding: 4px 8px !important;
          position: relative !important;
          z-index: 1 !important;
          color: #1e293b !important;
          line-height: 1 !important;
        }
        .fc-multimonth .fc-day-today {
          background: #eff6ff !important;
        }
        .fc-multimonth .fc-day-today .fc-daygrid-day-number {
          color: #3b82f6 !important;
          background: #dbeafe !important;
          border-radius: 4px !important;
        }
        .custom-calendar .fc-theme-standard td, .custom-calendar .fc-theme-standard th {
          border-color: #f1f5f9;
        }
      `}} />
    </div>
  );
}
