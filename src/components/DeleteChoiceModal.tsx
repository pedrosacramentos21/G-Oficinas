import React from 'react';
import { Trash2, Calendar, Layout, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DeleteChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (choice: 'backlog-only' | 'both') => void;
  title?: string;
  description?: string;
}

export default function DeleteChoiceModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Como deseja apagar?", 
  description = "Escolha se deseja remover o item apenas do backlog ou também do calendário."
}: DeleteChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-red-50 p-3 rounded-2xl">
              <Trash2 className="text-red-500 w-6 h-6" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="text-slate-400 w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {description}
          </p>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onConfirm('backlog-only')}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-ambev-blue hover:bg-blue-50/50 transition-all group text-left"
            >
              <div className="bg-blue-100 p-2.5 rounded-xl group-hover:bg-ambev-blue transition-colors">
                <Layout className="text-ambev-blue group-hover:text-white w-5 h-5" />
              </div>
              <div>
                <span className="block font-black text-slate-900 uppercase text-xs tracking-wider">Somente em backlog</span>
                <span className="text-[10px] text-slate-500 font-medium">Mantém a marcação no calendário</span>
              </div>
            </button>

            <button
              onClick={() => onConfirm('both')}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50/50 transition-all group text-left"
            >
              <div className="bg-red-100 p-2.5 rounded-xl group-hover:bg-red-500 transition-colors">
                <Calendar className="text-red-500 group-hover:text-white w-5 h-5" />
              </div>
              <div>
                <span className="block font-black text-red-600 uppercase text-xs tracking-wider">Calendário e Backlog</span>
                <span className="text-[10px] text-red-400 font-medium">Remove de ambos permanentemente</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
