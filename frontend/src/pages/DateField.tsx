import { useState } from 'react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const FIRST_YEAR = 1900;

const YEARS = (() => {
  const last = new Date().getFullYear() + 5;
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => String(last - i));
})();

interface DateParts {
  day: string;
  month: string;
  year: string;
}

const EMPTY_DATE: DateParts = { day: '', month: '', year: '' };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function splitDate(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { year: match[1], month: match[2], day: match[3] } : EMPTY_DATE;
}

function joinDate({ day, month, year }: DateParts): string {
  return day && month && year ? `${year}-${month}-${day}` : '';
}

function daysInMonth({ month, year }: DateParts): number {
  if (!month) {
    return 31;
  }
  return new Date(Number(year || '2024'), Number(month), 0).getDate();
}

export default function DateField({
  label,
  value,
  issue,
  onChange,
}: {
  label: string;
  value: string;
  issue?: string;
  onChange: (value: string) => void;
}) {
  const [edit, setEdit] = useState<{ parts: DateParts; source: string } | null>(null);
  const parts = edit && edit.source === value ? edit.parts : splitDate(value);
  const invalid = issue ? ' section-input-invalid' : '';

  const change = (part: keyof DateParts, chosen: string) => {
    const next = { ...parts, [part]: chosen };
    const last = daysInMonth(next);
    if (next.day && Number(next.day) > last) {
      next.day = pad(last);
    }
    const joined = joinDate(next);
    setEdit({ parts: next, source: joined });
    onChange(joined);
  };

  return (
    <div className="auth-label section-date" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="section-date-parts">
        <select
          className={`auth-input${invalid}`}
          aria-label={`${label} — день`}
          value={parts.day}
          onChange={(e) => change('day', e.target.value)}
        >
          <option value="">День</option>
          {Array.from({ length: daysInMonth(parts) }, (_, i) => pad(i + 1)).map((day) => (
            <option key={day} value={day}>{Number(day)}</option>
          ))}
        </select>
        <select
          className={`auth-input${invalid}`}
          aria-label={`${label} — месяц`}
          value={parts.month}
          onChange={(e) => change('month', e.target.value)}
        >
          <option value="">Месяц</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={pad(i + 1)}>{name}</option>
          ))}
        </select>
        <select
          className={`auth-input${invalid}`}
          aria-label={`${label} — год`}
          value={parts.year}
          onChange={(e) => change('year', e.target.value)}
        >
          <option value="">Год</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      {issue && <span className="auth-error" role="alert">{issue}</span>}
    </div>
  );
}
