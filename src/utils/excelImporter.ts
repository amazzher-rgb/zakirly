import * as XLSX from 'xlsx';
import { Student, Teacher, ScheduledSession, DatabaseState } from '../types';
import { normalizeTo24H } from './timeUtils';

/**
 * Flexible column value lookup in row object regardless of header formatting,
 * case, or extra whitespace.
 */
export function getRowValue(row: Record<string, any>, possibleKeys: string[]): any {
  if (!row || typeof row !== 'object') return undefined;

  const normalizedRowKeys = Object.keys(row).map((k) => ({
    original: k,
    normalized: k.toLowerCase().replace(/[\s_\-–—()]+/g, '').trim(),
  }));

  for (const targetKey of possibleKeys) {
    const normTarget = targetKey.toLowerCase().replace(/[\s_\-–—()]+/g, '').trim();
    const found = normalizedRowKeys.find(
      (nk) => nk.normalized === normTarget || nk.normalized.includes(normTarget)
    );
    if (found && row[found.original] !== undefined && row[found.original] !== '') {
      return row[found.original];
    }
  }

  return undefined;
}

/**
 * Parse Excel date (numeric serial or various string formats) to YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (val === null || val === undefined || val === '') {
    return new Date().toISOString().split('T')[0];
  }

  if (typeof val === 'number') {
    // Excel serial date code
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const s = String(val).trim();
  if (!s) return new Date().toISOString().split('T')[0];

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(s)) {
    const parts = s.split(/[\/\-\.]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // YYYY/MM/DD
  if (/^\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2}$/.test(s)) {
    const parts = s.split(/[\/\.]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parse Excel time (fractional number or string) to HH:mm
 */
export function parseExcelTime(val: any): string {
  if (val === null || val === undefined || val === '') {
    return '17:00';
  }

  if (typeof val === 'number' && val >= 0 && val <= 1) {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return normalizeTo24H(String(val));
}

/**
 * Clean and read rows from uploaded file (File object)
 */
export async function readExcelFile(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('ملف Excel فارغ أو لا يحتوي على صفحات بيانات.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
    raw: true,
  });

  return rows;
}

// ----------------------------------------------------
// STUDENTS IMPORT & PARSING
// ----------------------------------------------------

export interface ParsedStudentRow {
  code?: string;
  nameAr: string;
  nameEn?: string;
  grade: string;
  phone: string;
  parentNameAr: string;
  parentPhone?: string;
  remainingSessions: number;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'trial' | 'pending_renewal';
  assignedTeacherNameAr?: string;
  packageNameAr?: string;
  notes?: string;
  isExisting?: boolean;
  existingId?: string;
}

