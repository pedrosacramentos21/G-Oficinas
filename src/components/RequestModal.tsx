import React, { useState, useEffect } from 'react';
import { Solicitacao, AREAS, Tipo, Prioridade } from '../types';
import { X, Trash2 } from 'lucide-react';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Solicitacao) => void;
  onDelete?: (id: number) => void;
  initialData?: Partial<Solicitacao>;
}

export default function RequestModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData
}: RequestModalProps) {
  const [formData, setFormData] = useState<Solicitacao>({
    area: AREAS[0],
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
    hora_inicio: '08:00',
    hora_fim: '09:00',
    tipo: 'Montagem',
    descricao: '',
    prioridade: 'Normal'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {formData.id ? 'Editar Solicitação' : 'Nova Solicitação'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Área</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: (e.target as HTMLSelectElement).value })}
                required
              >
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Responsável</label>
              <input
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                value={formData.responsavel}
                onChange={e => setFormData({ ...formData, responsavel: (e.target as HTMLInputElement).value })}
                placeholder="Ex: Mauricio"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: (e.target as HTMLSelectElement).value as Tipo })}
              >
                <option value="Montagem">Montagem</option>
                <option value="Desmontagem">Desmontagem</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Prioridade</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                value={formData.prioridade}
                onChange={e => setFormData({ ...formData, prioridade: (e.target as HTMLSelectElement).value as Prioridade })}
              >
                <option value="Normal">Normal</option>
                <option value="Urgente">Urgente</option>
                <option value="Emergencial">Emergencial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Data</label>
              <input
                type="date"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: (e.target as HTMLInputElement).value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Início</label>
                <input
                  type="time"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                  value={formData.hora_inicio}
                  onChange={e => setFormData({ ...formData, hora_inicio: (e.target as HTMLInputElement).value })}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fim</label>
                <input
                  type="time"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                  value={formData.hora_fim}
                  onChange={e => setFormData({ ...formData, hora_fim: (e.target as HTMLInputElement).value })}
                  required
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Descrição do Serviço</label>
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium min-h-[100px]"
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: (e.target as HTMLTextAreaElement).value })}
                placeholder="Detalhes do serviço..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 gap-3">
            {formData.id && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(formData.id!)}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
              >
                <Trash2 size={18} />
                Excluir
              </button>
            ) : <div />}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                Salvar Solicitação
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
