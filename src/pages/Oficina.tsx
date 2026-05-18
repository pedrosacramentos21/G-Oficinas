import React, { useState, useEffect } from 'react';
import { Wrench, ClipboardCheck, History, Plus, ChevronLeft, Save, AlertCircle, CheckCircle2, User, Calendar, MapPin, Search, Settings2, Trash2, Edit3, X } from 'lucide-react';
import { useStore } from '../store';
import { cn, formatDate } from '../lib/utils';
import PasswordModal from '../components/PasswordModal';

export default function Oficina() {
  const { 
    workshopChecklists, fetchWorkshopChecklists, addWorkshopChecklist,
    workshopEquipment, fetchWorkshopEquipment, addWorkshopEquipment, updateWorkshopEquipment, deleteWorkshopEquipment 
  } = useStore();
  const [view, setView] = useState<'selection' | 'form' | 'history' | 'management'>('selection');
  const [selectedEq, setSelectedEq] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    responsavel: '',
    observacoes: '',
    items: {} as Record<string, 'S' | 'N' | 'NA'>
  });

  const [newItemLabel, setNewItemLabel] = useState('');

  const [eqFormData, setEqFormData] = useState({
    name: '',
    local: '',
    items: [] as { id: string, label: string }[]
  });

  useEffect(() => {
    fetchWorkshopChecklists();
    fetchWorkshopEquipment();
  }, [fetchWorkshopChecklists, fetchWorkshopEquipment]);

  const handleSelectEquipment = (eq: any) => {
    setSelectedEq(eq);
    const initialItems = eq.items.reduce((acc: any, item: any) => {
      acc[item.id] = 'S'; 
      return acc;
    }, {} as Record<string, 'S' | 'N' | 'NA'>);
    
    setFormData({
      responsavel: '',
      observacoes: '',
      items: initialItems
    });
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEq) return;
    if (!formData.responsavel) {
      alert('Por favor, preencha o nome do responsável.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addWorkshopChecklist({
        data: new Date().toISOString().split('T')[0],
        responsavel: formData.responsavel,
        equipamento: selectedEq.name,
        items: formData.items,
        observacoes: formData.observacoes
      });
      alert('Checklist salvo com sucesso!');
      setView('selection');
    } catch (err: any) {
      alert('Erro ao salvar checklist: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenManagement = (password: string) => {
    if (password === 'Itf2026') {
      setView('management');
      setShowPasswordModal(false);
    } else {
      alert('Senha incorreta');
    }
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEquipment) {
      await updateWorkshopEquipment(editingEquipment.id, eqFormData);
    } else {
      await addWorkshopEquipment(eqFormData);
    }
    setEditingEquipment(null);
    setEqFormData({ name: '', local: '', items: [] });
  };

  const addEqItem = () => {
    if (newItemLabel.trim()) {
      const id = newItemLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
      setEqFormData({
        ...eqFormData,
        items: [...eqFormData.items, { id: `${id}_${Date.now()}`, label: newItemLabel.trim() }]
      });
      setNewItemLabel('');
    }
  };

  const removeEqItem = (id: string) => {
    setEqFormData({
      ...eqFormData,
      items: eqFormData.items.filter(i => i.id !== id)
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f9] overflow-hidden">
      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleOpenManagement}
      />

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-ambev-blue p-2 md:p-2.5 rounded-lg md:rounded-xl shadow-lg shadow-ambev-blue/10">
              <Wrench size={16} className="md:w-5 md:h-5 text-ambev-gold" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest leading-none">
                Oficina Central
              </h1>
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Gestão de Equipamentos e Manutenção
              </p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setView('selection'); setSelectedEq(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                (view === 'selection' || view === 'form') ? "bg-white text-ambev-blue shadow-sm" : "hover:bg-white/50 text-gray-500"
              )}
            >
              <ClipboardCheck size={14} />
              Checklist
            </button>
            <button
              onClick={() => { setView('history'); setSelectedEq(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                view === 'history' ? "bg-white text-ambev-blue shadow-sm" : "hover:bg-white/50 text-gray-500"
              )}
            >
              <History size={14} />
              Histórico
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                view === 'management' ? "bg-white text-ambev-blue shadow-sm" : "hover:bg-white/50 text-gray-500"
              )}
            >
              <Settings2 size={14} />
              Gestão
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {view === 'selection' && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  Selecione o Equipamento
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Para iniciar o registro do checklist diário
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {workshopEquipment.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => handleSelectEquipment(eq)}
                    className="group relative bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ambev-blue transition-all duration-300 text-left overflow-hidden flex flex-col items-start gap-4"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-ambev-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    
                    <div className="bg-ambev-blue/10 p-3 rounded-2xl group-hover:bg-ambev-blue group-hover:scale-110 transition-all duration-300">
                      <Settings2 size={24} className="text-ambev-blue group-hover:text-ambev-gold transition-colors" />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                        {eq.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-slate-400">
                        <MapPin size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{eq.local}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between w-full">
                      <span className="text-[9px] font-black text-ambev-blue uppercase tracking-widest flex items-center gap-1">
                        Abrir Checklist <Plus size={10} />
                      </span>
                      <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center group-hover:border-ambev-blue group-hover:translate-x-2 transition-all">
                        <ChevronLeft size={16} className="rotate-180 text-gray-300 group-hover:text-ambev-blue" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'form' && selectedEq && (
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setView('selection')}
                className="flex items-center gap-2 text-slate-400 hover:text-ambev-blue transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
              </button>

              <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                {/* Form Header Reduzido */}
                <div className="bg-ambev-blue px-6 py-4 md:px-8 md:py-6 text-white border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-sm md:text-xl font-black uppercase tracking-widest leading-none">
                        Check List - {selectedEq.name}
                      </h1>
                      <div className="flex items-center gap-2 text-ambev-gold/80 mt-1.5">
                        <MapPin size={12} />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{selectedEq.local}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 self-start">
                      <span className="text-[8px] md:text-[9px] font-black text-ambev-gold/90 uppercase tracking-widest">
                        Inspeção Diária
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Responsible and Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Responsável</label>
                      <input
                        type="text" required
                        value={formData.responsavel}
                        onChange={e => setFormData({ ...formData, responsavel: e.target.value })}
                        placeholder="NOME COMPLETO"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black uppercase tracking-widest text-[10px] focus:ring-4 focus:ring-ambev-blue/10 focus:border-ambev-blue outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Data</label>
                      <input
                        type="date" disabled
                        value={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-black uppercase tracking-widest text-[10px] text-gray-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Verificações</h3>
                      <div className="flex gap-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                        <span>S = Sim | N = Não | NA = N/A</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedEq.items.map((item: any) => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all gap-3">
                          <span className="text-[10px] font-bold text-slate-700 uppercase leading-snug">
                            {item.label}
                          </span>
                          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shrink-0 self-end sm:self-center">
                            {(['S', 'N', 'NA'] as const).map((val) => (
                              <button
                                key={val} type="button"
                                onClick={() => setFormData({
                                  ...formData, items: { ...formData.items, [item.id]: val }
                                })}
                                className={cn(
                                  "w-9 h-7 flex items-center justify-center rounded-md text-[9px] font-black transition-all",
                                  formData.items[item.id] === val
                                    ? val === 'S' ? "bg-green-500 text-white" : val === 'N' ? "bg-red-500 text-white" : "bg-gray-500 text-white"
                                    : "text-gray-400 hover:bg-gray-100"
                                )}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Observações</label>
                    <textarea
                      rows={2}
                      value={formData.observacoes}
                      onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[10px] text-gray-700 outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full bg-ambev-blue text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Salvar Checklist</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'management' && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="flex items-center justify-between">
                <button
                  onClick={() => setView('selection')}
                  className="flex items-center gap-2 text-slate-400 hover:text-ambev-blue transition-colors group"
                >
                  <ChevronLeft size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sair da Gestão</span>
                </button>
                <h2 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-widest">Gerenciamento de Oficina</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to Add/Edit */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ambev-blue border-b border-gray-100 pb-4">
                      {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Nome do Equipamento</label>
                        <input
                          type="text"
                          value={eqFormData.name}
                          onChange={e => setEqFormData({...eqFormData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase tracking-widest text-[10px] outline-none focus:border-ambev-blue transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Localização</label>
                        <input
                          type="text"
                          value={eqFormData.local}
                          onChange={e => setEqFormData({...eqFormData, local: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase tracking-widest text-[10px] outline-none focus:border-ambev-blue transition-colors"
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Itens de Verificação</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newItemLabel}
                              onChange={e => setNewItemLabel(e.target.value)}
                              placeholder="NOVA VERIFICAÇÃO..."
                              onKeyDown={e => e.key === 'Enter' && addEqItem()}
                              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold uppercase tracking-widest text-[9px] outline-none focus:border-ambev-blue transition-colors"
                            />
                            <button 
                              type="button" onClick={addEqItem}
                              className="bg-ambev-blue text-white p-2 rounded-xl hover:scale-105 transition-all shadow-md shadow-ambev-blue/10"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                          {eqFormData.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 group">
                              <span className="text-[9px] font-bold uppercase text-slate-600 line-clamp-1">{item.label}</span>
                              <button 
                                onClick={() => removeEqItem(item.id)}
                                className="text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {editingEquipment && (
                        <button
                          onClick={() => { setEditingEquipment(null); setEqFormData({ name: '', local: '', items: [] }); }}
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-black uppercase tracking-widest text-[9px] hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={handleSaveEquipment}
                        className="flex-2 bg-ambev-blue text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-ambev-blue/10"
                      >
                        {editingEquipment ? 'Salvar Alterações' : 'Criar Equipamento'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* List of Equipment */}
                <div className="lg:col-span-2 space-y-4">
                  {workshopEquipment.map((eq) => (
                    <div key={eq.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-ambev-blue transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-black uppercase tracking-tighter text-slate-900">{eq.name}</h4>
                          <span className="text-[8px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{eq.local}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{eq.items.length} itens no checklist</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setEditingEquipment(eq); setEqFormData({ name: eq.name, local: eq.local, items: [...eq.items] }); }}
                          className="bg-gray-50 p-2.5 rounded-xl text-slate-400 hover:bg-ambev-blue hover:text-white transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Excluir este equipamento?')) deleteWorkshopEquipment(eq.id); }}
                          className="bg-gray-50 p-2.5 rounded-xl text-slate-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  Histórico de Registros
                </h2>
                <div className="relative group w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="FILTRAR REGISTROS..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl font-black uppercase tracking-widest text-[9px] outline-none shadow-sm"
                  />
                </div>
              </div>

              {workshopChecklists.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 border-dashed">
                  <History size={24} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {workshopChecklists.map((record) => (
                    <div key={record.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className={cn("w-full md:w-1.5", record.items && Object.values(record.items).includes('N') ? "bg-red-500" : "bg-green-500")} />
                        <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[8px] font-black tracking-widest">{formatDate(record.data)}</span>
                              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase">{record.equipamento}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <User size={12} />
                                <span className="text-[9px] font-bold uppercase">{record.responsavel}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className={Object.values(record.items).includes('N') ? "text-red-500" : "text-green-500"} />
                                <span className={cn("text-[9px] font-black uppercase", Object.values(record.items).includes('N') ? "text-red-600" : "text-green-600")}>
                                  {Object.values(record.items).includes('N') ? 'Não Conforme' : 'Conforme'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {record.observacoes && (
                            <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 max-w-sm">
                              <p className="text-[8px] font-bold text-gray-500 uppercase leading-tight italic">"{record.observacoes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