export function parseStudentsFromRows(rows: any[], existingStudents: Student[]): ParsedStudentRow[] {
  const result: ParsedStudentRow[] = [];

  for (const row of rows) {
    const nameAr = getRowValue(row, [
      'اسم الطالب',
      'الطالب',
      'اسم_الطالب',
      'الاسم',
      'Student Name',
      'Student',
      'Name',
    ]);
    if (!nameAr || !String(nameAr).trim()) continue;

    const trimmedName = String(nameAr).trim();
    const code = getRowValue(row, ['كود الطالب', 'الكود', 'كود', 'Code', 'Student Code']);
    const grade = getRowValue(row, ['الصف', 'الصف الدراسي', 'المرحلة', 'Grade', 'Year']) || 'الصف الأول الثانوي';
    const parentNameAr = getRowValue(row, ['ولي الأمر', 'اسم ولي الأمر', 'ولي_الأمر', 'Parent Name', 'Parent', 'Guardian']) || `ولي أمر ${trimmedName}`;
    const phone = String(getRowValue(row, ['الهاتف', 'رقم الهاتف', 'الموبايل', 'الهاتف / الواتساب', 'Phone', 'Mobile', 'WhatsApp']) || '+201000000000').trim();
    const parentPhone = getRowValue(row, ['هاتف ولي الأمر', 'رقم ولي الأمر', 'Parent Phone']);

    const remainingSessionsRaw = getRowValue(row, ['الحصص المتبقية', 'عدد الحصص', 'الحصص', 'Remaining Sessions', 'Sessions']);
    const remainingSessions = !isNaN(Number(remainingSessionsRaw)) ? Number(remainingSessionsRaw) : 12;

    const balanceRaw = getRowValue(row, ['الرصيد', 'الرصيد المالي', 'Balance']);
    const balance = !isNaN(Number(balanceRaw)) ? Number(balanceRaw) : 0;

    const currency = getRowValue(row, ['العملة', 'Currency']) || 'SAR';

    const statusRaw = String(getRowValue(row, ['الحالة', 'Status']) || 'active').trim().toLowerCase();
    let status: 'active' | 'inactive' | 'trial' | 'pending_renewal' = 'active';
    if (statusRaw.includes('تجديد') || statusRaw.includes('pending') || remainingSessions <= 0) {
      status = 'pending_renewal';
    } else if (statusRaw.includes('تجريب') || statusRaw.includes('trial')) {
      status = 'trial';
    } else if (statusRaw.includes('متوقف') || statusRaw.includes('غير') || statusRaw.includes('inactive')) {
      status = 'inactive';
    }

    const assignedTeacherNameAr = getRowValue(row, ['المعلم', 'اسم المعلم', 'المدرس', 'Teacher Name', 'Teacher']);
    const packageNameAr = getRowValue(row, ['الباقة', 'المادة', 'الكورس', 'Package', 'Subject']);
    const notes = getRowValue(row, ['ملاحظات', 'Notes']);

    // Check if exists in DB
    const existing = existingStudents.find(
      (s) =>
        (code && s.code.toLowerCase() === String(code).trim().toLowerCase()) ||
        s.nameAr.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (phone && phone !== '+201000000000' && s.phone === phone)
    );

    result.push({
      code: code ? String(code).trim() : undefined,
      nameAr: trimmedName,
      grade: String(grade).trim(),
      phone,
      parentNameAr: String(parentNameAr).trim(),
      parentPhone: parentPhone ? String(parentPhone).trim() : undefined,
      remainingSessions,
      balance,
      currency: String(currency).trim(),
      status,
      assignedTeacherNameAr: assignedTeacherNameAr ? String(assignedTeacherNameAr).trim() : undefined,
      packageNameAr: packageNameAr ? String(packageNameAr).trim() : undefined,
      notes: notes ? String(notes).trim() : 'تم الاستيراد آلياً عبر شيت Excel',
      isExisting: !!existing,
      existingId: existing?.id,
    });
  }

  return result;
}

