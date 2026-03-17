import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Layers, Lock, Unlock, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import PasswordModal from './PasswordModal';

const AREAS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades e Meio Ambiente'
];

const TIPOS_SERVICO = [
  'Montagem',
  'Desmontagem'
];

const HORARIOS = Array.from({ length: 12 }, (_, i) => {
  const hour = (i + 7).toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function AndaimeModal({ isOpen, onClose, andaime }: { isOpen: boolean, onClose: () => void, andaime?: any }) {
  const { addAndaime, updateAndaime } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showNotice, setShowNotice] = useState(false);
  
  const initialFormState = {
    area: AREAS[0],
    local_setor: '',
    tipo_servico: TIPOS_SERVICO[0],
    quantidade_pontos: 1,
    data_montagem: new Date().toISOString().split('T')[0],
    data_desmontagem: '',
    hora_inicio: '08:00',
    hora_fim: '09:00',
    solicitante: '',
    descricao_local: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setShowPasswordModal(false);
      if (andaime) {
        setFormData({
          area: andaime.area,
          local_setor: andaime.local_setor,
          tipo_servico: andaime.tipo_servico,
          quantidade_pontos: andaime.quantidade_pontos,
          data_montagem: andaime.data_montagem,
          data_desmontagem: andaime.data_desmontagem,
          hora_inicio: andaime.hora_inicio,
          hora_fim: andaime.hora_fim,
          solicitante: andaime.solicitante,
          descricao_local: andaime.descricao_local
        });
        setIsUnlocked(andaime.status !== 'aprovado');
      } else {
        setFormData(initialFormState);
        setIsUnlocked(true);
        setShowNotice(true);
        const timer = setTimeout(() => setShowNotice(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, andaime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.data_desmontagem) {
      alert('A data de desmontagem prevista deve ser preenchida antes de enviar a solicitação.');
      return;
    }

    if (new Date(formData.data_desmontagem) < new Date(formData.data_montagem)) {
      alert('A data de desmontagem não pode ser anterior à data de montagem.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (andaime) {
        await updateAndaime(andaime.id, formData, unlockPassword);
        onClose();
      } else {
        const res = await addAndaime(formData);
        if (res.message) {
          alert(res.message);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 3000);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async (password: string) => {
    if (password === 'Itf2026') {
      if (andaime && andaime.status === 'pendente') {
        try {
          await useStore.getState().approveAndaime(andaime.id, password);
          onClose();
        } catch (err: any) {
          alert(err.message);
        }
      } else {
        setIsUnlocked(true);
        setUnlockPassword(password);
        setShowPasswordModal(false);
      }
    } else {
      alert('Senha incorreta');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative custom-scrollbar">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300 min-h-[400px]">
            <div className="bg-green-100 p-6 rounded-full mb-6 shadow-inner">
              <Layers className="text-green-600" size={64} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight leading-tight">
              SOLICITAÇÃO ENVIADA!
            </h3>
            <div className="space-y-2">
              <p className="text-gray-500 font-bold text-lg">
                Aguarde aprovação da solicitação por
              </p>
              <p className="text-orange-500 font-black text-xl uppercase">
                Pedro Sacramento - ITF
              </p>
            </div>
            <button 
              onClick={onClose}
              className="mt-10 bg-gray-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-800 transition-all"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {showNotice && (
          <div className="bg-blue-600 text-white p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300 z-20">
            <Info size={20} className="shrink-0" />
            <p className="text-xs font-black uppercase tracking-widest leading-tight">
              Gentileza verificar com encarregado Solução Andaimes a respeito da quantidade de pontos antes de confirmar a solicitação.
            </p>
            <button onClick={() => setShowNotice(false)} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-6 border-b border-orange-50 flex items-center justify-between bg-orange-50/30 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
                  <Layers className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">G-Oficinas</h2>
                  <p className="text-sm font-bold text-gray-400 mt-1">
                    {andaime ? (andaime.status === 'aprovado' ? 'Editar Solicitação Aprovada' : 'Solicitação Pendente') : 'Nova Solicitação'}
                  </p>
                  {andaime?.status === 'pendente' && (
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2 animate-pulse">
                      Aguardar aprovação da solicitação por Pedro Sacramento - ITF
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {andaime?.status === 'pendente' && (
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <CheckCircle2 size={14} />
                    Aprovar Solicitação
                  </button>
                )}
                {andaime?.status === 'aprovado' && !isUnlocked && (
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-200 transition-all"
                  >
                    <Lock size={14} />
                    Desbloquear para Editar
                  </button>
                )}
                {andaime?.status === 'aprovado' && isUnlocked && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]">
                    <Unlock size={14} />
                    Edição Liberada
                  </div>
                )}
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className={cn("p-8 space-y-6", !isUnlocked && "opacity-50 pointer-events-none")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Local / Setor</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    placeholder="Ex: Torre de Resfriar"
                    value={formData.local_setor}
                    onChange={e => setFormData({...formData, local_setor: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Área</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.area}
                    onChange={e => setFormData({...formData, area: e.target.value})}
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Tipo de Serviço</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.tipo_servico}
                    onChange={e => setFormData({...formData, tipo_servico: e.target.value})}
                  >
                    {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Quantidade de Pontos</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.quantidade_pontos}
                    onChange={e => setFormData({...formData, quantidade_pontos: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Data da Montagem</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.data_montagem}
                    onChange={e => setFormData({...formData, data_montagem: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">
                    Data Prevista Desmontagem <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.data_desmontagem}
                    onChange={e => setFormData({...formData, data_desmontagem: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Início</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.hora_inicio}
                    onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                  >
                    {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Fim</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.hora_fim}
                    onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                  >
                    {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Solicitante</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.solicitante}
                    onChange={e => setFormData({...formData, solicitante: e.target.value})}
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Descrição do Local</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none min-h-[80px]"
                    placeholder="Detalhes adicionais sobre o local..."
                    value={formData.descricao_local}
                    onChange={e => setFormData({...formData, descricao_local: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-xl transition-all uppercase tracking-widest text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !isUnlocked}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
                >
                  {isSubmitting ? 'Processando...' : (andaime ? 'Salvar Alterações' : 'Solicitar Agendamento')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleUnlock}
      />
    </div>
  );
}
