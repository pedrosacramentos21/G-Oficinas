export type Prioridade = 'Normal' | 'Urgente' | 'Emergencial';
export type Tipo = 'Montagem' | 'Desmontagem';

export interface Solicitacao {
  id?: number;
  area: string;
  responsavel: string;
  data: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  tipo: Tipo;
  descricao: string;
  prioridade: Prioridade;
}

export const AREAS = [
  'PROCESSO',
  'PACKAGING',
  'BBLEND',
  'XAROPARIA',
  'UTILIDADES E MEIO AMBIENTE'
];
