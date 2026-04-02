import { AREAS, Solicitacao } from '../types';

interface IndicatorsProps {
  solicitacoes: Solicitacao[];
}

export default function Indicators({ solicitacoes }: IndicatorsProps) {
  const counts = AREAS.reduce((acc, area) => {
    acc[area] = solicitacoes.filter(s => s.area === area).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-6 bg-gray-50">
      {AREAS.map((area) => (
        <div key={area} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-ambev-blue transition-colors">
            {area}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">{counts[area] || 0}</span>
            <span className="text-xs font-bold text-gray-400 uppercase">pts</span>
          </div>
          <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-ambev-blue transition-all duration-500 ease-out" 
              style={{ width: `${Math.min((counts[area] || 0) * 10, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
