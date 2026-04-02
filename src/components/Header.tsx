import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HeaderProps {
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onNewRequest: () => void;
}

export default function Header({ 
  currentDate, 
  onPrevWeek, 
  onNextWeek, 
  onToday, 
  onNewRequest 
}: HeaderProps) {
  const start = startOfWeek(currentDate, { weekStartsOn: 0 });
  const end = endOfWeek(currentDate, { weekStartsOn: 0 });

  const weekLabel = `Semana de ${format(start, 'd MMM.', { locale: ptBR })} - ${format(end, 'd MMM.', { locale: ptBR })}`;

  return (
    <header className="flex items-center justify-between p-6 bg-white border-b border-gray-200 sticky top-0 z-40">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ANDAIMES</h1>
        <p className="text-sm text-gray-500 font-medium">Cronograma de Montagem/Desmontagem</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
          <button 
            onClick={onPrevWeek}
            className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={onToday}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
          >
            Semana atual
          </button>
          <button 
            onClick={onNextWeek}
            className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="text-sm font-bold text-gray-800 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
          {weekLabel}
        </div>

        <button 
          onClick={onNewRequest}
          className="flex items-center gap-2 bg-ambev-blue hover:bg-ambev-blue/90 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Nova Solicitação
        </button>
      </div>
    </header>
  );
}