export function downloadStudentsTemplate() {
  const template = [
    {
      'كود الطالب': 'STU-1001',
      'اسم الطالب': 'أحمد محمد علي',
      'الصف الدراسي': 'الصف الأول الثانوي',
      'ولي الأمر': 'محمد علي إبراهيم',
      'الهاتف': '+201012345678',
      'الحصص المتبقية': 12,
      'الرصيد المالي': 0,
      'العملة': 'SAR',
      'الحالة': 'نشط',
      'المعلم': 'أ. أحمد السيد',
      'المادة': 'الرياضيات - باقة الحصص الشاملة',
      'ملاحظات': 'طالب منتظم',
    },
    {
      'كود الطالب': 'STU-1002',
      'اسم الطالب': 'سارة خالد محمود',
      'الصف الدراسي': 'الصف الثالث الإعدادي',
      'ولي الأمر': 'خالد محمود',
      'الهاتف': '+201098765432',
      'الحصص المتبقية': 8,
      'الرصيد المالي': 500,
      'العملة': 'SAR',
      'الحالة': 'نشط',
      'المعلم': 'أ. فاطمة الزهراء',
      'المادة': 'اللغة الإنجليزية IGCSE',
      'ملاحظات': 'تفضل المواعيد المسائية',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_إدارة_الطلاب');
  XLSX.writeFile(workbook, 'نموذج_استيراد_الطلاب_أكاديمية_ذاكرلي.xlsx');
}

// ----------------------------------------------------
// TEACHERS IMPORT & PARSING
// ----------------------------------------------------

export interface ParsedTeacherRow {
  code?: string;
  nameAr: string;
  email: string;
  password?: string;
  phone: string;
  subjects: string[];
  perSessionRate: number;
  status: 'active' | 'on_leave' | 'inactive';
  bio?: string;
  isExisting?: boolean;
  existingId?: string;
}

export function parseTeachersFromRows(rows: any[], existingTeachers: Teacher[]): ParsedTeacherRow[] {
  const result: ParsedTeacherRow[] = [];

  for (const row of rows) {
    const nameAr = getRowValue(row, [
      'اسم المعلم',
      'المعلم',
      'المدرس',
      'اسم المدرس',
      'Teacher Name',
      'Teacher',
      'Name',
      'الاسم',
    ]);
    if (!nameAr || !String(nameAr).trim()) continue;

    const trimmedName = String(nameAr).trim();
    const code = getRowValue(row, ['كود المعلم', 'الكود', 'كود', 'Code', 'Teacher Code']);
    
    let email = String(getRowValue(row, ['البريد', 'البريد الإلكتروني', 'الإيميل', 'Email']) || '').trim();
    if (!email) {
      email = `teacher.${Date.now()}.${Math.floor(Math.random() * 1000)}@zakirly.academy`;
    } else if (!email.includes('@')) {
      email = `${email}@zakirly.academy`;
    }

    const password = String(getRowValue(row, ['كلمة المرور', 'الباسورد', 'Password']) || '123456').trim();
    const phone = String(getRowValue(row, ['الهاتف', 'رقم الهاتف', 'الموبايل', 'Phone', 'Mobile']) || '+201000000000').trim();

    const subjectsRaw = getRowValue(row, ['المواد', 'المادة', 'التخصص', 'المواد الدراسية', 'Subjects', 'Subject']) || 'اللغة الإنجليزية IGCSE';
    const subjects = String(subjectsRaw)
      .split(/[,،\/\+]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const rateRaw = getRowValue(row, ['سعر الحصة', 'أجر الحصة', 'سعر الساعة', 'Rate', 'Hourly Rate', 'Session Rate']);
    const perSessionRate = !isNaN(Number(rateRaw)) && Number(rateRaw) > 0 ? Number(rateRaw) : 250;

    const statusRaw = String(getRowValue(row, ['الحالة', 'Status']) || 'active').trim().toLowerCase();
    let status: 'active' | 'on_leave' | 'inactive' = 'active';
    if (statusRaw.includes('إجازة') || statusRaw.includes('leave')) {
      status = 'on_leave';
    } else if (statusRaw.includes('متوقف') || statusRaw.includes('غير') || statusRaw.includes('inactive')) {
      status = 'inactive';
    }

    const bio = getRowValue(row, ['نبذة', 'ملاحظات', 'السيرة الذاتية', 'Bio', 'Notes']);

    const existing = existingTeachers.find(
      (t) =>
        (code && t.code.toLowerCase() === String(code).trim().toLowerCase()) ||
        t.nameAr.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (email && t.email.toLowerCase() === email.toLowerCase())
    );

    result.push({
      code: code ? String(code).trim() : undefined,
      nameAr: trimmedName,
      email,
      password,
      phone,
      subjects: subjects.length > 0 ? subjects : ['عام'],
      perSessionRate,
      status,
      bio: bio ? String(bio).trim() : '',
      isExisting: !!existing,
      existingId: existing?.id,
    });
  }

  return result;
}

export function downloadTeachersTemplate() {
  const template = [
    {
      'كود المعلم': 'TCH-3001',
      'اسم المعلم': 'أ. أحمد السيد إبراهيم',
      'البريد الإلكتروني': 'ahmed.sayed@zakirly.academy',
      'كلمة المرور': '123456',
      'الهاتف': '+201023456789',
      'التخصص / المواد': 'الرياضيات، الإحصاء',
      'سعر الحصة': 250,
      'الحالة': 'نشط',
      'نبذة': 'معلم خبير حاصل على ماجستير في الرياضيات',
    },
    {
      'كود المعلم': 'TCH-3002',
      'اسم المعلم': 'أ. فاطمة الزهراء علي',
      'البريد الإلكتروني': 'fatma.ali@zakirly.academy',
      'كلمة المرور': 'Pass@2026',
      'الهاتف': '+201087654321',
      'التخصص / المواد': 'اللغة الإنجليزية IGCSE',
      'سعر الحصة': 300,
      'الحالة': 'نشط',
      'نبذة': 'متخصصة مناهج كامبريدج وإيدكسل',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_إدارة_المعلمين');
  XLSX.writeFile(workbook, 'نموذج_استيراد_المعلمين_أكاديمية_ذاكرلي.xlsx');
}

// ----------------------------------------------------
// SESSIONS (SCHEDULE) IMPORT & PARSING
// ----------------------------------------------------

const DAYS_LOOKUP = [
  { id: 'saturday', nameAr: 'السبت', dayNum: 6, aliases: ['السبت', 'سبت', 'sat', 'saturday'] },
  { id: 'sunday', nameAr: 'الأحد', dayNum: 0, aliases: ['الأحد', 'الاحد', 'أحد', 'احد', 'sun', 'sunday'] },
  { id: 'monday', nameAr: 'الإثنين', dayNum: 1, aliases: ['الإثنين', 'الاثنين', 'إثنين', 'اثنين', 'mon', 'monday'] },
  { id: 'tuesday', nameAr: 'الثلاثاء', dayNum: 2, aliases: ['الثلاثاء', 'ثلاثاء', 'tue', 'tuesday'] },
  { id: 'wednesday', nameAr: 'الأربعاء', dayNum: 3, aliases: ['الأربعاء', 'الاربعاء', 'أربعاء', 'اربعاء', 'wed', 'wednesday'] },
  { id: 'thursday', nameAr: 'الخميس', dayNum: 4, aliases: ['الخميس', 'خميس', 'thu', 'thursday'] },
  { id: 'friday', nameAr: 'الجمعة', dayNum: 5, aliases: ['الجمعة', 'جمعة', 'fri', 'friday'] },
];

export function resolveDayOfWeek(val: any): { id: string; nameAr: string; dayNum: number } {
  if (!val) return DAYS_LOOKUP[0];
  const str = String(val).trim().toLowerCase();

  for (const d of DAYS_LOOKUP) {
    if (d.aliases.some((a) => str.includes(a))) {
      return { id: d.id, nameAr: d.nameAr, dayNum: d.dayNum };
    }
  }

  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
      const num = new Date(y, m, day).getDay();
      const match = DAYS_LOOKUP.find((d) => d.dayNum === num);
      if (match) return { id: match.id, nameAr: match.nameAr, dayNum: match.dayNum };
    }
  }

  return DAYS_LOOKUP[0];
}

export interface ParsedSessionRow {
  code?: string;
  dayOfWeek: string;
  dayNameAr: string;
  dayNum: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  studentNameAr: string;
  teacherNameAr: string;
  courseTitleAr: string;
  meetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  isExisting?: boolean;
  existingId?: string;
}

export function parseSessionsFromRows(
  rows: any[],
  db: DatabaseState
): ParsedSessionRow[] {
  const result: ParsedSessionRow[] = [];

  for (const row of rows) {
    const studentNameRaw = getRowValue(row, ['الطالب', 'اسم الطالب', 'Student', 'Student Name']);
    const teacherNameRaw = getRowValue(row, ['المعلم', 'اسم المعلم', 'المدرس', 'Teacher', 'Teacher Name']);

    // At least student name or teacher name must be present
    if (!studentNameRaw && !teacherNameRaw) continue;

    const studentNameAr = String(studentNameRaw || 'طالب مجهول').trim();
    const teacherNameAr = String(teacherNameRaw || 'معلم الحصة').trim();

    const dayVal = getRowValue(row, [
      'يوم الحصة',
      'اليوم',
      'يوم',
      'اليوم في الأسبوع',
      'Day',
      'Week Day',
      'Day of Week',
      'التاريخ',
      'تاريخ الحصة',
      'Date',
      'Session Date',
    ]);
    const dayResolved = resolveDayOfWeek(dayVal);

    const timeVal = getRowValue(row, [
      'الوقت',
      'الساعة',
      'وقت البدء',
      'الوقت (12 ساعة)',
      'موعد الحصة',
      'توقيت الحصة',
      'Time',
      'Start Time',
    ]);
    const startTime = parseExcelTime(timeVal);

    const durationRaw = getRowValue(row, ['المدة', 'مدة الحصة', 'المدة بالدقائق', 'Duration', 'Minutes']);
    const durationMinutes = !isNaN(Number(durationRaw)) && Number(durationRaw) > 0 ? Number(durationRaw) : 60;

    // Calculate end time
    const [h, m] = startTime.split(':').map(Number);
    const endH = (h + Math.floor((m + durationMinutes) / 60)) % 24;
    const endM = (m + durationMinutes) % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const courseTitleRaw = getRowValue(row, ['المادة', 'المادة الدراسية', 'الكورس', 'Subject', 'Course']);
    const courseTitleAr = String(courseTitleRaw || 'مادة تعليمية').trim();

    const meetingUrlRaw = getRowValue(row, ['رابط الحصة', 'رابط التيمز', 'رابط الاجتماع', 'Teams Link', 'Meeting URL', 'Link']);
    const meetingUrl = meetingUrlRaw ? String(meetingUrlRaw).trim() : `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`;

    const statusRaw = String(getRowValue(row, ['الحالة', 'Status']) || 'scheduled').trim().toLowerCase();
    let status: 'scheduled' | 'completed' | 'cancelled' = 'scheduled';
    if (statusRaw.includes('مكتمل') || statusRaw.includes('منفذ') || statusRaw.includes('completed')) {
      status = 'completed';
    } else if (statusRaw.includes('ملغ') || statusRaw.includes('cancel')) {
      status = 'cancelled';
    }

    const notes = getRowValue(row, ['ملاحظات', 'Notes']);
    const code = getRowValue(row, ['كود الحصة', 'الكود', 'كود', 'Code', 'Session Code']);

    // Check if session exists on same day of week, time, and with same student/teacher
    const existing = db.sessions.find(
      (s) =>
        (code && s.code.toLowerCase() === String(code).trim().toLowerCase()) ||
        ((s.dayOfWeek === dayResolved.id || s.dayNameAr === dayResolved.nameAr || s.date === dayResolved.nameAr) &&
          s.startTime === startTime &&
          (s.studentNameAr === studentNameAr || s.teacherNameAr === teacherNameAr))
    );

    result.push({
      code: code ? String(code).trim() : undefined,
      dayOfWeek: dayResolved.id,
      dayNameAr: dayResolved.nameAr,
      dayNum: dayResolved.dayNum,
      date: dayResolved.nameAr,
      startTime,
      endTime,
      durationMinutes,
      studentNameAr,
      teacherNameAr,
      courseTitleAr,
      meetingUrl,
      status,
      notes: notes ? String(notes).trim() : 'حصة أسبوعية مجدولة عبر Excel',
      isExisting: !!existing,
      existingId: existing?.id,
    });
  }

  return result;
}

export function downloadSessionsTemplate() {
  const template = [
    {
      'كود الحصة': 'SES-5001',
      'يوم الحصة': 'السبت',
      'وقت البدء': '05:00 م',
      'المدة بالدقائق': 60,
      'اسم الطالب': 'أحمد محمد علي',
      'اسم المعلم': 'أ. أحمد السيد',
      'المادة الدراسية': 'الرياضيات',
      'رابط Microsoft Teams': 'https://teams.microsoft.com/l/meetup-join/zakirly-demo-1',
      'الحالة': 'مجدولة',
      'ملاحظات': 'حصة أسبوعية ثابتة بتوقيت 12 ساعة',
    },
    {
      'كود الحصة': 'SES-5002',
      'يوم الحصة': 'الإثنين',
      'وقت البدء': '06:30 م',
      'المدة بالدقائق': 60,
      'اسم الطالب': 'سارة خالد محمود',
      'اسم المعلم': 'أ. فاطمة الزهراء',
      'المادة الدراسية': 'اللغة الإنجليزية IGCSE',
      'رابط Microsoft Teams': 'https://teams.microsoft.com/l/meetup-join/zakirly-demo-2',
      'الحالة': 'مجدولة',
      'ملاحظات': 'حصة أسبوعية ثابتة بتوقيت 12 ساعة',
    },
    {
      'كود الحصة': 'SES-5003',
      'يوم الحصة': 'الأربعاء',
      'وقت البدء': '04:00 م',
      'المدة بالدقائق': 60,
      'اسم الطالب': 'يوسف إبراهيم',
      'اسم المعلم': 'م. هشام عبد المنعم',
      'المادة الدراسية': 'الرياضيات المتقدمة',
      'رابط Microsoft Teams': 'https://teams.microsoft.com/l/meetup-join/zakirly-demo-3',
      'الحالة': 'مجدولة',
      'ملاحظات': 'حصة أسبوعية ثابتة بتوقيت 12 ساعة',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_جدول_الحصص');
  XLSX.writeFile(workbook, 'نموذج_استيراد_جدول_الحصص_أكاديمية_ذاكرلي.xlsx');
}
