
export const AREAS = [
  'Brassagem',
  'Filtração/Adegas',
  'Packaging, Bblend e Xaroparia',
  'Utilidades',
  'Meio Ambiente'
];

export const STATUS_EXECUCAO_OPTIONS = [
  'Pendente',
  'Em andamento',
  'Concluído'
] as const;

export const STATUS_COLORS: Record<string, string> = {
  'Pendente': 'text-amber-600 bg-amber-50 border-amber-200',
  'Montagem Pendente': 'text-amber-600 bg-amber-50 border-amber-200', // Alias for initial state
  'Em andamento': 'text-orange-600 bg-orange-50 border-orange-200',
  'Concluído': 'text-green-600 bg-green-50 border-green-200'
};

export const GET_LIMIT = (column: string) => {
  if (column === 'Brassagem') return 5;
  if (column === 'Filtração/Adegas') return 5;
  if (column.includes('Packaging')) return 4;
  if (column.includes('Utilidades')) return 3;
  if (column.includes('Meio Ambiente')) return 3;
  return 999;
};
