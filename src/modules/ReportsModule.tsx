import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Download, Calendar, CheckCircle2, Users, Banknote, ShieldCheck } from 'lucide-react';
import { exportToExcel } from '../utils/excelExporter';
import { getRecentAccountingCycles, getCurrentAccountingCycle, AccountingCycle, isDateInAccountingCycle } from '../utils/accountingUtils';

export const ReportsModule: React.FC = () => {
  const { kpis, db, lang, currencySymbol } = useApp();

  const cycles = getRecentAccountingCycles(12, 6);
  const currentCycle = getCurrentAccountingCycle();
  const [selectedCycle, setSelectedCycle] = useState<AccountingCycle>(currentCycle);

  // Compute metrics for selected cycle
  const cycleAttendance = db.attendance.filter((a) => isDateInAccountingCycle(a.date, selectedCycle));
  const cycleSessions = db.sessions.filter((s) => isDateInAccountingCycle(s.date, selectedCycle));
  const cyclePayrolls = db.payrolls.filter((p) => p.month === selectedCycle.month && p.year === selectedCycle.year);
  
  const presentCount = cycleAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = cycleAttendance.length > 0 ? Math.round((presentCount / cycleAttendance.length) * 100) : 100;

  const cyclePayrollTotal = cyclePayrolls.reduce((sum, p) => sum + p.netSalary, 0);

  const handleExportFullReport = () => {
    const data = [
      { 'المؤشر الأكاديمي': 'الدورة المحاسبية', 'القيمة الرقمية': selectedCycle.labelAr },
      { 'المؤشر الأكاديمي': 'تاريخ البداية (من يوم 26)', 'القيمة الرقمية': selectedCycle.startDate },
      { 'المؤشر الأكاديمي': 'تاريخ النهاية (إلى يوم 25)', 'القيمة الرقمية': selectedCycle.endDate },
      { 'المؤشر الأكاديمي': 'إجمالي حصص الدورة', 'القيمة الرقمية': cycleAttendance.length || cycleSessions.length },
      { 'المؤشر الأكاديمي': 'نسبة انضباط الحضور', 'القيمة الرقمية': `${attendanceRate}%` },
      { 'المؤشر الأكاديمي': 'إجمالي رواتب المعلمين للدورة', 'القيمة الرقمية': `${cyclePayrollTotal} ${currencySymbol}` },
      { 'المؤشر الأكاديمي': 'إجمالي الطلاب المسجلين', 'القيمة الرقمية': kpis.totalStudents },
      { 'المؤشر الأكاديمي': 'الطلاب النشطين', 'القيمة الرقمية': kpis.activeStudents },
    ];
    exportToExcel(data, `تقرير_الدورة_المحاسبية_${selectedCycle.shortLabelAr}`, 'تقرير الدورة');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'مركز التحليلات والتقارير المحاسبية' : 'Executive Accounting Reports Center'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تقارير شاملة مبنية على الدورة المحاسبية (من يوم 26 إلى يوم 25 من الشهر التالي).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Cycle Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-xs font-bold">
            <Calendar className="w-4 h-4 text-purple-700 me-1" />
            <select
              value={`${selectedCycle.month}-${selectedCycle.year}`}
              onChange={(e) => {
                const [m, y] = e.target.value.split('-').map(Number);
                const found = cycles.find((c) => c.month === m && c.year === y);
                if (found) setSelectedCycle(found);
              }}
              className="bg-transparent border-none text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              {cycles.map((c) => (
                <option key={`${c.month}-${c.year}`} value={`${c.month}-${c.year}`}>
                  {c.labelAr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportFullReport}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>تصدير تقرير الدورة Excel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-xs font-bold">إجمالي حصص الدورة المحاسبية</div>
          <div className="text-2xl font-black text-purple-700">{cycleAttendance.length || cycleSessions.length} حصة</div>
          <p className="text-slate-400 text-[11px]">من {selectedCycle.startDate} إلى {selectedCycle.endDate}</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-xs font-bold">نسبة انضباط حضور الحصص</div>
          <div className="text-2xl font-black text-emerald-700">{attendanceRate}%</div>
          <p className="text-slate-400 text-[11px]">مؤشر التزام الطلاب في الدورة</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-xs font-bold">إجمالي مستحقات المعلمين للـ25 يوماً</div>
          <div className="text-2xl font-black text-blue-700">{cyclePayrollTotal.toLocaleString()} {currencySymbol}</div>
          <p className="text-slate-400 text-[11px]">مثبتة ومحسوبة حتى يوم 25 فقط</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-slate-500 text-xs font-bold">حالة الدورة المحاسبية</div>
          <div className="text-sm font-black text-slate-800">
            {selectedCycle.isCurrent ? 'جارية ومباشرة ⚡' : selectedCycle.isClosed ? 'مغلقة ومؤرشفة 🔒' : 'قادمة'}
          </div>
          <p className="text-slate-400 text-[11px]">تغلق تلقائياً في نهاية يوم 25</p>
        </div>
      </div>
    </div>
  );
};
