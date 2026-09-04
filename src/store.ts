import { create } from 'zustand';

interface Andaime {
  id: number;
  area: string;
  local_setor: string;
  tipo_servico: string;
  quantidade_pontos: number;
  data_montagem: string;
  data_desmontagem: string;
  hora_inicio: string;
  hora_fim: string;
  solicitante: string;
  descricao_local: string;
  status: 'pendente' | 'aprovado';
  status_execucao?: 'Pendente' | 'Em andamento' | 'Concluído';
  somente_backlog?: boolean;
  esconder_no_backlog?: boolean;
  excedeu_limite?: boolean;
  justificativa_excesso?: string;
  data_montagem_original?: string;
  created_at?: string;
}

interface PTA {
  id: number;
  equipamento: string;
  area: string;
  responsavel: string;
  telefone?: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  descricao: string;
  prioridade: string;
  status: 'pendente' | 'aprovado';
  created_at?: string;
}

interface AtividadeSalaMotores {
  id: number;
  titulo: string;
  responsavel: string;
  data: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'entregue';
  custo_evitado: number;
  causa_raiz?: string;
  observacoes?: string;
  area?: string;
  sub_area?: string;
  tag_motor?: string;
  data_inicio?: string;
  data_conclusao?: string;
  data_entrega?: string;
  historico_status?: { status: string; data: string }[];
  created_at?: string;
}

interface ArmstrongManutencao {
  id: number;
  titulo: string;
  area: string;
  sub_area?: string;
  equipamento: string;
  responsavel: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  descricao: string;
  observacoes: string;
  impacto_energetico: string;
  investimento_estimado: string;
  status: string;
  tipo_manutencao: string;
  created_at?: string;
}

interface RefrigeracaoManutencao {
  id: number;
  titulo: string;
  area: string;
  sub_area?: string;
  equipamento: string;
  responsavel: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  descricao: string;
  observacoes: string;
  investimento_estimado: string;
  status: string;
  tipo_manutencao: string;
  nivel_criticidade: string;
  created_at?: string;
}

interface ArmstrongPCMArea {
  id: number;
  data: string;
  area: string;
}

interface ArmstrongBacklog {
  id: number;
  area: string;
  sub_area?: string;
  titulo: string;
  impacto_energetico: string;
  investimento_estimado: string;
  data_prevista: string;
  status: string;
  observacoes?: string;
  descricao?: string;
  equipamento?: string;
  responsavel?: string;
  hora_inicio?: string;
  hora_fim?: string;
  tipo_manutencao: string;
  created_at?: string;
}

interface RefrigeracaoBacklog {
  id: number;
  area: string;
  sub_area?: string;
  titulo: string;
  investimento_estimado: string;
  data_prevista: string;
  status: string;
  observacoes?: string;
  descricao?: string;
  equipamento?: string;
  responsavel?: string;
  hora_inicio?: string;
  hora_fim?: string;
  tipo_manutencao: string;
  nivel_criticidade: string;
  created_at?: string;
}

interface OficinaServico {
  id: number;
  servico: string;
  responsavel: string;
  data: string;
  status: string;
  created_at?: string;
}

interface WorkshopChecklist {
  id: number;
  data: string;
  responsavel: string;
  equipamento: string;
  items: Record<string, 'S' | 'N' | 'NA'>;
  observacoes?: string;
  created_at?: string;
}

interface WorkshopEquipment {
  id: number;
  name: string;
  local: string;
  items: { id: string, label: string }[];
}

