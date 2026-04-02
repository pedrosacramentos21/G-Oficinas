export type Prioridade = 'Normal' | 'Urgente' | 'Emergencial';
export type Tipo = 'Montagem' | 'Desmontagem';

export interface Solicitacao {
  id?: number;
  area: string;
  sub_area?: string;
  responsavel: string;
  data: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  tipo: Tipo;
  descricao: string;
  prioridade: Prioridade;
  criticidade?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status?: string;
  equipamento?: string;
}

export const AREAS = [
  'PROCESSO',
  'PACKAGING',
  'BBLEND',
  'XAROPARIA',
  'UTILIDADES E MEIO AMBIENTE'
];
