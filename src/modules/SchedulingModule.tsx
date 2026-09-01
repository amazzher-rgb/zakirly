import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, Plus, Clock, Video, User, BookOpen, AlertCircle, CheckCircle2, Play, X, Trash2, VideoOff, ChevronDown, ChevronUp } from 'lucide-react';

const WEEK_DAYS = [
  { id: 'all', nameAr: 'جميع الأيام', dayNum: -1 },
  { id: 'sunday', nameAr: 'الأحد', dayNum: 0 },
  { id: 'monday', nameAr: 'الإثنين', dayNum: 1 },
  { id: 'tuesday', nameAr: 'الثلاثاء', dayNum: 2 },
  { id: 'wednesday', nameAr: 'الأربعاء', dayNum: 3 },
  { id: 'thursday', nameAr: 'الخميس', dayNum: 4 },
  { id: 'friday', nameAr: 'الجمعة', dayNum: 5 },
  { id: 'saturday', nameAr: 'السبت', dayNum: 6 },
];

export const SchedulingModule: React.FC = () => {
  const { db, lang, createSession, completeSession, updateDatabaseState } = useApp();
  const [selectedDayTab, setSelectedDayTab] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Form state
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [courseId, setCourseId] = useState(db.courseSubjects[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customTeamsLink, setCustomTeamsLink] = useState('');

  // Helper to parse YYYY-MM-DD date safely in local time to avoid timezone offsets
  const getDayNumFromDateStr = (dateStr: string) => {
    if (!dateStr) return -1;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day).getDay();
    }
    return new Date(dateStr).getDay();
  };

  const openAddModalForDay = (dayNum: number) => {
    if (dayNum !== -1) {
      // Calculate date for the selected day in current week
      const today = new Date();
      const currentDayNum = today.getDay();
      const diff = dayNum - currentDayNum;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      setDate(targetDate.toISOString().split('T')[0]);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
    }

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

    const res = await createSession({
      teacherId: effTeacherId,
      teacherNameAr: selectedTeacher.nameAr,
      studentId: effStudentId,
      studentNameAr: selectedStudent.nameAr,
      courseId: effCourseId,
      courseTitleAr: selectedCourse ? selectedCourse.titleAr : 'مادة تعليمية',
      date,
      startTime,
      durationMinutes,
      meetingUrl: customTeamsLink.trim() || `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    if (res && res.success) {
      setIsAddOpen(false);
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

  // Helper to get day name for a date string
  const getDayNameFromDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dayIndex = getDayNumFromDateStr(dateStr);
    const dayObj = WEEK_DAYS.find((w) => w.dayNum === dayIndex);
    return dayObj ? dayObj.nameAr : '';
  };

  // Filter sessions by selected tab
  const filteredSessions = db.sessions.filter((session) => {
    if (selectedDayTab === 'all') return true;
    const targetDay = WEEK_DAYS.find((w) => w.id === selectedDayTab);
    if (!targetDay) return true;
    const sessionDayNum = getDayNumFromDateStr(session.date);
    return sessionDayNum === targetDay.dayNum;
  });

  return (
    <div className="space-y-6">
      
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

        <button
          onClick={() => openAddModalForDay(-1)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>جدولة حصة جديدة</span>
        </button>
      </div>

      {/* Day Navigation Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto min-w-max pb-1 sm:pb-0">
          {WEEK_DAYS.map((day) => {
            const count = day.id === 'all'
              ? db.sessions.length
              : db.sessions.filter((s) => getDayNumFromDateStr(s.date) === day.dayNum).length;

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
            const daySessions = db.sessions.filter((s) => getDayNumFromDateStr(s.date) === day.dayNum);

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
                        جدول قاعات Microsoft Teams وحضور طلاب يوم {day.nameAr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModalForDay(day.dayNum);
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
                          onClick={() => openAddModalForDay(day.dayNum)}
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
                            onComplete={() => completeSession(session.id, 'present', 'تم الحضور بنجاح')}
                            getDayNameFromDate={getDayNameFromDate}
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
              onClick={() => openAddModalForDay(WEEK_DAYS.find((w) => w.id === selectedDayTab)?.dayNum ?? -1)}
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
                onClick={() => openAddModalForDay(WEEK_DAYS.find((w) => w.id === selectedDayTab)?.dayNum ?? -1)}
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
                  onComplete={() => completeSession(session.id, 'present', 'تم الحضور بنجاح')}
                  getDayNameFromDate={getDayNameFromDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Session Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">جدولة حصة جديدة (Microsoft Teams)</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر المعلم*</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
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
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  {db.students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameAr} (متبقي {s.remainingSessions} حصة)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المادة الكورس*</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  {db.courseSubjects.map((c) => (
                    <option key={c.id} value={c.id}>{c.titleAr}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الحصة*</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت البدء*</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>رابط اجتماع Microsoft Teams</span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-extrabold">تلقائي تيمز</span>
                </label>
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={customTeamsLink}
                  onChange={(e) => setCustomTeamsLink(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500 mt-1">اتركه فارغاً ليتم توليد رابط Microsoft Teams تلقائياً للحصة.</p>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow-md">حفظ وجدولة الحصة</button>
            </div>
          </form>
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

    </div>
  );
};

// Component for session cards with MS Teams button
const SessionCard: React.FC<{
  session: any;
  onDelete: () => void;
  onComplete: () => void;
  getDayNameFromDate: (dateStr: string) => string;
}> = ({ session, onDelete, onComplete, getDayNameFromDate }) => {
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
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md ml-1 inline-block">
              {getDayNameFromDate(session.date)}
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
              {session.status === 'completed' ? 'مكتملة' : 'مجدولة'}
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

        <div className="space-y-1 text-[10px] sm:text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400 text-[9px] sm:text-[10px]">الوقت:</span>
            <span className="font-bold text-blue-800 text-[10px] sm:text-xs">{session.startTime} - {session.endTime}</span>
          </div>

          <div className="flex items-center justify-between truncate">
            <span className="text-slate-400 text-[9px] sm:text-[10px] shrink-0 ml-1">الطالب:</span>
            <span className="font-bold truncate">{session.studentNameAr}</span>
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

        {session.status === 'scheduled' && (
          <button
            onClick={onComplete}
            className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>إكمال</span>
          </button>
        )}
      </div>
    </div>
  );
};

