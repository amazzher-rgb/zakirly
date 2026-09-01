import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceRecord } from '../types';
import { AccountingCycleSelectorBar } from '../components/AccountingCycleSelectorBar';
import {
  CheckCircle2,
  Plus,
  Trash2,
  X,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  Sparkles,
  Search,
  Filter,
  Lock,
} from 'lucide-react';
import {
  groupAttendanceByDaysInCycle,
  AccountingCycle,
  DayAttendanceGroup,
  isDateInAccountingCycle,
  getAccountingCycleForDate,
  parseLocalDate,
} from '../utils/accountingUtils';

export const AttendanceModule: React.FC = () => {
  const { db, lang, activeCycle, updateDatabaseState } = useApp();

  const [showOnlyWithSessions, setShowOnlyWithSessions] = useState(true);

  // Accordion state: Set of opened date strings (e.g., "2026-07-26")
  const [openDates, setOpenDates] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('attendance_open_dates');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [status, setStatus] = useState<'present' | 'absent_excused' | 'absent_unexcused' | 'late'>('present');
  const [notes, setNotes] = useState('تم الحضور بانتظام والالتزام بالواجب');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Save accordion state to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem('attendance_open_dates', JSON.stringify(openDates));
    } catch (e) {}
  }, [openDates]);

  // Toggle single day accordion
  const toggleDate = (dateStr: string) => {
    setOpenDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  // Group records for selected cycle
  const dayGroups = groupAttendanceByDaysInCycle(db.attendance, activeCycle);

  // Filter groups if searching or if hiding empty days
  const displayedGroups = dayGroups.filter((group) => {
    if (showOnlyWithSessions && group.sessionCount === 0) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (group.displayDateAr || '').toLowerCase().includes(q) ||
        (group.dateStr || '').includes(q) ||
        group.records.some(
          (r) =>
            (r.studentNameAr || '').toLowerCase().includes(q) ||
            (r.teacherNameAr || '').toLowerCase().includes(q) ||
            (r.notes ? r.notes.toLowerCase().includes(q) : false)
        );
      if (!matchesSearch) return false;
    }

    return true;
  });

  const expandAll = () => {
    const nextState: Record<string, boolean> = {};
    dayGroups.forEach((g) => {
      if (g.sessionCount > 0) {
        nextState[g.dateStr] = true;
      }
    });
    setOpenDates(nextState);
  };

  const collapseAll = () => {
    setOpenDates({});
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const targetStudentId = studentId || db.students[0]?.id;
    const st = db.students.find((s) => s.id === targetStudentId) || db.students[0];
    if (!st) {
      setModalError('⚠️ لا يوجد طلاب مسجلون بالنظام لتسجيل الحضور.');
      return;
    }

    const tch = db.teachers.find((t) => t.id === teacherId) || db.teachers.find((t) => t.id === st.teacherId) || db.teachers[0];
    const targetDate = customDate || new Date().toISOString().split('T')[0];

    const newAtt: AttendanceRecord = {
      id: `att-${Date.now()}`,
      tenantId: st.tenantId || 'tenant-zakirly-main',
      sessionId: `sess-${Date.now()}`,
      studentId: st.id,
      studentNameAr: st.nameAr,
      teacherId: tch?.id || '',
      teacherNameAr: tch?.nameAr || 'المعلم المحاضر',
      date: targetDate,
      status,
      notes,
      loggedBy: 'المشرف الأكاديمي',
      timestamp: new Date().toISOString(),
    };

    updateDatabaseState((draft) => {
      draft.attendance.unshift(newAtt);

      const draftSt = draft.students.find((s) => s.id === st.id);
      const draftTch = draft.teachers.find((t) => t.id === (tch?.id || st.teacherId));

      // If student attended or late, deduct remaining session from student & credit session to teacher
      if (status === 'present' || status === 'late') {
        if (draftSt && draftSt.remainingSessions > 0) {
          draftSt.remainingSessions -= 1;
          draftSt.totalSessionsCompleted = (draftSt.totalSessionsCompleted || 0) + 1;
        }

        const sub = draft.subscriptions?.find((sb) => sb.studentId === st.id || sb.id === st.packageId);
        if (sub && sub.remainingSessions > 0) {
          sub.remainingSessions -= 1;
        }

        if (draftTch) {
          draftTch.completedSessionsCount = (draftTch.completedSessionsCount || 0) + 1;
          draftTch.totalEarned = (draftTch.totalEarned || 0) + (draftTch.perSessionRate || 250);
        }
      }
    });

    if (status === 'present' || status === 'late') {
      setFeedbackMsg(
        `تم تسجيل الحضور بنجاح في ${targetDate}! تم خصم حصة واحدة للطالب (${st.nameAr})، واحتساب الحصة للمعلم (${tch?.nameAr || 'المعلم'}).`
      );
    } else {
      setFeedbackMsg(`تم تسجيل حالة الغياب للطالب ${st.nameAr} بتاريخ ${targetDate} بنجاح.`);
    }

    // Automatically expand the day recorded
    setOpenDates((prev) => ({ ...prev, [targetDate]: true }));

    setTimeout(() => setFeedbackMsg(null), 6000);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.attendance.findIndex((a) => a.id === id);
      if (idx !== -1) {
        draft.attendance.splice(idx, 1);
      }
    });
    setDeletingId(null);
  };

  const totalSessionsInCycle = dayGroups.reduce((sum, g) => sum + g.sessionCount, 0);
  const totalPresentInCycle = dayGroups.reduce((sum, g) => sum + g.presentCount, 0);

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'شيت الغياب والحضور المحاسبي' : 'Accounting Attendance Sheet'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            عرض منظم للحصص مقسم بـ (الأيام Accordion) وفق الدورة المحاسبية (من يوم 26 إلى يوم 25 من الشهر التالي).
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setModalError(null);
              if (db.students.length > 0) setStudentId(db.students[0].id);
              if (db.teachers.length > 0) setTeacherId(db.teachers[0].id);
              setCustomDate(new Date().toISOString().split('T')[0]);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل حضور جديد</span>
          </button>
        </div>
      </div>

      {/* Global Accounting Cycle Selector Bar */}
      <AccountingCycleSelectorBar />

      {/* Stats Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-[11px] font-extrabold">الدورة المحاسبية الحالية</div>
          <div className="text-sm font-black text-slate-900">{activeCycle.shortLabelAr}</div>
          <div className="text-[10px] text-slate-500 font-mono dir-ltr">
            {activeCycle.startDate} ← {activeCycle.endDate}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-[11px] font-extrabold">إجمالي حصص الدورة المحاسبية</div>
          <div className="text-xl font-black text-emerald-700">{totalSessionsInCycle} حصة</div>
          <div className="text-[10px] text-slate-400">موزعة على أيام الدورة</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-[11px] font-extrabold">عدد الحضور الفعلي</div>
          <div className="text-xl font-black text-blue-700">{totalPresentInCycle} حضور</div>
          <div className="text-[10px] text-slate-400">
            نسبة الانضباط: {totalSessionsInCycle > 0 ? Math.round((totalPresentInCycle / totalSessionsInCycle) * 100) : 100}%
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-[11px] font-extrabold">حالة الشهر المحاسبي</div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {activeCycle.isCurrent ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>جاري حتى يوم 25</span>
              </span>
            ) : activeCycle.isClosed ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>مغلق تلقائياً</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                شهر محاسبي مستقبلي
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">الإغلاق الآلي تلقائي في نهاية يوم 25</div>
        </div>
      </div>

      {/* Accordion Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب، المعلم، اليوم، أو الملاحظات..."
            className="w-full bg-white border border-slate-200 ps-9 pe-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle show all days vs days with sessions */}
          <button
            onClick={() => setShowOnlyWithSessions(!showOnlyWithSessions)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showOnlyWithSessions
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showOnlyWithSessions ? 'أيام الحصص فقط' : 'كافة الـ 31 يوماً'}</span>
          </button>

          <button
            onClick={expandAll}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>توسيع الكل</span>
          </button>

          <button
            onClick={collapseAll}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            <span>طوي الكل</span>
          </button>
        </div>
      </div>

      {/* ACCORDION DAYS LIST */}
      <div className="space-y-3">
        {displayedGroups.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-extrabold text-sm text-slate-800">لا توجد حصص مسجلة في هذه الدورة المحاسبية</p>
            <p className="text-xs text-slate-400">يمكنك تغيير الشهر المحاسبي من القائمة أوالضغط على تسجيل حضور جديد.</p>
          </div>
        ) : (
          displayedGroups.map((group) => {
            const isOpen = !!openDates[group.dateStr];

            return (
              <div
                key={group.dateStr}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleDate(group.dateStr)}
                  className={`w-full p-4 flex items-center justify-between text-start transition-colors ${
                    isOpen ? 'bg-emerald-50/60 border-b border-emerald-100' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        isOpen ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          📅 يوم {group.dayNumber} - {group.displayDateAr}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">({group.dateStr})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        حالة اليوم: {group.sessionCount > 0 ? `${group.sessionCount} حصة منفذة` : 'لا توجد حصص'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge counts */}
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                        {group.sessionCount} حصة
                      </span>
                      {group.presentCount > 0 && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800">
                          {group.presentCount} حاضر
                        </span>
                      )}
                      {group.absentCount > 0 && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800">
                          {group.absentCount} غائب
                        </span>
                      )}
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                      {isOpen ? <ChevronUp className="w-5 h-5 text-emerald-700" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </button>

                {/* Accordion Body (Lazy rendered when expanded) */}
                {isOpen && (
                  <div className="p-2 sm:p-4 bg-slate-50/50 animate-in fade-in duration-200">
                    {group.records.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-bold">
                        لم يتم تسجيل حصص أو حضور في هذا اليوم بعد.
                      </div>
                    ) : (
                      <>
                        {/* Mobile: 2-column side-by-side cards */}
                        <div className="grid grid-cols-2 gap-2 md:hidden">
                          {group.records.map((att) => (
                            <div key={att.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-1.5 text-start">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className="font-black text-slate-900 text-xs truncate">{att.studentNameAr}</h4>
                                  <button
                                    onClick={() => setDeletingId(att.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-[10px] text-emerald-800 font-bold truncate">
                                  {att.teacherNameAr || 'المعلم'}
                                </div>
                              </div>

                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                                    att.status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : att.status === 'late'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {att.status === 'present'
                                    ? 'حاضر'
                                    : att.status === 'late'
                                    ? 'متأخر'
                                    : 'غائب'}
                                </span>
                                <span className="text-[9px] text-slate-400 truncate max-w-[70px]">{att.loggedBy}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop & Tablet: Full Detailed Table */}
                        <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-start text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase">
                              <tr>
                                <th className="p-3 text-start">الطالب</th>
                                <th className="p-3 text-start">المعلم المحاضر</th>
                                <th className="p-3 text-start">المسجل بواسطة</th>
                                <th className="p-3 text-center">حالة الحضور</th>
                                <th className="p-3 text-start">ملاحظات الحصة</th>
                                <th className="p-3 text-center">إجراءات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                              {group.records.map((att) => (
                                <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-extrabold text-slate-900">{att.studentNameAr}</td>
                                  <td className="p-3 font-bold text-emerald-800 flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{att.teacherNameAr || 'معلم المادة'}</span>
                                  </td>
                                  <td className="p-3 text-slate-600">{att.loggedBy}</td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        att.status === 'present'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : att.status === 'late'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {att.status === 'present'
                                        ? 'حاضر ومكتمل'
                                        : att.status === 'late'
                                        ? 'متأخر'
                                        : 'غائب'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 text-[11px]">{att.notes || 'لا يوجد ملاحظات'}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => setDeletingId(att.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="حذف السجل"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">تسجيل سجل حضور جديد</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ الحصة*</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-900"
                />
                <p className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg mt-1 font-bold border border-blue-100 flex items-center gap-1.5">
                  <span>🗓️</span>
                  <span>
                    التاريخ المختصر ينتمي إلى <strong>{getAccountingCycleForDate(customDate).shortLabelAr}</strong> (الفترة من {getAccountingCycleForDate(customDate).startDate} إلى {getAccountingCycleForDate(customDate).endDate}).
                    {parseLocalDate(customDate).getDate() >= 26 && ' [حصص من يوم 26 تُرحل للشهر الجديد ولا تحسب في الشهر المقفل 25]'}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر الطالب*</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-900"
                >
                  {db.students.length === 0 ? (
                    <option value="">لا يوجد طلاب مسجلون</option>
                  ) : (
                    db.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr} ({s.grade || 'غير محدد'} - متبقي {s.remainingSessions ?? 0} حصة)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المعلم المحاضر للحصة*</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-emerald-900 bg-emerald-50/50"
                >
                  {db.teachers.length === 0 ? (
                    <option value="">لا يوجد معلمون مسجلون</option>
                  ) : (
                    db.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameAr} ({Array.isArray(t.subjects) ? t.subjects.join('، ') : t.subjects || 'عام'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">حالة الحضور*</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  <option value="present">حاضر (Present - خصم حصة واحتساب للمعلم)</option>
                  <option value="late">متأخر (Late - خصم حصة واحتساب للمعلم)</option>
                  <option value="absent_excused">غائب بعذر (Excused Absence)</option>
                  <option value="absent_unexcused">غائب بدون عذر (Unexcused Absence)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات المعلم / المشرف</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs">
                {modalError}
              </div>
            )}

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-xl">
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl shadow-md">
                حفظ وتسجيل السجل
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد الحذف</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف سجل الحضور هذا؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                إلغاء
              </button>
              <button onClick={() => handleDelete(deletingId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
