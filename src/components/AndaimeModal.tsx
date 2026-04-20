import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Layers, Lock, Unlock, Info, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import PasswordModal from './PasswordModal';
import DeleteChoiceModal from './DeleteChoiceModal';

const AREAS = [
  'Processo cerveja',
  'Packaging, Bblend e Xaroparia',
  'Utilidades',
  'Meio Ambiente'
];

const TIPOS_SERVICO = [
  'Montagem',
  'Desmontagem'
];

const HORARIOS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function AndaimeModal({ isOpen, onClose, andaime, isBacklog }: { isOpen: boolean, onClose: () => void, andaime?: any, isBacklog?: boolean }) {
  const { addAndaime, updateAndaime } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showNotice, setShowNotice] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState<'backlog-only' | 'both' | null>(null);
  
  const initialFormState = {
    area: AREAS[0],
    local_setor: '',
    tipo_servico: TIPOS_SERVICO[0],
    quantidade_pontos: 1,
    data_montagem: new Date().toISOString().split('T')[0],
    data_desmontagem: '',
    hora_inicio: '08:00',
    hora_fim: '17:00',
    solicitante: '',
    descricao_local: '',
    excedeu_limite: false,
    justificativa_excesso: '',
    somente_backlog: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [passwordModalAction, setPasswordModalAction] = useState<'unlock' | 'delete'>('unlock');
  const { andaimes } = useStore();

  const LIMITS: Record<string, number> = {
    'Processo cerveja': 10,
    'Packaging, Bblend e Xaroparia': 4,
    'Utilidades': 3,
    'Meio Ambiente': 3
  };

  useEffect(() => {
    if (isOpen) {
      setShowPasswordModal(false);
      setPasswordModalAction('unlock');
      if (andaime) {
        setFormData({
          area: andaime.area || AREAS[0],
          local_setor: andaime.local_setor || '',
          tipo_servico: andaime.tipo_servico || TIPOS_SERVICO[0],
          quantidade_pontos: andaime.quantidade_pontos || 1,
          data_montagem: andaime.data_montagem || new Date().toISOString().split('T')[0],
          data_desmontagem: andaime.data_desmontagem || '',
          hora_inicio: andaime.hora_inicio || '08:00',
          hora_fim: andaime.hora_fim || '17:00',
          solicitante: andaime.solicitante || '',
          descricao_local: andaime.descricao_local || '',
          excedeu_limite: andaime.excedeu_limite || false,
          justificativa_excesso: andaime.justificativa_excesso || '',
          somente_backlog: andaime.somente_backlog || false
        });
        setIsUnlocked(!andaime.id || andaime.status !== 'aprovado');
      } else {
        setFormData(initialFormState);
        setIsUnlocked(true);
        setShowNotice(true);
        const timer = setTimeout(() => setShowNotice(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, andaime]);

  useEffect(() => {
    if (!andaime && formData.tipo_servico === 'Montagem') {
      const currentPoints = andaimes
        .filter(a => a.area === formData.area && a.status === 'aprovado' && a.tipo_servico !== 'Desmontagem' && !a.esconder_no_backlog)
        .reduce((sum, a) => sum + a.quantidade_pontos, 0);
      
      const limit = LIMITS[formData.area] || 999;
      const willExceed = currentPoints + formData.quantidade_pontos > limit;
      
      if (willExceed !== formData.excedeu_limite) {
        setFormData(prev => ({ ...prev, excedeu_limite: willExceed }));
        if (willExceed) {
          setShowLimitAlert(true);
          setTimeout(() => setShowLimitAlert(false), 5000);
        }
      }
    }
  }, [formData.area, formData.quantidade_pontos, formData.tipo_servico, andaimes, andaime]);

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

    const dateMontagem = new Date(formData.data_montagem);
    const dateDesmontagem = new Date(formData.data_desmontagem);
    const diffTime = Math.abs(dateDesmontagem.getTime() - dateMontagem.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      alert('A data de desmontagem deve ser no máximo 30 dias após a data de montagem.');
      return;
    }

    if (formData.excedeu_limite && !formData.justificativa_excesso) {
      alert('Por favor, insira uma justificativa para a montagem acima do limite de pontos.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (andaime?.id) {
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
      if (showPasswordModal && passwordModalAction === 'delete') {
        try {
          if (deleteChoice === 'backlog-only') {
            await updateAndaime(andaime.id, { esconder_no_backlog: true }, password);
          } else {
            await useStore.getState().deleteAndaime(andaime.id, password);
          }
          onClose();
        } catch (err: any) {
          alert(err.message);
        }
      } else if (andaime && andaime.status === 'pendente') {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-200">
      {showLimitAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-500">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500">
            <Info size={20} className="animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Alerta de Contrato</span>
              <span className="text-xs font-bold">Limite de pontos excedido para esta área!</span>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[95vh] relative">
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
              <p className="text-ambev-blue font-black text-xl uppercase">
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
        <div className="p-4 sm:p-6 border-b border-ambev-blue/10 flex items-center justify-between bg-ambev-blue/5 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-ambev-blue p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-ambev-blue/20">
                  <Layers className="text-ambev-gold w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Andaimes</h2>
                  <p className="text-[10px] sm:text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
                    {andaime ? (andaime.status === 'aprovado' ? 'Editar Solicitação' : 'Pendente') : 'Nova Solicitação'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} className="text-gray-400 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {andaime?.status === 'pendente' && (
                <div className="px-6 pt-4">
                  <p className="text-[10px] font-black text-ambev-blue uppercase tracking-widest animate-pulse bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    Aguardar aprovação por Pedro Sacramento - ITF
                  </p>
                </div>
              )}

              <form id="andaime-form" onSubmit={handleSubmit} className={cn("p-6 sm:p-8 space-y-6", !isUnlocked && "opacity-50 pointer-events-none")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Local / Setor</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-ambev-blue focus:border-transparent transition-all outline-none"
                    placeholder="Ex: Torre de Resfriar"
                    value={formData.local_setor}
                    onChange={e => setFormData({...formData, local_setor: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Área</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-ambev-blue focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.area}
                    onChange={e => setFormData({...formData, area: e.target.value})}
                  >
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Tipo de Serviço</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-ambev-blue focus:border-transparent transition-all outline-none appearance-none"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-ambev-blue focus:border-transparent transition-all outline-none"
                    value={formData.quantidade_pontos}
                    onChange={e => setFormData({...formData, quantidade_pontos: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Data da Montagem</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.data_desmontagem}
                    onChange={e => setFormData({...formData, data_desmontagem: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Início</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                      value={formData.hora_inicio}
                      onChange={e => setFormData({...formData, hora_inicio: e.target.value})}
                    >
                      {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Fim</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                      value={formData.hora_fim}
                      onChange={e => setFormData({...formData, hora_fim: e.target.value})}
                    >
                      {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Solicitante</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    value={formData.solicitante}
                    onChange={e => setFormData({...formData, solicitante: e.target.value})}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Descrição do Local</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none min-h-[80px]"
                    placeholder="Detalhes adicionais sobre o local..."
                    value={formData.descricao_local}
                    onChange={e => setFormData({...formData, descricao_local: e.target.value})}
                  />
                </div>

                {formData.excedeu_limite && (
                  <div className="sm:col-span-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-2">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <Info size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Aviso: Limite de pontos excedido</span>
                      </div>
                      <p className="text-[10px] font-bold text-red-500 uppercase leading-tight">
                        O limite de pontos para a área {formData.area} ({LIMITS[formData.area]} pts) foi excedido. 
                        É obrigatório inserir uma justificativa para esta solicitação.
                      </p>
                    </div>
                    <label className="block text-xs font-black text-red-600 uppercase tracking-widest mb-2">Justificativa do Excesso <span className="text-red-500">*</span></label>
                    <textarea 
                      required
                      className="w-full bg-red-50/30 border border-red-200 rounded-xl p-3.5 sm:p-3 font-bold text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none min-h-[80px]"
                      placeholder="Descreva o motivo da necessidade acima do limite contratual..."
                      value={formData.justificativa_excesso}
                      onChange={e => setFormData({...formData, justificativa_excesso: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
            {andaime && (
              <button 
                type="button"
                onClick={() => {
                  if (isBacklog) {
                    setShowDeleteChoice(true);
                  } else {
                    setPasswordModalAction('delete');
                    setShowPasswordModal(true);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-red-50 hover:bg-red-100 text-red-500 font-black rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 border border-red-100 order-3 sm:order-1"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:ml-auto order-1 sm:order-2">
              {andaime?.status === 'pendente' && (
                <button 
                  type="button"
                  onClick={() => {
                    setPasswordModalAction('unlock');
                    setShowPasswordModal(true);
                  }}
                  className="flex-1 px-6 py-3.5 sm:py-3 bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Aprovar
                </button>
              )}

              {andaime?.status === 'aprovado' && !isUnlocked && (
                <button 
                  type="button"
                  onClick={() => {
                    setPasswordModalAction('unlock');
                    setShowPasswordModal(true);
                  }}
                  className="flex-1 px-6 py-3.5 sm:py-3 bg-orange-100 text-orange-600 font-black rounded-xl hover:bg-orange-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  Desbloquear
                </button>
              )}

              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3.5 sm:py-3 bg-gray-200 text-gray-600 font-black rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest text-xs order-2 sm:order-1"
              >
                Cancelar
              </button>
              
              <button 
                form="andaime-form"
                type="submit"
                disabled={isSubmitting || !isUnlocked}
                className="flex-[2] px-6 py-3.5 sm:py-3 bg-ambev-blue text-white font-black rounded-xl shadow-xl shadow-ambev-blue/20 hover:bg-ambev-blue/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs order-1 sm:order-2"
              >
                {isSubmitting ? 'Processando...' : (andaime ? 'Salvar Alterações' : 'Solicitar Agendamento')}
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleUnlock}
      />

      <DeleteChoiceModal
        isOpen={showDeleteChoice}
        onClose={() => setShowDeleteChoice(false)}
        onConfirm={(choice) => {
          setDeleteChoice(choice);
          setShowDeleteChoice(false);
          setPasswordModalAction('delete');
          setShowPasswordModal(true);
        }}
      />
    </div>
  );
}
