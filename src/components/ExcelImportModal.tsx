import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  RefreshCw,
  Info,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  readExcelFile,
  parseStudentsFromRows,
  parseTeachersFromRows,
  parseSessionsFromRows,
  downloadStudentsTemplate,
  downloadTeachersTemplate,
  downloadSessionsTemplate,
  ParsedStudentRow,
  ParsedTeacherRow,
  ParsedSessionRow,
} from '../utils/excelImporter';

export type ExcelImportType = 'students' | 'teachers' | 'sessions';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ExcelImportType;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  const { db, updateDatabaseState, activeTenantId } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);

  // Parsed data state
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentRow[]>([]);
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacherRow[]>([]);
  const [parsedSessions, setParsedSessions] = useState<ParsedSessionRow[]>([]);
  const [importSuccess, setImportSuccess] = useState<{
    total: number;
    created: number;
    updated: number;
  } | null>(null);

  if (!isOpen) return null;

  const getModuleInfo = () => {
    switch (type) {
      case 'students':
        return {
          title: 'استيراد شيت الطلاب (Excel)',
          description:
            'ارفع شيت بيانات الطلاب وسيتم إنشاء ملفات الطلاب وأولياء الأمور واشتراكات الحصص آلياً كأنك أدخلتها يدوياً.',
          color: 'blue',
          downloadTemplate: downloadStudentsTemplate,
        };
      case 'teachers':
        return {
          title: 'استيراد شيت المعلمين (Excel)',
          description:
            'ارفع شيت هيئة التدريس وسيتم تسجيل المعلمين وتعيين المواد وسعر الحصة وإنشاء حسابات الدخول بكلمات المرور تلقائياً.',
          color: 'emerald',
          downloadTemplate: downloadTeachersTemplate,
        };
      case 'sessions':
        return {
          title: 'استيراد شيت جدول الحصص (Excel)',
          description:
            'ارفع شيت مواعيد الحصص وسيتم إدراجها في الجدول الأسبوعي وفق أيام الأسبوع وربطها بالمعلمين والطلاب وروابط Teams فوراً.',
          color: 'indigo',
          downloadTemplate: downloadSessionsTemplate,
        };
    }
  };

  const info = getModuleInfo();

  const handleReset = () => {
    setFile(null);
    setParsedStudents([]);
    setParsedTeachers([]);
    setParsedSessions([]);
    setErrorMsg(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setErrorMsg(null);
    setImportSuccess(null);

    try {
      const rawRows = await readExcelFile(selectedFile);
      if (!rawRows || rawRows.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على صفوف صالحة.');
      }

      if (type === 'students') {
        const parsed = parseStudentsFromRows(rawRows, db.students);
        if (parsed.length === 0) {
          throw new Error('لم يتم العثور على أي بيانات طلاب مطابقة. يرجى التأكد من وجود عمود "اسم الطالب" أو استخدام النموذج المعتمد.');
        }
        setParsedStudents(parsed);
      } else if (type === 'teachers') {
        const parsed = parseTeachersFromRows(rawRows, db.teachers);
        if (parsed.length === 0) {
          throw new Error('لم يتم العثور على أي بيانات معلمين مطابقة. يرجى التأكد من وجود عمود "اسم المعلم" أو استخدام النموذج المعتمد.');
        }
        setParsedTeachers(parsed);
      } else if (type === 'sessions') {
        const parsed = parseSessionsFromRows(rawRows, db);
        if (parsed.length === 0) {
          throw new Error('لم يتم العثور على أي حصص مطابقة. يرجى التأكد من وجود أعمدة "اسم الطالب" أو "اسم المعلم" والتاريخ والوقت.');
        }
        setParsedSessions(parsed);
      }
    } catch (err: any) {
      console.error('Error importing Excel:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء قراءة ملف Excel');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Perform the actual import into Database State
  const handleConfirmImport = () => {
    setLoading(true);
    try {
      if (type === 'students') {
        let created = 0;
        let updated = 0;

        updateDatabaseState((draft) => {
          if (!draft.students) draft.students = [];
          if (!draft.parents) draft.parents = [];
          if (!draft.subscriptions) draft.subscriptions = [];

          for (const item of parsedStudents) {
            let targetStudent = item.isExisting && updateExisting && item.existingId
              ? draft.students.find((s) => s.id === item.existingId)
              : null;

            // Resolve teacher if matched by name
            const matchedTeacher = item.assignedTeacherNameAr
              ? (draft.teachers || []).find((t) =>
                  t.nameAr.toLowerCase().includes(item.assignedTeacherNameAr!.toLowerCase()) ||
                  item.assignedTeacherNameAr!.toLowerCase().includes(t.nameAr.toLowerCase())
                )
              : null;

            if (targetStudent) {
              // Update existing student
              targetStudent.grade = item.grade || targetStudent.grade;
              targetStudent.phone = item.phone || targetStudent.phone;
              targetStudent.parentNameAr = item.parentNameAr || targetStudent.parentNameAr;
              targetStudent.remainingSessions = item.remainingSessions;
              targetStudent.balance = item.balance;
              targetStudent.currency = item.currency || targetStudent.currency;
              targetStudent.status = item.status || targetStudent.status;
              if (matchedTeacher) {
                targetStudent.assignedTeacherId = matchedTeacher.id;
                targetStudent.assignedTeacherNameAr = matchedTeacher.nameAr;
              } else if (item.assignedTeacherNameAr) {
                targetStudent.assignedTeacherNameAr = item.assignedTeacherNameAr;
              }
              if (item.packageNameAr) {
                targetStudent.packageNameAr = item.packageNameAr;
              }
              if (item.notes) {
                targetStudent.notes = item.notes;
              }

              // Update subscription remaining sessions if exists
              const sub = draft.subscriptions.find((sb) => sb.studentId === targetStudent!.id || sb.id === targetStudent!.packageId);
              if (sub) {
                sub.remainingSessions = item.remainingSessions;
                if (item.packageNameAr) sub.courseTitleAr = item.packageNameAr;
              }

              updated++;
            } else {
              // Create new student
              const studentId = `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const parentPhone = item.parentPhone || item.phone || '+201000000000';
              const parentNameAr = item.parentNameAr || `ولي أمر ${item.nameAr}`;

              // Find or create parent
              let parent = draft.parents.find(
                (p) => (parentPhone !== '+201000000000' && p.phone === parentPhone) || p.nameAr === parentNameAr
              );

              if (!parent) {
                parent = {
                  id: `par-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  tenantId: activeTenantId,
                  code: `PAR-${Math.floor(2000 + Math.random() * 8000)}`,
                  nameAr: parentNameAr,
                  nameEn: parentNameAr,
                  phone: parentPhone,
                  whatsapp: parentPhone,
                  email: `parent.${Date.now()}.${Math.floor(Math.random() * 1000)}@zakirly.edu`,
                  relationship: 'والد / ولي أمر',
                  childrenIds: [studentId],
                  totalDue: 0,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                draft.parents.unshift(parent);
              } else if (!parent.childrenIds.includes(studentId)) {
                parent.childrenIds.push(studentId);
              }

              const newStudent = {
                id: studentId,
                tenantId: activeTenantId,
                code: item.code || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
                nameAr: item.nameAr,
                nameEn: item.nameEn || item.nameAr,
                gender: 'male' as const,
                email: `student.${Date.now()}.${Math.floor(Math.random() * 1000)}@zakirly.edu`,
                phone: item.phone,
                parentId: parent.id,
                parentNameAr: parent.nameAr,
                grade: item.grade,
                status: item.status,
                balance: item.balance,
                currency: item.currency,
                remainingSessions: item.remainingSessions,
                totalSessionsCompleted: 0,
                enrolledCourseIds: ['cs-101'],
                assignedTeacherId: matchedTeacher?.id,
                assignedTeacherNameAr: matchedTeacher?.nameAr || item.assignedTeacherNameAr,
                packageNameAr: item.packageNameAr || `${item.grade} - باقة الحصص الشاملة`,
                notes: item.notes || 'تم الاستيراد آلياً عبر شيت Excel',
                createdAt: new Date().toISOString().split('T')[0],
              };

              draft.students.unshift(newStudent);

              // Auto-create subscription package
              const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const newSub = {
                id: subId,
                tenantId: activeTenantId,
                studentId,
                studentNameAr: newStudent.nameAr,
                courseId: 'cs-101',
                courseTitleAr: item.packageNameAr || `${newStudent.grade} - باقة الحصص الشاملة`,
                totalSessions: item.remainingSessions,
                remainingSessions: item.remainingSessions,
                price: 3000,
                paidAmount: 3000,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
                status: 'active' as const,
                autoRenewal: true,
                notes: 'تم إنشاء الاشتراك آلياً عبر استيراد شيت الطلاب',
              };
              draft.subscriptions.unshift(newSub);
              (newStudent as any).packageId = subId;

              created++;
            }
          }
        });

        setImportSuccess({
          total: parsedStudents.length,
          created,
          updated,
        });
      } else if (type === 'teachers') {
        let created = 0;
        let updated = 0;

        updateDatabaseState((draft) => {
          if (!draft.teachers) draft.teachers = [];
          if (!draft.users) draft.users = [];

          for (const item of parsedTeachers) {
            let targetTeacher = item.isExisting && updateExisting && item.existingId
              ? draft.teachers.find((t) => t.id === item.existingId)
              : null;

            if (targetTeacher) {
              targetTeacher.email = item.email || targetTeacher.email;
              targetTeacher.phone = item.phone || targetTeacher.phone;
              targetTeacher.subjects = item.subjects.length > 0 ? item.subjects : targetTeacher.subjects;
              targetTeacher.perSessionRate = item.perSessionRate;
              targetTeacher.hourlyRate = item.perSessionRate;
              targetTeacher.status = item.status;
              if (item.bio) targetTeacher.bio = item.bio;

              // Update user password / email if present
              const usr = draft.users.find(
                (u) => u.linkedEntityId === targetTeacher!.id || u.email === targetTeacher!.email
              );
              if (usr) {
                usr.email = item.email;
                if (item.password) usr.password = item.password;
              }

              updated++;
            } else {
              const tchId = `tch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const newTeacher = {
                id: tchId,
                tenantId: activeTenantId,
                code: item.code || `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
                nameAr: item.nameAr,
                nameEn: item.nameAr,
                email: item.email,
                phone: item.phone,
                subjects: item.subjects,
                languages: ['العربية'],
                hourlyRate: item.perSessionRate,
                perSessionRate: item.perSessionRate,
                status: item.status,
                totalEarned: 0,
                completedSessionsCount: 0,
                rating: 5.0,
                bio: item.bio || '',
                joinedDate: new Date().toISOString().split('T')[0],
              };

              draft.teachers.unshift(newTeacher);

              // Create user account for login
              draft.users.unshift({
                id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                tenantId: activeTenantId,
                name: item.nameAr,
                nameAr: item.nameAr,
                email: item.email,
                password: item.password || '123456',
                role: 'teacher',
                linkedEntityId: tchId,
                status: 'active',
              });

              created++;
            }
          }
        });

        setImportSuccess({
          total: parsedTeachers.length,
          created,
          updated,
        });
      } else if (type === 'sessions') {
        let created = 0;
        let updated = 0;

        updateDatabaseState((draft) => {
          if (!draft.sessions) draft.sessions = [];

          for (const item of parsedSessions) {
            let targetSession = item.isExisting && updateExisting && item.existingId
              ? draft.sessions.find((s) => s.id === item.existingId)
              : null;

            // Match student and teacher IDs
            const student = (draft.students || []).find((s) =>
              s.nameAr.toLowerCase().includes(item.studentNameAr.toLowerCase()) ||
              item.studentNameAr.toLowerCase().includes(s.nameAr.toLowerCase())
            );

            const teacher = (draft.teachers || []).find((t) =>
              t.nameAr.toLowerCase().includes(item.teacherNameAr.toLowerCase()) ||
              item.teacherNameAr.toLowerCase().includes(t.nameAr.toLowerCase())
            );

            const course = (draft.courseSubjects || []).find((c) =>
              c.titleAr.toLowerCase().includes(item.courseTitleAr.toLowerCase()) ||
              item.courseTitleAr.toLowerCase().includes(c.titleAr.toLowerCase())
            );

            const studentId = student?.id || `stu-auto-${Date.now()}`;
            const studentNameAr = student?.nameAr || item.studentNameAr;
            const teacherId = teacher?.id || (draft.teachers[0]?.id || `tch-default`);
            const teacherNameAr = teacher?.nameAr || item.teacherNameAr;
            const courseId = course?.id || 'cs-101';
            const courseTitleAr = course?.titleAr || item.courseTitleAr;

            if (targetSession) {
              targetSession.date = item.date;
              targetSession.startTime = item.startTime;
              targetSession.endTime = item.endTime;
              targetSession.durationMinutes = item.durationMinutes;
              targetSession.studentId = studentId;
              targetSession.studentNameAr = studentNameAr;
              targetSession.teacherId = teacherId;
              targetSession.teacherNameAr = teacherNameAr;
              targetSession.courseId = courseId;
              targetSession.courseTitleAr = courseTitleAr;
              targetSession.subjectNameAr = courseTitleAr;
              targetSession.status = item.status;
              if (item.meetingUrl) targetSession.meetingUrl = item.meetingUrl;
              if (item.notes) targetSession.notes = item.notes;

              updated++;
            } else {
              const newSession = {
                id: `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                tenantId: activeTenantId,
                code: item.code || `SES-${Math.floor(1000 + Math.random() * 9000)}`,
                studentId,
                studentNameAr,
                teacherId,
                teacherNameAr,
                courseId,
                courseTitleAr,
                subjectNameAr: courseTitleAr,
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                durationMinutes: item.durationMinutes,
                status: item.status,
                meetingUrl:
                  item.meetingUrl ||
                  `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
                roomName: 'قاعة افتراضية',
                notes: item.notes || 'تم الاستيراد آلياً عبر شيت جدول الحصص',
                teacherPaid: false,
              };

              draft.sessions.unshift(newSession);
              created++;
            }
          }
        });

        setImportSuccess({
          total: parsedSessions.length,
          created,
          updated,
        });
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const currentCount =
    type === 'students'
      ? parsedStudents.length
      : type === 'teachers'
      ? parsedTeachers.length
      : parsedSessions.length;

  const existingCount =
    type === 'students'
      ? parsedStudents.filter((s) => s.isExisting).length
      : type === 'teachers'
      ? parsedTeachers.filter((t) => t.isExisting).length
      : parsedSessions.filter((s) => s.isExisting).length;

  const newCount = currentCount - existingCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-serif">
                  {info.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                  Excel (.xlsx, .csv)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {info.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Success Banner */}
          {importSuccess && (
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <h4 className="font-extrabold text-sm sm:text-base">
                  تم استيراد وحفظ البيانات بنجاح في النظام!
                </h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                تم معالجة <strong>{importSuccess.total}</strong> سجل بالكامل (إضافة{' '}
                <strong>{importSuccess.created}</strong> سجل جديد، وتحديث{' '}
                <strong>{importSuccess.updated}</strong> سجل موجود). البيانات الآن مسمعة فوراً في
                الجداول وقواعد البيانات والسيرفر كأنك أدخلتها يدوياً.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  إغلاق ومشاهدة البيانات المحدثة
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all"
                >
                  رفع شيت آخر
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 flex items-start gap-3 text-xs font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-1">تنبيه أثناء قراءة الملف:</span>
                {errorMsg}
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Actions & Template Download Area */}
          {!importSuccess && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    تحميل نموذج Excel فارغ جاهز (Template)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ملف منظم بالأعمدة المطلوبة وأمثلة توضيحية لملء البيانات
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:justify-end">
                <button
                  type="button"
                  onClick={info.downloadTemplate}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>تنزيل نموذج Excel الآن</span>
                </button>
              </div>
            </div>
          )}

          {/* File Upload Zone */}
          {!importSuccess && currentCount === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                  اضغط لاختيار ملف Excel أو اسحبه وأفلته هنا
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  يدعم ملفات صيغ <strong>.xlsx</strong> و <strong>.xls</strong> و <strong>.csv</strong>
                </p>
              </div>
              <span className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md group-hover:bg-blue-700 transition-all flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>اختيار ملف من جهازك</span>
              </span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {!importSuccess && currentCount > 0 && (
            <div className="space-y-4">
              
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800">
                      الملف المحدد: {file?.name}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      تم اكتشاف <strong>{currentCount}</strong> سجل في الشيت
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                    جديد: {newCount}
                  </span>
                  {existingCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800">
                      موجود مسبقاً: {existingCount}
                    </span>
                  )}
                  <button
                    onClick={handleReset}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    تغيير الملف
                  </button>
                </div>
              </div>

              {/* Duplicate Handling Checkbox */}
              {existingCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    id="updateExistingCheckbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="updateExistingCheckbox" className="cursor-pointer font-bold">
                    تحديث بيانات السجلات الموجودة مسبقاً في حال تطابق الاسم أو الكود (بدلاً من تجاهلها)
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                      {type === 'students' && (
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">اسم الطالب</th>
                          <th className="p-3">الصف الدراسي</th>
                          <th className="p-3">ولي الأمر</th>
                          <th className="p-3">الهاتف</th>
                          <th className="p-3">الحصص</th>
                          <th className="p-3">المعلم</th>
                          <th className="p-3">الحالة</th>
                        </tr>
                      )}
                      {type === 'teachers' && (
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">اسم المعلم</th>
                          <th className="p-3">البريد الإلكتروني</th>
                          <th className="p-3">كلمة المرور</th>
                          <th className="p-3">الهاتف</th>
                          <th className="p-3">التخصص / المواد</th>
                          <th className="p-3">أجر الحصة</th>
                          <th className="p-3">الحالة</th>
                        </tr>
                      )}
                      {type === 'sessions' && (
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">تاريخ الحصة</th>
                          <th className="p-3">الوقت</th>
                          <th className="p-3">المدة</th>
                          <th className="p-3">اسم الطالب</th>
                          <th className="p-3">اسم المعلم</th>
                          <th className="p-3">المادة الدراسية</th>
                          <th className="p-3">الحالة</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {type === 'students' &&
                        parsedStudents.map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{st.nameAr}</span>
                              {st.isExisting && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                  موجود
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">{st.grade}</td>
                            <td className="p-3 text-slate-600">{st.parentNameAr}</td>
                            <td className="p-3 text-slate-600 font-mono">{st.phone}</td>
                            <td className="p-3 font-bold text-blue-700">{st.remainingSessions}</td>
                            <td className="p-3 text-slate-600">{st.assignedTeacherNameAr || '—'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                      {type === 'teachers' &&
                        parsedTeachers.map((tch, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{tch.nameAr}</span>
                              {tch.isExisting && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                  موجود
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 font-mono">{tch.email}</td>
                            <td className="p-3 text-slate-600 font-mono">{tch.password}</td>
                            <td className="p-3 text-slate-600 font-mono">{tch.phone}</td>
                            <td className="p-3 text-slate-600">{tch.subjects.join('، ')}</td>
                            <td className="p-3 font-bold text-emerald-700">{tch.perSessionRate} ج.م</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {tch.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                      {type === 'sessions' &&
                        parsedSessions.map((ses, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{ses.date}</td>
                            <td className="p-3 font-mono text-blue-700 font-bold">{ses.startTime}</td>
                            <td className="p-3 text-slate-600">{ses.durationMinutes} دقيقة</td>
                            <td className="p-3 font-bold text-slate-800">{ses.studentNameAr}</td>
                            <td className="p-3 text-slate-700">{ses.teacherNameAr}</td>
                            <td className="p-3 text-slate-600">{ses.courseTitleAr}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {ses.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            {importSuccess ? 'إغلاق' : 'إلغاء'}
          </button>

          {!importSuccess && currentCount > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الاستيراد والتخزين...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد واستيراد {currentCount} سجل فوراً</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
