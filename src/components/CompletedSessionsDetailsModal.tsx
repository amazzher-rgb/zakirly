import React, { useState } from 'react';
import { ScheduledSession } from '../types';
import { AccountingCycle } from '../utils/accountingUtils';
import { Calendar, Clock, User, BookOpen, CheckCircle2, X, Search, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExporter';

interface CompletedSessionsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sessions: ScheduledSession[];
  cycle?: AccountingCycle;
}

export const CompletedSessionsDetailsModal: React.FC<CompletedSessionsDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  sessions,
  cycle,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'in_cycle' | 'post_cycle'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  if (!isOpen) return null;

  const completedSessions = sessions.filter(
    (s) => !s.status || s.status === 'completed' || s.completedAt
  );

  const getStageLabel = (sessionDate?: string) => {
    if (!cycle || !sessionDate) return 'حصة منفذة';
    const cleanDate = sessionDate.split('T')[0];
    if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
      return 'ضمن الدورة (حتى 25)';
    }
    if (cleanDate > cycle.endDate) {
      return 'مُرحّلة (بعد 25)';
    }
    return 'دورة سابقة';
  };

  const filtered = completedSessions.filter((s) => {
    const cleanDate = (s.date || '').split('T')[0];

    // Date range filter
    if (startDateFilter && cleanDate < startDateFilter) return false;
    if (endDateFilter && cleanDate > endDateFilter) return false;

    // Stage filter
    if (cycle && stageFilter === 'in_cycle') {
      if (cleanDate < cycle.startDate || cleanDate > cycle.endDate) return false;
    }
    if (cycle && stageFilter === 'post_cycle') {
      if (cleanDate <= cycle.endDate) return false;
    }

    // Search filter
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.studentNameAr?.toLowerCase().includes(term) ||
      s.teacherNameAr?.toLowerCase().includes(term) ||
      s.subjectNameAr?.toLowerCase().includes(term) ||
      s.date?.includes(term)
    );
  });

  const inCycleCount = cycle
    ? completedSessions.filter((s) => {
        const d = (s.date || '').split('T')[0];
        return d >= cycle.startDate && d <= cycle.endDate;
      }).length
    : 0;

  const postCycleCount = cycle
    ? completedSessions.filter((s) => {
        const d = (s.date || '').split('T')[0];
        return d > cycle.endDate;
      }).length
    : 0;

  const handleExportExcel = () => {
    const dataToExport = filtered.map((s, idx) => ({
      '#': idx + 1,
      'التاريخ': s.date || '',
      'الوقت': `${s.startTime || ''} - ${s.endTime || ''}`,
      'المادة / الكورس': s.subjectNameAr || 'مادة دراسية',
      'المعلم': s.teacherNameAr || '',
      'الطالب': s.studentNameAr || '',
      'مرحلة الدورة': getStageLabel(s.date),
      'حالة المحاسبة': s.teacherPaid ? 'تمت المحاسبة والتسوية' : 'غير محاسب (نشطة)',
      'ملاحظات': s.notes || '',
    }));

    const sanitizedTitle = title ? title.replace(/[^a-zA-Z0-9\u0600-\u06FF\s_-]/g, '').trim() : 'الحصص_المنفذة';
    exportToExcel(dataToExport, sanitizedTitle || 'تفاصيل_الحصص_المنفذة', 'الحصص المنفذة');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg font-serif">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Date Range Filter Bar */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-extrabold text-emerald-950">تحديد أيام وتواريخ الحصص:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold">من تاريخ:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold font-mono text-slate-900 focus:outline-none cursor-pointer dir-ltr"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold">إلى تاريخ:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold font-mono text-slate-900 focus:outline-none cursor-pointer dir-ltr"
              />
            </div>

            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="px-3 py-1 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-xl font-bold text-xs flex items-center gap-1 border border-rose-300 transition-all cursor-pointer"
                title="تفريغ تحديد التواريخ"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء تصفية التواريخ</span>
              </button>
            )}
          </div>
        </div>

        {/* Cycle Info Banner if cycle provided */}
        {cycle && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-extrabold text-slate-900">دورة الحساب المحددة:</span>
              <span className="font-mono font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg dir-ltr">
                {cycle.startDate} ← {cycle.endDate}
              </span>
            </div>

            {/* Stage Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setStageFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stageFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                الكل ({completedSessions.length})
              </button>
              <button
                onClick={() => setStageFilter('in_cycle')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stageFilter === 'in_cycle'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                الدورة حتى 25 ({inCycleCount})
              </button>
              <button
                onClick={() => setStageFilter('post_cycle')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stageFilter === 'post_cycle'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                المُرحّلة بعد 25 ({postCycleCount})
              </button>
            </div>
          </div>
        )}

        {/* Stats, Search & Export Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-900 font-extrabold rounded-xl border border-blue-200">
              عدد الحصص المعروضة: {filtered.length} حصة
            </span>

            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-xs"
              title="تصدير جدول الحصص إلى ملف Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير إكسيل</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالتاريخ أو الاسم أو المادة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3 text-start">#</th>
                <th className="p-3 text-start">التاريخ والوقت</th>
                <th className="p-3 text-start">المادة / الكورس</th>
                <th className="p-3 text-start">المعلم</th>
                <th className="p-3 text-start">الطالب</th>
                <th className="p-3 text-center">مرحلة الدورة والحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد حصص منفذة تطابق البحث المحدد
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => {
                  const cleanDate = (s.date || '').split('T')[0];
                  const isInCycle = cycle && cleanDate >= cycle.startDate && cleanDate <= cycle.endDate;
                  const isPostCycle = cycle && cleanDate > cycle.endDate;

                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{s.date}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{s.startTime} - {s.endTime}</span>
                          {s.durationMinutes && <span className="text-slate-400">({s.durationMinutes} دقيقة)</span>}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{s.subjectNameAr || 'مادة دراسية'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{s.teacherNameAr || 'المعلم'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{s.studentNameAr || 'الطالب'}</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {cycle ? (
                            isInCycle ? (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-[10px] font-black border border-blue-200">
                                الدورة الحالية (حتى 25)
                              </span>
                            ) : isPostCycle ? (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black border border-amber-300">
                                مُرحّلة (بعد 25)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black border border-slate-200">
                                قبل الدورة
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>مكتملة</span>
                            </span>
                          )}

                          {s.teacherPaid ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[9px] font-extrabold border border-emerald-200">
                              تمت المحاسبة والتسوية ✓
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-extrabold border border-amber-200">
                              لم يتم المحاسبة بعد
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <div className="text-[10px] text-slate-500 mt-1 italic max-w-[120px] truncate" title={s.notes}>
                            {s.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed text-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تحميل التفاصيل Excel</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
