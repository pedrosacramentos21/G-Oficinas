import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
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
  const events = solicitacoes.map((s) => ({
    id: String(s.id),
    title: `${s.area}\nResponsável: ${s.responsavel}`,
    start: `${s.data}T${s.hora_inicio}`,
    end: `${s.data}T${s.hora_fim}`,
    extendedProps: s,
    backgroundColor: '#fef3c7', // amber-100
    borderColor: '#f97316', // orange-500
    textColor: '#1f2937', // gray-800
    classNames: ['border-l-4 border-l-orange-500 shadow-sm rounded-md p-1 font-bold text-xs']
  }));

  const FullCalendarComponent = FullCalendar as any;

  return (
    <div className="flex-1 p-6 bg-white overflow-hidden">
      <FullCalendarComponent
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        locale={ptBR}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        height="auto"
        nowIndicator={true}
        eventClick={(info) => onEventClick(Number(info.event.id))}
        eventDrop={(info) => {
          if (info.event.start && info.event.end) {
            onEventDrop(Number(info.event.id), info.event.start, info.event.end);
          }
        }}
        eventResize={(info) => {
          if (info.event.start && info.event.end) {
            onEventResize(Number(info.event.id), info.event.start, info.event.end);
          }
        }}
        dateClick={(info) => onDateClick(info.date)}
        initialDate={currentDate}
        key={currentDate.toISOString()} // Force re-render on date change
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
      />
      <style>{`
        .fc { font-family: inherit; }
        .fc-timegrid-slot { height: 4rem !important; }
        .fc-col-header-cell { padding: 1rem 0 !important; background: #f9fafb; border-bottom: 2px solid #e5e7eb !important; }
        .fc-col-header-cell-cushion { text-transform: uppercase; font-size: 0.75rem; font-weight: 800; color: #6b7280; }
        .fc-timegrid-axis-cushion { font-size: 0.75rem; font-weight: 700; color: #9ca3af; }
        .fc-timegrid-slot-label-cushion { font-size: 0.75rem; font-weight: 700; color: #9ca3af; }
        .fc-event { cursor: pointer; transition: transform 0.1s; }
        .fc-event:hover { transform: scale(1.02); z-index: 50; }
        .fc-v-event { border: none; background: #fffbeb; }
      `}</style>
    </div>
  );
}
