import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Solicitacao } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarViewProps {
  solicitacoes: Solicitacao[];
  currentDate: Date;
  onEventClick: (id: number) => void;
  onEventDrop: (id: number, start: Date, end: Date) => void;
  onEventResize: (id: number, start: Date, end: Date) => void;
  onDateClick: (date: Date) => void;
}

export default function CalendarView({
  solicitacoes,
  currentDate,
  onEventClick,
  onEventDrop,
  onEventResize,
  onDateClick
}: CalendarViewProps) {
  const events = solicitacoes.map((s) => {
    const isOutOfHours = s.hora_inicio < '08:00' || s.hora_fim > '17:00';
    
    return {
      id: String(s.id),
      title: s.equipamento || s.area,
      start: `${s.data}T${s.hora_inicio}`,
      end: `${s.data}T${s.hora_fim}`,
      extendedProps: s,
      backgroundColor: s.status === 'Concluída' ? '#dcfce7' : s.status === 'Em Andamento' ? '#fef9c3' : '#fee2e2',
      borderColor: s.status === 'Concluída' ? '#22c55e' : s.status === 'Em Andamento' ? '#eab308' : '#ef4444',
      textColor: '#1e293b',
      classNames: [
        'border-l-4 shadow-sm rounded-md p-1 font-medium text-[10px]',
        isOutOfHours ? 'opacity-80 grayscale-[0.2]' : ''
      ]
    };
  });

  const FullCalendarComponent = FullCalendar as any;

  return (
    <div className="flex-1 p-6 bg-white overflow-hidden">
      <FullCalendarComponent
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        locale={ptBrLocale}
        allDaySlot={false}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime="08:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        expandRows={true}
        stickyHeaderDates={true}
        height="auto"
        nowIndicator={true}
        eventClick={(info: any) => onEventClick(Number(info.event.id))}
        eventDrop={(info: any) => {
          if (info.event.start && info.event.end) {
            onEventDrop(Number(info.event.id), info.event.start, info.event.end);
          }
        }}
        eventResize={(info: any) => {
          if (info.event.start && info.event.end) {
            onEventResize(Number(info.event.id), info.event.start, info.event.end);
          }
        }}
        dateClick={(info: any) => onDateClick(info.date)}
        initialDate={currentDate}
        key={currentDate.toISOString()}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          omitZeroMinute: false,
          meridiem: false
        }}
        dayHeaderFormat={{
          weekday: 'short',
          day: 'numeric',
          omitCommas: true
        }}
        slotLaneClassNames={(arg: any) => {
          const hour = arg.date.getHours();
          return (hour < 8 || hour >= 17) ? 'fc-timegrid-slot-non-business' : 'fc-timegrid-slot-business';
        }}
        slotLabelClassNames={(arg: any) => {
          const hour = arg.date.getHours();
          return (hour < 8 || hour >= 17) ? 'fc-timegrid-slot-label-non-business' : '';
        }}
        dayHeaderClassNames={(arg: any) => {
          const dateStr = format(arg.date, 'yyyy-MM-dd');
          const hasOffHours = solicitacoes.some(e => 
            e.data === dateStr && 
            (e.hora_inicio < '08:00' || e.hora_fim > '17:00')
          );
          return hasOffHours ? 'day-has-off-hours-event' : '';
        }}
        eventContent={(eventInfo: any) => {
          const s = eventInfo.event.extendedProps as Solicitacao;
          return (
            <div className="flex flex-col h-full overflow-hidden p-0.5 relative group">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[8px] font-bold uppercase truncate opacity-70">
                  {s.area} {s.sub_area && `• ${s.sub_area}`}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  s.status === 'Concluída' ? 'bg-green-500' : 
                  s.status === 'Em Andamento' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
              
              <div className="text-[10px] font-bold leading-tight line-clamp-2 mb-0.5 text-slate-900">
                {s.equipamento || 'Sem Equipamento'}
              </div>
              
              <div className="flex flex-col gap-0.5 mt-auto">
                <div className="flex items-center gap-1 text-[8px] opacity-80">
                  <span className="truncate">👤 {s.responsavel}</span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-semibold">
                  <span>🔧 {s.tipo}</span>
                  <span className="opacity-70">{s.hora_inicio} - {s.hora_fim}</span>
                </div>
              </div>

              {/* Popover content (details-on-hover) */}
              <div className="details-on-hover">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
                  <div>
                    <span className="label">Área / Subárea</span>
                    <p className="text-lg">{s.area} {s.sub_area && `• ${s.sub_area}`}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border-2 border-slate-900 font-bold text-xs ${
                    s.status === 'Concluída' ? 'bg-green-100' : 
                    s.status === 'Em Andamento' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {s.status || 'Pendente'}
                  </div>
                </div>

                <div className="info-grid">
                  <div>
                    <span className="label">Equipamento</span>
                    <p>{s.equipamento || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="label">Tipo de Manutenção</span>
                    <p>{s.tipo}</p>
                  </div>
                  <div>
                    <span className="label">Horário</span>
                    <p>{s.hora_inicio} às {s.hora_fim}</p>
                  </div>
                  <div>
                    <span className="label">Responsável</span>
                    <p>{s.responsavel}</p>
                  </div>
                </div>

                {s.criticidade && (
                  <div className="mb-3">
                    <span className="label">Criticidade</span>
                    <div className={`inline-block px-2 py-0.5 rounded border border-slate-900 text-[10px] font-bold ${
                      s.criticidade === 'Crítica' ? 'bg-red-500 text-white' :
                      s.criticidade === 'Alta' ? 'bg-orange-400' :
                      s.criticidade === 'Média' ? 'bg-yellow-400' : 'bg-blue-400'
                    }`}>
                      {s.criticidade}
                    </div>
                  </div>
                )}

                <div>
                  <span className="label">Descrição</span>
                  <p className="text-sm font-normal italic leading-relaxed bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300">
                    "{s.descricao}"
                  </p>
                </div>
              </div>
            </div>
          );
        }}
      />
      <style>{`
        .fc { font-family: inherit; }
        .fc-timegrid-slot { height: 4rem !important; }
        .fc-col-header-cell { padding: 1rem 0 !important; background: #f9fafb; border-bottom: 2px solid #e5e7eb !important; }
        .fc-col-header-cell-cushion { text-transform: uppercase; font-size: 0.75rem; font-weight: 800; color: #6b7280; }
        .fc-timegrid-axis-cushion { font-size: 0.75rem; font-weight: 700; color: #9ca3af; }
        .fc-timegrid-slot-label-cushion { font-size: 0.75rem; font-weight: 700; color: #9ca3af; }
        .fc-event { cursor: pointer; }
        .fc-v-event { border: none; background: #fffbeb; }
      `}</style>
    </div>
  );
}
