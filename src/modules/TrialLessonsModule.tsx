import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrialLesson } from '../types';
import { Sparkles, CheckCircle2, ArrowLeftRight, UserCheck, Plus, X, Trash2, FileSpreadsheet, Search, Phone, Calendar, Clock, LayoutGrid, Table, Download, MessageSquare, BookOpen, Layers, GraduationCap } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol } from '../utils/currencyUtils';
import { GoogleSheetsModal } from '../components/GoogleSheetsModal';
import { exportToExcel } from '../utils/excelExporter';

export const TrialLessonsModule: React.FC = () => {
  const { db, lang, convertTrial, currencySymbol, updateDatabaseState, activeTenantId, setActiveTenantId, role } = useApp();
  const [selectedTrial, setSelectedTrial] = useState<TrialLesson | null>(null);
  const [numSessions, setNumSessions] = useState(16);
  const [pkgPrice, setPkgPrice] = useState(3200);
  const [paidAmt, setPaidAmt] = useState(3200);
  const [trialCurrency, setTrialCurrency] = useState('SAR');

  // Role department restrictions
  const isRoleCourses = role === 'director_courses' || role === 'supervisor_courses';
  const isRoleCurriculum = role === 'director_curriculum' || role === 'supervisor_curriculum';

  // Active Sheet / Department Tab: 'courses' (شيت الكورسات) | 'curriculum' (شيت المناهج) | 'all'
  const [activeTab, setActiveTab] = useState<'courses' | 'curriculum' | 'all'>(() => {
    if (isRoleCourses) return 'courses';
    if (isRoleCurriculum) return 'curriculum';
    return activeTenantId === 'tenant-zakirly-courses' ? 'courses' : 'curriculum';
  });

  // Sync activeTab whenever activeTenantId changes (e.g. from top header selector)
  useEffect(() => {
    if (isRoleCourses) {
      setActiveTab('courses');
    } else if (isRoleCurriculum) {
      setActiveTab('curriculum');
    } else if (activeTenantId === 'tenant-zakirly-courses') {
      setActiveTab('courses');
    } else if (activeTenantId === 'tenant-zakirly-curriculum') {
      setActiveTab('curriculum');
    }
  }, [activeTenantId, isRoleCourses, isRoleCurriculum]);

  // View state: 'table' (Sheet View) or 'cards' (Cards View)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'converted' | 'cancelled'>('all');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Helper to reliably check if a course/subject belongs to Courses department
  const isCourseEntity = (c: any): boolean => {
    if (!c) return false;
    if (c.tenantId === 'tenant-zakirly-courses') return true;
    if (c.tenantId === 'tenant-zakirly-curriculum') return false;
    if (c.category === 'language' || (c.code && (c.code.startsWith('CRS') || c.code.startsWith('FRN') || c.code.startsWith('GER')))) {
      return true;
    }
    const title = (c.titleAr || '').toLowerCase();
    if (title.includes('دبلومة') || title.includes('كورس') || title.includes('فرنسية') || title.includes('ألمانية') || title.includes('delf') || title.includes('goethe') || title.includes('برمجة') || title.includes('مهارات')) {
      return true;
    }
    return false;
  };

  // Helper to reliably detect whether a trial lesson is for Courses or Curriculum
  const isCourseTrial = (trial: TrialLesson): boolean => {
    if (!trial) return false;
    if (trial.tenantId === 'tenant-zakirly-courses') return true;
    if (trial.tenantId === 'tenant-zakirly-curriculum') return false;

    // Check linked course subject
    const course = (db.courseSubjects || []).find((c) => c.id === trial.courseId);
    if (course) {
      return isCourseEntity(course);
    }

    // Check course title keywords
    const title = (trial.courseTitleAr || '').toLowerCase();
    if (title.includes('دبلومة') || title.includes('كورس') || title.includes('فرنسية') || title.includes('ألمانية') || title.includes('delf') || title.includes('goethe') || title.includes('برمجة') || title.includes('مهارات')) {
      return true;
    }
    return false;
  };

  // Add trial modal state
  const [isAddTrialOpen, setIsAddTrialOpen] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState<'courses' | 'curriculum'>('courses');
  const [studentNameAr, setStudentNameAr] = useState('');
  const [parentNameAr, setParentNameAr] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [deletingTrialId, setDeletingTrialId] = useState<string | null>(null);

  // Available courses and teachers filtered strictly by targetDepartment
  const availableCoursesForAdd = useMemo(() => {
    return (db.courseSubjects || []).filter((c) => {
      if (targetDepartment === 'courses') {
        return isCourseEntity(c);
      } else {
        return !isCourseEntity(c);
      }
    });
  }, [db.courseSubjects, targetDepartment]);

  const availableTeachersForAdd = useMemo(() => {
    const targetTenant = targetDepartment === 'courses' ? 'tenant-zakirly-courses' : 'tenant-zakirly-curriculum';
    const deptTeachers = (db.teachers || []).filter((t) => {
      if (t.tenantId === targetTenant) return true;
      if (targetDepartment === 'courses') {
        const teachesCourses = (t.subjects || []).some((s) =>
          s.includes('فرنسية') || s.includes('ألمانية') || s.includes('كورس') || s.includes('دبلومة') || s.includes('DELF') || s.includes('Goethe')
        );
        return teachesCourses;
      } else {
        const teachesCurriculum = (t.subjects || []).some((s) =>
          s.includes('القرآن') || s.includes('العربية') || s.includes('الرياضيات') || s.includes('IGCSE') || s.includes('ثانوية')
        );
        return teachesCurriculum;
      }
    });
    return deptTeachers.length > 0 ? deptTeachers : db.teachers;
  }, [db.teachers, targetDepartment]);

  // When opening modal or changing target department, select valid first items
  const handleOpenAddModal = (dept?: 'courses' | 'curriculum') => {
    const chosenDept = dept || (activeTab === 'courses' ? 'courses' : 'curriculum');
    setTargetDepartment(chosenDept);
    setStudentNameAr('');
    setParentNameAr('');
    setParentPhone('');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setScheduledTime('18:00');

    // Pre-select first matching course
    const validCourses = (db.courseSubjects || []).filter((c) =>
      chosenDept === 'courses' ? isCourseEntity(c) : !isCourseEntity(c)
    );
    if (validCourses.length > 0) {
      setCourseId(validCourses[0].id);
    } else if (db.courseSubjects.length > 0) {
      setCourseId(db.courseSubjects[0].id);
    }

    // Pre-select first matching teacher
    const targetTenant = chosenDept === 'courses' ? 'tenant-zakirly-courses' : 'tenant-zakirly-curriculum';
    const validTeachers = (db.teachers || []).filter((t) => t.tenantId === targetTenant);
    if (validTeachers.length > 0) {
      setTeacherId(validTeachers[0].id);
    } else if (db.teachers.length > 0) {
      setTeacherId(db.teachers[0].id);
    }

    setIsAddTrialOpen(true);
  };

  // Keep courseId and teacherId updated when targetDepartment changes inside modal
  useEffect(() => {
    if (isAddTrialOpen) {
      if (availableCoursesForAdd.length > 0 && !availableCoursesForAdd.some((c) => c.id === courseId)) {
        setCourseId(availableCoursesForAdd[0].id);
      }
      if (availableTeachersForAdd.length > 0 && !availableTeachersForAdd.some((t) => t.id === teacherId)) {
        setTeacherId(availableTeachersForAdd[0].id);
      }
    }
  }, [targetDepartment, isAddTrialOpen, availableCoursesForAdd, availableTeachersForAdd]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrial) return;
    await convertTrial(selectedTrial.id, selectedTrial.courseId, numSessions, pkgPrice, paidAmt, trialCurrency);
    setSelectedTrial(null);
  };

  const handleCreateTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameAr.trim() || !parentPhone.trim()) return;

    const course = db.courseSubjects.find((c) => c.id === courseId) || availableCoursesForAdd[0];
    const teacher = db.teachers.find((t) => t.id === teacherId) || availableTeachersForAdd[0];

    const targetTenantId = targetDepartment === 'courses' ? 'tenant-zakirly-courses' : 'tenant-zakirly-curriculum';

    const newTrial: TrialLesson = {
      id: `tr-${targetDepartment === 'courses' ? 'crs' : 'acad'}-${Date.now().toString().slice(-6)}`,
      tenantId: targetTenantId,
      studentNameAr: studentNameAr.trim(),
      parentNameAr: parentNameAr.trim() || `ولي أمر ${studentNameAr.trim()}`,
      parentPhone: parentPhone.trim(),
      courseId: course?.id || courseId,
      courseTitleAr: course?.titleAr || (targetDepartment === 'courses' ? 'كورس لغات وتدريب' : 'منهج أكاديمي'),
      assignedTeacherId: teacher?.id || teacherId,
      assignedTeacherNameAr: teacher?.nameAr || 'المعلم المعتمد',
      scheduledDate,
      scheduledTime,
      status: 'scheduled',
      createdAt: new Date().toISOString().split('T')[0],
    };

    updateDatabaseState((draft) => {
      if (!draft.trialLessons) draft.trialLessons = [];
      draft.trialLessons.unshift(newTrial);
    });

    // Automatically switch active tab & active tenant to match where the trial was added
    setActiveTab(targetDepartment);
    if (!isRoleCourses && !isRoleCurriculum) {
      setActiveTenantId(targetTenantId);
    }

    setIsAddTrialOpen(false);
    setStudentNameAr('');
    setParentNameAr('');
    setParentPhone('');
  };

  const handleDeleteTrial = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = (draft.trialLessons || []).findIndex((t) => t.id === id);
      if (idx !== -1) {
        draft.trialLessons.splice(idx, 1);
      }
    });
    setDeletingTrialId(null);
  };

  // Base list of trials strictly separated by activeTab
  const departmentTrials = useMemo(() => {
    return (db.trialLessons || []).filter((trial) => {
      if (activeTab === 'courses') {
        return isCourseTrial(trial);
      }
      if (activeTab === 'curriculum') {
        return !isCourseTrial(trial);
      }
      return true; // 'all'
    });
  }, [db.trialLessons, activeTab]);

  // Filtered trial lessons for display (Search + Status Filter)
  const filteredTrials = useMemo(() => {
    return departmentTrials.filter((trial) => {
      const matchesSearch =
        trial.studentNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.parentNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.parentPhone?.includes(searchTerm) ||
        trial.assignedTeacherNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.courseTitleAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || trial.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departmentTrials, searchTerm, statusFilter]);

  // Overall department count stats for the tabs
  const coursesTrialsCount = useMemo(() => {
    return (db.trialLessons || []).filter(isCourseTrial).length;
  }, [db.trialLessons]);

  const curriculumTrialsCount = useMemo(() => {
    return (db.trialLessons || []).filter((t) => !isCourseTrial(t)).length;
  }, [db.trialLessons]);

  // KPIs for the currently viewed department sheet
  const totalTrials = departmentTrials.length;
  const scheduledCount = departmentTrials.filter((t) => t.status === 'scheduled').length;
  const convertedCount = departmentTrials.filter((t) => t.status === 'converted').length;
  const conversionRate = totalTrials > 0 ? Math.round((convertedCount / totalTrials) * 100) : 0;

  const exportDirectExcel = () => {
    const sheetTitle =
      activeTab === 'courses'
        ? 'شيت_الحصص_التجريبية_قسم_الكورسات'
        : activeTab === 'curriculum'
        ? 'شيت_الحصص_التجريبية_قسم_المناهج'
        : 'شيت_الحصص_التجريبية_الشامل';

    const data = departmentTrials.map((t) => ({
      'كود الطلب': t.id,
      'القسم الأكاديمي': isCourseTrial(t) ? 'قسم الكورسات والتدريب' : 'قسم المناهج الدراسية',
      'اسم الطالب': t.studentNameAr,
      'اسم ولي الأمر': t.parentNameAr,
      'هاتف ولي الأمر': t.parentPhone,
      'المادة / الكورس': t.courseTitleAr,
      'المعلم المعين': t.assignedTeacherNameAr,
      'تاريخ الحصة': t.scheduledDate,
      'الموعد': t.scheduledTime,
      'الحالة':
        t.status === 'converted'
          ? 'تم التحويل لطالب مدفوع'
          : t.status === 'completed'
          ? 'مكتملة'
          : t.status === 'cancelled'
          ? 'ملغاة'
          : 'مجدولة',
      'تاريخ الطلب': t.createdAt || t.scheduledDate,
    }));

    exportToExcel(data, sheetTitle);
  };

  const handleTabSwitch = (tab: 'courses' | 'curriculum' | 'all') => {
    setActiveTab(tab);
    if (tab === 'courses' && !isRoleCurriculum) {
      setActiveTenantId('tenant-zakirly-courses');
    } else if (tab === 'curriculum' && !isRoleCourses) {
      setActiveTenantId('tenant-zakirly-curriculum');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Department / Sheet Switcher Tabs */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
          
          {/* Tab: Courses Sheet */}
          {(!isRoleCurriculum) && (
            <button
              onClick={() => handleTabSwitch('courses')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>شيت قسم الكورسات التدريبية</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'courses' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {coursesTrialsCount}
              </span>
            </button>
          )}

          {/* Tab: Curriculum Sheet */}
          {(!isRoleCourses) && (
            <button
              onClick={() => handleTabSwitch('curriculum')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'curriculum'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-300" />
              <span>شيت قسم المناهج الدراسية</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'curriculum' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {curriculumTrialsCount}
              </span>
            </button>
          )}

          {/* Tab: All Departments (Visible for super_admin & supervisors) */}
          {(!isRoleCourses && !isRoleCurriculum) && (
            <button
              onClick={() => handleTabSwitch('all')}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>عرض مجمع (الكل)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 self-end sm:self-center">
          <span className="text-[11px] font-bold text-slate-500">
            {activeTab === 'courses' ? '🚀 قسم الكورسات نشط' : activeTab === 'curriculum' ? '🎓 قسم المناهج نشط' : '🌐 شيت شامل'}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        activeTab === 'courses'
          ? 'bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 border-emerald-200'
          : activeTab === 'curriculum'
          ? 'bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/40 border-blue-200'
          : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
              activeTab === 'courses'
                ? 'bg-emerald-600 text-white'
                : activeTab === 'curriculum'
                ? 'bg-blue-600 text-white'
                : 'bg-purple-600 text-white'
            }`}>
              {activeTab === 'courses' ? (
                <Sparkles className="w-5 h-5" />
              ) : activeTab === 'curriculum' ? (
                <GraduationCap className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 font-serif">
                  {activeTab === 'courses'
                    ? 'شيت الحصص التجريبية - قسم الكورسات التدريبية'
                    : activeTab === 'curriculum'
                    ? 'شيت الحصص التجريبية - قسم المناهج الدراسية'
                    : 'شيت الحصص التجريبية الشامل (جميع الأقسام)'}
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  activeTab === 'courses'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : activeTab === 'curriculum'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-purple-100 text-purple-800 border-purple-300'
                }`}>
                  {activeTab === 'courses' ? 'شيت منفصل للكورسات' : activeTab === 'curriculum' ? 'شيت منفصل للمناهج' : 'شيت موحد'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {activeTab === 'courses'
                  ? 'متابعة وجدولة الحصص التجريبية الخاصة بقسم الكورسات والدورات وورش العمل فقط وتصديرها وتحويلها لاشتراكات.'
                  : activeTab === 'curriculum'
                  ? 'متابعة وجدولة الحصص التجريبية الخاصة بقسم المناهج الأكاديمية والمواد المدرسية وتصديرها وتحويلها لاشتراكات.'
                  : 'متابعة جميع الحصص التجريبية بالأكاديمية عبر كافة الفروع والأقسام.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setIsSheetsModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            title="تصدير ومزامنة مع Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={exportDirectExcel}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="تنزيل شيت تجريبي بصيغة Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تنزيل Excel ({activeTab === 'courses' ? 'الكورسات' : activeTab === 'curriculum' ? 'المناهج' : 'الكل'})</span>
          </button>

          <button
            onClick={() => handleOpenAddModal(activeTab === 'courses' ? 'courses' : 'curriculum')}
            className={`px-4 py-2.5 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 ${
              activeTab === 'courses'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'courses' ? 'حجز حصة تجريبية في الكورسات' : 'حجز حصة تجريبية في المناهج'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold block">
              {activeTab === 'courses' ? 'طلبات الكورسات التجريبية' : activeTab === 'curriculum' ? 'طلبات المناهج التجريبية' : 'إجمالي الحصص التجريبية'}
            </span>
            <span className="text-xl font-black text-slate-900">{totalTrials}</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
            activeTab === 'courses' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-amber-700 text-[11px] font-bold block">حافلة ومجدولة</span>
            <span className="text-xl font-black text-amber-900">{scheduledCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-emerald-700 text-[11px] font-bold block">تحوّلوا باقة مدفوعة</span>
            <span className="text-xl font-black text-emerald-900">{convertedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-indigo-700 text-[11px] font-bold block">نسبة نجاح التحويل</span>
            <span className="text-xl font-black text-indigo-900">{conversionRate}%</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'courses' ? 'ابحث في شيت الكورسات (طالب، ولي أمر، كورس، معلم)...' : 'ابحث في شيت المناهج (طالب، ولي أمر، مادة، معلم)...'}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="scheduled">المجدولة فقط</option>
            <option value="converted">المحولة لطالب مشترك</option>
            <option value="cancelled">الملغاة</option>
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>عرض الشيت (جدول)</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>عرض البطاقات</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: Table (شيت الحصص التجريبية الإشرافي) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'courses' ? 'text-emerald-600' : 'text-blue-600'}`} />
              <h3 className="font-extrabold text-slate-900 text-sm">
                {activeTab === 'courses' ? 'شيت الحصص التجريبية المباشر - قسم الكورسات' : activeTab === 'curriculum' ? 'شيت الحصص التجريبية المباشر - قسم المناهج' : 'شيت الحصص التجريبية الموحد'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500">
                عدد الحصص بالشيت: ({filteredTrials.length})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
                  <th className="p-3 text-center">#</th>
                  {activeTab === 'all' && <th className="p-3 text-start">القسم</th>}
                  <th className="p-3 text-start">اسم الطالب</th>
                  <th className="p-3 text-start">ولي الأمر والواتساب</th>
                  <th className="p-3 text-start">{activeTab === 'courses' ? 'الكورس التدريبي' : 'المادة الأكاديمية'}</th>
                  <th className="p-3 text-start">المعلم المخصص</th>
                  <th className="p-3 text-center">تاريخ وموعد الحصة</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات والإشراف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTrials.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'all' ? 9 : 8} className="p-12 text-center text-slate-400 font-bold">
                      <div className="max-w-sm mx-auto space-y-2">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-slate-600 font-bold">
                          {activeTab === 'courses'
                            ? 'لا توجد حصص تجريبية مسجلة حالياً في قسم الكورسات.'
                            : 'لا توجد حصص تجريبية مسجلة حالياً في قسم المناهج.'}
                        </p>
                        <button
                          onClick={() => handleOpenAddModal(activeTab === 'courses' ? 'courses' : 'curriculum')}
                          className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-sm mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة حصة تجريبية الآن</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrials.map((trial, index) => {
                    const isCourse = isCourseTrial(trial);
                    return (
                      <tr key={trial.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400 text-[11px]">
                          {index + 1}
                        </td>

                        {activeTab === 'all' && (
                          <td className="p-3 text-start">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              isCourse
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {isCourse ? 'كورس' : 'منهج'}
                            </span>
                          </td>
                        )}

                        <td className="p-3 text-start font-black text-slate-900">
                          {trial.studentNameAr}
                          <div className="text-[10px] text-slate-400 font-mono font-normal">{trial.id}</div>
                        </td>

                        <td className="p-3 text-start">
                          <div className="font-bold text-slate-800">{trial.parentNameAr}</div>
                          <a
                            href={`https://wa.me/${trial.parentPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>{trial.parentPhone}</span>
                          </a>
                        </td>

                        <td className="p-3 text-start">
                          <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border inline-block ${
                            isCourse
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {trial.courseTitleAr}
                          </span>
                        </td>

                        <td className="p-3 text-start font-bold text-slate-800">
                          {trial.assignedTeacherNameAr}
                        </td>

                        <td className="p-3 text-center font-mono text-[11px] text-slate-700">
                          <div className="font-bold">{trial.scheduledDate}</div>
                          <div className="text-slate-500 text-[10px]">{trial.scheduledTime}</div>
                        </td>

                        <td className="p-3 text-center">
                          {trial.status === 'converted' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-extrabold border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>مُحوّل باقة مدفوعة</span>
                            </span>
                          ) : trial.status === 'cancelled' ? (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold border border-rose-300">
                              ملغاة
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold border border-amber-300 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>حصة مجدولة</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {trial.status === 'scheduled' && (
                              <button
                                onClick={() => setSelectedTrial(trial)}
                                className={`px-2.5 py-1 text-white rounded-lg text-[11px] font-extrabold shadow-sm transition-all inline-flex items-center gap-1 ${
                                  isCourse ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                title="تحويل الطالب إلى اشتراك باقة مدفوعة"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>تحويل باقة</span>
                              </button>
                            )}

                            <button
                              onClick={() => setDeletingTrialId(trial.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="حذف الطلب التجريبي"
                            >
                              <Trash2 className="w-4 h-4" />
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
      ) : (
        /* VIEW MODE 2: Cards View */
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filteredTrials.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 font-bold">
              لا توجد حصص تجريبية تطابق معايير البحث.
            </div>
          ) : (
            filteredTrials.map((trial) => {
              const isCourse = isCourseTrial(trial);
              return (
                <div
                  key={trial.id}
                  className={`bg-white p-3 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all text-start relative ${
                    isCourse ? 'hover:border-emerald-300' : 'hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{trial.studentNameAr}</h3>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            isCourse ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isCourse ? 'كورس' : 'منهج'}
                          </span>
                        </div>
                        <div className={`text-[10px] sm:text-xs font-bold truncate mt-0.5 ${
                          isCourse ? 'text-emerald-700' : 'text-blue-700'
                        }`}>
                          {trial.courseTitleAr}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <span
                          className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                            trial.status === 'converted'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {trial.status === 'converted' ? 'مُحوّل' : 'مجدولة'}
                        </span>

                        <button
                          onClick={() => setDeletingTrialId(trial.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="حذف الطلب التجريبي"
                        >
                          <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px] sm:text-xs text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                      <div className="truncate">ولي الأمر: <strong className="text-slate-800">{trial.parentNameAr}</strong></div>
                      <div className="truncate">الهاتف: <strong className="font-mono text-emerald-800">{trial.parentPhone}</strong></div>
                      <div className="truncate">المعلم: <strong className="text-slate-800">{trial.assignedTeacherNameAr}</strong></div>
                      <div className="truncate font-mono text-slate-900 font-bold">{trial.scheduledDate} ({trial.scheduledTime})</div>
                    </div>
                  </div>

                  {trial.status === 'scheduled' && (
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedTrial(trial)}
                        className={`w-full py-1.5 sm:py-2 px-2 text-white rounded-xl text-[10px] sm:text-xs font-bold shadow-sm flex items-center justify-center gap-1 ${
                          isCourse ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">تحويل لاشتراك</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsModal isOpen={isSheetsModalOpen} onClose={() => setIsSheetsModalOpen(false)} />

      {/* Convert Trial Wizard Modal */}
      {selectedTrial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConvert} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">تحويل الحصة التجريبية إلى اشتراك رسمي</h3>
              <button type="button" onClick={() => setSelectedTrial(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs space-y-1">
              <div className="font-bold text-purple-900">الطالب: {selectedTrial.studentNameAr}</div>
              <div className="text-purple-700">الكورس/المادة: {selectedTrial.courseTitleAr} | المعلم: {selectedTrial.assignedTeacherNameAr}</div>
              <div className="text-[11px] text-purple-800 font-semibold">
                القسم التابع له: {isCourseTrial(selectedTrial) ? 'قسم الكورسات والدورات' : 'قسم المناهج الدراسية'}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الحصص بالباقة</label>
                  <input
                    type="number"
                    min={1}
                    value={numSessions}
                    onChange={(e) => setNumSessions(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">العملة</label>
                  <select
                    value={trialCurrency}
                    onChange={(e) => setTrialCurrency(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.nameAr} ({c.symbolAr})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">إجمالي سعر الباقة</label>
                  <input
                    type="number"
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المبلغ المحصل الآن</label>
                  <input
                    type="number"
                    value={paidAmt}
                    onChange={(e) => setPaidAmt(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setSelectedTrial(null)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md">تأكيد التحويل الآن</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Trial Modal */}
      {isAddTrialOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTrial} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">حجز حصة تجريبية جديدة</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تحديد القسم والكورس والمعلم لتسميع الحصة في الشيت المخصص مباشرة
                </p>
              </div>
              <button type="button" onClick={() => setIsAddTrialOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {/* Department Selector */}
              <div>
                <label className="block text-slate-800 font-extrabold mb-1.5">
                  القسم التابع له الحصة (تحديد الشيت المستهدف)*
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isRoleCurriculum}
                    onClick={() => setTargetDepartment('courses')}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      targetDepartment === 'courses'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    } ${isRoleCurriculum ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>قسم الكورسات التدريبية</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRoleCourses}
                    onClick={() => setTargetDepartment('curriculum')}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      targetDepartment === 'curriculum'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    } ${isRoleCourses ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>قسم المناهج الدراسية</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {targetDepartment === 'courses'
                    ? 'سيتم حفظ الحصة في شيت الكورسات فقط، ولن تظهر في شيت المناهج.'
                    : 'سيتم حفظ الحصة في شيت المناهج فقط، ولن تظهر في شيت الكورسات.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب المستهدف*</label>
                <input
                  type="text"
                  required
                  value={studentNameAr}
                  onChange={(e) => setStudentNameAr(e.target.value)}
                  placeholder="مثال: عمر طارق"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={parentNameAr}
                  onChange={(e) => setParentNameAr(e.target.value)}
                  placeholder="مثال: أ. طارق عبد المجيد (اختياري)"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">هاتف ولي الأمر (واتساب)*</label>
                <input
                  type="text"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="01012345678 أو +201000000000"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {targetDepartment === 'courses' ? 'الكورس التدريبي*' : 'المادة الأكاديمية*'}
                  </label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white"
                  >
                    {availableCoursesForAdd.map((c) => (
                      <option key={c.id} value={c.id}>{c.titleAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المعلم المخصص*</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white"
                  >
                    {availableTeachersForAdd.map((t) => (
                      <option key={t.id} value={t.id}>{t.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الحصة</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الوقت</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddTrialOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
              <button
                type="submit"
                className={`px-5 py-2 text-white rounded-xl shadow-md ${
                  targetDepartment === 'courses' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                حفظ الحصة في شيت {targetDepartment === 'courses' ? 'الكورسات' : 'المناهج'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingTrialId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد الحذف</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف الحصة التجريبية نهائياً من الشيت؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingTrialId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDeleteTrial(deletingTrialId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
