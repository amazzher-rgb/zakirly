import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  UserCheck,
  MoreHorizontal,
  X,
  CreditCard,
  Repeat,
  Edit2,
  Trash2,
  BookOpen,
  User,
  Check,
  Eye,
  LayoutGrid,
  List,
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExporter';
import { CompletedSessionsDetailsModal } from '../components/CompletedSessionsDetailsModal';
import { getStudentCompletedSessions } from '../utils/accountingUtils';
import { CURRENCIES, getCurrencySymbol } from '../utils/currencyUtils';

export const StudentsModule: React.FC = () => {
  const { db, lang, createStudent, updateDatabaseState, searchQuery, setSearchQuery, setActiveModule, activeTenantId, currencySymbol, activeCycle } = useApp();
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewingDetailsStudent, setViewingDetailsStudent] = useState<Student | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [grade, setGrade] = useState('الصف الأول الثانوي');
  const [phone, setPhone] = useState('');
  const [parentNameAr, setParentNameAr] = useState('');
  const [remainingSessions, setRemainingSessions] = useState(12);
  const [balance, setBalance] = useState(0);
  const [studentCurrency, setStudentCurrency] = useState('EGP');
  const [status, setStatus] = useState<'active' | 'inactive' | 'trial' | 'pending_renewal'>('active');

  // Teacher and Subject State
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [customTeacherName, setCustomTeacherName] = useState('');

  const filteredStudents = db.students.filter((s) => {
    const matchesQuery =
      s.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.assignedTeacherNameAr && s.assignedTeacherNameAr.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesQuery && matchesGrade && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setNameAr('');
    setGrade('الصف الأول الثانوي');
    setPhone('');
    setParentNameAr('');
    setRemainingSessions(12);
    setBalance(0);
    setStudentCurrency('SAR');
    setStatus('active');
    setSelectedTeacherIds(db.teachers.length > 0 ? [db.teachers[0].id] : []);
    setSelectedSubjectIds(db.courseSubjects.length > 0 ? [db.courseSubjects[0].id] : []);
    setCustomTeacherName('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setNameAr(student.nameAr);
    setGrade(student.grade);
    setPhone(student.phone);
    setParentNameAr(student.parentNameAr);
    setRemainingSessions(student.remainingSessions);
    setBalance(student.balance);
    setStudentCurrency((student as any).currency || 'SAR');
    setStatus(student.status);
    setSelectedTeacherIds(student.assignedTeacherId ? [student.assignedTeacherId] : []);
    setSelectedSubjectIds(student.enrolledCourseIds || []);
    setCustomTeacherName(student.assignedTeacherNameAr || '');
    setIsAddOpen(true);
  };

  const toggleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  };

  const toggleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    // Get selected teacher names
    const teacherNames = selectedTeacherIds
      .map((id) => db.teachers.find((t) => t.id === id)?.nameAr)
      .filter(Boolean);
    if (customTeacherName.trim() && !teacherNames.includes(customTeacherName.trim())) {
      teacherNames.push(customTeacherName.trim());
    }
    const assignedTeacherNameAr = teacherNames.join('، ') || 'غير محدد';
    const primaryTeacherId = selectedTeacherIds[0] || '';

    // Get subject titles
    const selectedSubjects = selectedSubjectIds
      .map((id) => db.courseSubjects.find((c) => c.id === id))
      .filter(Boolean);
    const subjectTitles = selectedSubjects.map((s) => s?.titleAr).filter(Boolean);
    const packageNameAr = subjectTitles.length > 0 ? subjectTitles.join(' + ') : `${grade} - باقة الحصص الشاملة`;

    const studentData = {
      tenantId: activeTenantId,
      nameAr: nameAr.trim(),
      grade,
      phone: phone.trim() || 'غير مدخل',
      parentNameAr: parentNameAr.trim() || 'ولي أمر الطالب',
      remainingSessions: Number(remainingSessions) || 12,
      balance: Number(balance) || 0,
      currency: studentCurrency,
      status,
      assignedTeacherId: primaryTeacherId,
      assignedTeacherNameAr,
      enrolledCourseIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : ['cs-101'],
      packageNameAr,
      enrolledTeachers: selectedTeacherIds.map((tId) => {
        const tObj = db.teachers.find((t) => t.id === tId);
        return {
          teacherId: tId,
          teacherNameAr: tObj?.nameAr || 'المعلم',
        };
      }),
    };

    if (editingStudent) {
      updateDatabaseState((draft) => {
        const idx = draft.students.findIndex((s) => s.id === editingStudent.id);
        if (idx !== -1) {
          draft.students[idx] = {
            ...draft.students[idx],
            ...studentData,
          };
        }
      });
      fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      }).catch(() => {});
    } else {
      await createStudent(studentData);
    }

    setIsAddOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.students.findIndex((s) => s.id === id);
      if (idx !== -1) {
        draft.students.splice(idx, 1);
      }
      draft.subscriptions = (draft.subscriptions || []).filter((sub) => sub.studentId !== id);
      draft.sessions = (draft.sessions || []).filter((ses) => ses.studentId !== id);
      draft.attendance = (draft.attendance || []).filter((att) => att.studentId !== id);
      draft.invoices = (draft.invoices || []).filter((inv) => inv.studentId !== id);
      if (Array.isArray(draft.parents)) {
        draft.parents.forEach((p) => {
          if (Array.isArray(p.childrenIds)) {
            p.childrenIds = p.childrenIds.filter((cid) => cid !== id);
          }
        });
      }
    });
    setDeletingStudentId(null);
    if (selectedStudent?.id === id) setSelectedStudent(null);
  };

  const handleExport = () => {
    const exportData = filteredStudents.map((s) => ({
      'كود الطالب': s.code,
      'اسم الطالب': s.nameAr,
      'الصف الدراسي': s.grade,
      'ولي الأمر': s.parentNameAr,
      'الهاتف': s.phone,
      'الحصص المتبقية': s.remainingSessions,
      'الحالة': s.status,
      'الرصيد المالي': s.balance,
    }));
    exportToExcel(exportData, 'قائمة_الطلاب_أكاديمية_ذاكر_لي', 'الطلاب');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'إدارة الطلاب وسجل الحصص' : 'Students Management'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة بيانات الطلاب، الحصص المتبقية، حالة التجديد، والرصيد المالي'
              : 'Directory of enrolled students, remaining package sessions, and status.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة طالب جديد' : 'Add Student'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'البحث باسم الطالب أو الكود أو ولي الأمر...' : 'Search student...'}
            className="w-full bg-slate-50 border border-slate-200 ps-9 pe-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="active">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="pending_renewal">{lang === 'ar' ? 'يتطلب التجديد' : 'Needs Renewal'}</option>
            <option value="trial">{lang === 'ar' ? 'تجريبي' : 'Trial'}</option>
            <option value="inactive">{lang === 'ar' ? 'متوقف' : 'Inactive'}</option>
          </select>

          {/* Mobile View Toggle: 2 Columns Side by Side vs 1 Column */}
          <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                mobileViewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض عمودان جنباً لجنب"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px]">عمودان</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                mobileViewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض قائمة رأسية"
            >
              <List className="w-4 h-4" />
              <span className="text-[10px]">قائمة</span>
            </button>
          </div>
        </div>

      </div>

      {/* Students Mobile Cards View */}
      <div className="md:hidden">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            {lang === 'ar' ? 'لا يوجد طلاب مطابقين للبحث' : 'No students found'}
          </div>
        ) : mobileViewMode === 'grid' ? (
          /* 2-Columns Grid View Side-by-Side on Mobile */
          <div className="grid grid-cols-2 gap-2.5">
            {filteredStudents.map((student) => {
              const isLowSessions = student.remainingSessions <= 2;
              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all text-start relative"
                >
                  <div className="space-y-2">
                    {/* Top: Avatar & Status Dot */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black flex items-center justify-center text-xs shrink-0">
                        {student.nameAr.charAt(0)}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-black truncate max-w-[80px] ${
                          student.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : student.status === 'pending_renewal'
                            ? 'bg-amber-100 text-amber-800'
                            : student.status === 'trial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {student.status === 'active'
                          ? 'نشط'
                          : student.status === 'pending_renewal'
                          ? 'تجديد'
                          : student.status === 'trial'
                          ? 'تجريبي'
                          : 'متوقف'}
                      </span>
                    </div>

                    {/* Student Name and Code */}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-1">
                        {student.nameAr}
                      </h4>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                        {student.code}
                      </div>
                    </div>

                    {/* Grade & Teacher */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1 text-[10px]">
                      <div className="text-slate-600 font-medium truncate">
                        🎓 {student.grade}
                      </div>
                      <div className="text-slate-800 font-bold truncate">
                        👨‍🏫 {student.assignedTeacherNameAr || 'غير محدد'}
                      </div>
                    </div>

                    {/* Sessions & Balance */}
                    <div className="flex items-center justify-between text-[10px] bg-blue-50/60 p-1.5 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-0.5 font-black text-slate-900">
                        {isLowSessions && <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
                        <span className={isLowSessions ? 'text-amber-700 font-black' : 'text-emerald-700 font-black'}>
                          {student.remainingSessions} ح
                        </span>
                      </div>
                      <div className={`font-black ${student.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {student.balance} {currencySymbol}
                      </div>
                    </div>
                  </div>

                  {/* Compact Quick Actions */}
                  <div className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => setViewingDetailsStudent(student)}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold flex-1 flex items-center justify-center gap-0.5"
                      title="سجل الحصص"
                    >
                      <Eye className="w-3 h-3" />
                      <span>الحصص</span>
                    </button>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold flex-1 flex items-center justify-center gap-0.5"
                      title="الملف"
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>الملف</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="تعديل"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 1-Column Detailed List View on Mobile */
          <div className="space-y-3">
            {filteredStudents.map((student) => {
              const isLowSessions = student.remainingSessions <= 2;
              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
                >
                  {/* Header: Name + Code + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm shrink-0">
                        {student.nameAr.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{student.nameAr}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.code} • {student.grade}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        student.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : student.status === 'pending_renewal'
                          ? 'bg-amber-100 text-amber-800'
                          : student.status === 'trial'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {student.status === 'active'
                        ? 'نشط'
                        : student.status === 'pending_renewal'
                        ? 'يتطلب التجديد'
                        : student.status === 'trial'
                        ? 'تجريبي'
                        : 'متوقف'}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {/* Teacher & Subject */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">المعلم والمادة:</span>
                      <div className="font-bold text-slate-800 text-xs truncate">
                        {student.assignedTeacherNameAr || 'غير محدد'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(student.enrolledCourseIds || []).map((cId) => {
                          const cs = db.courseSubjects.find((c) => c.id === cId);
                          return (
                            <span key={cId} className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold">
                              {cs ? cs.titleAr : cId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parent & Phone */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">ولي الأمر:</span>
                      <div className="font-bold text-slate-800 text-xs truncate">{student.parentNameAr}</div>
                      <a
                        href={`tel:${student.phone}`}
                        className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>{student.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Stats row: Sessions & Balance */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">الحصص المتبقية:</span>
                      <div className="flex items-center gap-1 font-black text-slate-900">
                        {isLowSessions && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        <span className={isLowSessions ? 'text-amber-700' : 'text-emerald-700'}>
                          {student.remainingSessions} حصة
                        </span>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="text-[10px] text-slate-500 font-bold block">الرصيد:</span>
                      <span className={`font-black text-xs ${student.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {student.balance} {currencySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setViewingDetailsStudent(student)}
                      className="flex-1 py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>الحصص</span>
                    </button>

                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>الملف</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeletingStudentId(student.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Students Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'كود الطالب والاسم' : 'Code & Name'}</th>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'الصف الدراسي' : 'Grade'}</th>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'المعلم والمادة' : 'Teacher & Subject'}</th>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'ولي الأمر والاتصال' : 'Parent & Contact'}</th>
                <th className="p-3.5 text-center">{lang === 'ar' ? 'الحصص المتبقية' : 'Remaining Sessions'}</th>
                <th className="p-3.5 text-center">{lang === 'ar' ? 'الرصيد المالي' : 'Balance'}</th>
                <th className="p-3.5 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="p-3.5 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {lang === 'ar' ? 'لا يوجد طلاب مطابقين للبحث' : 'No students found'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isLowSessions = student.remainingSessions <= 2;
                  return (
                    <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                            {student.nameAr.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{student.nameAr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{student.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700 font-bold">{student.grade}</td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[150px]">{student.assignedTeacherNameAr || 'غير محدد'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(student.enrolledCourseIds || []).map((cId) => {
                              const cs = db.courseSubjects.find((c) => c.id === cId);
                              return (
                                <span key={cId} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                                  {cs ? cs.titleAr : cId}
                                </span>
                              );
                            })}
                            {(!student.enrolledCourseIds || student.enrolledCourseIds.length === 0) && (
                              <span className="text-[10px] text-slate-400 font-medium">عام</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-900 font-bold">{student.parentNameAr}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student.phone}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                              isLowSessions
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {isLowSessions && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{student.remainingSessions} حصة متاحة</span>
                          </div>
                          <span className="text-[10px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            🔄 مرحّل تلقائياً للدورة الجديدة
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold">
                        <span
                          className={student.balance < 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}
                        >
                          {student.balance} {currencySymbol}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            student.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.status === 'pending_renewal'
                              ? 'bg-amber-100 text-amber-800'
                              : student.status === 'trial'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.status === 'active'
                            ? 'نشط'
                            : student.status === 'pending_renewal'
                            ? 'يتطلب التجديد'
                            : student.status === 'trial'
                            ? 'تجريبي'
                            : 'متوقف'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingDetailsStudent(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تفاصيل الحصص المنفذة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all"
                            title="عرض ملف الطالب"
                          >
                            الملف
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل البيانات"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStudentId(student.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  ملف الطالب: {selectedStudent.nameAr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[10px]">الكود الرقمي:</span>
                <div className="font-bold font-mono text-slate-900">{selectedStudent.code}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[10px]">الصف الدراسي:</span>
                <div className="font-bold text-slate-900">{selectedStudent.grade}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[10px]">ولي الأمر:</span>
                <div className="font-bold text-slate-900">{selectedStudent.parentNameAr}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 text-[10px]">الهاتف:</span>
                <div className="font-bold font-mono text-slate-900">{selectedStudent.phone}</div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl space-y-1 col-span-2">
                <span className="text-purple-700 text-[10px] font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  المعلم المسؤول:
                </span>
                <div className="font-extrabold text-purple-950 text-sm">
                  {selectedStudent.assignedTeacherNameAr || 'غير محدد'}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl space-y-1.5 col-span-2">
                <span className="text-blue-700 text-[10px] font-bold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  المواد المسجل بها:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedStudent.enrolledCourseIds || []).map((cId) => {
                    const cs = db.courseSubjects.find((c) => c.id === cId);
                    return (
                      <span key={cId} className="px-2.5 py-1 bg-white text-blue-800 border border-blue-200 rounded-lg text-xs font-bold shadow-sm">
                        {cs ? cs.titleAr : cId}
                      </span>
                    );
                  })}
                  {(!selectedStudent.enrolledCourseIds || selectedStudent.enrolledCourseIds.length === 0) && (
                    <span className="text-xs text-slate-500">لم يتم اختيار مواد</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl space-y-1">
                <span className="text-blue-600 text-[10px]">الحصص المتبقية:</span>
                <div className="font-black text-blue-900 text-base">{selectedStudent.remainingSessions} حصة</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl space-y-1">
                <span className="text-emerald-600 text-[10px]">الرصيد المالي:</span>
                <div className="font-black text-emerald-900 text-base">{selectedStudent.balance} {currencySymbol}</div>
              </div>

              <button
                onClick={() => setViewingDetailsStudent(selectedStudent)}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 col-span-2 mt-1"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>الاطلاع على تفاصيل الحصص المنفذة للطالب</span>
              </button>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  handleOpenEdit(s);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                تعديل البيانات
              </button>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setActiveModule('subscriptions');
                }}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700"
              >
                تجديد باقة الحصص
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleSaveStudent} className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingStudent ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد في الأكاديمية'}
              </h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب الرباعي (بالعربية)*</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: يوسف أحمد محمود علي"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصف الدراسي*</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  <optgroup label="المرحلة الابتدائية">
                    <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                    <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                    <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                    <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                    <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                    <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  </optgroup>
                  <optgroup label="المرحلة الإعدادية">
                    <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                    <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                    <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  </optgroup>
                  <optgroup label="المرحلة الثانوية">
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  </optgroup>
                </select>
              </div>

              {/* Teacher Selection */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-slate-800 font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    المعلم المسؤول
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">يمكن تحديد معلم واحد أو أكثر</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                  {db.teachers.map((t) => {
                    const isSelected = selectedTeacherIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTeacherSelect(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs text-start transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate">{t.nameAr}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="text"
                    value={customTeacherName}
                    onChange={(e) => setCustomTeacherName(e.target.value)}
                    placeholder="أو اكتب اسم المعلم يدوياً..."
                    className="w-full border border-slate-200 p-2 rounded-lg text-xs bg-white font-medium"
                  />
                </div>
              </div>

              {/* Subject Selection Dropdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-slate-800 font-extrabold flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    المادة / المواد المسجل بها الطالب
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">اختر المادة من القائمة المنسدلة</span>
                </label>

                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedSubjectIds.includes(val)) {
                      setSelectedSubjectIds([...selectedSubjectIds, val]);
                    }
                  }}
                  className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- اختر مادة لإضافتها للطالب من القائمة المنسدلة --</option>
                  {db.courseSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id} disabled={selectedSubjectIds.includes(sub.id)}>
                      {sub.titleAr} ({sub.code}) {selectedSubjectIds.includes(sub.id) ? '✓ تم الاختيار' : ''}
                    </option>
                  ))}
                </select>

                {/* Selected Subject Badges */}
                {selectedSubjectIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedSubjectIds.map((subId) => {
                      const sub = db.courseSubjects.find((s) => s.id === subId);
                      return (
                        <span
                          key={subId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-extrabold shadow-sm"
                        >
                          <span>{sub?.titleAr || subId}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subId))}
                            className="text-emerald-700 hover:text-rose-600 p-0.5 rounded-md hover:bg-emerald-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={parentNameAr}
                  onChange={(e) => setParentNameAr(e.target.value)}
                  placeholder="اسم ولي الأمر"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الهاتف (واتساب)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الحصص المتبقية</label>
                  <input
                    type="number"
                    value={remainingSessions}
                    onChange={(e) => setRemainingSessions(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرصيد المالي</label>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عملة سداد اشتراك الطالب*</label>
                <select
                  value={studentCurrency}
                  onChange={(e) => setStudentCurrency(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-slate-50 text-slate-800"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameAr} ({c.symbolAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">حالة الطالب</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="pending_renewal">يتطلب التجديد (Pending Renewal)</option>
                  <option value="trial">تجريبي (Trial)</option>
                  <option value="inactive">متوقف (Inactive)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md">
                حفظ البيانات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">
              تأكيد حذف الطالب
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              هل أنت متأكد من حذف الطالب وسجل حصصه؟ لن تتمكن من التراجع عن هذه العملية.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingStudentId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteStudent(deletingStudentId)}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing student executed sessions details */}
      {viewingDetailsStudent && (
        <CompletedSessionsDetailsModal
          isOpen={!!viewingDetailsStudent}
          onClose={() => setViewingDetailsStudent(null)}
          title={`تفاصيل الحصص المنفذة للطالب: ${viewingDetailsStudent.nameAr}`}
          subtitle={`كود الطالب: ${viewingDetailsStudent.code} | الصف: ${viewingDetailsStudent.grade} | المعلم المسؤول: ${viewingDetailsStudent.assignedTeacherNameAr || 'غير محدد'}`}
          sessions={getStudentCompletedSessions(
            viewingDetailsStudent,
            db.sessions || [],
            db.attendance || [],
            activeCycle,
            db.courseSubjects || [],
            db.teachers || []
          )}
          cycle={activeCycle}
        />
      )}

    </div>
  );
};