interface StoreState {
  error: string | null;
  setError: (error: string | null) => void;
  andaimes: Andaime[];
  ptas: PTA[];
  salaMotores: AtividadeSalaMotores[];
  armstrongManutencoes: ArmstrongManutencao[];
  armstrongPCMAreas: ArmstrongPCMArea[];
  armstrongBacklog: ArmstrongBacklog[];
  refrigeracaoManutencoes: RefrigeracaoManutencao[];
  refrigeracaoPCMAreas: ArmstrongPCMArea[];
  refrigeracaoBacklog: RefrigeracaoBacklog[];
  oficinaServicos: OficinaServico[];
  workshopChecklists: WorkshopChecklist[];
  workshopEquipment: WorkshopEquipment[];
  fetchAndaimes: () => Promise<void>;
  addAndaime: (andaime: Omit<Andaime, 'id' | 'status'>) => Promise<any>;
  approveAndaime: (id: number, password: string) => Promise<void>;
  updateAndaime: (id: number, andaime: Partial<Andaime>, password?: string) => Promise<void>;
  deleteAndaime: (id: number, password: string) => Promise<void>;
  batchDeleteAndaimes: (ids: number[], password: string) => Promise<void>;
  batchUpdateAndaimes: (ids: number[], updates: Partial<Andaime>, password: string) => Promise<void>;
  batchApproveAndaimes: (ids: number[], password: string) => Promise<void>;
  updateStatusExecucaoAndaime: (id: number, status: string) => Promise<void>;
  fetchPTAs: () => Promise<void>;
  addPTA: (pta: any) => Promise<any>;
  approvePTA: (id: number, password: string) => Promise<void>;
  updatePTA: (id: number, updates: any, password?: string) => Promise<void>;
  deletePTA: (id: number, password: string) => Promise<void>;
  batchDeletePTAs: (ids: number[], password: string) => Promise<void>;
  fetchSalaMotores: () => Promise<void>;
  addAtividadeSalaMotores: (atividade: Omit<AtividadeSalaMotores, 'id' | 'status'>) => Promise<void>;
  updateStatusSalaMotores: (id: number, status: AtividadeSalaMotores['status']) => Promise<void>;
  updateAtividadeSalaMotores: (id: number, updates: Partial<AtividadeSalaMotores>, password?: string) => Promise<void>;
  deleteAtividadeSalaMotores: (id: number, password: string) => Promise<void>;
  batchDeleteSalaMotores: (ids: number[], password: string) => Promise<void>;
  fetchArmstrong: () => Promise<void>;
  addArmstrongManutencao: (manutencao: Omit<ArmstrongManutencao, 'id'>) => Promise<void>;
  updateArmstrongManutencao: (id: number, updates: Partial<ArmstrongManutencao>, password?: string) => Promise<void>;
  deleteArmstrongManutencao: (id: number, password: string) => Promise<void>;
  batchDeleteArmstrongManutencoes: (ids: number[], password: string) => Promise<void>;
  addArmstrongPCMArea: (area: Omit<ArmstrongPCMArea, 'id'>) => Promise<void>;
  deleteArmstrongPCMArea: (id: number) => Promise<void>;
  addArmstrongBacklog: (item: Omit<ArmstrongBacklog, 'id'>) => Promise<void>;
  updateArmstrongBacklog: (id: number, updates: Partial<ArmstrongBacklog>, password?: string) => Promise<void>;
  deleteArmstrongBacklog: (id: number, password: string) => Promise<void>;
  batchDeleteArmstrongBacklog: (ids: number[], password: string) => Promise<void>;
  batchUpdateArmstrongBacklog: (ids: number[], updates: any, password: string) => Promise<void>;
  fetchRefrigeracao: () => Promise<void>;
  addRefrigeracaoManutencao: (manutencao: Omit<RefrigeracaoManutencao, 'id'>) => Promise<void>;
  updateRefrigeracaoManutencao: (id: number, updates: Partial<RefrigeracaoManutencao>, password?: string) => Promise<void>;
  deleteRefrigeracaoManutencao: (id: number, password: string) => Promise<void>;
  batchDeleteRefrigeracaoManutencoes: (ids: number[], password: string) => Promise<void>;
  addRefrigeracaoPCMArea: (area: Omit<ArmstrongPCMArea, 'id'>) => Promise<void>;
  deleteRefrigeracaoPCMArea: (id: number) => Promise<void>;
  addRefrigeracaoBacklog: (item: Omit<RefrigeracaoBacklog, 'id'>) => Promise<void>;
  updateRefrigeracaoBacklog: (id: number, updates: Partial<RefrigeracaoBacklog>, password?: string) => Promise<void>;
  deleteRefrigeracaoBacklog: (id: number, password: string) => Promise<void>;
  batchDeleteRefrigeracaoBacklog: (ids: number[], password: string) => Promise<void>;
  batchUpdateRefrigeracaoBacklog: (ids: number[], updates: any, password: string) => Promise<void>;
  fetchOficina: () => Promise<void>;
  addOficinaServico: (servico: Omit<OficinaServico, 'id'>) => Promise<void>;
  fetchWorkshopChecklists: () => Promise<void>;
  addWorkshopChecklist: (checklist: Omit<WorkshopChecklist, 'id'>) => Promise<void>;
  deleteWorkshopChecklist: (id: number) => Promise<void>;
  fetchWorkshopEquipment: () => Promise<void>;
  addWorkshopEquipment: (equipment: Omit<WorkshopEquipment, 'id'>) => Promise<void>;
  updateWorkshopEquipment: (id: number, equipment: Partial<WorkshopEquipment>) => Promise<void>;
  deleteWorkshopEquipment: (id: number) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  error: null,
  setError: (error) => set({ error }),
  andaimes: [],
  ptas: [],
  salaMotores: [],
  armstrongManutencoes: [],
  armstrongPCMAreas: [],
  armstrongBacklog: [],
  refrigeracaoManutencoes: [],
  refrigeracaoPCMAreas: [],
  refrigeracaoBacklog: [],
  oficinaServicos: [],
  workshopChecklists: [],
  workshopEquipment: [],

