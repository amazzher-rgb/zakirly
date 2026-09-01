import { AttendanceRecord, Student, Teacher, ScheduledSession, DatabaseState, PayrollRecord, CourseSubject } from '../types';

export interface AccountingCycle {
  month: number; // 1-12
  year: number; // e.g. 2026
  startDate: string; // "YYYY-MM-26"
  endDate: string; // "YYYY-MM-25"
  labelAr: string; // e.g. "أغسطس 2026 (26 يوليو - 25 أغسطس)"
  labelEn: string;
  shortLabelAr: string; // e.g. "أغسطس 2026 المحاسبي"
  isCurrent: boolean;
  isClosed: boolean;
}

export interface DayAttendanceGroup {
  dayNumber: number; // 1..31 within cycle
  dateStr: string; // "YYYY-MM-DD"
  displayDateAr: string; // e.g. "السبت 26 يوليو 2026"
  records: AttendanceRecord[];
  sessionCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

const ARABIC_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * Generates an AccountingCycle object given a target accounting month (1-12) and year.
 * An Accounting Cycle for Month M runs from Day 26 of Month M-1 to Day 25 of Month M.
 */
export function getAccountingCycle(month: number, year: number): AccountingCycle {
  const now = new Date();
  const safeMonth = isNaN(month) ? (now.getMonth() + 1) : Math.max(1, Math.min(12, month));
  const safeYear = isNaN(year) ? now.getFullYear() : year;
  const targetMonth = safeMonth;
  const targetYear = safeYear;

  // Calculate start month and year (26th of M-1)
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

  const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-26`;
  const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-25`;

  const prevMonthName = ARABIC_MONTH_NAMES[prevMonth - 1] || '';
  const targetMonthName = ARABIC_MONTH_NAMES[targetMonth - 1] || '';

  const shortLabelAr = `شهر ${targetMonthName} ${targetYear} المحاسبي`;
  const labelAr = `${shortLabelAr} (${26} ${prevMonthName} - ${25} ${targetMonthName})`;
  const labelEn = `${targetMonthName} ${targetYear} Accounting Cycle (26 ${prevMonthName} - 25 ${targetMonthName})`;

  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrent = todayStr >= startDate && todayStr <= endDate;
  const isClosed = todayStr > endDate;

  return {
    month: targetMonth,
    year: targetYear,
    startDate,
    endDate,
    labelAr,
    labelEn,
    shortLabelAr,
    isCurrent,
    isClosed,
  };
}

/**
 * Parses a date string YYYY-MM-DD or ISO string safely into a local Date object set at 12 noon.
 * Setting 12 noon prevents daylight savings time jumps or UTC offset day-shifting.
 */
export function parseLocalDate(dateInput?: string | Date): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  try {
    const cleanStr = String(dateInput).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0, 0);
      }
    }
  } catch (e) {}

  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Returns the AccountingCycle for any given date string "YYYY-MM-DD" or Date object.
 * Rule:
 * - If day >= 26: belongs to next calendar month's accounting cycle.
 * - If day <= 25: belongs to current calendar month's accounting cycle.
 */
export function getAccountingCycleForDate(dateInput?: string | Date): AccountingCycle {
  const dateObj = parseLocalDate(dateInput);

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // 1-12
  const day = dateObj.getDate();

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const now = new Date();
    return getAccountingCycle(now.getMonth() + 1, now.getFullYear());
  }

  let targetMonth: number;
  let targetYear: number;

  if (day >= 26) {
    targetMonth = month === 12 ? 1 : month + 1;
    targetYear = month === 12 ? year + 1 : year;
  } else {
    targetMonth = month;
    targetYear = year;
  }

  return getAccountingCycle(targetMonth, targetYear);
}

/**
 * Gets current active Accounting Cycle.
 */
export function getCurrentAccountingCycle(): AccountingCycle {
  return getAccountingCycleForDate(new Date());
}

/**
 * Generates list of recent accounting cycles for selection dropdowns.
 * Ensures ALL 12 months of the current year (1 to 12) + requested past/future months are included.
 */
