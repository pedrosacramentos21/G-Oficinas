import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Calendar as CalendarIcon, 
  LayoutGrid, 
  X, 
  Clock, 
  User, 
  MapPin, 
  TrendingUp, 
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Info,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';
import PasswordModal from '../components/PasswordModal';

const STATUS_OPTIONS = ['Não planejada', 'Planejada', 'Concluída'];

export default function Armstrong() {
  const { 
    armstrongManutencoes, 
    armstrongPCMAreas, 
    armstrongBacklog,
    fetchArmstrong,
    addArmstrongManutencao,
    updateArmstrongManutencao,
    deleteArmstrongManutencao,
    addArmstrongPCMArea,
    deleteArmstrongPCMArea,
    addArmstrongBacklog,
    updateArmstrongBacklog,
    deleteArmstrongBacklog,
    batchDeleteArmstrongManutencoes,
    batchDeleteArmstrongBacklog
  } = useStore();

  const [activeTab, setActiveTab] = useState<'calendario' | 'backlog'>('calendario');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'manutencao' | 'details'>('manutencao');
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef<any>(null);
  const [addingPCMArea, setAddingPCMArea] = useState<{ date: string, value: string } | null>(null);
  const pcmInputRef = useRef<HTMLInputElement>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, id: number | null, ids?: number[], action: 'edit' | 'delete' | 'backlog-edit' | 'backlog-delete' | 'batch-delete' | 'backlog-batch-delete' }>({
    isOpen: false,
    id: null,
    action: 'edit'
  });

  const [formData, setFormData] = useState({
    titulo: '',
    area: '',
    equipamento: '',
    responsavel: '',
    data: '',
    hora_inicio: '07:00',
    hora_fim: '08:00',
    descricao: '',
    observacoes: '',
    impacto_energetico: '',
    investimento_estimado: '',
    status: 'Planejada'
  });

  useEffect(() => {
    fetchArmstrong();
  }, [fetchArmstrong]);

  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const openNewModal = () => {
    setSelectedItem(null);
    setModalType('manutencao');
    setFormData({
      titulo: '',
      area: '',
      equipamento: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
      hora_inicio: '07:00',
      hora_fim: '08:00',
      descricao: '',
      observacoes: '',
      impacto_energetico: '',
      investimento_estimado: '',
      status: 'Planejada'
    });
    setIsModalOpen(true);
  };

  const openDetailsModal = (item: any) => {
    setSelectedItem(item);
    setModalType('details');
    setFormData({
      ...item,
      data: item.data || item.data_prevista || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem && modalType === 'details') {
        // This is handled via password modal for existing interventions
        return;
      }
      
      // Add to calendar
      await addArmstrongManutencao(formData);
      
      // Sync with backlog
      const existingBacklog = armstrongBacklog.find(b => b.titulo === formData.titulo && b.area === formData.area);
      
      if (!selectedItem && !existingBacklog) {
        await addArmstrongBacklog({
          area: formData.area,
          titulo: formData.titulo,
          impacto_energetico: formData.impacto_energetico,
          investimento_estimado: formData.investimento_estimado,
          data_prevista: formData.data,
          status: formData.status
        });
      } else if (selectedItem && !selectedItem.hora_inicio) {
        // This was a backlog item being scheduled
        await updateArmstrongBacklog(selectedItem.id, { status: formData.status }, 'Itf2026');
      } else if (existingBacklog) {
        // Update existing backlog item status
        await updateArmstrongBacklog(existingBacklog.id, { status: formData.status }, 'Itf2026');
      }

      setIsModalOpen(false);
      setSelectedItem(null);
      fetchArmstrong();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    try {
      const { id: _, created_at: __, ...updates } = formData;
      
      if (passwordModal.action === 'edit') {
        await updateArmstrongManutencao(passwordModal.id!, updates, password);
        // Sync with backlog
        const existingBacklog = armstrongBacklog.find(b => b.titulo === formData.titulo && b.area === formData.area);
        if (existingBacklog) {
          await updateArmstrongBacklog(existingBacklog.id, { status: formData.status, data_prevista: formData.data }, password);
        }
      } else if (passwordModal.action === 'delete') {
        await deleteArmstrongManutencao(passwordModal.id!, password);
      } else if (passwordModal.action === 'backlog-edit') {
        const backlogUpdates = {
          titulo: formData.titulo,
          area: formData.area,
          impacto_energetico: formData.impacto_energetico,
          investimento_estimado: formData.investimento_estimado,
          data_prevista: formData.data,
          status: formData.status
        };
        await updateArmstrongBacklog(passwordModal.id!, backlogUpdates, password);
        // Sync with calendar
        const existingManutencao = armstrongManutencoes.find(m => m.titulo === formData.titulo && m.area === formData.area);
        if (existingManutencao) {
          await updateArmstrongManutencao(existingManutencao.id, { status: formData.status, data: formData.data }, password);
        }
      } else if (passwordModal.action === 'backlog-delete') {
        await deleteArmstrongBacklog(passwordModal.id!, password);
      } else if (passwordModal.action === 'batch-delete') {
        await batchDeleteArmstrongManutencoes(passwordModal.ids!, password);
        setSelectionMode(false);
        setSelectedIds([]);
      } else if (passwordModal.action === 'backlog-batch-delete') {
        await batchDeleteArmstrongBacklog(passwordModal.ids!, password);
        setSelectionMode(false);
        setSelectedIds([]);
      }
      
      await fetchArmstrong();
      setPasswordModal({ ...passwordModal, isOpen: false });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const itemId = parseInt(draggableId);
    
    const item = armstrongBacklog.find(b => b.id === itemId);
    if (!item || item.status === newStatus) return;

    try {
      await updateArmstrongBacklog(itemId, { status: newStatus }, 'Itf2026');
      
      // Sync with calendar if exists
      const existingManutencao = armstrongManutencoes.find(m => m.titulo === item.titulo && m.area === item.area);
      if (existingManutencao) {
        await updateArmstrongManutencao(existingManutencao.id, { status: newStatus }, 'Itf2026');
      }
      
      fetchArmstrong();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Calendar Events
  const events = armstrongManutencoes.map(m => ({
    id: String(m.id),
    title: m.titulo || m.descricao || 'Intervenção',
    start: `${m.data}T${m.hora_inicio}`,
    end: `${m.data}T${m.hora_fim}`,
    backgroundColor: m.status === 'Concluída' ? '#dcfce7' : (m.status === 'Planejada' ? '#fef9c3' : '#fee2e2'),
    borderColor: m.status === 'Concluída' ? '#22c55e' : (m.status === 'Planejada' ? '#eab308' : '#ef4444'),
    textColor: '#1e293b',
    extendedProps: m
  }));

  // PCM Areas for the current week
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(currentDate);

  const handleAddPCMAreaTag = async (date: string) => {
    if (addingPCMArea?.date === date && addingPCMArea.value.trim()) {
      await addArmstrongPCMArea({ data: date, area: addingPCMArea.value.trim() });
      setAddingPCMArea(null);
    } else {
      setAddingPCMArea({ date, value: '' });
      setTimeout(() => pcmInputRef.current?.focus(), 100);
    }
  };

  const handlePCMAreaKeyDown = (e: React.KeyboardEvent, date: string) => {
    if (e.key === 'Enter') {
      handleAddPCMAreaTag(date);
    } else if (e.key === 'Escape') {
      setAddingPCMArea(null);
    }
  };

  // Backlog Indicators
  const pendingBacklog = armstrongBacklog.filter(b => b.status !== 'Concluída');
  const totalGain = armstrongBacklog.reduce((sum, b) => sum + (parseFloat(b.impacto_energetico) || 0), 0);
  const totalInvestment = armstrongBacklog.reduce((sum, b) => sum + (parseFloat(b.investimento_estimado?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0') || 0), 0);

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-orange-500 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/20">
            <Flame className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Armstrong (Vapor)</h1>
            <p className="text-slate-500 font-bold mt-0.5 md:mt-1 uppercase tracking-widest text-[8px] md:text-[10px]">Gestão de purgadores e sistemas de vapor</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-1 md:gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={() => {
                setActiveTab('calendario');
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg font-black text-[9px] md:text-[10px] transition-all",
                activeTab === 'calendario' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <CalendarIcon size={14} />
              CALENDÁRIO
            </button>
            <button 
              onClick={() => {
                setActiveTab('backlog');
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg font-black text-[9px] md:text-[10px] transition-all",
                activeTab === 'backlog' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid size={14} />
              BACKLOG
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectionMode ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds([]);
                  }}
                  className="flex-1 sm:flex-none bg-slate-200 hover:bg-slate-300 text-slate-600 font-black px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-[9px] md:text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => setPasswordModal({ 
                    isOpen: true, 
                    ids: selectedIds, 
                    action: activeTab === 'calendario' ? 'batch-delete' : 'backlog-batch-delete',
                    id: null
                  })}
                  disabled={selectedIds.length === 0}
                  className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white font-black px-3 md:px-4 py-2.5 md:py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[9px] md:text-[10px] uppercase tracking-widest"
                >
                  <Trash2 size={14} />
                  Excluir ({selectedIds.length})
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectionMode(true)}
                className="flex-1 sm:flex-none bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <CheckSquare size={14} />
                Selecionar
              </button>
            )}
            <button 
              onClick={openNewModal}
              className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white font-black px-4 md:px-6 py-2.5 md:py-3 rounded-xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-[10px] md:text-xs"
            >
              <Plus size={18} />
              Nova Manutenção
            </button>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'calendario' ? (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* PCM Areas Panel */}
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 p-3 md:p-4 shrink-0">
            <h2 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
              <AlertCircle size={12} className="text-orange-500" />
              Áreas em PCM (Parada de Manutenção)
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-3">
              {weekDays.map((day, idx) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayName = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][idx];
                const areas = armstrongPCMAreas.filter(a => a.data === dateStr);
                
                return (
                  <div key={idx} className={cn("flex flex-col gap-1 md:gap-1.5", idx >= 4 && "hidden sm:flex")}>
                    <div className="text-center py-0.5 md:py-1 bg-slate-50 rounded-lg">
                      <span className="text-[8px] md:text-[9px] font-black text-slate-500">{dayName}</span>
                    </div>
                    <div className="min-h-[50px] md:min-h-[60px] bg-slate-50/50 rounded-xl p-1 md:p-1.5 border border-dashed border-slate-200 flex flex-wrap gap-1 content-start relative group">
                      {areas.map(a => (
                        <div key={a.id} className="relative z-10 bg-white border border-slate-200 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg flex items-center gap-1 shadow-sm">
                          <span className="text-[8px] md:text-[9px] font-bold text-slate-700 uppercase">{a.area}</span>
                          <button onClick={() => deleteArmstrongPCMArea(a.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      
                      {addingPCMArea?.date === dateStr ? (
                        <div className="w-full">
                          <input
                            ref={pcmInputRef}
                            type="text"
                            className="w-full bg-white border border-orange-500 rounded-lg px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[9px] font-bold uppercase focus:outline-none"
                            value={addingPCMArea.value}
                            onChange={(e) => setAddingPCMArea({ ...addingPCMArea, value: e.target.value })}
                            onKeyDown={(e) => handlePCMAreaKeyDown(e, dateStr)}
                            onBlur={() => {
                              if (!addingPCMArea.value.trim()) setAddingPCMArea(null);
                            }}
                            placeholder="ÁREA..."
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAddPCMAreaTag(dateStr)}
                          className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center"
                          title="Adicionar Área"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 p-2 md:p-4 overflow-hidden flex flex-col custom-calendar min-h-[400px]">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
              locale={ptBrLocale}
              headerToolbar={false}
              events={events}
              slotMinTime="07:00:00"
              slotMaxTime="18:00:00"
              allDaySlot={false}
              height="100%"
              expandRows={true}
              stickyHeaderDates={true}
              slotDuration="01:00:00"
              eventClick={(info) => openDetailsModal(info.event.extendedProps)}
              eventContent={(eventInfo) => {
                const data = eventInfo.event.extendedProps;
                const isSelected = selectedIds.includes(data.id);
                return (
                  <div 
                    onClick={(e) => {
                      if (selectionMode) {
                        e.stopPropagation();
                        toggleSelection(data.id);
                      }
                    }}
                    className={cn(
                      "p-1 md:p-2 h-full flex flex-col justify-between overflow-hidden border-l-2 md:border-l-4 transition-all relative",
                      data.status === 'Concluída' ? "border-green-500 bg-green-50/50" : 
                      data.status === 'Planejada' ? "border-yellow-500 bg-yellow-50/50" : 
                      "border-red-500 bg-red-50/50",
                      isSelected && "ring-2 ring-orange-500 ring-offset-1"
                    )}
                  >
                    {selectionMode && (
                      <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                        {isSelected ? (
                          <CheckSquare size={10} className="text-orange-500 md:w-3 md:h-3" />
                        ) : (
                          <Square size={10} className="text-slate-300 md:w-3 md:h-3" />
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5 md:space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-[7px] md:text-[8px] font-black uppercase tracking-tighter truncate",
                          data.status === 'Concluída' ? "text-green-600" : 
                          data.status === 'Planejada' ? "text-yellow-600" : 
                          "text-red-600"
                        )}>
                          {data.area}
                        </span>
                        <span className={cn(
                          "text-[6px] md:text-[7px] font-black px-0.5 md:px-1 rounded uppercase text-white shrink-0",
                          data.status === 'Concluída' ? "bg-green-500" : 
                          data.status === 'Planejada' ? "bg-yellow-500" : 
                          "bg-red-500"
                        )}>
                          {data.status}
                        </span>
                      </div>
                      <div className="font-black text-[8px] md:text-[10px] text-slate-900 uppercase leading-tight line-clamp-2">
                        {data.equipamento}
                      </div>
                      <div className="text-[7px] md:text-[9px] text-slate-500 font-medium line-clamp-1">
                        {data.responsavel}
                      </div>
                    </div>
                    <div className="mt-0.5 md:mt-1 pt-0.5 md:pt-1 border-t border-orange-100 hidden md:block">
                      <p className="text-[8px] text-slate-600 font-bold uppercase truncate italic">
                        {data.descricao}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 md:gap-8 overflow-hidden">
          {/* Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6">
              <div className="bg-blue-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-blue-500">
                <AlertCircle size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendências em Aberto</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">{pendingBacklog.length}</p>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6">
              <div className="bg-orange-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-orange-500">
                <TrendingUp size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho Total (MJ/hL)</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">{totalGain.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6">
              <div className="bg-green-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-green-500">
                <DollarSign size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Total</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">R$ {totalInvestment.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Backlog Columns */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 overflow-hidden">
              {STATUS_OPTIONS.map(status => (
                <Droppable key={status} droppableId={status}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-3 md:gap-4 bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-[2.5rem] border border-slate-200/50 min-h-0"
                    >
                      <div className="flex items-center justify-between px-2 md:px-4 py-1 md:py-2 shrink-0">
                        <h2 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{status}</h2>
                        <span className="bg-white text-slate-900 text-[9px] md:text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                          {armstrongBacklog.filter(b => b.status === status).length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar space-y-3 md:space-y-4">
                        {armstrongBacklog
                          .filter(b => b.status === status)
                          .map((item, index) => (
                            // @ts-ignore
                            <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => {
                                    if (selectionMode) {
                                      toggleSelection(item.id);
                                    } else {
                                      openDetailsModal(item);
                                    }
                                  }}
                                  className={cn(
                                    "p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border transition-all group cursor-pointer active:scale-[0.98] relative",
                                    status === 'Não planejada' ? "bg-red-50 border-red-100 hover:shadow-red-200/50" :
                                    status === 'Planejada' ? "bg-yellow-50 border-yellow-100 hover:shadow-yellow-200/50" :
                                    "bg-green-50 border-green-100 hover:shadow-green-200/50",
                                    selectedIds.includes(item.id) && "ring-2 ring-orange-500 ring-offset-2"
                                  )}
                                >
                                  {selectionMode && (
                                    <div className="absolute top-3 right-3 md:top-4 md:right-4">
                                      {selectedIds.includes(item.id) ? (
                                        <CheckSquare size={14} className="text-orange-500 md:w-4 md:h-4" />
                                      ) : (
                                        <Square size={14} className="text-slate-300 md:w-4 md:h-4" />
                                      )}
                                    </div>
                                  )}
                                  <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5 md:space-y-1 min-w-0">
                                        <p className={cn(
                                          "text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate",
                                          status === 'Não planejada' ? "text-red-400" :
                                          status === 'Planejada' ? "text-yellow-600" :
                                          "text-green-600"
                                        )}>{item.area}</p>
                                        <h3 className="font-black text-slate-900 text-xs md:text-sm leading-tight uppercase truncate">{item.titulo}</h3>
                                      </div>
                                      {!selectionMode && (
                                        <div className="flex gap-1.5 md:gap-2 shrink-0">
                                          {status !== 'Concluída' && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedItem(item);
                                                setModalType('manutencao');
                                                setFormData({
                                                  ...formData,
                                                  titulo: item.titulo,
                                                  area: item.area,
                                                  impacto_energetico: item.impacto_energetico,
                                                  investimento_estimado: item.investimento_estimado,
                                                  status: 'Planejada',
                                                  data: item.data_prevista || new Date().toISOString().split('T')[0]
                                                });
                                                setIsModalOpen(true);
                                              }}
                                              className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                                              title="Agendar no Calendário"
                                            >
                                              <CalendarIcon size={12} className="md:w-3.5 md:h-3.5" />
                                            </button>
                                          )}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openDetailsModal(item);
                                            }}
                                            className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl text-slate-400 hover:bg-slate-100 transition-all shadow-sm"
                                          >
                                            <Info size={12} className="md:w-3.5 md:h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                      <div className="space-y-0.5 md:space-y-1">
                                        <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Impacto</p>
                                        <p className={cn(
                                          "text-[10px] md:text-xs font-black",
                                          status === 'Não planejada' ? "text-red-600" :
                                          status === 'Planejada' ? "text-yellow-600" :
                                          "text-green-600"
                                        )}>{item.impacto_energetico} MJ/hL</p>
                                      </div>
                                      <div className="space-y-0.5 md:space-y-1">
                                        <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Investimento</p>
                                        <p className="text-[10px] md:text-xs font-black text-green-600">{item.investimento_estimado}</p>
                                      </div>
                                    </div>

                                    <div className="pt-2 md:pt-3 border-t border-black/5 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[9px] font-bold text-slate-500">
                                        <CalendarIcon size={10} className="md:w-3 md:h-3" />
                                        <span>{item.data_prevista ? new Date(item.data_prevista).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                                      </div>
                                      <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-1 transition-transform md:w-3.5 md:h-3.5" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-2 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-orange-500 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/20">
                  {modalType === 'manutencao' ? <Plus className="text-white w-5 h-5 md:w-6 md:h-6" /> : <Info className="text-white w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {modalType === 'manutencao' ? 'Nova Manutenção' : 'Detalhes da Intervenção'}
                  </h2>
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">
                    {modalType === 'manutencao' ? 'Planejamento de Sistema de Vapor' : 'Informações Completas'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="md:col-span-2 space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Intervenção</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                      placeholder="Ex: Troca de Purgador"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                      placeholder="Ex: Brassagem 1"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipamento</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.equipamento}
                      onChange={e => setFormData({...formData, equipamento: e.target.value})}
                      placeholder="Ex: Purgador P12"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.responsavel}
                      onChange={e => setFormData({...formData, responsavel: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.data}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário Início</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.hora_inicio}
                      onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                    >
                      {Array.from({ length: 13 }, (_, i) => {
                        const h = String(i + 7).padStart(2, '0');
                        return <option key={h} value={`${h}:00`}>{h}:00</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário Término</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm md:text-base"
                      value={formData.hora_fim}
                      onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                    >
                      {Array.from({ length: 13 }, (_, i) => {
                        const h = String(i + 7).padStart(2, '0');
                        return <option key={h} value={`${h}:00`}>{h}:00</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impacto Energético (MJ/hL)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all"
                      value={formData.impacto_energetico}
                      onChange={e => setFormData({...formData, impacto_energetico: e.target.value})}
                      placeholder="Ex: 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Investimento Estimado (R$)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all"
                      value={formData.investimento_estimado}
                      onChange={e => setFormData({...formData, investimento_estimado: e.target.value})}
                      placeholder="Ex: 25.000,00"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({...formData, status: s})}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border",
                            formData.status === s 
                              ? (s === 'Não planejada' ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" :
                                 s === 'Planejada' ? "bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/20" :
                                 "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20")
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição da Intervenção</label>
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-none"
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all h-20 resize-none"
                      value={formData.observacoes}
                      onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  {modalType === 'details' ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => setPasswordModal({ isOpen: true, id: selectedItem.id, action: 'delete' })}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-100"
                      >
                        <Trash2 size={18} />
                        EXCLUIR
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPasswordModal({ isOpen: true, id: selectedItem.id, action: 'edit' })}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        SALVAR ALTERAÇÕES
                      </button>
                    </>
                  ) : (
                    <button 
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em]"
                    >
                      <CheckCircle2 size={20} />
                      Salvar Intervenção
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <PasswordModal 
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        onConfirm={handlePasswordConfirm}
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
        }
        .custom-calendar .fc-timegrid-slot {
          height: 60px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .custom-calendar .fc-timegrid-slot-label-cushion {
          font-weight: 700;
          font-size: 12px;
          color: #94a3b8;
        }
        .custom-calendar .fc-event {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(242, 92, 5, 0.08);
          transition: all 0.2s;
          border: none !important;
          margin: 2px !important;
        }
        .custom-calendar .fc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(242, 92, 5, 0.12);
          z-index: 50;
        }
      `}} />
    </div>
  );
}
