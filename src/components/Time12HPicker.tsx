import React, { useMemo } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import {
  split12H,
  combine12HTo24H,
  formatTime12H,
  calculateEndTime,
  PRESET_LESSON_TIMES,
  TimePeriod,
} from '../utils/timeUtils';

interface Time12HPickerProps {
  value: string; // "17:00" or any time string
  onChange: (time24: string) => void;
  durationMinutes?: number;
  label?: string;
  className?: string;
}

export const Time12HPicker: React.FC<Time12HPickerProps> = ({
  value,
  onChange,
  durationMinutes = 60,
  label = 'وقت البدء (بنظام 12 ساعة)',
  className = '',
}) => {
  const { hour12, minute, period } = useMemo(() => split12H(value), [value]);

  const handleHourChange = (newHour: number) => {
    const updated24 = combine12HTo24H(newHour, minute, period);
    onChange(updated24);
  };

  const handleMinuteChange = (newMinute: number) => {
    const updated24 = combine12HTo24H(hour12, newMinute, period);
    onChange(updated24);
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    const updated24 = combine12HTo24H(hour12, minute, newPeriod);
    onChange(updated24);
  };

  const { endTime12H } = useMemo(
    () => calculateEndTime(value, durationMinutes),
    [value, durationMinutes]
  );

  const formatted12H = formatTime12H(value);

  // Minutes options: 00 to 55 by 5s
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  // Hours 1 to 12
  const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 shadow-xs">
          {formatted12H}
        </span>
      </div>

      {/* Main 12H Controls: Hour, Minute, AM/PM Toggle */}
      <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        
        {/* Hour Dropdown */}
        <div className="col-span-4 sm:col-span-4">
          <span className="block text-[10px] font-bold text-slate-500 mb-1">الساعة</span>
          <select
            value={hour12}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 font-mono font-black text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Dropdown */}
        <div className="col-span-4 sm:col-span-4">
          <span className="block text-[10px] font-bold text-slate-500 mb-1">الدقيقة</span>
          <select
            value={minute}
            onChange={(e) => handleMinuteChange(Number(e.target.value))}
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 font-mono font-black text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Toggle */}
        <div className="col-span-4 sm:col-span-4">
          <span className="block text-[10px] font-bold text-slate-500 mb-1">الفترة</span>
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => handlePeriodChange('PM')}
              className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                period === 'PM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="مساءً"
            >
              م
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('AM')}
              className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                period === 'AM'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="صباحاً"
            >
              ص
            </button>
          </div>
        </div>

      </div>

      {/* Quick Lesson Times Presets */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-500 font-bold">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>مواعيد الحصص الشائعة:</span>
          </span>
          <span>(توقيت 12 ساعة)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_LESSON_TIMES.map((preset) => {
            const isSelected = value === preset.time24;
            return (
              <button
                key={preset.time24}
                type="button"
                onClick={() => onChange(preset.time24)}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-1 ring-blue-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                {preset.label12}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live duration & end time notice */}
      <div className="flex items-center justify-between text-[11px] bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-xl text-blue-900 font-bold">
        <span>مدة الحصة: {durationMinutes} دقيقة</span>
        <span>تنتهي الحصة: <strong className="text-blue-800 font-black">{endTime12H}</strong></span>
      </div>
    </div>
  );
};
