import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, Plus, Clock, Video, User, BookOpen, AlertCircle, CheckCircle2, Play, X, Trash2, VideoOff, ChevronDown, ChevronUp, FileSpreadsheet, Download } from 'lucide-react';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { exportToExcel } from '../utils/excelExporter';
import { formatTime12H } from '../utils/timeUtils';
import { Time12HPicker } from '../components/Time12HPicker';
import { isArabicNameMatch } from '../utils/accountingUtils';

export const WEEK_DAYS = [
  { id: 'all', nameAr: 'جميع الأيام', dayNum: -1 },
  { id: 'saturday', nameAr: 'السبت', dayNum: 6 },
  { id: 'sunday', nameAr: 'الأحد', dayNum: 0 },
  { id: 'monday', nameAr: 'الإثنين', dayNum: 1 },
  { id: 'tuesday', nameAr: 'الثلاثاء', dayNum: 2 },
  { id: 'wednesday', nameAr: 'الأربعاء', dayNum: 3 },
  { id: 'thursday', nameAr: 'الخميس', dayNum: 4 },
  { id: 'friday', nameAr: 'الجمعة', dayNum: 5 },
];

export const getSessionDay = (session: any): { id: string; nameAr: string; dayNum: number } => {
  if (!session) return WEEK_DAYS[1];

  if (session.dayOfWeek) {
    const found = WEEK_DAYS.find((w) => w.id === session.dayOfWeek);
    if (found) return found;
  }

  if (session.dayNameAr) {
    const clean = String(session.dayNameAr).trim();
    const found = WEEK_DAYS.find((w) => w.id !== 'all' && (clean === w.nameAr || clean.includes(w.nameAr) || w.nameAr.includes(clean)));
    if (found) return found;
  }

  if (typeof session.dayNum === 'number' && session.dayNum >= 0 && session.dayNum <= 6) {
    const found = WEEK_DAYS.find((w) => w.dayNum === session.dayNum);
    if (found) return found;
  }

  if (session.date) {
    const str = String(session.date).trim();
    const foundAr = WEEK_DAYS.find((w) => w.id !== 'all' && (str.includes(w.nameAr) || w.nameAr.includes(str)));
    if (foundAr) return foundAr;

    const foundId = WEEK_DAYS.find((w) => w.id === str.toLowerCase());
    if (foundId) return foundId;

    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const num = new Date(year, month, day).getDay();
        const found = WEEK_DAYS.find((w) => w.dayNum === num);
        if (found) return found;
      }
    }
  }

  return WEEK_DAYS.find((w) => w.id === 'saturday') || WEEK_DAYS[1];
};

