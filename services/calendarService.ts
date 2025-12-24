
import { Task } from '../types';

/**
 * Formats a date string (YYYY-MM-DD) to iCal format (YYYYMMDDTHHMMSSZ)
 */
const formatToICalDate = (dateStr: string, hour: number = 9): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setHours(hour, 0, 0);
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  return date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';
};

/**
 * Generates a Google Calendar Template URL
 */
export const getGoogleCalendarUrl = (task: Task): string => {
  const base = 'https://www.google.com/calendar/render?action=TEMPLATE';
  const title = encodeURIComponent(`TuDú: ${task.title}`);
  const details = encodeURIComponent(`${task.description}\n\nCliente: ${task.classification.client}\nResponsable: ${task.people.responsible}`);
  
  const date = task.statusTime.dueDate || new Date().toISOString().split('T')[0];
  const start = formatToICalDate(date, 9);
  const end = formatToICalDate(date, 10);
  
  return `${base}&text=${title}&details=${details}&dates=${start}/${end}`;
};

/**
 * Generates and triggers a download for an .ics file (Apple/iPhone/Outlook)
 * Includes a VALARM for a 15-minute reminder/alarm.
 */
export const downloadIcsFile = (task: Task): void => {
  const date = task.statusTime.dueDate || new Date().toISOString().split('T')[0];
  const start = formatToICalDate(date, 9);
  const end = formatToICalDate(date, 10);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TuDu EO//Calendar Export//EN',
    'BEGIN:VEVENT',
    `UID:${task.id}-${Date.now()}@tudueo.com`,
    `DTSTAMP:${formatToICalDate(new Date().toISOString().split('T')[0], new Date().getHours())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:TuDú: ${task.title}`,
    `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}\\n\\nCliente: ${task.classification.client}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de Tarea',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `task-${task.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
