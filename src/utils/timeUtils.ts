/**
 * Time formatting and conversion utilities for 12-hour format across Zakirly Academy OS
 */

export type TimePeriod = 'AM' | 'PM';

/**
 * Format any time string (HH:mm 24-hour, Excel time, or existing 12-hour)
 * into a clean, uniform Arabic 12-hour format e.g. "05:00 م" or "09:30 ص".
 */
export function formatTime12H(timeStr?: string | null): string {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (!str) return '';

  // Check if it already has Arabic AM/PM markers
  const hasArPM = str.includes('م') || str.includes('مساء');
  const hasArAM = str.includes('ص') || str.includes('صباح');

  // Check if it has English AM/PM
  const hasEnPM = /pm/i.test(str);
  const hasEnAM = /am/i.test(str);

  // Extract hours and minutes
  const match = str.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) {
    // If just a single number like "5" or "17"
    const singleNumMatch = str.match(/^(\d{1,2})$/);
    if (singleNumMatch) {
      const h = parseInt(singleNumMatch[1], 10);
      if (h >= 12) {
        const h12 = h === 12 ? 12 : h - 12;
        return `${String(h12).padStart(2, '0')}:00 م`;
      } else {
        const h12 = h === 0 ? 12 : h;
        return `${String(h12).padStart(2, '0')}:00 ص`;
      }
    }
    return str;
  }

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  if (hasArPM || hasEnPM) {
    // It's PM
    const h12 = h > 12 ? (h % 12 === 0 ? 12 : h % 12) : (h === 0 ? 12 : h);
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} م`;
  }

  if (hasArAM || hasEnAM) {
    // It's AM
    const h12 = h > 12 ? (h % 12 === 0 ? 12 : h % 12) : (h === 0 ? 12 : h);
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ص`;
  }

  // It's a standard 24-hour time string like "17:00" or "09:30"
  if (h >= 12) {
    const h12 = h === 12 ? 12 : h - 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} م`;
  } else {
    const h12 = h === 0 ? 12 : h;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ص`;
  }
}

/**
 * Format a time range into 12-hour format e.g. "05:00 م - 06:00 م"
 */
export function formatTimeRange12H(start?: string | null, end?: string | null): string {
  const fStart = formatTime12H(start);
  const fEnd = formatTime12H(end);
  if (!fStart && !fEnd) return '';
  if (!fEnd) return fStart;
  if (!fStart) return fEnd;
  return `${fStart} - ${fEnd}`;
}

/**
 * Detailed Arabic description for a time, e.g. "05:00 م (مساءً)"
 */
export function formatTime12HWithDesc(timeStr?: string | null): string {
  const formatted = formatTime12H(timeStr);
  if (!formatted) return '';
  if (formatted.endsWith('م')) {
    return `${formatted} (مساءً)`;
  }
  if (formatted.endsWith('ص')) {
    return `${formatted} (صباحاً)`;
  }
  return formatted;
}

/**
 * Convert any time string (12-hour or 24-hour) to standard 24-hour HH:mm
 * for database storage and calculations.
 */
export function normalizeTo24H(timeStr?: string | null): string {
  if (!timeStr) return '17:00';
  const str = String(timeStr).trim();
  if (!str) return '17:00';

  const match = str.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return '17:00';

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  const isPM = /pm|م|مساء/i.test(str);
  const isAM = /am|ص|صباح/i.test(str);

  if (isPM) {
    if (h < 12) h += 12;
  } else if (isAM) {
    if (h === 12) h = 0;
  }

  // Ensure bounds
  h = Math.max(0, Math.min(23, h));
  const safeM = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
}

/**
 * Split a time string into 12-hour components (hour 1-12, minute 0-59, period AM/PM)
 */
export function split12H(timeStr?: string | null): { hour12: number; minute: number; period: TimePeriod } {
  const time24 = normalizeTo24H(timeStr);
  const [h24, m] = time24.split(':').map(Number);

  if (h24 >= 12) {
    return {
      hour12: h24 === 12 ? 12 : h24 - 12,
      minute: m || 0,
      period: 'PM',
    };
  } else {
    return {
      hour12: h24 === 0 ? 12 : h24,
      minute: m || 0,
      period: 'AM',
    };
  }
}

/**
 * Combine 12-hour components back into standard 24-hour HH:mm string
 */
export function combine12HTo24H(hour12: number, minute: number, period: TimePeriod): string {
  let h = Number(hour12) || 12;
  const m = Number(minute) || 0;

  if (period === 'PM') {
    if (h < 12) h += 12;
  } else {
    if (h === 12) h = 0;
  }

  h = Math.max(0, Math.min(23, h));
  const safeM = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
}

/**
 * Calculate end time given start time and duration in minutes
 */
export function calculateEndTime(
  startTimeStr: string,
  durationMinutes: number
): { endTime24: string; endTime12H: string } {
  const normStart = normalizeTo24H(startTimeStr);
  const [h, m] = normStart.split(':').map(Number);
  const dur = Number(durationMinutes) || 60;

  const totalM = m + dur;
  const endH = (h + Math.floor(totalM / 60)) % 24;
  const endM = totalM % 60;

  const endTime24 = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  const endTime12H = formatTime12H(endTime24);

  return { endTime24, endTime12H };
}

/**
 * Common preset lesson times for quick 1-click selection
 */
export const PRESET_LESSON_TIMES = [
  { time24: '14:00', label12: '02:00 م', periodName: 'ظهراً' },
  { time24: '15:00', label12: '03:00 م', periodName: 'عصراً' },
  { time24: '16:00', label12: '04:00 م', periodName: 'عصراً' },
  { time24: '17:00', label12: '05:00 م', periodName: 'مساءً' },
  { time24: '18:00', label12: '06:00 م', periodName: 'مساءً' },
  { time24: '19:00', label12: '07:00 م', periodName: 'مساءً' },
  { time24: '20:00', label12: '08:00 م', periodName: 'مساءً' },
  { time24: '21:00', label12: '09:00 م', periodName: 'ليلاً' },
];
