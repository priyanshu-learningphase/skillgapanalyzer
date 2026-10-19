/**
 * iCalendar (.ics, RFC 5545) export for the study calendar. Works with
 * Google Calendar, Outlook and Apple Calendar imports.
 */

/** Escape TEXT values (RFC 5545 §3.3.11). */
export const escapeText = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export const foldLine = (line) => {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
};

const compactDate = (day) => day.replace(/-/g, '');
const pad = (n) => String(n).padStart(2, '0');
const utcStamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const addMinutes = (hhmm, minutes) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return { day: Math.floor(total / 1440), time: `${pad(Math.floor((total % 1440) / 60))}${pad(total % 60)}00` };
};
const nextDay = (day) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * @param {object} p
 * @param {Array} p.days      buildSchedule().days
 * @param {Array} p.events    buildSchedule().events (exams, deadlines, interviews…)
 * @param {string} p.startTime "HH:MM" — study sessions are laid out from here each day
 */
export const buildIcs = ({ days, events = [], startTime = '19:00', now = new Date(), calendarName = 'SkillGap study plan' }) => {
  const stamp = utcStamp(now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SkillGap//Study calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(calendarName)}`];

  for (const day of days) {
    let offset = 0;
    for (const session of day.sessions) {
      const start = addMinutes(startTime, offset);
      const end = addMinutes(startTime, offset + Math.round(session.hours * 60));
      offset += Math.round(session.hours * 60);
      const startDay = start.day ? nextDay(day.date) : day.date;
      const endDay = end.day ? nextDay(day.date) : day.date;
      const part = session.parts > 1 ? ` (part ${session.part} of ${session.parts})` : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${escapeText(session.id)}-${compactDate(day.date)}@skillgap`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compactDate(startDay)}T${start.time}`,
        `DTEND:${compactDate(endDay)}T${end.time}`,
        `SUMMARY:${escapeText(`${session.kind === 'prep' ? '' : 'Study: '}${session.title}${part}`)}`,
        `DESCRIPTION:${escapeText(session.phaseTitle ? `Roadmap milestone: ${session.phaseTitle}` : 'From your SkillGap study plan')}`,
        'END:VEVENT',
      );
    }
  }

  const seen = new Set();
  for (const e of events) {
    const key = `${e.type}:${e.date}:${e.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const last = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(`${e.type}-${e.id || e.title}-${compactDate(e.date)}`)}@skillgap`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(e.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(last))}`,
      `SUMMARY:${escapeText(`${{ exam: 'Exam', assignment: 'Deadline', interview: 'Interview', placement: 'Placement drive', busy: 'Busy' }[e.type] || 'Event'}: ${e.title}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};
