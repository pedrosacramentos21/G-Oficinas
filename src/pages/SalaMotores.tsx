import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Plus, Zap, User, Calendar, DollarSign, CheckCircle2, Clock, Play } from 'lucide-react';
import { cn } from '../lib/utils';

const COLUMNS = [
  { id: 'pendente', name: 'Pendente', color: 'bg-yellow-500' },
  { id: 'em_andamento', name: 'Em andamento', color: 'bg-blue-500' },
  { id: 'concluido', name: 'Concluído', color: 'bg-green-500' }
];

export default function SalaMotores() {
  const { salaMotores, fetchSalaMotores, addAtividadeSalaMotores, updateStatusSalaMotores } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
    custo_evitado: 0
  });

  useEffect(() => {
    fetchSalaMotores();
  }, [fetchSalaMotores]);

  const totalCustoEvitadoMes = salaMotores
    .filter(a => a.status === 'concluido' && new Date(a.data).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.custo_evitado, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAtividadeSalaMotores(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in duration-500 overflow-hidden">
      <div className="shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">SALA DE MOTORES</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestão de intervenções e atividades</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="bg-white px-4 md:px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="bg-green-50 p-2 rounded-lg">
              <DollarSign className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo evitado no mês</p>
              <p className="text-lg font-black text-gray-900">R$ {totalCustoEvitadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            Nova Atividade
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-hidden">
        {COLUMNS.map(column => (
          <div key={column.id} className="flex flex-col gap-4 bg-gray-100/50 p-4 rounded-[2rem] border border-gray-200/50 min-h-0">
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", column.color)} />
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{column.name}</h2>
              </div>
              <span className="bg-white text-gray-900 text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                {salaMotores.filter(a => a.status === column.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {salaMotores
                .filter(a => a.status === column.id)
                .map(item => (
                  <div 
                    key={item.id} 
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", column.color)} />
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-black text-gray-900 text-sm leading-tight group-hover:text-orange-500 transition-colors">
                          {item.titulo}
                        </h3>
                        {item.status === 'concluido' ? (
                          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        ) : item.status === 'em_andamento' ? (
                          <Play size={16} className="text-blue-500 shrink-0" />
                        ) : (
                          <Clock size={16} className="text-yellow-500 shrink-0" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <User size={12} />
                          <span className="truncate">{item.responsavel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <Calendar size={12} />
                          <span>{item.data}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-1 text-green-600 font-black text-[10px]">
                          <DollarSign size={10} />
                          {item.custo_evitado.toLocaleString('pt-BR')}
                        </div>
                        
                        <div className="flex gap-1">
                          {column.id !== 'pendente' && (
                            <button 
                              onClick={() => updateStatusSalaMotores(item.id, 'pendente')}
                              className="p-1.5 hover:bg-yellow-50 text-yellow-500 rounded-lg transition-colors"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                          {column.id !== 'em_andamento' && (
                            <button 
                              onClick={() => updateStatusSalaMotores(item.id, 'em_andamento')}
                              className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          {column.id !== 'concluido' && (
                            <button 
                              onClick={() => updateStatusSalaMotores(item.id, 'concluido')}
                              className="p-1.5 hover:bg-green-50 text-green-500 rounded-lg transition-colors"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">NOVA ATIVIDADE</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sala de Motores</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-colors">
                <Plus size={24} className="text-gray-400 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título da Atividade</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    value={formData.titulo}
                    onChange={e => setFormData({...formData, titulo: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
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
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Custo Evitado (R$)</label>
                  <input 
                    type="number"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all"
                    value={formData.custo_evitado}
                    onChange={e => setFormData({...formData, custo_evitado: Number(e.target.value)})}
                  />
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
    </div>
  );
}