  fetchAndaimes: async () => {
    try {
      console.log('Fetching andaimes...');
      const res = await fetch('/api/andaimes');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao buscar andaimes' }));
        console.error('Andaimes fetch error status:', res.status, err);
        throw new Error(err.error || 'Erro ao buscar andaimes');
      }
      const data = await res.json();
      console.log(`Fetched ${Array.isArray(data) ? data.length : 0} andaimes`);
      if (Array.isArray(data)) {
        set({ andaimes: data, error: null });
      } else {
        set({ andaimes: [], error: 'Dados de andaimes inválidos' });
      }
    } catch (error: any) {
      console.error('Failed to fetch andaimes:', error);
      set({ error: error.message });
    }
  },

  addAndaime: async (andaime) => {
    const res = await fetch('/api/andaimes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(andaime),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    }
    get().fetchAndaimes();
    return data;
  },

  approveAndaime: async (id, password) => {
    const res = await fetch(`/api/andaimes/${id}/aprovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },

  updateAndaime: async (id, andaime, password) => {
    const res = await fetch(`/api/andaimes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...andaime, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },

  deleteAndaime: async (id, password) => {
    const res = await fetch(`/api/andaimes/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },
  
  batchDeleteAndaimes: async (ids, password) => {
    const res = await fetch('/api/andaimes/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },
  
  batchUpdateAndaimes: async (ids, updates, password) => {
    const res = await fetch('/api/andaimes/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },

  batchApproveAndaimes: async (ids, password) => {
    const res = await fetch('/api/andaimes/batch-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },
  
  updateStatusExecucaoAndaime: async (id, status) => {
    const res = await fetch(`/api/andaimes/${id}/status-execucao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
  },
  
  fetchPTAs: async () => {
    try {
      console.log('Fetching PTAs...');
      const res = await fetch('/api/ptas');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao buscar PTAs' }));
        console.error('PTAs fetch error status:', res.status, err);
        throw new Error(err.error || 'Erro ao buscar PTAs');
      }
      const data = await res.json();
      console.log(`Fetched ${Array.isArray(data) ? data.length : 0} PTAs`);
      if (Array.isArray(data)) {
        set({ ptas: data, error: null });
      } else {
        set({ ptas: [], error: 'Dados de PTAs inválidos' });
      }
    } catch (error: any) {
      console.error('Failed to fetch ptas:', error);
      set({ error: error.message });
    }
  },

  addPTA: async (pta) => {
    const res = await fetch('/api/ptas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pta),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao salvar solicitação');
    }
    get().fetchPTAs();
    return data;
  },

  approvePTA: async (id, password) => {
    const res = await fetch(`/api/ptas/${id}/aprovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchPTAs();
  },

  updatePTA: async (id, updates, password) => {
    const res = await fetch(`/api/ptas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchPTAs();
  },

  deletePTA: async (id, password) => {
    const res = await fetch(`/api/ptas/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchPTAs();
  },

  batchDeletePTAs: async (ids, password) => {
    const res = await fetch('/api/ptas/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchPTAs();
  },

  fetchSalaMotores: async () => {
    try {
      const res = await fetch('/api/sala-motores');
      const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar atividades da sala de motores');
      }
      if (Array.isArray(data)) {
        set({ salaMotores: data, error: null });
      } else {
        throw new Error('Dados da sala de motores inválidos');
      }
    } catch (error: any) {
      console.error('Failed to fetch sala de motores:', error);
      set({ salaMotores: [], error: error.message });
    }
  },

  addAtividadeSalaMotores: async (atividade) => {
    const res = await fetch('/api/sala-motores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(atividade),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido ao salvar atividade' }));
      throw new Error(error.error || 'Falha ao salvar atividade');
    }
    get().fetchSalaMotores();
  },

  updateStatusSalaMotores: async (id, status) => {
    const res = await fetch(`/api/sala-motores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido ao atualizar status' }));
      throw new Error(error.error || 'Falha ao atualizar status');
    }
    get().fetchSalaMotores();
  },

  updateAtividadeSalaMotores: async (id, updates, password) => {
    const res = await fetch(`/api/sala-motores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchSalaMotores();
  },

  deleteAtividadeSalaMotores: async (id, password) => {
    const res = await fetch(`/api/sala-motores/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchSalaMotores();
  },

  batchDeleteSalaMotores: async (ids, password) => {
    const res = await fetch('/api/sala-motores/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchSalaMotores();
  },

  fetchArmstrong: async () => {
    try {
      const fetchWithCatch = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `Erro em ${name}` }));
            throw new Error(err.error || `Erro ao carregar ${name}`);
          }
          return await res.json();
        } catch (err: any) {
          console.warn(`Partial fetch failure for ${name}:`, err);
          return null; // Return null instead of throwing for Promise.all
        }
      };

      const [manutencoes, pcmAreas, backlog] = await Promise.all([
        fetchWithCatch('/api/armstrong/manutencoes', 'Manutenções Armstrong'),
        fetchWithCatch('/api/armstrong/pcm-areas', 'Áreas PCM Armstrong'),
        fetchWithCatch('/api/armstrong/backlog', 'Backlog Armstrong')
      ]);

      const updates: any = { error: null };
      if (manutencoes !== null) updates.armstrongManutencoes = manutencoes;
      if (pcmAreas !== null) updates.armstrongPCMAreas = pcmAreas;
      if (backlog !== null) updates.armstrongBacklog = backlog;
      
      set(updates);
    } catch (error: any) {
      console.error('Failed to fetch armstrong data:', error);
      set({ error: error.message });
    }
  },

  addArmstrongManutencao: async (manutencao) => {
    const res = await fetch('/api/armstrong/manutencoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manutencao),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add manutencao');
    }
    get().fetchArmstrong();
  },

  updateArmstrongManutencao: async (id, updates, password) => {
    const res = await fetch(`/api/armstrong/manutencoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  deleteArmstrongManutencao: async (id, password) => {
    const res = await fetch(`/api/armstrong/manutencoes/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  batchDeleteArmstrongManutencoes: async (ids, password) => {
    const res = await fetch('/api/armstrong/manutencoes/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  addArmstrongPCMArea: async (area) => {
    const res = await fetch('/api/armstrong/pcm-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(area),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add PCM area');
    }
    get().fetchArmstrong();
  },

  deleteArmstrongPCMArea: async (id) => {
    await fetch(`/api/armstrong/pcm-areas/${id}`, {
      method: 'DELETE',
    });
    get().fetchArmstrong();
  },

  addArmstrongBacklog: async (item) => {
    const res = await fetch('/api/armstrong/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add backlog item');
    }
    get().fetchArmstrong();
  },

  updateArmstrongBacklog: async (id, updates, password) => {
    const res = await fetch(`/api/armstrong/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  deleteArmstrongBacklog: async (id, password) => {
    const res = await fetch(`/api/armstrong/backlog/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  batchDeleteArmstrongBacklog: async (ids, password) => {
    const res = await fetch('/api/armstrong/backlog/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  batchUpdateArmstrongBacklog: async (ids, updates, password) => {
    const res = await fetch('/api/armstrong/backlog/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchArmstrong();
  },

  fetchRefrigeracao: async () => {
    try {
      const fetchWithCatch = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `Erro em ${name}` }));
            throw new Error(err.error || `Erro ao carregar ${name}`);
          }
          return await res.json();
        } catch (err: any) {
          console.warn(`Partial fetch failure for ${name}:`, err);
          return null; // Return null instead of throwing for Promise.all
        }
      };

      const [manutencoes, pcmAreas, backlog] = await Promise.all([
        fetchWithCatch('/api/refrigeracao/manutencoes', 'Manutenções Refrigeração'),
        fetchWithCatch('/api/refrigeracao/pcm-areas', 'Áreas PCM Refrigeração'),
        fetchWithCatch('/api/refrigeracao/backlog', 'Backlog Refrigeração')
      ]);

      const updates: any = { error: null };
      if (manutencoes !== null) updates.refrigeracaoManutencoes = manutencoes;
      if (pcmAreas !== null) updates.refrigeracaoPCMAreas = pcmAreas;
      if (backlog !== null) updates.refrigeracaoBacklog = backlog;
      
      set(updates);
    } catch (error: any) {
      console.error('Failed to fetch refrigeracao data:', error);
      set({ error: error.message });
    }
  },

  addRefrigeracaoManutencao: async (manutencao) => {
    const res = await fetch('/api/refrigeracao/manutencoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manutencao),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add manutencao');
    }
    get().fetchRefrigeracao();
  },

  updateRefrigeracaoManutencao: async (id, updates, password) => {
    const res = await fetch(`/api/refrigeracao/manutencoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  deleteRefrigeracaoManutencao: async (id, password) => {
    const res = await fetch(`/api/refrigeracao/manutencoes/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  batchDeleteRefrigeracaoManutencoes: async (ids, password) => {
    const res = await fetch('/api/refrigeracao/manutencoes/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  addRefrigeracaoPCMArea: async (area) => {
    const res = await fetch('/api/refrigeracao/pcm-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(area),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add PCM area');
    }
    get().fetchRefrigeracao();
  },

  deleteRefrigeracaoPCMArea: async (id) => {
    await fetch(`/api/refrigeracao/pcm-areas/${id}`, {
      method: 'DELETE',
    });
    get().fetchRefrigeracao();
  },

  addRefrigeracaoBacklog: async (item) => {
    const res = await fetch('/api/refrigeracao/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add backlog item');
    }
    get().fetchRefrigeracao();
  },

  updateRefrigeracaoBacklog: async (id, updates, password) => {
    const res = await fetch(`/api/refrigeracao/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  deleteRefrigeracaoBacklog: async (id, password) => {
    const res = await fetch(`/api/refrigeracao/backlog/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  batchDeleteRefrigeracaoBacklog: async (ids, password) => {
    const res = await fetch('/api/refrigeracao/backlog/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  batchUpdateRefrigeracaoBacklog: async (ids, updates, password) => {
    const res = await fetch('/api/refrigeracao/backlog/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchRefrigeracao();
  },

  fetchOficina: async () => {
    try {
      const res = await fetch('/api/oficina/servicos');
      const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar serviços da oficina');
      }
      if (Array.isArray(data)) {
        set({ oficinaServicos: data, error: null });
      } else {
        throw new Error('Dados da oficina inválidos');
      }
    } catch (error: any) {
      console.error('Failed to fetch oficina servicos:', error);
      set({ oficinaServicos: [], error: error.message });
    }
  },

  addOficinaServico: async (servico) => {
    const res = await fetch('/api/oficina/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servico),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add oficina servico');
    }
    get().fetchOficina();
  },

  fetchWorkshopChecklists: async () => {
    try {
      const res = await fetch('/api/workshop/checklists');
      const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar checklists da oficina');
      }
      if (Array.isArray(data)) {
        set({ workshopChecklists: data, error: null });
      } else {
        throw new Error('Dados da oficina inválidos');
      }
    } catch (error: any) {
      console.error('Failed to fetch workshop checklists:', error);
      set({ workshopChecklists: [], error: error.message });
    }
  },

  addWorkshopChecklist: async (checklist) => {
    const res = await fetch('/api/workshop/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checklist),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add workshop checklist');
    }
    get().fetchWorkshopChecklists();
  },

  deleteWorkshopChecklist: async (id) => {
    const res = await fetch(`/api/workshop/checklists/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to delete workshop checklist');
    }
    get().fetchWorkshopChecklists();
  },

  fetchWorkshopEquipment: async () => {
    try {
      const res = await fetch('/api/workshop/equipment');
      const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar equipamentos da oficina');
      }
      if (Array.isArray(data)) {
        set({ workshopEquipment: data, error: null });
      } else {
        throw new Error('Dados de equipamentos inválidos');
      }
    } catch (error: any) {
      console.error('Failed to fetch workshop equipment:', error);
      set({ workshopEquipment: [], error: error.message });
    }
  },

  addWorkshopEquipment: async (equipment) => {
    const res = await fetch('/api/workshop/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipment),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to add workshop equipment');
    }
    get().fetchWorkshopEquipment();
  },

  updateWorkshopEquipment: async (id, equipment) => {
    const res = await fetch(`/api/workshop/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipment),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to update workshop equipment');
    }
    get().fetchWorkshopEquipment();
  },

  deleteWorkshopEquipment: async (id) => {
    const res = await fetch(`/api/workshop/equipment/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to delete workshop equipment');
    }
    get().fetchWorkshopEquipment();
  },
}));
