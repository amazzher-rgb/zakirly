import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar } from 'lucide-react';
import { getCurrentAccountingCycle } from '../utils/accountingUtils';

export const AccountingCycleSelectorBar: React.FC = () => {
  const {
    activeCycle,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    isCustomDates,
    setCycleMonthYear,
    setCustomCycleDates,
  } = useApp();

  const defaultCycle = getCurrentAccountingCycle();

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-800/50 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>دورة الحساب المعتمدة (26 إلى 25)</span>
              <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 text-[10px] font-mono rounded-md border border-blue-400/30 dir-ltr">
                {activeCycle.startDate} ← {activeCycle.endDate}
              </span>
            </h3>
            <p className="text-[11px] text-blue-200/80 mt-0.5">
              يمكنك تغيير الشهر والسنة أو كتابة تاريخ بداية ونهاية الدورة يدوياً لاحتساب حصص المعلمين والحصص المُرحّلة وتفاصيلها.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={() => setCycleMonthYear(defaultCycle.month, defaultCycle.year)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              !isCustomDates && selectedMonth === defaultCycle.month && selectedYear === defaultCycle.year
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            الدورة الحالية
          </button>

          <button
            onClick={() => {
              const prevM = defaultCycle.month === 1 ? 12 : defaultCycle.month - 1;
              const prevY = defaultCycle.month === 1 ? defaultCycle.year - 1 : defaultCycle.year;
              setCycleMonthYear(prevM, prevY);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              !isCustomDates && selectedMonth === (defaultCycle.month === 1 ? 12 : defaultCycle.month - 1)
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            الشهر السابق
          </button>
        </div>
      </div>

      {/* Selectors and Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
        {/* Month Selector */}
        <div className="space-y-1">
          <label className="text-[11px] text-blue-200 font-bold block">شهر الدورة:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setCycleMonthYear(Number(e.target.value), selectedYear)}
            className="w-full bg-slate-800 text-white border border-blue-500/30 rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[
              '1 - يناير', '2 - فبراير', '3 - مارس', '4 - أبريل',
              '5 - مايو', '6 - يونيو', '7 - يوليو', '8 - أغسطس',
              '9 - سبتمبر', '10 - أكتوبر', '11 - نوفمبر', '12 - ديسمبر'
            ].map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div className="space-y-1">
          <label className="text-[11px] text-blue-200 font-bold block">سنة الدورة:</label>
          <select
            value={selectedYear}
            onChange={(e) => setCycleMonthYear(selectedMonth, Number(e.target.value))}
            className="w-full bg-slate-800 text-white border border-blue-500/30 rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Custom Start Date (26th) */}
        <div className="space-y-1">
          <label className="text-[11px] text-blue-200 font-bold block">تاريخ بداية الدورة (26):</label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomCycleDates(e.target.value, customEndDate)}
            className="w-full bg-slate-800 text-white border border-blue-500/30 rounded-xl px-3 py-2 font-bold dir-ltr focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Custom End Date (25th) */}
        <div className="space-y-1">
          <label className="text-[11px] text-blue-200 font-bold block">تاريخ إغلاق الدورة (25):</label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomCycleDates(customStartDate, e.target.value)}
            className="w-full bg-slate-800 text-white border border-blue-500/30 rounded-xl px-3 py-2 font-bold dir-ltr focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  );
};
