import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarDays,
  Plus,
  Clock,
  Video,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Play,
  X,
  Trash2,
  VideoOff,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Edit2,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Layers,
} from 'lucide-react';
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

interface UndoAction {
  id: string;
  titleAr: string;
  timestamp: number;
  revert: () => void;
}

export const SchedulingModule: React.FC = () => {
  const { db, lang, createSession, completeSession, updateDatabaseState } = useApp();
  const [selectedDayTab, setSelectedDayTab] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isModalTransparent, setIsModalTransparent] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Undo history stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const pushUndo = (titleAr: string, revert: () => void) => {
    setUndoStack((prev) => [
      {
        id: `undo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        titleAr,
        timestamp: Date.now(),
        revert,
      },
      ...prev.slice(0, 24), // keep last 25 actions
    ]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [actionToUndo, ...remaining] = undoStack;
    setUndoStack(remaining);
    try {
      actionToUndo.revert();
      setActionFeedback({
        type: 'success',
        message: `تم التراجع بنجاح!`,
        details: `تم التراجع عن: ${actionToUndo.titleAr}`,
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'فشل التراجع عن الإجراء',
        details: err?.message,
      });
    }
  };

  // Keyboard shortcut Ctrl+Z or Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]);

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
    showUndoBtn?: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-renew completed sessions after 2.5 minutes (150 seconds) so they automatically return to green scheduled status
  useEffect(() => {
    const AUTO_RENEW_MS = 150 * 1000; // 2.5 minutes (between 2 and 3 minutes)

    const checkAutoRenew = () => {
      const now = Date.now();
      let hasRenewedAny = false;

      updateDatabaseState((draft) => {
        draft.sessions.forEach((s) => {
          if (s.status === 'completed' && s.completedAt) {
            const elapsed = now - new Date(s.completedAt).getTime();
            if (elapsed >= AUTO_RENEW_MS) {
              s.status = 'scheduled';
              hasRenewedAny = true;
            }
          }
        });
      });

      if (hasRenewedAny) {
        // silent auto-update or brief refresh
      }
    };

    checkAutoRenew();
    const timer = setInterval(checkAutoRenew, 2000);
    return () => clearInterval(timer);
  }, []);

  // Form state - Add Session
  const [selectedDayId, setSelectedDayId] = useState('saturday');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [courseId, setCourseId] = useState(db.courseSubjects[0]?.id || '');
  const [startTime, setStartTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customTeamsLink, setCustomTeamsLink] = useState('');

  // Form state - Edit Session
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editCourseId, setEditCourseId] = useState('');
  const [editDayId, setEditDayId] = useState('saturday');
  const [editStartTime, setEditStartTime] = useState('17:00');
  const [editDurationMinutes, setEditDurationMinutes] = useState(60);
  const [editCustomTeamsLink, setEditCustomTeamsLink] = useState('');

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

    const validTeacher = db.teachers.find((t) => t.id === teacherId) || db.teachers[0];
    if (validTeacher) setTeacherId(validTeacher.id);

    const validStudent = db.students.find((s) => s.id === studentId) || db.students[0];
    if (validStudent) setStudentId(validStudent.id);

    const validCourse = db.courseSubjects.find((c) => c.id === courseId) || db.courseSubjects[0];
    if (validCourse) setCourseId(validCourse.id);

    setCustomTeamsLink('');
    setErrorMsg('');
    setIsModalTransparent(false);
    setIsAddOpen(true);
  };

  const openEditModal = (session: any) => {
    setEditingSession(session);
    setEditTeacherId(session.teacherId || db.teachers[0]?.id || '');
    setEditStudentId(session.studentId || db.students[0]?.id || '');
    setEditCourseId(session.courseId || db.courseSubjects[0]?.id || '');
    const dayInfo = getSessionDay(session);
    setEditDayId(dayInfo.id);
    setEditStartTime(session.startTime || '17:00');
    setEditDurationMinutes(session.durationMinutes || 60);
    setEditCustomTeamsLink(session.meetingUrl || '');
  };

  // Sessions already scheduled for the day selected in Add Modal
  const existingSessionsForSelectedDay = useMemo(() => {
    return db.sessions.filter((s) => getSessionDay(s).id === selectedDayId);
  }, [db.sessions, selectedDayId]);

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
      date: dayObj.nameAr,
      startTime,
      durationMinutes,
      meetingUrl: customTeamsLink.trim() || `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    if (res && res.success) {
      setIsAddOpen(false);
      const createdSessionId = res.session?.id || res.id;

      // Push to Undo stack
      pushUndo(`جدولة حصة جديدة للطالب (${selectedStudent.nameAr})`, () => {
        updateDatabaseState((draft) => {
          if (createdSessionId) {
            draft.sessions = draft.sessions.filter((s) => s.id !== createdSessionId);
          } else {
            // fallback: remove the most recently added session
            draft.sessions.shift();
          }
        });
      });

      if (selectedDayTab !== 'all' && selectedDayTab !== dayObj.id) {
        setSelectedDayTab(dayObj.id);
      }
      setCollapsedDays((prev) => ({ ...prev, [dayObj.id]: false }));

      setActionFeedback({
        type: 'success',
        message: 'تمت جدولة الحصة بنجاح!',
        details: `تمت جدولة الحصة ليوم ${dayObj.nameAr} (${formatTime12H(startTime)}) مع المعلم (${selectedTeacher.nameAr}) والطالب (${selectedStudent.nameAr}).`,
        showUndoBtn: true,
      });
      setTimeout(() => setActionFeedback(null), 8000);
    } else {
      setErrorMsg((res && res.message) || 'خطأ في جدولة الحصة');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const originalSessionSnapshot = { ...editingSession };
    const selTeacher = db.teachers.find((t) => t.id === editTeacherId) || db.teachers[0];
    const selStudent = db.students.find((s) => s.id === editStudentId) || db.students[0];
    const selCourse = db.courseSubjects.find((c) => c.id === editCourseId) || db.courseSubjects[0];
    const dayObj = WEEK_DAYS.find((w) => w.id === editDayId) || WEEK_DAYS[1];

    // Calculate end time
    const [h, m] = editStartTime.split(':').map(Number);
    const totalMinutes = (h || 0) * 60 + (m || 0) + editDurationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const calculatedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    updateDatabaseState((draft) => {
      const target = draft.sessions.find((s) => s.id === editingSession.id);
      if (target) {
        target.teacherId = selTeacher.id;
        target.teacherNameAr = selTeacher.nameAr;
        target.studentId = selStudent.id;
        target.studentNameAr = selStudent.nameAr;
        target.courseId = selCourse ? selCourse.id : target.courseId;
        target.subjectNameAr = selCourse ? selCourse.titleAr : target.subjectNameAr;
        (target as any).courseTitleAr = selCourse ? selCourse.titleAr : (target as any).courseTitleAr;
        target.dayOfWeek = dayObj.id;
        target.dayNameAr = dayObj.nameAr;
        target.dayNum = dayObj.dayNum;
        target.date = dayObj.nameAr;
        target.startTime = editStartTime;
        target.endTime = calculatedEndTime;
        target.durationMinutes = editDurationMinutes;
        target.meetingUrl = editCustomTeamsLink.trim() || target.meetingUrl;
      }
    });

    // Push to undo stack
    pushUndo(`تعديل حصة الطالب (${selStudent.nameAr})`, () => {
      updateDatabaseState((draft) => {
        const target = draft.sessions.find((s) => s.id === originalSessionSnapshot.id);
        if (target) {
          Object.assign(target, originalSessionSnapshot);
        }
      });
    });

    setEditingSession(null);
    setActionFeedback({
      type: 'success',
      message: 'تم حفظ تعديل الحصة بنجاح!',
      details: `تم تحديث موعد ومعلومات حصة الطالب (${selStudent.nameAr}) في يوم ${dayObj.nameAr}.`,
      showUndoBtn: true,
    });
    setTimeout(() => setActionFeedback(null), 7000);
  };

  const handleDeleteSession = (id: string) => {
    const sessionToDelete = db.sessions.find((s) => s.id === id);
    if (!sessionToDelete) {
      setDeletingSessionId(null);
      return;
    }

    const linkedAttendance = (db.attendance || []).filter((att) => att.sessionId === id);

    updateDatabaseState((draft) => {
      draft.sessions = draft.sessions.filter((s) => s.id !== id);
      draft.attendance = (draft.attendance || []).filter((att) => att.sessionId !== id);
    });

    // Remove from selection if selected
    setSelectedSessionIds((prev) => prev.filter((sId) => sId !== id));
    setDeletingSessionId(null);

    // Push to undo stack
    pushUndo(`حذف حصة الطالب (${sessionToDelete.studentNameAr})`, () => {
      updateDatabaseState((draft) => {
        draft.sessions.unshift(sessionToDelete);
        if (linkedAttendance.length > 0) {
          draft.attendance = [...linkedAttendance, ...(draft.attendance || [])];
        }
      });
    });

    setActionFeedback({
      type: 'success',
      message: `تم حذف الحصة بنجاح!`,
      details: `تم حذف حصة الطالب (${sessionToDelete.studentNameAr}). يمكنك التراجع عن الحذف في أي وقت بالضغط على زر التراجع.`,
      showUndoBtn: true,
    });
    setTimeout(() => setActionFeedback(null), 8000);
  };

  const handleBulkDelete = () => {
    if (selectedSessionIds.length === 0) return;

    const idsToDelete = [...selectedSessionIds];
    const sessionsToDelete = db.sessions.filter((s) => idsToDelete.includes(s.id));
    const linkedAttendance = (db.attendance || []).filter((att) => idsToDelete.includes(att.sessionId));

    updateDatabaseState((draft) => {
      draft.sessions = draft.sessions.filter((s) => !idsToDelete.includes(s.id));
      draft.attendance = (draft.attendance || []).filter((att) => !idsToDelete.includes(att.sessionId));
    });

    setSelectedSessionIds([]);
    setIsBulkDeleteOpen(false);

    // Push to Undo
    pushUndo(`حذف متعدد لعدد (${sessionsToDelete.length}) حصص`, () => {
      updateDatabaseState((draft) => {
        draft.sessions = [...sessionsToDelete, ...draft.sessions];
        if (linkedAttendance.length > 0) {
          draft.attendance = [...linkedAttendance, ...(draft.attendance || [])];
        }
      });
    });

    setActionFeedback({
      type: 'success',
      message: `تم حذف ${sessionsToDelete.length} حصة محددة بنجاح!`,
      details: 'يمكنك استعادة الحصص المحذوفة مباشرة عبر الضغط على زر التراجع.',
      showUndoBtn: true,
    });
    setTimeout(() => setActionFeedback(null), 8000);
  };

  // Toggle selection for a session
  const toggleSelectSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filter sessions by selected tab
  const filteredSessions = db.sessions.filter((session) => {
    if (selectedDayTab === 'all') return true;
    return getSessionDay(session).id === selectedDayTab;
  });

  // Toggle select all visible
  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredSessions.map((s) => s.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSessionIds.includes(id));

    if (allSelected) {
      setSelectedSessionIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedSessionIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

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
        // Push undo for session completion
        pushUndo(`إكمال حصة الطالب (${session.studentNameAr})`, () => {
          updateDatabaseState((draft) => {
            const target = draft.sessions.find((s) => s.id === session.id);
            if (target) {
              target.status = 'scheduled';
            }
            // roll back student remaining sessions
            const stu = draft.students.find((s) => s.id === session.studentId || isArabicNameMatch(s.nameAr, session.studentNameAr));
            if (stu) {
              stu.remainingSessions = (stu.remainingSessions || 0) + 1;
              stu.totalSessionsCompleted = Math.max(0, (stu.totalSessionsCompleted || 1) - 1);
            }
            // roll back teacher earned
            const tch = draft.teachers.find((t) => t.id === session.teacherId || isArabicNameMatch(t.nameAr, session.teacherNameAr));
            if (tch) {
              tch.completedSessionsCount = Math.max(0, (tch.completedSessionsCount || 1) - 1);
              const rate = tch.perSessionRate || tch.hourlyRate || 250;
              tch.totalEarned = Math.max(0, (tch.totalEarned || rate) - rate);
            }
            // remove attendance record
            draft.attendance = (draft.attendance || []).filter((a) => a.sessionId !== session.id);
          });
        });

        setActionFeedback({
          type: 'success',
          message: `تم إكمال الحصة بنجاح!`,
          details: `${res.message || `تم ترحيل الحصة لشيت الحضور والغياب، واحتساب الحصة للمعلم (${session.teacherNameAr})، وخصم حصة من رصيد الطالب (${session.studentNameAr}).`} • ستتجدد الحصة تلقائياً باللون الأخضر للأسبوع القادم بعد دقيقتين ونصف دون الحاجة للضغط على أي زر.`,
          showUndoBtn: true,
        });
        setTimeout(() => {
          setActionFeedback(null);
        }, 12000);
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
      details: `الحصة جاهزة الآن باللون الأخضر، وسجلات الحضور والغياب والمستحقات السابقة محفوظة دون تغيير.`,
    });
    setTimeout(() => {
      setActionFeedback(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Notification Banner with Undo Button */}
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

          <div className="flex items-center gap-2 shrink-0">
            {actionFeedback.showUndoBtn && undoStack.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="تراجع عن هذا الإجراء"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                <span>تراجع الآن</span>
              </button>
            )}

            <button
              onClick={() => setActionFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Bar when items selected */}
      {selectedSessionIds.length > 0 && (
        <div className="sticky top-2 z-30 p-3 sm:p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
              {selectedSessionIds.length}
            </span>
            <span className="font-black text-xs sm:text-sm">
              تم تحديد {selectedSessionIds.length} حصة من الجدول
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف الحصص المحددة ({selectedSessionIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSessionIds([])}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء التحديد
            </button>
          </div>
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
              ? 'مقسم بجميع أيام الأسبوع من السبت إلى الجمعة، مع روابط قاعات Microsoft Teams وتجديد تلقائي للأسبوع القادم'
              : 'Weekly timetable organized Saturday through Friday with Microsoft Teams links and auto-renewal.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Global Undo Button */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 shadow-sm ${
              undoStack.length > 0
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={undoStack.length > 0 ? `تراجع عن: ${undoStack[0]?.titleAr} (Ctrl+Z)` : 'لا توجد إجراءات للتراجع عنها حالياً'}
          >
            <RotateCcw className={`w-4 h-4 ${undoStack.length > 0 ? 'text-amber-700' : 'text-slate-400'}`} />
            <span>تراجع</span>
            {undoStack.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
                {undoStack.length}
              </span>
            )}
          </button>

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

      {/* Day Navigation Tabs & Multi-select Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto min-w-max pb-1 sm:pb-0 flex-1">
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

        {/* Quick select all toggle */}
        {filteredSessions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={handleToggleSelectAllVisible}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                filteredSessions.every((s) => selectedSessionIds.includes(s.id))
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-400 bg-white'
              }`}>
                {filteredSessions.every((s) => selectedSessionIds.includes(s.id)) && <Check className="w-2.5 h-2.5" />}
              </div>
              <span>
                {filteredSessions.every((s) => selectedSessionIds.includes(s.id))
                  ? 'إلغاء تحديد الكل'
                  : 'تحديد كل المعروض'}
              </span>
            </button>
          </div>
        )}
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
            const isDayAllSelected = daySessions.length > 0 && daySessions.every((s) => selectedSessionIds.includes(s.id));

            return (
              <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Accordion Header Dropdown */}
                <div
                  onClick={() => setCollapsedDays((prev) => ({ ...prev, [day.id]: !prev[day.id] }))}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Day Select All Checkbox */}
                    {daySessions.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const dayIds = daySessions.map((s) => s.id);
                          if (isDayAllSelected) {
                            setSelectedSessionIds((prev) => prev.filter((id) => !dayIds.includes(id)));
                          } else {
                            setSelectedSessionIds((prev) => Array.from(new Set([...prev, ...dayIds])));
                          }
                        }}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isDayAllSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white hover:border-blue-400'
                        }`}
                        title={isDayAllSelected ? 'إلغاء تحديد حصص هذا اليوم' : 'تحديد جميع حصص هذا اليوم'}
                      >
                        {isDayAllSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )}

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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {daySessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            isSelected={selectedSessionIds.includes(session.id)}
                            onToggleSelect={() => toggleSelectSession(session.id)}
                            onDelete={() => setDeletingSessionId(session.id)}
                            onEdit={() => openEditModal(session)}
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm">
              حصص يوم {WEEK_DAYS.find((w) => w.id === selectedDayTab)?.nameAr} ({filteredSessions.length} حصة)
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openAddModalForDay(selectedDayTab)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حصة جديدة لهذا اليوم</span>
              </button>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSessionIds.includes(session.id)}
                  onToggleSelect={() => toggleSelectSession(session.id)}
                  onDelete={() => setDeletingSessionId(session.id)}
                  onEdit={() => openEditModal(session)}
                  onComplete={() => handleComplete(session)}
                  onResetSchedule={() => handleResetToScheduled(session)}
                  isCompleting={completingId === session.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Session Modal with Split View: Form + Rest of Day's Schedule */}
      {isAddOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-all ${
            isModalTransparent ? 'bg-slate-900/20 backdrop-blur-none' : 'bg-slate-900/60 backdrop-blur-sm'
          }`}
        >
          <div
            className={`bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] transition-all ${
              isModalTransparent ? 'opacity-90 ring-4 ring-blue-500/50' : 'opacity-100'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">جدولة حصة جديدة (Microsoft Teams)</h3>
                  <p className="text-[11px] text-slate-500">
                    يمكنك رؤية باقي جدول يوم {WEEK_DAYS.find((w) => w.id === selectedDayId)?.nameAr} بالجانب مباشرة لتجنب تداخل المواعيد
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Transparency / Peek toggle button */}
                <button
                  type="button"
                  onClick={() => setIsModalTransparent((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                    isModalTransparent
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={isModalTransparent ? 'إعادة التعتيم الطبيعي' : 'شفافية لمعاينة خلفية الصفحة'}
                >
                  {isModalTransparent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isModalTransparent ? 'إخفاء الخلفية' : 'معاينة الخلفية'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Content: Left = Day's Existing Timetable (Rest of Schedule), Right = Scheduling Form */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200">
              
              {/* Form Section */}
              <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Day of Week Selector */}
                  <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-800 font-extrabold text-xs">
                        اختر يوم الحصة من أيام الأسبوع*
                      </label>
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md font-bold">
                        ثابت أسبوعياً
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                      {WEEK_DAYS.filter((w) => w.id !== 'all').map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDayId(d.id)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all text-center border ${
                            selectedDayId === d.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d.nameAr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Teacher & Student */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              {s.nameAr} ({isNeg ? `رصيد سالب: ${s.remainingSessions} حصة ⚠️` : `متبقي ${s.remainingSessions} حصة`})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Course & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  {/* 12-Hour Time Picker */}
                  <Time12HPicker
                    value={startTime}
                    onChange={setStartTime}
                    durationMinutes={durationMinutes}
                    label="موعد الحصة (توقيت 12 ساعة صباحاً/مساءً)"
                  />

                  {/* Microsoft Teams Link */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                      <span>رابط قاعة Microsoft Teams</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-extrabold">توليد آلي إن ترك فارغاً</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://teams.microsoft.com/l/meetup-join/..."
                      value={customTeamsLink}
                      onChange={(e) => setCustomTeamsLink(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-[11px] bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
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
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ وجدولة الحصة</span>
                  </button>
                </div>
              </form>

              {/* Side Panel: Rest of Schedule for Selected Day (باقي الجدول) */}
              <div className="w-full lg:w-80 bg-slate-50/70 p-4 flex flex-col overflow-hidden max-h-72 lg:max-h-none border-t lg:border-t-0 border-slate-200">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h4 className="font-extrabold text-xs text-slate-800">
                      باقي جدول يوم {WEEK_DAYS.find((w) => w.id === selectedDayId)?.nameAr}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    {existingSessionsForSelectedDay.length} حصة
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {existingSessionsForSelectedDay.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200 my-auto">
                      <p className="font-medium">لا توجد حصص أخرى مسجلة ليوم {WEEK_DAYS.find((w) => w.id === selectedDayId)?.nameAr} بعد.</p>
                      <p className="text-[10px] text-slate-400 mt-1">هذا اليوم خالٍ ومتاح بالكامل لجدولة الحصص.</p>
                    </div>
                  ) : (
                    existingSessionsForSelectedDay.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-[11px] space-y-1 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-blue-800 text-[10px]">
                          <span>{formatTime12H(s.startTime)} - {formatTime12H(s.endTime)}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 truncate">
                          الطالب: {s.studentNameAr}
                        </div>
                        <div className="text-slate-600 text-[10px] flex items-center justify-between truncate">
                          <span>المعلم: {s.teacherNameAr}</span>
                          <span className="text-slate-400 text-[9px]">{s.subjectNameAr}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">تعديل الحصة المجدولة</h3>
                  <p className="text-[11px] text-slate-500">تعديل اليوم والموعد أو المعلم أو الطالب مع إمكانية التراجع بزر التراجع</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Day of Week */}
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
                  <label className="block text-slate-800 font-extrabold text-xs">
                    يوم الحصة*
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    {WEEK_DAYS.filter((w) => w.id !== 'all').map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setEditDayId(d.id)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all text-center border ${
                          editDayId === d.id
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.nameAr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المعلم*</label>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الطالب*</label>
                    <select
                      value={editStudentId}
                      onChange={(e) => setEditStudentId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المادة الدراسية*</label>
                    <select
                      value={editCourseId}
                      onChange={(e) => setEditCourseId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      {db.courseSubjects.map((c) => (
                        <option key={c.id} value={c.id}>{c.titleAr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المدة*</label>
                    <select
                      value={editDurationMinutes}
                      onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-800"
                    >
                      <option value={30}>30 دقيقة</option>
                      <option value={45}>45 دقيقة</option>
                      <option value={60}>60 دقيقة</option>
                      <option value={90}>90 دقيقة</option>
                      <option value={120}>120 دقيقة</option>
                    </select>
                  </div>
                </div>

                {/* 12-Hour Time Picker */}
                <Time12HPicker
                  value={editStartTime}
                  onChange={setEditStartTime}
                  durationMinutes={editDurationMinutes}
                  label="موعد الحصة الجديد (توقيت 12 ساعة)"
                />

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رابط Microsoft Teams</label>
                  <input
                    type="url"
                    value={editCustomTeamsLink}
                    onChange={(e) => setEditCustomTeamsLink(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-[11px] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>حفظ التعديل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Modal */}
      {deletingSessionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد حذف الحصة</h3>
            <p className="text-xs text-slate-600 mb-6">
              هل أنت متأكد من حذف هذه الحصة المجدولة؟ يمكنك التراجع عن الحذف في أي وقت بزر التراجع.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingSessionId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteSession(deletingSessionId)}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
              >
                حذف الحصة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">
              تأكيد حذف الحصص المحددة
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف <strong className="text-rose-600">({selectedSessionIds.length})</strong> حصص محددة؟
              <br />
              <span className="text-[11px] text-slate-500 mt-1 block">
                ملاحظة: يمكنك التراجع عن هذا الإجراء فوراً عبر زر "تراجع" واستعادة جميع الحصص المحذوفة.
              </span>
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md active:scale-95"
              >
                تأكيد حذف ({selectedSessionIds.length}) حصص
              </button>
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

// Component for session cards with MS Teams button, Multi-Select Checkbox, and Auto-Renewal Countdown
const SessionCard: React.FC<{
  session: any;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onComplete: () => void;
  onResetSchedule?: () => void;
  isCompleting?: boolean;
}> = ({ session, isSelected, onToggleSelect, onDelete, onEdit, onComplete, onResetSchedule, isCompleting }) => {
  const { db, updateDatabaseState } = useApp();
  const dayInfo = getSessionDay(session);

  // Auto-renew timer: 2.5 minutes (150 seconds)
  const AUTO_RENEW_MS = 150 * 1000;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (session.status !== 'completed' || !session.completedAt) return 0;
    const elapsed = Date.now() - new Date(session.completedAt).getTime();
    return Math.max(0, Math.ceil((AUTO_RENEW_MS - elapsed) / 1000));
  });

  useEffect(() => {
    if (session.status !== 'completed' || !session.completedAt) {
      setSecondsRemaining(0);
      return;
    }

    const checkTimer = () => {
      const elapsed = Date.now() - new Date(session.completedAt).getTime();
      const left = Math.max(0, Math.ceil((AUTO_RENEW_MS - elapsed) / 1000));
      setSecondsRemaining(left);

      if (left <= 0) {
        // Automatically reverts back to green scheduled status without clicking!
        updateDatabaseState((draft) => {
          const target = draft.sessions.find((s) => s.id === session.id);
          if (target && target.status === 'completed') {
            target.status = 'scheduled';
          }
        });
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [session.status, session.completedAt, session.id]);

  // Find linked student
  const student = db.students.find(
    (s) => s.id === session.studentId || (session.studentNameAr && isArabicNameMatch(s.nameAr, session.studentNameAr))
  );

  const isStudentNegative = student && typeof student.remainingSessions === 'number' && student.remainingSessions < 0;

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between text-start relative group ${
        isSelected
          ? 'ring-2 ring-blue-500 bg-blue-50/40 border-blue-400 shadow-md'
          : session.status === 'completed'
          ? 'bg-emerald-50/40 border-emerald-200'
          : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Multi-Select Checkbox */}
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 bg-white hover:border-blue-400'
                }`}
                title={isSelected ? 'إلغاء تحديد هذه الحصة' : 'تحديد هذه الحصة'}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            )}

            <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100 shrink-0">
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

            {/* Edit Button */}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                title="تعديل الحصة"
              >
                <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </button>
            )}

            {/* Delete Button */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full">
            <span className="py-1 px-2 rounded-lg bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>محسوبة بالحضور</span>
            </span>

            {/* Automatic Renewal Badge and Countdown */}
            <div className="flex-1 flex items-center justify-between sm:justify-end gap-1.5 bg-blue-50/80 border border-blue-200/90 px-2 py-1 rounded-xl text-[9px] sm:text-[10px] text-blue-900 font-bold">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                <span>تتجدد تلقائياً:</span>
                <span className="font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                  {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
                </span>
              </div>

              {onResetSchedule && (
                <button
                  onClick={onResetSchedule}
                  className="px-1.5 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-700 text-[9px] font-bold transition-colors border border-blue-200 shrink-0"
                  title="تجديد موعد الحصة فوراً باللون الأخضر"
                >
                  تجديد الآن
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
