import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import DeleteChoiceModal from '../components/DeleteChoiceModal';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Snowflake, 
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
  Square,
  BarChart3
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';
import { 
  format, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PasswordModal from '../components/PasswordModal';
import { MultiSelect } from '../components/MultiSelect';

const STATUS_OPTIONS = ['Não planejada', 'Planejada', 'Concluída'];

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

export default function Refrigeracao() {
  const { 
    refrigeracaoManutencoes, 
    refrigeracaoPCMAreas, 
    refrigeracaoBacklog,
    fetchRefrigeracao,
    addRefrigeracaoManutencao,
    updateRefrigeracaoManutencao,
    deleteRefrigeracaoManutencao,
    addRefrigeracaoPCMArea,
    deleteRefrigeracaoPCMArea,
    addRefrigeracaoBacklog,
    updateRefrigeracaoBacklog,
    deleteRefrigeracaoBacklog,
    batchDeleteRefrigeracaoManutencoes,
    batchDeleteRefrigeracaoBacklog
  } = useStore();

  const [activeTab, setActiveTab] = useState<'calendario' | 'backlog' | 'panorama'>('calendario');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'manutencao' | 'details'>('manutencao');
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef<any>(null);
  const [addingPCMArea, setAddingPCMArea] = useState<{ date: string, value: string } | null>(null);
  const pcmInputRef = useRef<HTMLInputElement>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterArea, setFilterArea] = useState<string[]>([]);
  const [filterSubArea, setFilterSubArea] = useState<string[]>([]);
  const [filterTipo, setFilterTipo] = useState<string[]>([]);
  const [filterCriticidade, setFilterCriticidade] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'investimento' | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, id: number | null, ids?: number[], action: 'edit' | 'delete' | 'backlog-edit' | 'backlog-delete' | 'batch-delete' | 'backlog-batch-delete', deleteChoice?: 'backlog-only' | 'both' }>({
    isOpen: false,
    id: null,
    action: 'edit'
  });
  const [deleteChoiceModal, setDeleteChoiceModal] = useState<{ isOpen: boolean, id: number | null, ids: number[] | null }>({
    isOpen: false,
    id: null,
    ids: null
  });

  const [formData, setFormData] = useState({
    titulo: '',
    area: AREAS_MOTORES[0],
    sub_area: '',
    equipamento: '',
    responsavel: '',
    data: '',
    hora_inicio: '08:00',
    hora_fim: '17:00',
    descricao: '',
    observacoes: '',
    tipo_manutencao: 'Corretiva',
    nivel_criticidade: '2 - Baixa',
    status: 'Planejada'
  });

  useEffect(() => {
    fetchRefrigeracao();
  }, [fetchRefrigeracao]);

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

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const openNewModal = () => {
    setSelectedItem(null);
    setModalType('manutencao');
    setFormData({
      titulo: '',
      area: AREAS_MOTORES[0],
      sub_area: '',
      equipamento: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
      hora_inicio: '07:00',
      hora_fim: '08:00',
      descricao: '',
      observacoes: '',
      investimento_estimado: '',
      tipo_manutencao: 'Corretiva',
      nivel_criticidade: '2 - Baixa',
      status: 'Planejada'
    });
    setIsModalOpen(true);
  };

  const openDetailsModal = (item: any, source: 'calendar' | 'backlog') => {
    setSelectedItem({ ...item, _source: source });
    setModalType('details');
    setFormData({
      ...item,
      data: item.data || item.data_prevista || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (selectedItem && modalType === 'details') {
        setPasswordModal({ 
          isOpen: true, 
          id: selectedItem.id, 
          action: selectedItem._source === 'calendar' ? 'edit' : 'backlog-edit' 
        });
        setIsSubmitting(false);
        return;
      }
      
      await addRefrigeracaoManutencao(formData);
      
      const existingBacklog = refrigeracaoBacklog.find(b => b.titulo === formData.titulo && b.area === formData.area && b.sub_area === formData.sub_area);
      
      if (!selectedItem && !existingBacklog) {
        await addRefrigeracaoBacklog({
          area: formData.area,
          sub_area: formData.sub_area,
          titulo: formData.titulo,
          investimento_estimado: formData.investimento_estimado,
          data_prevista: formData.data,
          status: formData.status,
          observacoes: formData.observacoes,
          descricao: formData.descricao,
          equipamento: formData.equipamento,
          responsavel: formData.responsavel,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          tipo_manutencao: formData.tipo_manutencao,
          nivel_criticidade: formData.nivel_criticidade
        });
      } else if (selectedItem && !selectedItem.hora_inicio) {
        // This was a backlog item being scheduled
        await updateRefrigeracaoBacklog(selectedItem.id, { 
          titulo: formData.titulo,
          area: formData.area,
          sub_area: formData.sub_area,
          investimento_estimado: formData.investimento_estimado,
          status: formData.status, 
          data_prevista: formData.data,
          observacoes: formData.observacoes,
          descricao: formData.descricao,
          equipamento: formData.equipamento,
          responsavel: formData.responsavel,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          tipo_manutencao: formData.tipo_manutencao,
          nivel_criticidade: formData.nivel_criticidade
        }, 'Itf2026');
      } else if (existingBacklog) {
        // Update existing backlog item status and date
        await updateRefrigeracaoBacklog(existingBacklog.id, { 
          titulo: formData.titulo,
          area: formData.area,
          sub_area: formData.sub_area,
          investimento_estimado: formData.investimento_estimado,
          status: formData.status, 
          data_prevista: formData.data,
          observacoes: formData.observacoes,
          descricao: formData.descricao,
          equipamento: formData.equipamento,
          responsavel: formData.responsavel,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          tipo_manutencao: formData.tipo_manutencao,
          nivel_criticidade: formData.nivel_criticidade
        }, 'Itf2026');
      }

      setIsModalOpen(false);
      setSelectedItem(null);
      fetchRefrigeracao();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    try {
      const { id: _, created_at: __, ...allUpdates } = formData;
      
      const manutencaoUpdates = {
        titulo: allUpdates.titulo,
        area: allUpdates.area,
        sub_area: allUpdates.sub_area,
        equipamento: allUpdates.equipamento,
        responsavel: allUpdates.responsavel,
        data: formData.data,
        hora_inicio: allUpdates.hora_inicio,
        hora_fim: allUpdates.hora_fim,
        descricao: allUpdates.descricao,
        observacoes: allUpdates.observacoes,
        investimento_estimado: allUpdates.investimento_estimado,
        tipo_manutencao: allUpdates.tipo_manutencao,
        nivel_criticidade: allUpdates.nivel_criticidade,
        status: allUpdates.status
      };

      const backlogUpdates = {
        titulo: allUpdates.titulo,
        area: allUpdates.area,
        sub_area: allUpdates.sub_area,
        investimento_estimado: allUpdates.investimento_estimado,
        data_prevista: formData.data,
        status: allUpdates.status,
        observacoes: allUpdates.observacoes,
        descricao: allUpdates.descricao,
        equipamento: allUpdates.equipamento,
        responsavel: allUpdates.responsavel,
        hora_inicio: allUpdates.hora_inicio,
        hora_fim: allUpdates.hora_fim,
        tipo_manutencao: allUpdates.tipo_manutencao,
        nivel_criticidade: allUpdates.nivel_criticidade
      };
      
      if (passwordModal.action === 'edit') {
        await updateRefrigeracaoManutencao(passwordModal.id!, manutencaoUpdates, password);
        // Sync with backlog
        const currentItem = refrigeracaoManutencoes.find(m => m.id === passwordModal.id);
        const existingBacklog = refrigeracaoBacklog.find(b => 
          (b.titulo === currentItem?.titulo && b.area === currentItem?.area) ||
          (b.titulo === formData.titulo && b.area === formData.area)
        );
        if (existingBacklog) {
          await updateRefrigeracaoBacklog(existingBacklog.id, backlogUpdates, password);
        } else {
          // Create backlog item if it doesn't exist
          await addRefrigeracaoBacklog({
            ...backlogUpdates
          });
        }
      } else if (passwordModal.action === 'delete') {
        const currentItem = refrigeracaoManutencoes.find(m => m.id === passwordModal.id);
        await deleteRefrigeracaoManutencao(passwordModal.id!, password);
        // Sync with backlog
        const existingBacklog = refrigeracaoBacklog.find(b => b.titulo === currentItem?.titulo && b.area === currentItem?.area);
        if (existingBacklog) {
          await deleteRefrigeracaoBacklog(existingBacklog.id, password);
        }
      } else if (passwordModal.action === 'backlog-edit') {
        await updateRefrigeracaoBacklog(passwordModal.id!, backlogUpdates, password);
        // Sync with calendar
        const currentBacklog = refrigeracaoBacklog.find(b => b.id === passwordModal.id);
        const existingManutencao = refrigeracaoManutencoes.find(m => 
          (m.titulo === currentBacklog?.titulo && m.area === currentBacklog?.area) ||
          (m.titulo === formData.titulo && m.area === formData.area)
        );
        if (existingManutencao) {
          await updateRefrigeracaoManutencao(existingManutencao.id, manutencaoUpdates, password);
        } else if (formData.status === 'Planejada') {
          // Create calendar item if it doesn't exist and status is Planejada
          await addRefrigeracaoManutencao(manutencaoUpdates);
        }
      } else if (passwordModal.action === 'backlog-delete') {
        const currentBacklog = refrigeracaoBacklog.find(b => b.id === passwordModal.id);
        await deleteRefrigeracaoBacklog(passwordModal.id!, password);
        // Sync with calendar
        if (passwordModal.deleteChoice !== 'backlog-only') {
          const existingManutencao = refrigeracaoManutencoes.find(m => m.titulo === currentBacklog?.titulo && m.area === currentBacklog?.area);
          if (existingManutencao) {
            await deleteRefrigeracaoManutencao(existingManutencao.id, password);
          }
        }
      } else if (passwordModal.action === 'batch-delete') {
        const itemsToDelete = refrigeracaoManutencoes.filter(m => passwordModal.ids?.includes(m.id));
        await batchDeleteRefrigeracaoManutencoes(passwordModal.ids!, password);
        // Sync with backlog
        if (passwordModal.deleteChoice !== 'backlog-only') {
          for (const item of itemsToDelete) {
            const existingBacklog = refrigeracaoBacklog.find(b => b.titulo === item.titulo && b.area === item.area);
            if (existingBacklog) {
              await deleteRefrigeracaoBacklog(existingBacklog.id, password);
            }
          }
        }
        setSelectionMode(false);
        setSelectedIds([]);
      } else if (passwordModal.action === 'backlog-batch-delete') {
        const itemsToDelete = refrigeracaoBacklog.filter(b => passwordModal.ids?.includes(b.id));
        await batchDeleteRefrigeracaoBacklog(passwordModal.ids!, password);
        // Sync with calendar
        if (passwordModal.deleteChoice !== 'backlog-only') {
          for (const item of itemsToDelete) {
            const existingManutencao = refrigeracaoManutencoes.find(m => m.titulo === item.titulo && m.area === item.area);
            if (existingManutencao) {
              await deleteRefrigeracaoManutencao(existingManutencao.id, password);
            }
          }
        }
        setSelectionMode(false);
        setSelectedIds([]);
      }
      
      await fetchRefrigeracao();
      setPasswordModal({ ...passwordModal, isOpen: false });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmDeleteChoice = (choice: 'backlog-only' | 'both') => {
    const isBatch = deleteChoiceModal.ids !== null;
    setDeleteChoiceModal({ ...deleteChoiceModal, isOpen: false });
    setPasswordModal({ 
      isOpen: true, 
      id: deleteChoiceModal.id, 
      ids: deleteChoiceModal.ids || undefined,
      action: isBatch ? 'backlog-batch-delete' : 'backlog-delete',
      deleteChoice: choice
    });
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
    
    const item = refrigeracaoBacklog.find(b => b.id === itemId);
    if (!item || item.status === newStatus) return;

    try {
      await updateRefrigeracaoBacklog(itemId, { status: newStatus }, 'Itf2026');
      
      const existingManutencao = refrigeracaoManutencoes.find(m => m.titulo === item.titulo && m.area === item.area);
      if (existingManutencao) {
        await updateRefrigeracaoManutencao(existingManutencao.id, { status: newStatus }, 'Itf2026');
      } else if (newStatus === 'Planejada') {
        // Create calendar item if it doesn't exist and status is Planejada
        await addRefrigeracaoManutencao({
          titulo: item.titulo,
          area: item.area,
          sub_area: item.sub_area || '',
          equipamento: item.equipamento || '',
          responsavel: item.responsavel || '',
          data: item.data_prevista || new Date().toISOString().split('T')[0],
          hora_inicio: item.hora_inicio || '07:00',
          hora_fim: item.hora_fim || '08:00',
          descricao: item.descricao || '',
          observacoes: item.observacoes || '',
          investimento_estimado: item.investimento_estimado || '',
          tipo_manutencao: item.tipo_manutencao || 'Corretiva',
          nivel_criticidade: item.nivel_criticidade || '2 - Baixa',
          status: newStatus
        });
      }
      
      fetchRefrigeracao();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const events = refrigeracaoManutencoes.map(m => ({
    id: String(m.id),
    title: m.titulo || m.descricao || 'Intervenção',
    start: `${m.data}T${m.hora_inicio}`,
    end: `${m.data}T${m.hora_fim}`,
    backgroundColor: m.status === 'Concluída' ? '#22c55e' : (m.status === 'Planejada' ? '#FFD100' : '#ef4444'),
    borderColor: m.status === 'Concluída' ? '#16a34a' : (m.status === 'Planejada' ? '#eab308' : '#dc2626'),
    textColor: m.status === 'Planejada' ? '#1e293b' : '#ffffff',
    extendedProps: m
  }));

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
      await addRefrigeracaoPCMArea({ data: date, area: addingPCMArea.value.trim() });
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
  const filteredBacklog = refrigeracaoBacklog
    .filter(b => {
      const matchArea = filterArea.length === 0 || filterArea.includes(b.area);
      const matchSubArea = filterSubArea.length === 0 || filterSubArea.includes(b.sub_area);
      const matchTipo = filterTipo.length === 0 || filterTipo.includes(b.tipo_manutencao);
      const matchCriticidade = filterCriticidade.length === 0 || filterCriticidade.includes(b.nivel_criticidade);
      
      let matchDate = true;
      if (filterMonth.length > 0 || filterYear.length > 0) {
        const date = new Date(b.data_prevista);
        const monthMatch = filterMonth.length === 0 || filterMonth.includes((date.getMonth() + 1).toString());
        const yearMatch = filterYear.length === 0 || filterYear.includes(date.getFullYear().toString());
        matchDate = monthMatch && yearMatch;
      }

      return matchArea && matchSubArea && matchTipo && matchCriticidade && matchDate;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      
      let valA = 0;
      let valB = 0;
      
      if (sortBy === 'investimento') {
        valA = parseFloat(a.investimento_estimado?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0') || 0;
        valB = parseFloat(b.investimento_estimado?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0') || 0;
      }
      
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  const pendingBacklog = filteredBacklog.filter(b => b.status !== 'Concluída');
  const totalInvestment = filteredBacklog.reduce((sum, b) => sum + (parseFloat(b.investimento_estimado?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0') || 0), 0);

  return (
    <div className={cn(
      "flex flex-col gap-3 md:gap-4 p-2 md:p-6",
      activeTab === 'calendario' ? "h-screen overflow-hidden" : "min-h-screen h-auto overflow-y-auto"
    )}>
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-ambev-blue p-1.5 rounded-lg shadow-md shadow-ambev-blue/20">
            <Snowflake className="text-ambev-gold w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase leading-none">Refrigeração</h1>
            <p className="text-slate-500 font-bold mt-0.5 uppercase tracking-widest text-[6px] md:text-[8px]">Gestão de ar condicionado e sistemas de frio</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button 
              onClick={() => {
                setActiveTab('calendario');
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md font-black text-[8px] transition-all",
                activeTab === 'calendario' ? "bg-white text-ambev-blue shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <CalendarIcon size={10} className="hidden xs:block" />
              CALENDÁRIO
            </button>
            <button 
              onClick={() => {
                setActiveTab('backlog');
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md font-black text-[8px] transition-all",
                activeTab === 'backlog' ? "bg-white text-ambev-blue shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid size={10} className="hidden xs:block" />
              BACKLOG
            </button>
            <button 
              onClick={() => {
                setActiveTab('panorama');
                setSelectionMode(false);
                setSelectedIds([]);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md font-black text-[8px] transition-all",
                activeTab === 'panorama' ? "bg-white text-ambev-blue shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <BarChart3 size={10} className="hidden xs:block" />
              PANORAMA
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5 hidden sm:block" />

          <div className="flex items-center gap-1">
            {selectionMode ? (
              <>
                <button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds([]);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-black px-2 py-1 rounded-lg transition-all text-[8px] uppercase tracking-widest"
                >
                  Sair
                </button>
                <button 
                  onClick={() => {
                    if (activeTab === 'backlog') {
                      setDeleteChoiceModal({ isOpen: true, id: null, ids: selectedIds });
                    } else {
                      setPasswordModal({ 
                        isOpen: true, 
                        ids: selectedIds, 
                        action: 'batch-delete',
                        id: null
                      });
                    }
                  }}
                  disabled={selectedIds.length === 0}
                  className="bg-red-500 hover:bg-red-600 text-white font-black px-2 py-1 rounded-lg shadow-lg shadow-red-500/20 transition-all flex items-center gap-1 disabled:opacity-50 text-[8px] uppercase tracking-widest"
                >
                  <Trash2 size={10} />
                  <span className="hidden xs:inline">Excluir ({selectedIds.length})</span>
                  <span className="xs:hidden">({selectedIds.length})</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSelectionMode(true)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black px-2 py-1 rounded-lg transition-all text-[8px] uppercase tracking-widest flex items-center gap-1"
              >
                <CheckSquare size={10} />
                Selecionar
              </button>
            )}
            <button 
              onClick={openNewModal}
              className="bg-ambev-blue hover:bg-ambev-blue/90 text-white font-black px-3 py-1.5 rounded-lg shadow-lg shadow-ambev-blue/20 transition-all flex items-center gap-1 active:scale-95 uppercase tracking-widest text-[8px]"
            >
              <Plus size={12} />
              <span className="hidden xs:inline">Nova Manutenção</span>
              <span className="xs:hidden">Novo</span>
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 ml-auto sm:ml-0">
            <button 
              onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')} 
              className="px-1.5 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
            >
              Semana
            </button>
            <button 
              onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')} 
              className="px-1.5 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
            >
              Dia
            </button>
            <div className="w-px h-3 bg-slate-100 mx-0.5" />
            <button 
              onClick={handleToday}
              className="px-1.5 py-1 hover:bg-slate-50 rounded-md text-slate-600 font-black text-[8px] uppercase tracking-widest transition-all"
            >
              Hoje
            </button>
            <button onClick={handlePrev} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
              <ChevronLeft size={12} />
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-slate-50 rounded-md text-slate-600 transition-all">
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'panorama' ? (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manutenções (Mês)</p>
                <p className="text-2xl font-black text-slate-900">{refrigeracaoManutencoes.filter(m => {
                  const d = parseISO(m.data);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length} <span className="text-xs text-slate-400">Atividades</span></p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Backlog</p>
                <p className="text-2xl font-black text-emerald-500">{refrigeracaoBacklog.length} <span className="text-xs text-slate-400">Total</span></p>
             </div>
          </div>
          
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Plano de Manutenção Preventiva/Corretiva</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cronograma Geral</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {Array.from(new Set(refrigeracaoManutencoes.map(m => m.data))).sort((a, b) => b.localeCompare(a)).map(dateStr => {
                  const dayManutencoes = refrigeracaoManutencoes.filter(m => m.data === dateStr);
                  if (dayManutencoes.length === 0) return null;
                  const date = parseISO(dateStr);

                  return (
                    <div key={dateStr} className="flex gap-4">
                       <div className="min-w-[60px] flex flex-col items-center pt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{format(date, 'EEE', { locale: ptBR })}</span>
                          <span className="text-xl font-black text-slate-800 tracking-tighter mt-1">{format(date, 'dd/MM')}</span>
                       </div>
                       <div className="flex-1 space-y-2">
                          {dayManutencoes.map(m => (
                            <div 
                              key={m.id} 
                              onClick={() => openDetailsModal(m, 'calendar')}
                              className={cn(
                                "p-3 rounded-xl border border-dashed flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                                m.status === 'Concluída' ? "border-emerald-200 bg-emerald-50/20" : "border-amber-200 bg-amber-50/20"
                              )}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg border",
                                    m.status === 'Concluída' ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-amber-100 text-amber-600 border-amber-200"
                                  )}>
                                     <Snowflake size={16} />
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{m.area}</span>
                                        <span className={cn(
                                          "text-[7px] font-black px-1.5 rounded-full uppercase border",
                                          m.status === 'Concluída' ? "bg-emerald-500 text-white border-emerald-600" : "bg-amber-500 text-white border-amber-600"
                                        )}>{m.status}</span>
                                     </div>
                                     <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5">{m.titulo}</h4>
                                     <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate max-w-md">{m.equipamento}</p>
                                     <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                           <User size={10} className="text-slate-300" />
                                           {m.responsavel}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                           <Clock size={10} className="text-slate-300" />
                                           {m.hora_inicio} - {m.hora_fim}
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
        <div className="flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden">
          {/* PCM Areas Panel - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1 shrink-0 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 min-w-[1000px]">
              <div className="flex items-center gap-1.5 px-2 py-1 border-r border-slate-100 shrink-0">
                <Clock size={12} className="text-sky-500" />
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tight">Áreas em PCM</span>
              </div>
              
              <div className="flex-1 grid grid-cols-7 gap-1">
                {weekDays.map((day, idx) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const areas = refrigeracaoPCMAreas.filter(a => a.data === dateStr);
                  const dayName = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][idx];
                  const dayOfMonth = day.getDate();
                  
                  return (
                    <div key={`pcm-${idx}`} className="flex items-center gap-1 bg-slate-50/50 rounded-md p-1 border border-slate-100 min-h-[40px]">
                      <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-1 shrink-0">
                        <span className="text-[6px] font-bold text-slate-400 uppercase">{dayName}</span>
                        <span className="text-[8px] font-black text-slate-600 leading-none">{dayOfMonth}</span>
                      </div>
                      
                      <div className="flex-1 flex flex-wrap gap-0.5">
                        {areas.length > 0 ? (
                          areas.map(a => (
                            <div key={a.id} className="bg-sky-50 border border-sky-100 px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                              <span className="text-[7px] font-black text-sky-600 uppercase truncate max-w-[40px]">{a.area}</span>
                              <button onClick={() => deleteRefrigeracaoPCMArea(a.id)} className="text-sky-400 hover:text-sky-600 transition-colors">
                                <X size={6} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[6px] text-slate-300 italic font-medium">Livre</span>
                        )}
                      </div>
                      
                      <div className="shrink-0">
                        {addingPCMArea?.date === dateStr ? (
                          <input
                            ref={pcmInputRef}
                            type="text"
                            className="w-12 bg-white border border-sky-500 rounded px-1 py-0.5 text-[7px] font-bold uppercase focus:outline-none"
                            value={addingPCMArea.value}
                            onChange={(e) => setAddingPCMArea({ ...addingPCMArea, value: e.target.value })}
                            onKeyDown={(e) => handlePCMAreaKeyDown(e, dateStr)}
                            onBlur={() => {
                              if (!addingPCMArea.value.trim()) setAddingPCMArea(null);
                            }}
                            autoFocus
                            placeholder="..."
                          />
                        ) : (
                          <button 
                            onClick={() => handleAddPCMAreaTag(dateStr)}
                            className="w-4 h-4 rounded bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-500 transition-all flex items-center justify-center"
                          >
                            <Plus size={8} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-0.5 flex flex-col custom-calendar high-slots min-h-0 !overflow-visible">
            <div className="flex-1 custom-scrollbar calendar-scroller !overflow-visible">
              <div className="min-w-[1000px] w-full h-full !overflow-visible">
                <FullCalendar
                  key={`calendar-${events.length}`}
                  ref={calendarRef}
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
                  locale={ptBrLocale}
                  headerToolbar={false}
                  events={events}
                  scrollTime="08:00:00"
                  allDaySlot={false}
                  height="100%"
                  expandRows={true}
                  stickyHeaderDates={true}
                  slotDuration="01:00:00"
                  dayMaxEvents={false}
                  dayMaxEventRows={false}
                  eventMaxStack={undefined}
                  slotEventOverlap={false}
                  eventClick={(info) => openDetailsModal(info.event.extendedProps, 'calendar')}
                  eventContent={(eventInfo) => {
                    const data = eventInfo.event.extendedProps;
                    const isSelected = selectedIds.includes(data.id);
                    const isWeekView = eventInfo.view.type === 'timeGridWeek';
                    const isMobile = window.innerWidth < 640;
                    
                    const start = eventInfo.event.start;
                    const end = eventInfo.event.end;
                    const durationHours = end && start ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 1;
                    const isShort = durationHours <= 1.1; // 1 hour or less
                    
                    const areaColorMap: Record<string, string> = {
                      'Packaging': 'text-blue-600 bg-blue-50 px-1 rounded',
                      'Processo Refri': 'text-purple-600 bg-purple-50 px-1 rounded',
                      'Processo Cerveja': 'text-amber-600 bg-amber-50 px-1 rounded',
                      'Meio ambiente': 'text-emerald-600 bg-emerald-50 px-1 rounded',
                      'Utilidades': 'text-cyan-600 bg-cyan-50 px-1 rounded',
                      'Subprodutos': 'text-indigo-600 bg-indigo-50 px-1 rounded',
                      'ADM': 'text-slate-600 bg-slate-50 px-1 rounded',
                      'Outras áreas': 'text-rose-600 bg-rose-50 px-1 rounded'
                    };

                    return (
                      <div 
                        onClick={(e) => {
                          if (selectionMode) {
                            e.stopPropagation();
                            toggleSelection(data.id);
                          }
                        }}
                        className={cn(
                          "p-1 h-full flex flex-col gap-0.5 overflow-visible border-2 rounded-md relative transition-all",
                          data.status === 'Concluída' ? "border-green-500 bg-green-50/40" : 
                          data.status === 'Planejada' ? "border-yellow-500 bg-yellow-50/40" : 
                          "border-red-500 bg-red-50/40",
                          isSelected && "ring-2 ring-sky-500 ring-offset-0",
                          (isWeekView && isMobile) && "p-0.5 gap-0"
                        )}>
                        {selectionMode && (
                          <div className="absolute top-0.5 right-0.5">
                            {isSelected ? (
                              <CheckSquare size={isMobile ? 6 : 8} className="text-sky-500" />
                            ) : (
                              <Square size={isMobile ? 6 : 8} className="text-slate-300" />
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-tighter truncate",
                            areaColorMap[data.area] || "text-slate-600 bg-slate-50 px-1 rounded",
                            ((isWeekView && isMobile) || isShort) && "text-[6px] px-0.5"
                          )}>
                            {data.area}
                          </span>
                          {!isMobile && !isShort && (
                            <span className={cn(
                              "text-[6px] font-black px-0.5 rounded uppercase text-white shrink-0",
                              data.status === 'Concluída' ? "bg-green-500" : 
                              data.status === 'Planejada' ? "bg-yellow-500" : 
                              "bg-red-500"
                            )}>
                              {data.status}
                            </span>
                          )}
                        </div>

                        <div className={cn(
                          "font-black text-slate-900 uppercase leading-tight line-clamp-2",
                          isShort ? "text-[7px] sm:text-[8px]" : "text-[10px]",
                          (isWeekView && isMobile) && "text-[7px]"
                        )}>
                          {data.equipamento || data.titulo}
                        </div>

                        {!( (isWeekView && isMobile) || isShort) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <User size={7} className="text-slate-400" />
                            <span className="text-[8px] text-slate-500 font-bold line-clamp-1">
                              {data.responsavel}
                            </span>
                          </div>
                        )}

                        {!isShort && (
                          <div className={cn(
                            "text-[7px] font-black uppercase tracking-tighter truncate mt-0.5",
                            data.tipo_manutencao === 'Corretiva' ? "text-red-600" :
                            data.tipo_manutencao === 'Preventiva' ? "text-blue-600" :
                            "text-amber-600"
                          )}>
                            {data.tipo_manutencao}
                          </div>
                        )}

                        <div className="details-on-hover">
                          <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded uppercase text-white",
                              data.status === 'Concluída' ? "bg-green-500" : 
                              data.status === 'Planejada' ? "bg-yellow-500" : 
                              "bg-red-500"
                            )}>
                              {data.status}
                            </span>
                            <span className="text-[11px] font-black text-slate-900 uppercase truncate">
                              {data.equipamento}
                            </span>
                          </div>

                          <div className="info-grid">
                            <div>
                              <span className="label">Título</span>
                              <p className="text-ambev-blue">{data.titulo}</p>
                            </div>
                            <div>
                              <span className="label">Área</span>
                              <p className={cn(
                                "font-bold",
                                data.area === 'Processo cerveja' ? "text-amber-600" :
                                data.area === 'Packaging, Bblend e Xaroparia' ? "text-blue-600" :
                                data.area === 'Utilidades e Meio Ambiente' ? "text-emerald-600" :
                                "text-slate-600"
                              )}>{data.area}</p>
                            </div>
                            {data.sub_area && (
                              <div>
                                <span className="label">Sub-área</span>
                                <p>{data.sub_area}</p>
                              </div>
                            )}
                            <div>
                              <span className="label">Responsável</span>
                              <p>{data.responsavel}</p>
                            </div>
                            <div>
                              <span className="label">Criticidade</span>
                              <p className={cn(
                                "font-black",
                                data.nivel_criticidade === 'Alta' ? "text-red-600" :
                                data.nivel_criticidade === 'Média' ? "text-ambev-blue" :
                                "text-ambev-blue"
                              )}>{data.nivel_criticidade}</p>
                            </div>
                            <div>
                              <span className="label">Investimento</span>
                              <p className="text-ambev-blue font-black">R$ {data.investimento_estimado || '0,00'}</p>
                            </div>
                            <div>
                              <span className="label">Tipo</span>
                              <p>{data.tipo_manutencao}</p>
                            </div>
                            <div>
                              <span className="label">Horário</span>
                              <p>{data.hora_inicio} - {data.hora_fim}</p>
                            </div>
                          </div>
                          <div>
                            <span className="label">Descrição Detalhada</span>
                            <p className="text-slate-600 italic">{data.descricao || 'Sem descrição'}</p>
                            {data.observacoes && (
                              <>
                                <span className="label mt-2">Observações</span>
                                <p className="text-slate-500">{data.observacoes}</p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
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
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 md:gap-8">
          {/* Filters */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-x-4 gap-y-2 items-center">
            <MultiSelect 
              label="Área"
              options={AREAS_MOTORES.map(area => ({ label: area, value: area }))}
              selectedValues={filterArea}
              onChange={setFilterArea}
              activeColor="sky"
            />
            <MultiSelect 
              label="Sub-Área"
              options={SUB_AREAS_MOTORES.filter(s => s !== '').map(sub => ({ label: sub, value: sub }))}
              selectedValues={filterSubArea}
              onChange={setFilterSubArea}
              activeColor="sky"
            />
            <MultiSelect 
              label="Tipo"
              options={[
                { label: 'CORRETIVA', value: 'Corretiva' },
                { label: 'PREVENTIVA', value: 'Preventiva' },
                { label: 'INSPEÇÃO', value: 'Inspeção' }
              ]}
              selectedValues={filterTipo}
              onChange={setFilterTipo}
              activeColor="sky"
            />
            <MultiSelect 
              label="Criticidade"
              options={[
                { label: '0 - URGENTE', value: '0 - Urgente' },
                { label: '1 - MÉDIA', value: '1 - Média' },
                { label: '2 - BAIXA', value: '2 - Baixa' }
              ]}
              selectedValues={filterCriticidade}
              onChange={setFilterCriticidade}
              activeColor="sky"
            />
            <MultiSelect 
              label="Mês"
              options={Array.from({ length: 12 }, (_, i) => ({
                label: new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase(),
                value: String(i + 1)
              }))}
              selectedValues={filterMonth}
              onChange={setFilterMonth}
              activeColor="sky"
            />
            <MultiSelect 
              label="Ano"
              options={[2024, 2025, 2026].map(year => ({ label: String(year), value: String(year) }))}
              selectedValues={filterYear}
              onChange={setFilterYear}
              activeColor="sky"
            />
            <div className="flex items-center gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Ordenar:</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 w-fit"
              >
                <option value="">PADRÃO</option>
                <option value="investimento">INVESTIMENTO</option>
              </select>
              {sortBy && (
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-all"
                >
                  {sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
            {(filterArea.length > 0 || filterSubArea.length > 0 || filterTipo.length > 0 || filterCriticidade.length > 0 || filterMonth.length > 0 || filterYear.length > 0 || sortBy) && (
              <button 
                onClick={() => {
                  setFilterArea([]);
                  setFilterSubArea([]);
                  setFilterTipo([]);
                  setFilterCriticidade([]);
                  setFilterMonth([]);
                  setFilterYear([]);
                  setSortBy('');
                  setSortOrder('desc');
                }}
                className="text-[10px] font-black text-sky-500 uppercase tracking-widest hover:underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 shrink-0">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6">
              <div className="bg-blue-50 p-2.5 md:p-4 rounded-xl md:rounded-2xl text-blue-500">
                <AlertCircle size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendências em Aberto</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">{pendingBacklog.length}</p>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6">
              <div className="bg-green-50 p-2.5 md:p-4 rounded-xl md:rounded-2xl text-green-500">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start">
              {STATUS_OPTIONS.map(status => (
                <Droppable key={status} droppableId={status}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-3 md:gap-4 bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-[2.5rem] border border-slate-200/50 h-auto"
                    >
                      <div className="flex items-center justify-between px-2 md:px-4 py-1 md:py-2 shrink-0">
                        <h2 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{status}</h2>
                        <span className="bg-white text-slate-900 text-[8px] md:text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                          {filteredBacklog.filter(b => b.status === status).length}
                        </span>
                      </div>

                      <div className="max-h-[500px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar space-y-3 md:space-y-4">
                        {filteredBacklog
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
                                      openDetailsModal(item, 'backlog');
                                    }
                                  }}
                                  className={cn(
                                    "p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border transition-all group cursor-pointer active:scale-[0.98] relative",
                                    status === 'Não planejada' ? "bg-red-50 border-red-100 hover:shadow-red-200/50" :
                                    status === 'Planejada' ? "bg-yellow-50 border-yellow-100 hover:shadow-yellow-200/50" :
                                    "bg-green-50 border-green-100 hover:shadow-green-200/50",
                                    selectedIds.includes(item.id) && "ring-2 ring-sky-500 ring-offset-2"
                                  )}
                                >
                                  {selectionMode && (
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4">
                                      {selectedIds.includes(item.id) ? (
                                        <CheckSquare size={14} className="text-sky-500 md:w-4 md:h-4" />
                                      ) : (
                                        <Square size={14} className="text-slate-300 md:w-4 md:h-4" />
                                      )}
                                    </div>
                                  )}
                                  <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center justify-between gap-2 mb-2 md:mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg uppercase tracking-wider",
                                          item.tipo_manutencao === 'Corretiva' ? "bg-red-100 text-red-600" :
                                          item.tipo_manutencao === 'Preventiva' ? "bg-blue-100 text-blue-600" :
                                          "bg-amber-100 text-amber-600"
                                        )}>
                                          {item.tipo_manutencao}
                                        </span>
                                        <div className="flex items-center gap-1.5 bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg shadow-sm">
                                          <div className={cn(
                                            "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                                            item.nivel_criticidade === '0 - Urgente' ? "bg-red-500" :
                                            item.nivel_criticidade === '1 - Média' ? "bg-yellow-500" :
                                            "bg-green-500"
                                          )} />
                                          <span className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                            {item.nivel_criticidade?.split(' - ')[1]}
                                          </span>
                                        </div>
                                      </div>
                                      {!selectionMode && (
                                        <div className="flex gap-1 md:gap-2 shrink-0">
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
                                                  status: 'Planejada',
                                                  data: item.data_prevista || new Date().toISOString().split('T')[0],
                                                  tipo_manutencao: item.tipo_manutencao,
                                                  nivel_criticidade: item.nivel_criticidade
                                                });
                                                setIsModalOpen(true);
                                              }}
                                              className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl text-sky-500 hover:bg-sky-500 hover:text-white transition-all shadow-sm"
                                              title="Agendar no Calendário"
                                            >
                                              <CalendarIcon size={12} className="md:w-[14px] md:h-[14px]" />
                                            </button>
                                          )}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openDetailsModal(item, 'backlog');
                                            }}
                                            className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl text-slate-400 hover:bg-slate-100 transition-all shadow-sm"
                                          >
                                            <Info size={12} className="md:w-[14px] md:h-[14px]" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5 md:space-y-1">
                                        <p className={cn(
                                          "text-[8px] md:text-[9px] font-black uppercase tracking-widest",
                                          status === 'Não planejada' ? "text-red-400" :
                                          status === 'Planejada' ? "text-yellow-600" :
                                          "text-green-600"
                                        )}>{item.area}</p>
                                        <h3 className="font-black text-slate-900 text-xs md:text-sm leading-tight uppercase line-clamp-2">{item.titulo}</h3>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 md:gap-4">
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
                                      <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-1 transition-transform md:w-[14px] md:h-[14px]" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-sky-500 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-sky-500/20">
                  {modalType === 'manutencao' ? <Plus className="text-white w-5 h-5 sm:w-6 sm:h-6" /> : <Info className="text-white w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                    {modalType === 'manutencao' ? 'Nova Manutenção' : 'Detalhes'}
                  </h2>
                  <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">
                    {modalType === 'manutencao' ? 'Planejamento de Sistema de Frio' : 'Informações Completas'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <form id="refrigeracao-form" onSubmit={handleSave} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Intervenção</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base"
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                      placeholder="Ex: Manutenção Preventiva AC"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                    >
                      {AREAS_MOTORES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Área</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                      value={formData.sub_area}
                      onChange={e => setFormData({...formData, sub_area: e.target.value})}
                    >
                      {SUB_AREAS_MOTORES.map(s => (
                        <option key={s} value={s}>{s || 'NÃO DEFINIDA'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipamento</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base"
                      value={formData.equipamento}
                      onChange={e => setFormData({...formData, equipamento: e.target.value})}
                      placeholder="Ex: Chiller 01"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base"
                      value={formData.responsavel}
                      onChange={e => setFormData({...formData, responsavel: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base"
                      value={formData.data}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                      <select 
                        className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                        value={formData.hora_inicio}
                        onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const h = String(i).padStart(2, '0');
                          return <option key={h} value={`${h}:00`}>{h}:00</option>;
                        })}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                      <select 
                        className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                        value={formData.hora_fim}
                        onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const h = String(i).padStart(2, '0');
                          return <option key={h} value={`${h}:00`}>{h}:00</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Manutenção/Intervenção</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                      value={formData.tipo_manutencao}
                      onChange={e => setFormData({...formData, tipo_manutencao: e.target.value})}
                    >
                      <option value="Corretiva">CORRETIVA</option>
                      <option value="Preventiva">PREVENTIVA</option>
                      <option value="Inspeção">INSPEÇÃO</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Criticidade</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base appearance-none"
                      value={formData.nivel_criticidade}
                      onChange={e => setFormData({...formData, nivel_criticidade: e.target.value})}
                    >
                      <option value="0 - Urgente">0 - URGENTE</option>
                      <option value="1 - Média">1 - MÉDIA</option>
                      <option value="2 - Baixa">2 - BAIXA</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Investimento (R$)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all text-sm sm:text-base"
                      value={formData.investimento_estimado}
                      onChange={e => setFormData({...formData, investimento_estimado: e.target.value})}
                      placeholder="Ex: 10.000,00"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({...formData, status: s})}
                          className={cn(
                            "flex-1 min-w-[100px] py-2.5 sm:py-3 rounded-xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest transition-all border",
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
                  <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição da Intervenção</label>
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all h-20 sm:h-24 resize-none text-sm sm:text-base"
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all h-16 sm:h-20 resize-none text-sm sm:text-base"
                      value={formData.observacoes}
                      onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
              {modalType === 'details' ? (
                <>
                  <button 
                    type="button"
                    onClick={() => {
                      if (selectedItem._source === 'backlog') {
                        setDeleteChoiceModal({ isOpen: true, id: selectedItem.id, ids: null });
                      } else {
                        setPasswordModal({ 
                          isOpen: true, 
                          id: selectedItem.id, 
                          action: 'delete' 
                        });
                      }
                    }}
                    className="w-full sm:flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-100 text-[10px] sm:text-xs uppercase tracking-widest order-2 sm:order-1"
                  >
                    <Trash2 size={18} />
                    EXCLUIR
                  </button>
                  <button 
                    form="refrigeracao-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={18} />
                    {isSubmitting ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                  </button>
                </>
              ) : (
                <button 
                  form="refrigeracao-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={20} />
                  {isSubmitting ? 'SALVANDO...' : 'Salvar Intervenção'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PasswordModal 
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        onConfirm={handlePasswordConfirm}
      />

      <DeleteChoiceModal
        isOpen={deleteChoiceModal.isOpen}
        onClose={() => setDeleteChoiceModal({ ...deleteChoiceModal, isOpen: false })}
        onConfirm={confirmDeleteChoice}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-calendar .fc {
          --fc-border-color: #f1f5f9;
          --fc-today-bg-color: #f0f9ff;
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
          overflow: visible !important;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.08);
          transition: all 0.2s;
          border: none !important;
          margin: 2px !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
          display: block !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* FullCalendar Scrollbar Styling */
        .fc-scroller::-webkit-scrollbar {
          width: 6px;
          height: 6px;
          display: block !important;
        }
        .fc-scroller::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .fc-scroller::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        /* Mobile adjustments */
        @media (max-width: 640px) {
          .fc-header-toolbar {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .fc-view-h-scroll {
            overflow-x: auto !important;
          }
          .fc-timegrid-slot {
            height: 50px !important;
          }
        }
      `}} />
    </div>
  );
}
