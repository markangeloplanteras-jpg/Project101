import { addDays, format, isSameDay, startOfWeek, subDays, differenceInCalendarDays } from 'date-fns';

export const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fromISODate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addOneDay = (date: Date) => addDays(startOfDay(date), 1);
export const subtractOneDay = (date: Date) => subDays(startOfDay(date), 1);
export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function formatDisplayDate(value: string | Date, dateFormat = 'MMM d, yyyy') {
  const date = value instanceof Date ? startOfDay(value) : fromISODate(isDateOnly(value) ? value : new Date(value).toISOString().slice(0, 10));
  if (dateFormat === 'MMM d, yyyy') return format(date, 'MMM d, yyyy');
  if (dateFormat === 'MM/dd/yyyy') return format(date, 'MM/dd/yyyy');
  if (dateFormat === 'yyyy-MM-dd') return toISODate(date);
  if (dateFormat === 'MMM d') return format(date, 'MMM d');
  return format(date, dateFormat);
}

export function formatTime(value: string | Date) {
  const date = value instanceof Date ? startOfDay(value) : fromISODate(isDateOnly(value) ? value : new Date(value).toISOString().slice(0, 10));
  return format(date, 'h:mm a');
}

export function formatShortDate(value: string | Date) {
  const date = value instanceof Date ? startOfDay(value) : fromISODate(isDateOnly(value) ? value : new Date(value).toISOString().slice(0, 10));
  return format(date, 'MMM d');
}

export function isSameDaySafe(a: Date | string, b: Date | string) {
  const first = a instanceof Date ? startOfDay(a) : fromISODate(isDateOnly(a) ? a : new Date(a).toISOString().slice(0, 10));
  const second = b instanceof Date ? startOfDay(b) : fromISODate(isDateOnly(b) ? b : new Date(b).toISOString().slice(0, 10));
  return isSameDay(first, second);
}

export function weekDays(start: Date, weekStartsOn = 0) {
  const first = new Date(start);
  first.setHours(0, 0, 0, 0);
  const difference = (first.getDay() - weekStartsOn + 7) % 7;
  return Array.from({ length: 7 }, (_, index) => addDays(first, index - difference));
}

export function monthMatrix(year: number, month: number, weekStartsOn = 0) {
  const first = new Date(year, month, 1);
  const start = weekDays(first, weekStartsOn)[0];
  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) days.push(addDays(start, index));
  return days;
}

export function differenceInDays(a: Date, b: Date) {
  return differenceInCalendarDays(startOfDay(a), startOfDay(b));
}

export function currency(amount: number, currencyCode = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