export const SchedulingModule: React.FC = () => {
  const { db, lang, createSession, completeSession, updateDatabaseState } = useApp();
  const [selectedDayTab, setSelectedDayTab] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Form state - Day of week based
  const [selectedDayId, setSelectedDayId] = useState('saturday');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [courseId, setCourseId] = useState(db.courseSubjects[0]?.id || '');
  const [startTime, setStartTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customTeamsLink, setCustomTeamsLink] = useState('');

  const openAddModalForDay = (targetDay: string | number = 'saturday') => {
    let resolvedDayId = 'saturday';
    if (typeof targetDay === 'string') {
      if (targetDay !== 'all') {
        resolvedDayId = targetDay;
      } else if (selectedDayTab !== 'all') {
        resolvedDayId = selectedDayTab;
      }
    } else if (typeof targetDay === 'number') {
      if (targetDay !== -1) {
        const found = WEEK_DAYS.find((w) => w.dayNum === targetDay);
        if (found) resolvedDayId = found.id;
      } else if (selectedDayTab !== 'all') {
        resolvedDayId = selectedDayTab;
      }
    }

    setSelectedDayId(resolvedDayId);

    // Auto-select valid teacher, student, course if empty
    const validTeacher = db.teachers.find((t) => t.id === teacherId) || db.teachers[0];
    if (validTeacher) setTeacherId(validTeacher.id);

    const validStudent = db.students.find((s) => s.id === studentId) || db.students[0];
    if (validStudent) setStudentId(validStudent.id);

    const validCourse = db.courseSubjects.find((c) => c.id === courseId) || db.courseSubjects[0];
    if (validCourse) setCourseId(validCourse.id);

    setCustomTeamsLink('');
    setErrorMsg('');
    setIsAddOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (db.teachers.length === 0) {
      setErrorMsg('لا يوجد معلمون متاحون لجدولة الحصة. يرجى إضافة معلم أولاً.');
      return;
    }
    if (db.students.length === 0) {
      setErrorMsg('لا يوجد طلاب متاحون لجدولة الحصة. يرجى إضافة طالب أولاً.');
      return;
    }

    const selectedTeacher = db.teachers.find((t) => t.id === teacherId) || db.teachers[0];
    const selectedStudent = db.students.find((s) => s.id === studentId) || db.students[0];
    const selectedCourse = db.courseSubjects.find((c) => c.id === courseId) || db.courseSubjects[0];

    const effTeacherId = selectedTeacher.id;
    const effStudentId = selectedStudent.id;
    const effCourseId = selectedCourse ? selectedCourse.id : 'cs-101';
    const dayObj = WEEK_DAYS.find((w) => w.id === selectedDayId) || WEEK_DAYS[1];

    const res = await createSession({
      teacherId: effTeacherId,
      teacherNameAr: selectedTeacher.nameAr,
      studentId: effStudentId,
      studentNameAr: selectedStudent.nameAr,
      courseId: effCourseId,
      courseTitleAr: selectedCourse ? selectedCourse.titleAr : 'مادة تعليمية',
      dayOfWeek: dayObj.id,
      dayNameAr: dayObj.nameAr,
      dayNum: dayObj.dayNum,
      date: dayObj.nameAr, // Session is bound to day of week, permanently remaining in this day
      startTime,
      durationMinutes,
      meetingUrl: customTeamsLink.trim() || `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    if (res && res.success) {
      setIsAddOpen(false);
      // Auto-switch to scheduled day if currently in single day view, and ensure accordion is expanded
      if (selectedDayTab !== 'all' && selectedDayTab !== dayObj.id) {
        setSelectedDayTab(dayObj.id);
      }
      setCollapsedDays((prev) => ({ ...prev, [dayObj.id]: false }));
      setActionFeedback({
        type: 'success',
        message: 'تمت جدولة الحصة بنجاح!',
        details: `تمت جدولة الحصة ليوم ${dayObj.nameAr} (${formatTime12H(startTime)}) مع المعلم (${selectedTeacher.nameAr}) والطالب (${selectedStudent.nameAr}). تظهر الحصة الآن في الجدول الأسبوعي.`,
      });
      setTimeout(() => setActionFeedback(null), 8000);
    } else {
      setErrorMsg((res && res.message) || 'خطأ في جدولة الحصة');
    }
  };

  const handleDeleteSession = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.sessions.findIndex((s) => s.id === id);
      if (idx !== -1) {
        draft.sessions.splice(idx, 1);
      }
      draft.attendance = (draft.attendance || []).filter((att) => att.sessionId !== id);
    });
    setDeletingSessionId(null);
  };

  // Filter sessions by selected tab using day-of-week info
  const filteredSessions = db.sessions.filter((session) => {
    if (selectedDayTab === 'all') return true;
    return getSessionDay(session).id === selectedDayTab;
  });

  const handleExport = () => {
    const exportData = filteredSessions.map((s) => {
      const dayInfo = getSessionDay(s);
      return {
        'كود الحصة': s.code,
        'يوم الحصة': dayInfo.nameAr,
        'وقت البدء': formatTime12H(s.startTime),
        'وقت الانتهاء': formatTime12H(s.endTime),
        'المدة بالدقائق': s.durationMinutes,
        'اسم الطالب': s.studentNameAr,
        'اسم المعلم': s.teacherNameAr,
        'المادة الدراسية': s.subjectNameAr || (s as any).courseTitleAr || '',
        'رابط Microsoft Teams': s.meetingUrl || '',
        'الحالة': s.status === 'completed' ? 'مكتملة' : s.status === 'cancelled' ? 'ملغاة' : 'مجدولة',
        'ملاحظات': s.notes || '',
      };
    });
    exportToExcel(exportData, 'جدول_الحصص_الأسبوعي_أكاديمية_ذاكرلي', 'جدول_الحصص');
  };

  const handleComplete = async (session: any) => {
    setCompletingId(session.id);
    setActionFeedback(null);
    try {
      const res = await completeSession(
        session.id,
        'present',
        `تم إكمال الحصة (${session.subjectNameAr || 'مادة تعليمية'}) وتسجيل الحضور`,
        session
      );

      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: `تم إكمال الحصة بنجاح!`,
          details: res.message || `تم ترحيل الحصة لشيت الحضور والغياب، واحتساب الحصة للمعلم (${session.teacherNameAr})، وخصم حصة من رصيد الطالب (${session.studentNameAr}).`,
        });
        setTimeout(() => {
          setActionFeedback(null);
        }, 10000);
      } else {
        setActionFeedback({
          type: 'error',
          message: (res && res.message) || 'حدث خطأ أثناء إكمال الحصة',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء معالجة إكمال الحصة',
      });
    } finally {
      setCompletingId(null);
    }
  };

  const handleResetToScheduled = (session: any) => {
    updateDatabaseState((draft) => {
      const target = draft.sessions.find((s) => s.id === session.id);
      if (target) {
        target.status = 'scheduled';
      }
    });
    setActionFeedback({
      type: 'success',
      message: `تم تجديد موعد الحصة للأسبوع القادم بنجاح!`,
      details: `الحصة جاهزة للأسبوع القادم في نفس يومها وموعدها، وسجلات الحضور والغياب والمستحقات السابقة محفوظة دون تغيير.`,
    });
    setTimeout(() => {
      setActionFeedback(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-md transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-black text-xs sm:text-sm">{actionFeedback.message}</h4>
              {actionFeedback.details && (
                <p className="text-[11px] sm:text-xs text-emerald-800 mt-1 leading-relaxed">
                  {actionFeedback.details}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'جدول الحصص الأسبوعية (Microsoft Teams)' : 'Weekly Sessions Timetable (MS Teams)'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'مقسم بجميع أيام الأسبوع من الأحد إلى الجمعة، مع روابط قاعات Microsoft Teams المعتمدة'
              : 'Organized by days of the week (Sun-Sat) with integrated Microsoft Teams meeting links.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsExcelImportOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-300 shadow-sm flex items-center gap-1.5"
            title="رفع شيت Excel لجدول الحصص والتحديث الآلي"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'رفع شيت Excel' : 'Import Excel'}</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
            title="تصدير جدول الحصص الحالي إلى ملف Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => openAddModalForDay(selectedDayTab !== 'all' ? selectedDayTab : 'saturday')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>جدولة حصة جديدة</span>
          </button>
        </div>
      </div>

      {/* Day Navigation Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto min-w-max pb-1 sm:pb-0">
          {WEEK_DAYS.map((day) => {
            const count = day.id === 'all'
              ? db.sessions.length
              : db.sessions.filter((s) => getSessionDay(s).id === day.id).length;

            return (
              <button
                key={day.id}
                onClick={() => setSelectedDayTab(day.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedDayTab === day.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{day.nameAr}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  selectedDayTab === day.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Week Day Breakdown Accordion Lists */}
      {selectedDayTab === 'all' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
            <span>قوائم جدول الأيام المنسدلة:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsedDays({})}
                className="text-blue-600 hover:underline font-extrabold"
              >
                فتح جميع الأيام
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  const allCol: Record<string, boolean> = {};
                  WEEK_DAYS.filter((w) => w.id !== 'all').forEach((w) => (allCol[w.id] = true));
                  setCollapsedDays(allCol);
                }}
                className="text-slate-600 hover:underline font-extrabold"
              >
                إغلاق جميع الأيام
              </button>
            </div>
          </div>

          {WEEK_DAYS.filter((w) => w.id !== 'all').map((day) => {
            const isCollapsed = !!collapsedDays[day.id];
            const daySessions = db.sessions.filter((s) => getSessionDay(s).id === day.id);

            return (
              <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Accordion Header Dropdown */}
                <div
                  onClick={() => setCollapsedDays((prev) => ({ ...prev, [day.id]: !prev[day.id] }))}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span>حصص يوم {day.nameAr}</span>
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-black rounded-full border border-blue-200">
                          {daySessions.length} حصة
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        جدول قاعات Microsoft Teams وحضور طلاب يوم {day.nameAr} (ثابت أسبوعياً)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModalForDay(day.id);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة حصة لـ {day.nameAr}</span>
                    </button>

                    <div className="p-1.5 text-slate-400 hover:text-slate-700">
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Accordion Content */}
                {!isCollapsed && (
                  <div className="p-4 bg-white">
                    {daySessions.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium space-y-2">
                        <p>لا توجد حصص مجدولة ليوم {day.nameAr} حالياً.</p>
                        <button
                          type="button"
                          onClick={() => openAddModalForDay(day.id)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
                        >
                          + إضافة أول حصة لـ {day.nameAr}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                        {daySessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            onDelete={() => setDeletingSessionId(session.id)}
                            onComplete={() => handleComplete(session)}
                            onResetSchedule={() => handleResetToScheduled(session)}
                            isCompleting={completingId === session.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Day Selected View */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm">
              حصص يوم {WEEK_DAYS.find((w) => w.id === selectedDayTab)?.nameAr} ({filteredSessions.length} حصة)
            </h3>

            <button
              onClick={() => openAddModalForDay(selectedDayTab)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حصة جديدة لهذا اليوم</span>
            </button>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-bold space-y-2">
              <p>لا توجد حصص مجدولة لهذا اليوم.</p>
              <button
                onClick={() => openAddModalForDay(selectedDayTab)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow"
              >
                + جدول حصة الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onDelete={() => setDeletingSessionId(session.id)}
                  onComplete={() => handleComplete(session)}
                  onResetSchedule={() => handleResetToScheduled(session)}
                  isCompleting={completingId === session.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Session Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">جدولة حصة جديدة (Microsoft Teams)</h3>
                  <p className="text-[11px] text-slate-500">حصة أسبوعية ترتبط باليوم المحدد، وتُحسب للمعلم وتُخصم من رصيد الطالب</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Row 1: Teacher & Student */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اختر المعلم*</label>
                    <select
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameAr} ({Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects || 'عام'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اختر الطالب*</label>
                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.students.map((s) => {
                        const isNeg = s.remainingSessions < 0;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.nameAr} ({isNeg ? `رصيد سالب: ${s.remainingSessions} حصة (غير مجدد ⚠️)` : `متبقي ${s.remainingSessions} حصة`})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Row 2: Course & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المادة / الكورس*</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.courseSubjects.map((c) => (
                        <option key={c.id} value={c.id}>{c.titleAr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مدة الحصة*</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      <option value={30}>30 دقيقة (نصف ساعة)</option>
                      <option value={45}>45 دقيقة</option>
                      <option value={60}>60 دقيقة (ساعة كاملة)</option>
                      <option value={90}>90 دقيقة (ساعة ونصف)</option>
                      <option value={120}>120 دقيقة (ساعتان)</option>
                    </select>
                  </div>
                </div>

                {/* Day of Week Selection */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-800 font-extrabold text-xs">
                      يوم الحصة من أيام الأسبوع*
                    </label>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md font-bold">
                      ثابت أسبوعياً في الجدول
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {WEEK_DAYS.filter((w) => w.id !== 'all').map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDayId(d.id)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all text-center border ${
                          selectedDayId === d.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.nameAr}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedDayId}
                    onChange={(e) => setSelectedDayId(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-extrabold bg-white text-slate-800 text-xs"
                    required
                  >
                    {WEEK_DAYS.filter((w) => w.id !== 'all').map((d) => (
                      <option key={d.id} value={d.id}>
                        يوم {d.nameAr} (ثابت أسبوعياً)
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    الحصة غير مقيدة بتاريخ ميلادي محدد؛ ستبقى موجودة ومتاحة أسبوعياً في يوم {WEEK_DAYS.find((w) => w.id === selectedDayId)?.nameAr}.
                  </p>
                </div>

                {/* 12-Hour Time Picker */}
                <Time12HPicker
                  value={startTime}
                  onChange={setStartTime}
                  durationMinutes={durationMinutes}
                  label="موعد الحصة (توقيت 12 ساعة)"
                />

                {/* Microsoft Teams Link */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>رابط اجتماع Microsoft Teams</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-extrabold">توليد آلي إن ترك فارغاً</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                    value={customTeamsLink}
                    onChange={(e) => setCustomTeamsLink(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-[11px] bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">اتركه فارغاً ليتم توليد رابط Microsoft Teams تلقائياً للحصة مع زر الانضمام المباشر.</p>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>حفظ وجدولة الحصة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingSessionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد إغلاق/حذف الحصة</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من إلغاء وحذف هذه الحصة المجدولة؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingSessionId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDeleteSession(deletingSessionId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        type="sessions"
      />

    </div>
  );
};

// Component for session cards with MS Teams button
const SessionCard: React.FC<{
  session: any;
  onDelete: () => void;
  onComplete: () => void;
  onResetSchedule?: () => void;
  isCompleting?: boolean;
}> = ({ session, onDelete, onComplete, onResetSchedule, isCompleting }) => {
  const { db } = useApp();
  const dayInfo = getSessionDay(session);

  // Find linked student
  const student = db.students.find(
    (s) => s.id === session.studentId || (session.studentNameAr && isArabicNameMatch(s.nameAr, session.studentNameAr))
  );

  const isStudentNegative = student && typeof student.remainingSessions === 'number' && student.remainingSessions < 0;

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between text-start ${
        session.status === 'completed'
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-1">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md ml-1 inline-block border border-blue-100">
              يوم {dayInfo.nameAr}
            </span>
            <span className="font-extrabold text-slate-900 text-xs truncate inline-block">{session.subjectNameAr}</span>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                session.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {session.status === 'completed' ? 'مكتملة ومسجلة' : 'مجدولة'}
            </span>

            <button
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
              title="إلغاء/حذف الحصة"
            >
              <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-[10px] sm:text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400 text-[9px] sm:text-[10px]">الموعد:</span>
            <span className="font-bold text-blue-800 text-[10px] sm:text-xs">
              {formatTime12H(session.startTime)} - {formatTime12H(session.endTime)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-400 text-[9px] sm:text-[10px] shrink-0">الطالب:</span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold truncate text-slate-900">{session.studentNameAr}</span>
              {student && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                    isStudentNegative
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : student.remainingSessions <= 2
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                  title={isStudentNegative ? 'رصيد الحصص بالسالب - اشتراك غير مجدد' : undefined}
                >
                  {isStudentNegative
                    ? `بالسالب (${student.remainingSessions}) ⚠️`
                    : `متبقي ${student.remainingSessions}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between truncate">
            <span className="text-slate-400 text-[9px] sm:text-[10px] shrink-0 ml-1">المعلم:</span>
            <span className="font-bold text-emerald-800 truncate">{session.teacherNameAr}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 text-xs">
        {session.meetingUrl ? (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-700 text-white font-extrabold text-[10px] sm:text-[11px] hover:bg-indigo-800 transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            <span className="bg-white text-indigo-800 w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-[8px]">T</span>
            <span className="truncate">Teams</span>
          </a>
        ) : (
          <span className="text-slate-400 text-[9px] text-center">لا يوجد رابط</span>
        )}

        {session.status === 'scheduled' ? (
          <button
            onClick={onComplete}
            disabled={isCompleting}
            className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold text-[10px] sm:text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            title="إكمال الحصة واحتسابها للمدرس وخصمها من حصص الطالب وترحيلها لشيت الحضور والغياب"
          >
            {isCompleting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الإكمال...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>إكمال الحصة</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="py-1 px-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>محسوبة بالحضور</span>
            </span>
            {onResetSchedule && (
              <button
                onClick={onResetSchedule}
                className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[9px] sm:text-[10px] font-bold transition-colors border border-slate-200"
                title="تجديد موعد الحصة للأسبوع القادم"
              >
                تجديد للأسبوع القادم
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

