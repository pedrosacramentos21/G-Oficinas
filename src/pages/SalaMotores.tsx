import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { 
  Plus, Zap, User, Calendar, DollarSign, CheckCircle2, Clock, Play, 
  CheckSquare, Square, Trash2, Info, Edit3, X, AlertCircle, PackageCheck,
  History, ChevronRight, Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import PasswordModal from '../components/PasswordModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const DraggableAny = Draggable as any;
const DroppableAny = Droppable as any;

const COLUMNS = [
  { id: 'pendente', name: 'Pendente', color: 'bg-yellow-500' },
  { id: 'em_andamento', name: 'Em andamento', color: 'bg-blue-500' },
  { id: 'concluido', name: 'Concluído', color: 'bg-green-500' },
  { id: 'entregue', name: 'Entregue', color: 'bg-purple-500' }
];

const MONTHS = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Maio' },
  { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' },
  { value: 10, label: 'Novembro' },
  { value: 11, label: 'Dezembro' }
];

const AREAS_MOTORES = [
  'Packaging',
  'Processo Refri',
  'Processo Cerveja',
  'Meio ambiente',
  'Utilidades',
  'Subprodutos',
  'ADM',
  'Outras áreas'
];

const SUB_AREAS_MOTORES = [
  '', '501', '502', '503', '511', '512', '561', '562', 'Xaroparia', 'Dep. Açúcar',
  'Xaroparia Simples', 'Xaroparia Composta', 'ETA Refri', 'Brassagem 1',
  'Brassagem 2', 'Adegas', 'Adega de fermento', 'Adega de pressão',
  'Ferm. e maturação 01', 'Ferm. e maturação 02', 'Filtração 1', 'Filtração 2',
  'Resfriador de mosto 1', 'Resfriador de mosto 2', 'ETA', 'ETEI',
  'Usina de CO2', 'Secador de fermento'
];

export default function SalaMotores() {
  const { 
    salaMotores, fetchSalaMotores, addAtividadeSalaMotores, 
    updateStatusSalaMotores, updateAtividadeSalaMotores, 
    deleteAtividadeSalaMotores, batchDeleteSalaMotores 
  } = useStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [passwordAction, setPasswordAction] = useState<{ type: 'delete' | 'edit' | 'batch-delete', id?: number | null }>({ type: 'delete' });

  const [formData, setFormData] = useState({
    titulo: '',
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
    custo_evitado: 0,
    causa_raiz: '',
    observacoes: '',
    area: AREAS_MOTORES[0],
    sub_area: '',
    tag_motor: ''
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalaMotores();
  }, [fetchSalaMotores]);

  const filteredActivities = salaMotores.filter(a => {
    // Atividades Pendentes e Em Andamento sempre aparecem, pois podem transitar entre meses
    if (a.status === 'pendente' || a.status === 'em_andamento') return true;

    // Para Concluído e Entregue, filtramos pelo mês em que a ação foi finalizada
    // Priorizamos as datas de conclusão/entrega automáticas, senão usamos a data de registro
    const dateToFilter = a.status === 'entregue' 
      ? (a.data_entrega || a.data) 
      : (a.status === 'concluido' ? (a.data_conclusao || a.data) : a.data);

    if (!dateToFilter) return false;
    
    let year, month;
    if (dateToFilter.includes('T')) {
      // Formato ISO (TIMESTAMPTZ do banco)
      const d = new Date(dateToFilter);
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else {
      // Formato YYYY-MM-DD (Input date)
      const parts = dateToFilter.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    }
    
    return (month - 1) === selectedMonth && year === selectedYear;
  });

  const totalCustoEvitadoMes = filteredActivities
    .filter(a => (a.status === 'concluido' || a.status === 'entregue'))
    .reduce((acc, curr) => acc + curr.custo_evitado, 0);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const activityId = parseInt(draggableId);
    const newStatus = destination.droppableId as any;

    try {
      await updateStatusSalaMotores(activityId, newStatus);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAtividadeSalaMotores(formData);
      setIsModalOpen(false);
      setFormData({
        titulo: '',
        responsavel: '',
        data: new Date().toISOString().split('T')[0],
        custo_evitado: 0,
        causa_raiz: '',
        observacoes: '',
        area: AREAS_MOTORES[0],
        sub_area: '',
        tag_motor: ''
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAction({ type: 'edit', id: selectedActivity.id });
    setIsPasswordModalOpen(true);
  };

  const handlePasswordConfirm = async (password: string) => {
    try {
      if (passwordAction.type === 'delete' && passwordAction.id) {
        await deleteAtividadeSalaMotores(passwordAction.id, password);
        setIsDetailsModalOpen(false);
      } else if (passwordAction.type === 'edit' && passwordAction.id) {
        await updateAtividadeSalaMotores(passwordAction.id, selectedActivity, password);
        setIsDetailsModalOpen(false);
      } else if (passwordAction.type === 'batch-delete') {
        await batchDeleteSalaMotores(selectedIds, password);
        setSelectionMode(false);
        setSelectedIds([]);
      }
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCardClick = (activity: any) => {
    if (selectionMode) {
      toggleSelection(activity.id);
    } else {
      setSelectedActivity({ ...activity });
      setIsDetailsModalOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 lg:gap-8 animate-in fade-in duration-500 overflow-hidden relative">
      <div className="shrink-0 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-orange-500 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/20">
            <Zap className="text-white md:w-6 md:h-6" size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight uppercase">SALA DE MOTORES</h1>
            <p className="text-[10px] md:text-sm text-gray-500 font-medium mt-0.5 md:mt-1 uppercase tracking-widest">Gestão de intervenções e atividades</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 md:gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
            <Filter size={14} className="text-gray-400" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="bg-white px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 md:gap-4 flex-1 lg:flex-none">
            <div className="bg-green-50 p-1.5 md:p-2 rounded-lg">
              <DollarSign className="text-green-500 md:w-5 md:h-5" size={16} />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo evitado no mês</p>
              <p className="text-sm md:text-lg font-black text-gray-900">R$ {totalCustoEvitadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectionMode ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds([]);
                  }}
                  className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-[8px] md:text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setPasswordAction({ type: 'batch-delete' });
                    setIsPasswordModalOpen(true);
                  }}
                  disabled={selectedIds.length === 0}
                  className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white font-black px-3 md:px-4 py-2 md:py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[8px] md:text-[10px] uppercase tracking-widest"
                >
                  <Trash2 size={12} />
                  Excluir ({selectedIds.length})
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectionMode(true)}
                className="flex-1 sm:flex-none bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-[8px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2"
              >
                <CheckSquare size={12} className="md:w-[14px] md:h-[14px]" />
                Selecionar
              </button>
            )}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 lg:flex-none bg-orange-500 hover:bg-orange-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 whitespace-nowrap text-[10px] md:text-base uppercase tracking-widest"
            >
              <Plus size={16} className="md:w-5 md:h-5" />
              Nova Atividade
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 overflow-y-auto lg:overflow-hidden p-1 custom-scrollbar">
          {COLUMNS.map(column => (
            <DroppableAny key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "flex flex-col gap-3 md:gap-4 bg-gray-100/50 p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-gray-200/50 min-h-[300px] lg:min-h-0 transition-colors",
                    snapshot.isDraggingOver && "bg-orange-50/50 border-orange-200"
                  )}
                >
                  <div className="flex items-center justify-between px-2 md:px-4 py-1 md:py-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", column.color)} />
                      <h2 className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] md:tracking-[0.2em]">{column.name}</h2>
                    </div>
                    <span className="bg-white text-gray-900 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-sm">
                      {filteredActivities.filter(a => a.status === column.id).length}
                    </span>
                  </div>

                  <div className="flex-1 lg:overflow-y-auto space-y-3 md:space-y-4 pr-1 md:pr-2 custom-scrollbar">
                    {filteredActivities
                      .filter(a => a.status === column.id)
                      .map((item, index) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <DraggableAny key={item.id.toString()} draggableId={item.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleCardClick(item)}
                                className={cn(
                                  "bg-white p-4 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer",
                                  isSelected && "ring-2 ring-orange-500 ring-offset-2 shadow-lg",
                                  snapshot.isDragging && "shadow-2xl ring-2 ring-orange-500 rotate-2"
                                )}
                              >
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 md:w-1.5", column.color)} />
                                
                                {selectionMode && (
                                  <div className="absolute top-2 right-2 z-10">
                                    {isSelected ? (
                                      <CheckSquare size={16} className="text-orange-500" />
                                    ) : (
                                      <Square size={16} className="text-slate-300" />
                                    )}
                                  </div>
                                )}

                                <div className="space-y-3 md:space-y-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1">
                                      <h3 className="font-black text-gray-900 text-xs md:text-sm leading-tight group-hover:text-orange-500 transition-colors uppercase pr-6">
                                        {item.titulo}
                                      </h3>
                                      {item.tag_motor && (
                                        <span className="text-[7px] md:text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                                          TAG: {item.tag_motor}
                                        </span>
                                      )}
                                    </div>
                                    {!selectionMode && (
                                      item.status === 'entregue' ? (
                                        <PackageCheck size={14} className="text-purple-500 shrink-0 md:w-4 md:h-4" />
                                      ) : item.status === 'concluido' ? (
                                        <CheckCircle2 size={14} className="text-green-500 shrink-0 md:w-4 md:h-4" />
                                      ) : item.status === 'em_andamento' ? (
                                        <Play size={14} className="text-blue-500 shrink-0 md:w-4 md:h-4" />
                                      ) : (
                                        <Clock size={14} className="text-yellow-500 shrink-0 md:w-4 md:h-4" />
                                      )
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                                      <User size={10} className="md:w-3 md:h-3" />
                                      <span className="truncate uppercase">{item.responsavel}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold text-gray-400">
                                      <Calendar size={10} className="md:w-3 md:h-3" />
                                      <span>{item.data}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 pt-2 border-t border-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 text-green-600 font-black text-[9px] md:text-[10px]">
                                        <DollarSign size={10} className="md:w-3 md:h-3" />
                                        {item.custo_evitado.toLocaleString('pt-BR')}
                                      </div>
                                      
                                      {!selectionMode && (
                                        <div className="flex gap-1">
                                          {column.id !== 'pendente' && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusSalaMotores(item.id, 'pendente');
                                              }}
                                              className="p-1 md:p-1.5 hover:bg-yellow-50 text-yellow-500 rounded-lg transition-colors"
                                              title="Mover para Pendente"
                                            >
                                              <Clock size={12} className="md:w-3.5 md:h-3.5" />
                                            </button>
                                          )}
                                          {column.id !== 'em_andamento' && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusSalaMotores(item.id, 'em_andamento');
                                              }}
                                              className="p-1 md:p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                                              title="Mover para Em Andamento"
                                            >
                                              <Play size={12} className="md:w-3.5 md:h-3.5" />
                                            </button>
                                          )}
                                          {column.id !== 'concluido' && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusSalaMotores(item.id, 'concluido');
                                              }}
                                              className="p-1 md:p-1.5 hover:bg-green-50 text-green-500 rounded-lg transition-colors"
                                              title="Mover para Concluído"
                                            >
                                              <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />
                                            </button>
                                          )}
                                          {column.id !== 'entregue' && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusSalaMotores(item.id, 'entregue');
                                              }}
                                              className="p-1 md:p-1.5 hover:bg-purple-50 text-purple-500 rounded-lg transition-colors"
                                              title="Mover para Entregue"
                                            >
                                              <PackageCheck size={12} className="md:w-3.5 md:h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {item.data_conclusao && (
                                      <div className="text-[7px] md:text-[8px] font-bold text-green-500 flex items-center gap-1">
                                        <CheckCircle2 size={8} />
                                        CONCLUÍDO EM: {new Date(item.data_conclusao).toLocaleDateString('pt-BR')}
                                      </div>
                                    )}
                                    {item.data_entrega && (
                                      <div className="text-[7px] md:text-[8px] font-bold text-purple-500 flex items-center gap-1">
                                        <PackageCheck size={8} />
                                        ENTREGUE EM: {new Date(item.data_entrega).toLocaleDateString('pt-BR')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DraggableAny>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </DroppableAny>
          ))}
        </div>
      </DragDropContext>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight text-orange-500 uppercase">NOVA ATIVIDADE</h2>
                <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-1.5">Sala de Motores</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 sm:p-3 hover:bg-gray-200 rounded-xl sm:rounded-2xl transition-colors">
                <X size={24} className="text-gray-400 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form id="nova-atividade-form" onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-5 sm:space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título da Atividade</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Área</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base appearance-none"
                        value={formData.area}
                        onChange={e => setFormData({...formData, area: e.target.value})}
                      >
                        {AREAS_MOTORES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sub-Área</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base appearance-none"
                        value={formData.sub_area}
                        onChange={e => setFormData({...formData, sub_area: e.target.value})}
                      >
                        {SUB_AREAS_MOTORES.map(s => <option key={s} value={s}>{s || 'NÃO DEFINIDA'}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">TAG do Motor</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      value={formData.tag_motor}
                      onChange={e => setFormData({...formData, tag_motor: e.target.value})}
                      placeholder="Ex: MTR-01"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</label>
                      <input 
                        type="text"
                        required
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                        value={formData.responsavel}
                        onChange={e => setFormData({...formData, responsavel: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
                      <input 
                        type="date"
                        required
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                        value={formData.data}
                        onChange={e => setFormData({...formData, data: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Custo Evitado (R$)</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                      value={formData.custo_evitado}
                      onChange={e => setFormData({...formData, custo_evitado: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Causa Raiz da Falha</label>
                    <textarea 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base min-h-[100px]"
                      value={formData.causa_raiz}
                      onChange={e => setFormData({...formData, causa_raiz: e.target.value})}
                      placeholder="Descreva a causa raiz..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</label>
                    <textarea 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base min-h-[100px]"
                      value={formData.observacoes}
                      onChange={e => setFormData({...formData, observacoes: e.target.value})}
                      placeholder="Observações adicionais..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50/50 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm order-2 sm:order-1"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  form="nova-atividade-form"
                  className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-orange-500 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/20">
                  <Zap className="text-white sm:w-6 sm:h-6" size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight uppercase">DETALHES DA ATIVIDADE</h2>
                  <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-1.5">Sala de Motores</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setPasswordAction({ type: 'delete', id: selectedActivity.id });
                    setIsPasswordModalOpen(true);
                  }}
                  className="p-2 sm:p-3 hover:bg-red-50 text-red-500 rounded-xl sm:rounded-2xl transition-colors"
                  title="Excluir Atividade"
                >
                  <Trash2 size={24} className="sm:w-6 sm:h-6" />
                </button>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 sm:p-3 hover:bg-gray-200 rounded-xl sm:rounded-2xl transition-colors">
                  <X size={24} className="text-gray-400 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <form id="detalhes-atividade-form" onSubmit={handleEditSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título da Atividade</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base uppercase"
                      value={selectedActivity.titulo}
                      onChange={e => setSelectedActivity({...selectedActivity, titulo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Área</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base appearance-none"
                      value={selectedActivity.area || AREAS_MOTORES[0]}
                      onChange={e => setSelectedActivity({...selectedActivity, area: e.target.value})}
                    >
                      {AREAS_MOTORES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sub-Área</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base appearance-none"
                      value={selectedActivity.sub_area || ''}
                      onChange={e => setSelectedActivity({...selectedActivity, sub_area: e.target.value})}
                    >
                      {SUB_AREAS_MOTORES.map(s => <option key={s} value={s}>{s || 'NÃO DEFINIDA'}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">TAG do Motor</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base uppercase"
                      value={selectedActivity.tag_motor || ''}
                      onChange={e => setSelectedActivity({...selectedActivity, tag_motor: e.target.value})}
                      placeholder="Ex: MTR-01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        required
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 pl-12 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base uppercase"
                        value={selectedActivity.responsavel}
                        onChange={e => setSelectedActivity({...selectedActivity, responsavel: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="date"
                        required
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 pl-12 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                        value={selectedActivity.data}
                        onChange={e => setSelectedActivity({...selectedActivity, data: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Custo Evitado (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                      <input 
                        type="number"
                        required
                        className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 pl-12 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base"
                        value={selectedActivity.custo_evitado}
                        onChange={e => setSelectedActivity({...selectedActivity, custo_evitado: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base appearance-none"
                      value={selectedActivity.status}
                      onChange={e => setSelectedActivity({...selectedActivity, status: e.target.value})}
                    >
                      <option value="pendente">PENDENTE</option>
                      <option value="em_andamento">EM ANDAMENTO</option>
                      <option value="concluido">CONCLUÍDO</option>
                      <option value="entregue">ENTREGUE</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <History size={12} />
                      Histórico de Status
                    </label>
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                      {selectedActivity.historico_status && selectedActivity.historico_status.length > 0 ? (
                        selectedActivity.historico_status.map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-gray-600">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              COLUMNS.find(c => c.id === h.status)?.color || 'bg-gray-300'
                            )} />
                            <span className="uppercase w-24">{COLUMNS.find(c => c.id === h.status)?.name || h.status}</span>
                            <ChevronRight size={12} className="text-gray-300" />
                            <span className="text-gray-400">{new Date(h.data).toLocaleString('pt-BR')}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase italic">Nenhum histórico registrado</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Causa Raiz da Falha</label>
                    <textarea 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base min-h-[100px]"
                      value={selectedActivity.causa_raiz || ''}
                      onChange={e => setSelectedActivity({...selectedActivity, causa_raiz: e.target.value})}
                      placeholder="Descreva a causa raiz..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</label>
                    <textarea 
                      className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-sm sm:text-base min-h-[100px]"
                      value={selectedActivity.observacoes || ''}
                      onChange={e => setSelectedActivity({...selectedActivity, observacoes: e.target.value})}
                      placeholder="Observações adicionais..."
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-100 flex items-start gap-3 sm:gap-4">
                  <Info className="text-blue-500 shrink-0 mt-1" size={20} />
                  <p className="text-[10px] sm:text-xs font-bold text-blue-700 leading-relaxed uppercase">
                    A edição de informações requer autorização via senha mestre para garantir a integridade dos dados registrados.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50/50 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setPasswordAction({ type: 'delete', id: selectedActivity.id });
                    setIsPasswordModalOpen(true);
                  }}
                  className="w-full sm:flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 border border-red-100 order-3 sm:order-1"
                >
                  <Trash2 size={18} />
                  EXCLUIR
                </button>
                <button 
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm order-2 sm:order-2"
                >
                  FECHAR
                </button>
                <button 
                  type="submit"
                  form="detalhes-atividade-form"
                  className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 order-1 sm:order-3"
                >
                  <Edit3 size={18} />
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handlePasswordConfirm}
        onDelete={passwordAction.type === 'delete' ? () => handlePasswordConfirm('Itf2026') : undefined}
      />
    </div>
  );
}
