import React, { useState } from 'react';
import { X, Shield, Trash2, CheckCircle } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  onDelete?: () => void;
}

export default function PasswordModal({ isOpen, onClose, onConfirm, onDelete }: PasswordModalProps) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(password);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Ação Restrita</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Senha Mestre Necessária</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Senha de Autorização</label>
            <input 
              type="password"
              required
              autoFocus
              className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 transition-all text-center text-2xl tracking-[0.5em]"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-4 pt-2">
            {onDelete && (
              <button 
                type="button"
                onClick={() => {
                  onDelete();
                }}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-100"
              >
                <Trash2 size={18} />
                EXCLUIR
              </button>
            )}
            <button 
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              APROVAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
