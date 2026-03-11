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

interface StoreState {
  andaimes: Andaime[];
  ptas: PTA[];
  salaMotores: AtividadeSalaMotores[];
  fetchAndaimes: () => Promise<void>;
  addAndaime: (andaime: Omit<Andaime, 'id' | 'status'>) => Promise<void>;
  approveAndaime: (id: number, password: string) => Promise<void>;
  updateAndaime: (id: number, andaime: Partial<Andaime>, password?: string) => Promise<void>;
  deleteAndaime: (id: number, password: string) => Promise<void>;
  fetchPTAs: () => Promise<void>;
  addPTA: (pta: Omit<PTA, 'id' | 'status'>) => Promise<void>;
  approvePTA: (id: number, password: string) => Promise<void>;
  deletePTA: (id: number, password: string) => Promise<void>;
  fetchSalaMotores: () => Promise<void>;
  addAtividadeSalaMotores: (atividade: Omit<AtividadeSalaMotores, 'id' | 'status'>) => Promise<void>;
  updateStatusSalaMotores: (id: number, status: AtividadeSalaMotores['status']) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  andaimes: [],
  ptas: [],
  salaMotores: [],

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
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    get().fetchAndaimes();
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
    get().fetchPTAs();
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
}));
