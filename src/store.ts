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
}

interface PTA {
  id: number;
  equipamento: string;
  area: string;
  responsavel: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  descricao: string;
  prioridade: string;
  status: 'pendente' | 'aprovado';
}

interface AtividadeSalaMotores {
  id: number;
  titulo: string;
  responsavel: string;
  data: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  custo_evitado: number;
}

interface ArmstrongManutencao {
  id: number;
  titulo: string;
  area: string;
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
}

interface ArmstrongPCMArea {
  id: number;
  data: string;
  area: string;
}

interface ArmstrongBacklog {
  id: number;
  area: string;
  titulo: string;
  impacto_energetico: string;
  investimento_estimado: string;
  data_prevista: string;
  status: string;
}

interface StoreState {
  andaimes: Andaime[];
  ptas: PTA[];
  salaMotores: AtividadeSalaMotores[];
  armstrongManutencoes: ArmstrongManutencao[];
  armstrongPCMAreas: ArmstrongPCMArea[];
  armstrongBacklog: ArmstrongBacklog[];
  fetchAndaimes: () => Promise<void>;
  addAndaime: (andaime: Omit<Andaime, 'id' | 'status'>) => Promise<any>;
  approveAndaime: (id: number, password: string) => Promise<void>;
  updateAndaime: (id: number, andaime: Partial<Andaime>, password?: string) => Promise<void>;
  deleteAndaime: (id: number, password: string) => Promise<void>;
  batchDeleteAndaimes: (ids: number[], password: string) => Promise<void>;
  fetchPTAs: () => Promise<void>;
  addPTA: (pta: any) => Promise<any>;
  approvePTA: (id: number, password: string) => Promise<void>;
  deletePTA: (id: number, password: string) => Promise<void>;
  batchDeletePTAs: (ids: number[], password: string) => Promise<void>;
  fetchSalaMotores: () => Promise<void>;
  addAtividadeSalaMotores: (atividade: Omit<AtividadeSalaMotores, 'id' | 'status'>) => Promise<void>;
  updateStatusSalaMotores: (id: number, status: AtividadeSalaMotores['status']) => Promise<void>;
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
}

export const useStore = create<StoreState>((set, get) => ({
  andaimes: [],
  ptas: [],
  salaMotores: [],
  armstrongManutencoes: [],
  armstrongPCMAreas: [],
  armstrongBacklog: [],

  fetchAndaimes: async () => {
    try {
      const res = await fetch('/api/andaimes');
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ andaimes: data });
      } else {
        console.error('Andaimes data is not an array:', data);
        set({ andaimes: [] });
      }
    } catch (error) {
      console.error('Failed to fetch andaimes:', error);
      set({ andaimes: [] });
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

  fetchPTAs: async () => {
    try {
      const res = await fetch('/api/ptas');
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ ptas: data });
      } else {
        console.error('PTAs data is not an array:', data);
        set({ ptas: [] });
      }
    } catch (error) {
      console.error('Failed to fetch ptas:', error);
      set({ ptas: [] });
    }
  },

  addPTA: async (pta) => {
    const res = await fetch('/api/ptas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pta),
    });
    const data = await res.json();
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
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ salaMotores: data });
      } else {
        console.error('Sala Motores data is not an array:', data);
        set({ salaMotores: [] });
      }
    } catch (error) {
      console.error('Failed to fetch sala de motores:', error);
      set({ salaMotores: [] });
    }
  },

  addAtividadeSalaMotores: async (atividade) => {
    await fetch('/api/sala-motores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(atividade),
    });
    get().fetchSalaMotores();
  },

  updateStatusSalaMotores: async (id, status) => {
    await fetch(`/api/sala-motores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    get().fetchSalaMotores();
  },

  fetchArmstrong: async () => {
    try {
      const [manutencoesRes, pcmAreasRes, backlogRes] = await Promise.all([
        fetch('/api/armstrong/manutencoes'),
        fetch('/api/armstrong/pcm-areas'),
        fetch('/api/armstrong/backlog')
      ]);
      
      const [manutencoes, pcmAreas, backlog] = await Promise.all([
        manutencoesRes.json(),
        pcmAreasRes.json(),
        backlogRes.json()
      ]);

      set({ 
        armstrongManutencoes: Array.isArray(manutencoes) ? manutencoes : [],
        armstrongPCMAreas: Array.isArray(pcmAreas) ? pcmAreas : [],
        armstrongBacklog: Array.isArray(backlog) ? backlog : []
      });
    } catch (error) {
      console.error('Failed to fetch armstrong data:', error);
    }
  },

  addArmstrongManutencao: async (manutencao) => {
    await fetch('/api/armstrong/manutencoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manutencao),
    });
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
    await fetch('/api/armstrong/pcm-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(area),
    });
    get().fetchArmstrong();
  },

  deleteArmstrongPCMArea: async (id) => {
    await fetch(`/api/armstrong/pcm-areas/${id}`, {
      method: 'DELETE',
    });
    get().fetchArmstrong();
  },

  addArmstrongBacklog: async (item) => {
    await fetch('/api/armstrong/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
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
}));