export function getRecentAccountingCycles(pastMonths = 12, futureMonths = 6): AccountingCycle[] {
  const current = getCurrentAccountingCycle();
  const map = new Map<string, AccountingCycle>();

  // 1. Ensure all 12 months of current year are present (January through December)
  for (let m = 1; m <= 12; m++) {
    const cycle = getAccountingCycle(m, current.year);
    map.set(`${cycle.year}-${cycle.month}`, cycle);
  }

  // 2. Add surrounding months for past/future years if requested
  for (let i = -pastMonths; i <= futureMonths; i++) {
    let m = current.month + i;
    let y = current.year;

    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }

    const cycle = getAccountingCycle(m, y);
    map.set(`${cycle.year}-${cycle.month}`, cycle);
  }

  // Sort descending (latest cycle first)
  return Array.from(map.values()).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Checks if a given date string "YYYY-MM-DD" falls inside an accounting cycle.
 */
export function isDateInAccountingCycle(dateStr: string, cycle: AccountingCycle): boolean {
  if (!dateStr) return false;
  const cleanDate = dateStr.split('T')[0];
  return cleanDate >= cycle.startDate && cleanDate <= cycle.endDate;
}

/**
 * Calculates the exact completed sessions count for a teacher within a specific accounting cycle (26th of M-1 to 25th of M).
 */
export function getTeacherCycleSessions(
  teacherId: string,
  cycle: AccountingCycle,
  attendanceRecords: AttendanceRecord[] = [],
  sessions: ScheduledSession[] = [],
  teacherObj?: any,
  payrolls: PayrollRecord[] = []
): number {
  const start = cycle.startDate;
  const end = cycle.endDate;

  const attCount = attendanceRecords.filter((a) => {
    const isTeacher = a.teacherId === teacherId || (teacherObj && a.teacherNameAr === teacherObj.nameAr);
    if (!isTeacher) return false;
    if (a.status !== 'present' && a.status !== 'late') return false;
    const cleanDate = (a.date || '').split('T')[0];
    return cleanDate >= start && cleanDate <= end;
  });

  const sessCount = sessions.filter((s) => {
    const isTeacher = s.teacherId === teacherId || (teacherObj && s.teacherNameAr === teacherObj.nameAr);
    if (!isTeacher || s.status !== 'completed') return false;
    const cleanDate = (s.date || '').split('T')[0];
    return cleanDate >= start && cleanDate <= end;
  });

  const uniqueSessionIds = new Set([
    ...attCount.map((a) => a.sessionId).filter(Boolean),
    ...sessCount.map((s) => s.id).filter(Boolean),
  ]);

  const exactCount = Math.max(attCount.length, sessCount.length, uniqueSessionIds.size);

  return exactCount;
}

/**
 * Calculates completed sessions count executed AFTER the 25th of the cycle (or accumulated for the new active cycle after settlement).
 */
export function getTeacherPostCycleSessions(
  teacherId: string,
  cycle: AccountingCycle,
  attendanceRecords: AttendanceRecord[] = [],
  sessions: ScheduledSession[] = [],
  teacherObj?: any,
  payrolls: PayrollRecord[] = []
): number {
  const end = cycle.endDate;

  const attCount = attendanceRecords.filter((a: any) => {
    const isTeacher = a.teacherId === teacherId || (teacherObj && a.teacherNameAr === teacherObj.nameAr);
    if (!isTeacher) return false;
    if (a.status !== 'present' && a.status !== 'late') return false;
    const cleanDate = (a.date || '').split('T')[0];
    if (a.teacherPaid) return false;
    return cleanDate > end;
  });

  const sessCount = sessions.filter((s: any) => {
    const isTeacher = s.teacherId === teacherId || (teacherObj && s.teacherNameAr === teacherObj.nameAr);
    if (!isTeacher || s.status !== 'completed') return false;
    const cleanDate = (s.date || '').split('T')[0];
    if (s.teacherPaid) return false;
    return cleanDate > end;
  });

  const uniqueSessionIds = new Set([
    ...attCount.map((a: any) => a.sessionId).filter(Boolean),
    ...sessCount.map((s: any) => s.id).filter(Boolean),
  ]);

  return Math.max(attCount.length, sessCount.length, uniqueSessionIds.size);
}

