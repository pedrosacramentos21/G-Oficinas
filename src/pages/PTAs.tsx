import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useStore } from '../store';
import { Plus, Calendar as CalendarIcon, User, Clock, CheckCircle2, Trash2, Truck, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
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
  const calendarRef = useRef<FullCalendar>(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');

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
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(pta.data);
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
      backgroundColor: isSelected ? '#005596' : (p.status === 'aprovado' ? (equip?.color || '#005596') : '#FFD100'),
      borderColor: isSelected ? '#003d6b' : (p.status === 'aprovado' ? (equip?.color || '#005596') : '#eab308'),
      textColor: p.status === 'pendente' && !isSelected ? '#1e293b' : '#ffffff',
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
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
    <div className="flex flex-col gap-2 p-2 h-screen overflow-hidden bg-[#f4f7f9]">
      {/* Compact Header & Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-ambev-blue p-2 rounded-lg shadow-sm shadow-ambev-blue/20 shrink-0">
              <Truck className="text-ambev-gold w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">PTAs</h1>
              <p className="text-slate-400 font-bold mt-0.5 uppercase tracking-widest text-[7px]">Plataformas de Trabalho em Altura</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={navigateToNextPending}
              className="flex items-center gap-1.5 bg-ambev-blue/5 px-2 py-1 rounded-lg border border-ambev-blue/10 hover:bg-ambev-blue/10 transition-all active:scale-95"
            >
              <span className="text-[8px] font-black text-ambev-blue uppercase tracking-widest">Pendentes:</span>
              <span className="bg-ambev-blue text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                {pendingPTAs.length}
              </span>
            </button>

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
                onClick={() => {
                  setIsEditing(false);
                  setFormData(INITIAL_FORM_DATA);
                  setIsModalOpen(true);
                }}
                className="bg-ambev-blue hover:bg-ambev-blue/90 text-white font-black px-3 sm:px-4 py-1.5 rounded-lg shadow-sm shadow-ambev-blue/20 transition-all flex items-center gap-1.5 active:scale-95 uppercase tracking-widest text-[8px] sm:text-[9px]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Nova Solicitação</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 ml-auto sm:ml-1">
              <button 
                onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')} 
                className="px-1.5 sm:px-2 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
              >
                Mês
              </button>
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

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-0.5 flex flex-col custom-calendar high-slots min-h-0 !overflow-visible">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={currentView}
          locale={ptBrLocale}
          headerToolbar={false}
          events={events}
          scrollTime="08:00:00"
          allDaySlot={false}
          height="100%"
          expandRows={currentView !== 'dayGridMonth'}
          stickyHeaderDates={currentView !== 'dayGridMonth'}
          slotDuration="01:00:00"
          dayMaxEvents={true}
          eventMaxStack={2}
          handleWindowResize={window.innerWidth >= 640}
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
          eventClick={handleEventClick}
          eventContent={(eventInfo) => {
            const data = eventInfo.event.extendedProps;
            const equip = EQUIPAMENTOS.find(e => e.name === data.equipamento);
            const isSelected = selectedIds.includes(data.id);
            const isMonthView = eventInfo.view.type === 'dayGridMonth';
            const isWeekView = eventInfo.view.type === 'timeGridWeek';
            const isMobile = window.innerWidth < 640;
            
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
                  data.status === 'aprovado' 
                    ? (equip?.id === 'articulada' ? "border-blue-500 bg-blue-50/40" : "border-purple-500 bg-purple-50/40")
                    : "border-yellow-500 bg-yellow-50/40",
                  isSelected && "ring-2 ring-blue-500 ring-offset-0",
                  (isMonthView || (isWeekView && isMobile)) && "p-0.5 gap-0"
                )}>
                {isSelectionMode && (
                  <div className="absolute top-0.5 right-0.5">
                    {isSelected ? (
                      <CheckCircle2 size={isMobile ? 6 : 8} className="text-blue-500" />
                    ) : (
                      <div className={cn("border border-slate-300 rounded-sm", isMobile ? "w-1.5 h-1.5" : "w-2 h-2")} />
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-1">
                  <span className={cn(
                    "text-[6px] font-black uppercase tracking-tighter truncate px-1 rounded",
                    isSelected ? "text-white bg-white/20" : "text-blue-600 bg-blue-50",
                    (isMonthView || (isWeekView && isMobile)) && "text-[5px] px-0.5"
                  )}>
                    {data.area}
                  </span>
                  {!isMobile && (
                    <span className={cn(
                      "text-[5px] font-black px-0.5 rounded uppercase text-white shrink-0",
                      data.status === 'aprovado' ? "bg-green-500" : "bg-yellow-500"
                    )}>
                      {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                    </span>
                  )}
                </div>

                <div className={cn(
                  "font-black text-[9px] uppercase leading-none line-clamp-1",
                  isSelected ? "text-white" : "text-slate-900",
                  (isMonthView || (isWeekView && isMobile)) && "text-[7px]"
                )}>
                  {data.responsavel}
                </div>

                {!(isMonthView || (isWeekView && isMobile)) && (
                  <div className={cn(
                    "text-[7px] font-bold line-clamp-1",
                    isSelected ? "text-white/80" : "text-slate-500"
                  )}>
                    {data.equipamento}
                  </div>
                )}

                {!(isMonthView || (isWeekView && isMobile)) && (
                  <div className="details-on-hover">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded uppercase text-white",
                        data.status === 'aprovado' ? "bg-green-500" : "bg-yellow-500"
                      )}>
                        {data.status === 'aprovado' ? 'APROVADO' : 'PENDENTE'}
                      </span>
                      <span className="text-[11px] font-black text-slate-900 uppercase truncate">
                        {data.responsavel}
                      </span>
                    </div>

                    <div className="info-grid">
                      <div>
                        <span className="label">Área</span>
                        <p>{data.area}</p>
                      </div>
                      <div>
                        <span className="label">Equipamento</span>
                        <p>{data.equipamento}</p>
                      </div>
                      <div>
                        <span className="label">Responsável</span>
                        <p>{data.responsavel}</p>
                      </div>
                      <div>
                        <span className="label">Prioridade</span>
                        <p className={cn(
                          "font-black",
                          data.prioridade === 'Alta' ? "text-red-500" :
                          data.prioridade === 'Média' ? "text-amber-500" :
                          "text-blue-500"
                        )}>{data.prioridade || '-'}</p>
                      </div>
                      <div>
                        <span className="label">Data</span>
                        <p>{formatDate(data.data)}</p>
                      </div>
                      <div>
                        <span className="label">Horário</span>
                        <p>{data.hora_inicio} - {data.hora_fim}</p>
                      </div>
                    </div>
                    <div>
                      <span className="label">Descrição Detalhada</span>
                      <p className="text-slate-600 italic">{data.descricao || 'Sem descrição'}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-auto">
                  <span className={cn(
                    "text-[5px] font-black px-0.5 rounded uppercase text-white",
                    equip?.id === 'articulada' ? "bg-blue-500" : "bg-purple-500"
                  )}>
                    {data.equipamento ? data.equipamento.split(' ')[1] : 'PTA'}
                  </span>
                  <div className={cn(
                    "flex items-center gap-0.5",
                    isSelected ? "text-white/60" : "text-slate-400"
                  )}>
                    <Clock size={6} />
                    <span className="text-[6px] font-bold">{data.hora_inicio}</span>
                  </div>
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
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
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
                    {formatDate(selectedPTA.data)}
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
    </div>
  );
}