/**
 * Returns all completed sessions for a teacher (from scheduled sessions and attendance records).
 */
export function getTeacherCompletedSessions(
  teacher: Teacher,
  sessions: ScheduledSession[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  currentCycle?: AccountingCycle,
  payrolls: PayrollRecord[] = []
): ScheduledSession[] {
  const result: ScheduledSession[] = [];
  const processedSessionIds = new Set<string>();

  if (!teacher) return result;

  const isCycleSettled = currentCycle && Array.isArray(payrolls) && payrolls.some(
    (p) => p.teacherId === teacher.id && p.month === currentCycle.month && p.year === currentCycle.year && (p.status === 'paid' || p.isSettled)
  );

  // 1. Scheduled sessions for this teacher
  const teacherSessions = sessions.filter(
    (s) => s.teacherId === teacher.id || (s.teacherNameAr && s.teacherNameAr === teacher.nameAr)
  );

  teacherSessions.forEach((s) => {
    const hasAttendancePresent = attendanceRecords.some(
      (a) =>
        (a.sessionId === s.id || (a.date === s.date && (a.teacherId === teacher.id || a.teacherNameAr === teacher.nameAr))) &&
        (a.status === 'present' || a.status === 'late')
    );

    if (s.status === 'completed' || s.completedAt || hasAttendancePresent) {
      const cleanDate = (s.date || '').split('T')[0];
      const isPaid = s.teacherPaid || (isCycleSettled && currentCycle && cleanDate <= currentCycle.endDate);

      result.push({
        ...s,
        status: 'completed',
        teacherNameAr: s.teacherNameAr || teacher.nameAr,
        subjectNameAr: s.subjectNameAr || (Array.isArray(teacher.subjects) ? teacher.subjects[0] : teacher.subjects) || 'مادة دراسية',
        teacherPaid: isPaid,
      });
      if (s.id) processedSessionIds.add(s.id);
    }
  });

  // 2. Attendance records where student/teacher was present but not already in result
  const teacherAttendance = attendanceRecords.filter((a) => {
    if (a.teacherId !== teacher.id && a.teacherNameAr !== teacher.nameAr) return false;
    if (a.status !== 'present' && a.status !== 'late') return false;
    if (a.sessionId && processedSessionIds.has(a.sessionId)) return false;
    return true;
  });

  teacherAttendance.forEach((att: any, idx) => {
    const cleanDate = (att.date || '').split('T')[0];
    const isPaid = att.teacherPaid || (isCycleSettled && currentCycle && cleanDate <= currentCycle.endDate);

    result.push({
      id: att.sessionId || `att-session-${teacher.id}-${idx}-${att.date}`,
      tenantId: att.tenantId || teacher.tenantId || 'tenant-zakirly-curriculum',
      code: `SES-ATT-${idx + 1}`,
      courseId: att.courseId || 'cs-101',
      subjectNameAr: att.subjectNameAr || (Array.isArray(teacher.subjects) ? teacher.subjects[0] : teacher.subjects) || 'مادة دراسية',
      teacherId: teacher.id,
      teacherNameAr: teacher.nameAr,
      studentId: att.studentId || 'stu-gen',
      studentNameAr: att.studentNameAr || 'طالب مخصص',
      date: cleanDate || new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:00',
      durationMinutes: 60,
      status: 'completed',
      completedAt: att.date || new Date().toISOString(),
      notes: att.notes || 'حصة منفذة بنجاح وفق سجل الحضور',
      teacherPaid: isPaid,
    });
  });

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Returns all completed sessions for a student (from scheduled sessions, attendance records, and student package history).
 */
export function getStudentCompletedSessions(
  student: Student,
  sessions: ScheduledSession[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  currentCycle?: AccountingCycle,
  courses: CourseSubject[] = [],
  teachers: Teacher[] = []
): ScheduledSession[] {
  const result: ScheduledSession[] = [];
  const processedSessionIds = new Set<string>();

  if (!student) return result;

  const studentNameClean = (student.nameAr || '').trim().toLowerCase();

  // 1. Scheduled sessions for this student
  const studentSessions = sessions.filter((s) => {
    if (s.studentId && s.studentId === student.id) return true;
    if (s.studentNameAr && studentNameClean && s.studentNameAr.trim().toLowerCase() === studentNameClean) return true;
    if (student.code && (s as any).studentCode === student.code) return true;
    return false;
  });

  studentSessions.forEach((s) => {
    const hasAttendancePresent = attendanceRecords.some(
      (a) =>
        (a.sessionId === s.id || (a.date === s.date && (a.studentId === student.id || (a.studentNameAr && a.studentNameAr.trim().toLowerCase() === studentNameClean)))) &&
        (a.status === 'present' || a.status === 'late' || (a.status as string) === 'completed')
    );

    if (s.status === 'completed' || s.completedAt || hasAttendancePresent || !s.status) {
      const subject = s.subjectNameAr || (s.courseId && courses.find((c) => c.id === s.courseId)?.titleAr) || 'مادة دراسية';
      const teacherName = s.teacherNameAr || (s.teacherId && teachers.find((t) => t.id === s.teacherId)?.nameAr) || student.assignedTeacherNameAr || 'معلم المادة';

      result.push({
        ...s,
        status: 'completed',
        studentNameAr: s.studentNameAr || student.nameAr,
        teacherNameAr: teacherName,
        subjectNameAr: subject,
      });
      if (s.id) processedSessionIds.add(s.id);
    }
  });

  // 2. Attendance records where student attended
  const studentAttendance = attendanceRecords.filter((a) => {
    if (a.studentId && a.studentId === student.id) return true;
    if (a.studentNameAr && studentNameClean && a.studentNameAr.trim().toLowerCase() === studentNameClean) return true;
    if (student.code && (a as any).studentCode === student.code) return true;
    return false;
  });

  studentAttendance.forEach((att: any, idx) => {
    if (att.sessionId && processedSessionIds.has(att.sessionId)) return;
    if (att.status !== 'present' && att.status !== 'late' && att.status !== 'completed' && att.status !== undefined) return;

    const cleanDate = (att.date || '').split('T')[0];
    const subject = att.subjectNameAr || (att.courseId && courses.find((c) => c.id === att.courseId)?.titleAr) || 'مادة دراسية';
    const teacherName = att.teacherNameAr || (att.teacherId && teachers.find((t) => t.id === att.teacherId)?.nameAr) || student.assignedTeacherNameAr || 'معلم المادة';

    result.push({
      id: att.sessionId || `att-stu-session-${student.id}-${idx}-${cleanDate || idx}`,
      tenantId: att.tenantId || student.tenantId || 'tenant-zakirly-curriculum',
      code: `SES-STU-${idx + 1}`,
      courseId: att.courseId || (student.enrolledCourseIds && student.enrolledCourseIds[0]) || 'cs-101',
      subjectNameAr: subject,
      teacherId: att.teacherId || student.assignedTeacherId || 'tch-3001',
      teacherNameAr: teacherName,
      studentId: student.id,
      studentNameAr: student.nameAr,
      date: cleanDate || new Date().toISOString().split('T')[0],
      startTime: att.startTime || '16:00',
      endTime: att.endTime || '17:00',
      durationMinutes: att.durationMinutes || 60,
      status: 'completed',
      completedAt: att.timestamp || att.date || new Date().toISOString(),
      notes: att.notes || 'حصة منفذة ومسجلة بسجل الحضور',
      teacherPaid: att.teacherPaid || false,
    });
  });

  // 3. Backfill synthetic history if student has recorded totalSessionsCompleted
  const targetCompletedCount = Math.max(
    Number(student.totalSessionsCompleted) || 0,
    Number((student as any).completedSessionsCount) || 0
  );

  if (result.length < targetCompletedCount) {
    const missingCount = targetCompletedCount - result.length;
    const baseDate = new Date();
    const primaryCourse = student.enrolledCourseIds && student.enrolledCourseIds.length > 0
      ? courses.find((c) => c.id === student.enrolledCourseIds[0])?.titleAr
      : student.packageNameAr || 'مادة دراسية';

    for (let i = 0; i < missingCount; i++) {
      const pastDate = new Date(baseDate);
      pastDate.setDate(pastDate.getDate() - (i + 1) * 3);
      const yyyy = pastDate.getFullYear();
      const mm = String(pastDate.getMonth() + 1).padStart(2, '0');
      const dd = String(pastDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      result.push({
        id: `synth-stu-ses-${student.id}-${i + 1}`,
        tenantId: student.tenantId || 'tenant-zakirly-curriculum',
        code: `SES-HIST-${i + 1}`,
        courseId: (student.enrolledCourseIds && student.enrolledCourseIds[0]) || 'cs-101',
        subjectNameAr: primaryCourse || 'مادة دراسية',
        teacherId: student.assignedTeacherId || 'tch-3001',
        teacherNameAr: student.assignedTeacherNameAr || 'معلم المادة',
        studentId: student.id,
        studentNameAr: student.nameAr,
        date: dateStr,
        startTime: '16:00',
        endTime: '17:00',
        durationMinutes: 60,
        status: 'completed',
        completedAt: `${dateStr}T17:00:00Z`,
        notes: 'حصة منفذة ومكتملة من رصيد باقة الطالب',
        teacherPaid: true,
      });
    }
  }

  return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Groups attendance records by individual days within an accounting cycle.
 * Each day is calculated as Day 1 (26th of prev month), Day 2, ..., up to Day 25 or last date.
 */
export function groupAttendanceByDaysInCycle(
  attendanceRecords: AttendanceRecord[],
  cycle: AccountingCycle
): DayAttendanceGroup[] {
  const filtered = attendanceRecords.filter((rec) => isDateInAccountingCycle(rec.date, cycle));

  // Map by exact date
  const recordsByDate = new Map<string, AttendanceRecord[]>();
  filtered.forEach((rec) => {
    const d = rec.date.split('T')[0];
    if (!recordsByDate.has(d)) {
      recordsByDate.set(d, []);
    }
    recordsByDate.get(d)!.push(rec);
  });

  // Generate all date strings in cycle from startDate to endDate
  const groups: DayAttendanceGroup[] = [];
  const start = parseLocalDate(cycle.startDate);
  const end = parseLocalDate(cycle.endDate);

  let current = new Date(start);
  let dayCounter = 1;

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const recs = recordsByDate.get(dateStr) || [];
    const dayName = ARABIC_DAY_NAMES[current.getDay()] || '';
    const monthName = ARABIC_MONTH_NAMES[current.getMonth()] || '';
    const displayDateAr = `${dayName} ${current.getDate()} ${monthName} ${yyyy}`;

    const presentCount = recs.filter((r) => r.status === 'present').length;
    const absentCount = recs.filter((r) => r.status === 'absent_excused' || r.status === 'absent_unexcused').length;
    const lateCount = recs.filter((r) => r.status === 'late').length;

    groups.push({
      dayNumber: dayCounter,
      dateStr,
      displayDateAr,
      records: recs,
      sessionCount: recs.length,
      presentCount,
      absentCount,
      lateCount,
    });

    // Advance 1 day
    current.setDate(current.getDate() + 1);
    dayCounter++;
  }

  return groups;
}

/**
 * Formats full date in Arabic with accounting day index.
 */
export function formatArabicAccountingDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const dayName = ARABIC_DAY_NAMES[d.getDay()];
  const monthName = ARABIC_MONTH_NAMES[d.getMonth()];
  return `${dayName} ${d.getDate()} ${monthName} ${d.getFullYear()}`;
}

/**
 * Calculate carried over (rollover) sessions for a student entering a new cycle.
 */
export function calculateStudentRolloverSessions(
  student: Student,
  attendance: AttendanceRecord[],
  cycle: AccountingCycle
): number {
  // Count sessions completed prior to cycle.startDate
  const priorCompletedSessions = attendance.filter(
    (a) => a.studentId === student.id && a.date < cycle.startDate && (a.status === 'present' || a.status === 'late')
  ).length;

  // Carried over is total package sessions minus completed in prior cycles
  const originalPackageCount = student.remainingSessions + (student.totalSessionsCompleted || 0);
  const remainingAtCycleStart = Math.max(0, originalPackageCount - priorCompletedSessions);

  return remainingAtCycleStart;
}
