import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CourseSubject, TrialLesson } from '../types';
import { BookOpen, Plus, Edit2, Trash2, Clock, DollarSign, X, Layers, Search, LayoutGrid, List, Sparkles, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Time12HPicker } from '../components/Time12HPicker';

export const CoursesModule: React.FC = () => {
  const { db, lang, searchQuery, currencySymbol, activeTenantId, setActiveTenantId, setActiveModule, updateDatabaseState } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseSubject | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');

  // Quick Trial Booking State
  const [isQuickTrialOpen, setIsQuickTrialOpen] = useState(false);
  const [trialCourse, setTrialCourse] = useState<CourseSubject | null>(null);
  const [trialStudentName, setTrialStudentName] = useState('');
  const [trialParentName, setTrialParentName] = useState('');
  const [trialParentPhone, setTrialParentPhone] = useState('');
  const [trialTeacherId, setTrialTeacherId] = useState('');
  const [trialDate, setTrialDate] = useState(new Date().toISOString().split('T')[0]);
  const [trialTime, setTrialTime] = useState('18:00');
  const [trialSuccessMsg, setTrialSuccessMsg] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [level, setLevel] = useState('المرحلة الثانوية');
  const [pricePerSession, setPricePerSession] = useState(220);
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(60);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [descriptionAr, setDescriptionAr] = useState('');

  const isCoursesDepartment = activeTenantId === 'tenant-zakirly-courses';

  const handleOpenQuickTrial = (course: CourseSubject) => {
    setTrialCourse(course);
    setTrialStudentName('');
    setTrialParentName('');
    setTrialParentPhone('');
    setTrialDate(new Date().toISOString().split('T')[0]);
    setTrialTime('18:00');
    setTrialSuccessMsg(null);

    // Pick first matching teacher of courses
    const courseTeachers = db.teachers.filter((t) => t.tenantId === 'tenant-zakirly-courses');
    if (courseTeachers.length > 0) {
      setTrialTeacherId(courseTeachers[0].id);
    } else if (db.teachers.length > 0) {
      setTrialTeacherId(db.teachers[0].id);
    }

    setIsQuickTrialOpen(true);
  };

  const handleSaveQuickTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialCourse || !trialStudentName.trim() || !trialParentPhone.trim()) return;

    const teacher = db.teachers.find((t) => t.id === trialTeacherId) || db.teachers[0];

    const newTrial: TrialLesson = {
      id: `tr-crs-${Date.now().toString().slice(-6)}`,
      tenantId: 'tenant-zakirly-courses',
      studentNameAr: trialStudentName.trim(),
      parentNameAr: trialParentName.trim() || `ولي أمر ${trialStudentName.trim()}`,
      parentPhone: trialParentPhone.trim(),
      courseId: trialCourse.id,
      courseTitleAr: trialCourse.titleAr,
      assignedTeacherId: teacher?.id || trialTeacherId,
      assignedTeacherNameAr: teacher?.nameAr || 'المعلم المعتمد',
      scheduledDate: trialDate,
      scheduledTime: trialTime,
      status: 'scheduled',
      createdAt: new Date().toISOString().split('T')[0],
    };

    updateDatabaseState((draft) => {
      if (!draft.trialLessons) draft.trialLessons = [];
      draft.trialLessons.unshift(newTrial);
    });

    setTrialSuccessMsg(`تمت إضافة الحصة التجريبية بنجاح إلى شيت الكورسات للطالب (${trialStudentName})!`);
  };

  // Dynamic courses based on active department
  const displayedCourses = db.courseSubjects.filter((c) => {
    const matchesQuery =
      c.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());

    if (isCoursesDepartment) {
      return matchesQuery;
    }

    const isAcademic =
      c.category === 'academic' ||
      c.category === 'curriculum' ||
      !c.category ||
      c.code.startsWith('ACAD') ||
      c.code.startsWith('MTH') ||
      c.code.startsWith('CS') ||
      c.code.startsWith('PHY');
    return isAcademic && matchesQuery;
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setCode(isCoursesDepartment ? `CRS-${Math.floor(100 + Math.random() * 900)}` : `ACAD-${Math.floor(100 + Math.random() * 900)}`);
    setTitleAr('');
    setTitleEn('');
    setLevel(isCoursesDepartment ? 'دبلومة حرة / ورشة عمل' : 'المرحلة الثانوية');
    setPricePerSession(250);
    setSuggestedDurationMinutes(60);
    setStatus('active');
    setDescriptionAr('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: CourseSubject) => {
    setEditingCourse(course);
    setCode(course.code);
    setTitleAr(course.titleAr);
    setTitleEn(course.titleEn);
    setLevel(course.level);
    setPricePerSession(course.pricePerSession);
    setSuggestedDurationMinutes(course.suggestedDurationMinutes);
    setStatus(course.status);
    setDescriptionAr(course.descriptionAr || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim()) return;

    if (editingCourse) {
      updateDatabaseState((draft) => {
        const idx = draft.courseSubjects.findIndex((c) => c.id === editingCourse.id);
        if (idx !== -1) {
          draft.courseSubjects[idx] = {
            ...draft.courseSubjects[idx],
            code,
            titleAr: titleAr.trim(),
            titleEn: titleEn.trim() || titleAr.trim(),
            level,
            pricePerSession: Number(pricePerSession),
            suggestedDurationMinutes: Number(suggestedDurationMinutes),
            status,
            descriptionAr,
          };
        }
      });
    } else {
      const newCourse: CourseSubject = {
        id: `cs-${isCoursesDepartment ? 'crs' : 'acad'}-${Date.now()}`,
        tenantId: activeTenantId,
        code,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        category: isCoursesDepartment ? 'language' : 'academic',
        level,
        pricePerSession: Number(pricePerSession),
        suggestedDurationMinutes: Number(suggestedDurationMinutes),
        status,
        descriptionAr,
      };
      updateDatabaseState((draft) => {
        draft.courseSubjects.unshift(newCourse);
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.courseSubjects.findIndex((c) => c.id === id);
      if (idx !== -1) {
        draft.courseSubjects.splice(idx, 1);
      }
    });
    setDeletingCourseId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {isCoursesDepartment
                ? (lang === 'ar' ? 'قسم الكورسات والمسارات التدريبية' : 'Courses & Workshops')
                : (lang === 'ar' ? 'المناهج والمسارات الأكاديمية' : 'Academic Curricula')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isCoursesDepartment
              ? (lang === 'ar' ? 'إدارة الكورسات والدورات والورش التدريبية ودبلومات اللغات والمهارات (خاص بقسم الكورسات).' : 'Manage courses and language tracks.')
              : (lang === 'ar' ? 'إدارة المناهج الأكاديمية والمواد المدرسية للمراحل التعليمية المختلفة (خاص بقسم المناهج).' : 'Manage school curricula and academic subjects.')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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

          {isCoursesDepartment && (
            <button
              onClick={() => {
                setActiveTenantId('tenant-zakirly-courses');
                setActiveModule('trial_lessons');
              }}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="فتح شيت الحصص التجريبية الخاص بقسم الكورسات"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>شيت تجريبي الكورسات</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isCoursesDepartment ? (lang === 'ar' ? 'إضافة كورس تدريبي' : 'Add Course') : (lang === 'ar' ? 'إضافة منهج أكاديمي' : 'Add Curriculum')}</span>
          </button>
        </div>
      </div>

      <div className={
        mobileViewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }>
        {displayedCourses.map((course) => (
          <div key={course.id} className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative group hover:border-blue-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded font-mono">
                    {course.code}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-1 line-clamp-1">{course.titleAr}</h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-emerald-200">
                    {course.pricePerSession} {currencySymbol}
                  </span>
                </div>
              </div>

              <p className="text-slate-600 text-[10px] sm:text-xs leading-relaxed line-clamp-2">
                {course.descriptionAr}
              </p>
            </div>

            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
              <span className="truncate">المستوى: <strong>{course.level}</strong></span>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenQuickTrial(course)}
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                  title="حجز حصة تجريبية مباشرة في هذا الكورس"
                >
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>حجز تجريبي</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(course)}
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="تعديل"
                >
                  <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingCourseId(course.id)}
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="حذف"
                >
                  <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingCourse
                  ? (isCoursesDepartment ? 'تعديل الكورس التدريبي' : 'تعديل المنهج الأكاديمي')
                  : (isCoursesDepartment ? 'إضافة كورس تدريبي جديد' : 'إضافة منهج أكاديمي جديد')}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكود</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحالة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  >
                    <option value="active">مفعل</option>
                    <option value="inactive">غير مفعل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isCoursesDepartment ? 'اسم الكورس / الدورة (عربي)*' : 'اسم المنهج (عربي)*'}
                </label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder={isCoursesDepartment ? 'مثال: دبلومة البرمجة أو كورس اللغة الإنجليزية' : 'مثال: الرياضيات المتقدمة والفيزياء'}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم بالإنجليزي</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Advanced Mathematics & Physics"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المستوى</label>
                  <input
                    type="text"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">السعر / حصة</label>
                  <input
                    type="number"
                    value={pricePerSession}
                    onChange={(e) => setPricePerSession(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدة (دقيقة)</label>
                  <input
                    type="number"
                    value={suggestedDurationMinutes}
                    onChange={(e) => setSuggestedDurationMinutes(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وصف المنهج</label>
                <textarea
                  rows={3}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow-md">حفظ</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingCourseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد حذف المنهج</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف هذا المنهج الأكاديمي؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingCourseId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDelete(deletingCourseId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Trial Booking Modal for Courses */}
      {isQuickTrialOpen && trialCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>حجز حصة تجريبية في قسم الكورسات</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {trialCourse.titleAr}
                </h3>
              </div>
              <button type="button" onClick={() => setIsQuickTrialOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {trialSuccessMsg ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">{trialSuccessMsg}</p>
                  <p className="text-[11px] text-emerald-700">
                    تم توجيه الحصة مباشرة إلى <strong>شيت قسم الكورسات التدريبية</strong> منفصلة عن المناهج.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickTrialOpen(false);
                      setTrialSuccessMsg(null);
                    }}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickTrialOpen(false);
                      setTrialSuccessMsg(null);
                      setActiveTenantId('tenant-zakirly-courses');
                      setActiveModule('trial_lessons');
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-md flex items-center gap-1.5 hover:bg-emerald-700"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>فتح شيت الكورسات الآن</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveQuickTrial} className="space-y-3.5 text-xs">
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 font-bold flex items-center justify-between">
                  <span>القسم التابع: <strong>أكاديمية ذاكرلي (الكورسات)</strong></span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-mono">{trialCourse.code}</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الطالب*</label>
                  <input
                    type="text"
                    required
                    value={trialStudentName}
                    onChange={(e) => setTrialStudentName(e.target.value)}
                    placeholder="مثال: يوسف رامي"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم ولي الأمر</label>
                  <input
                    type="text"
                    value={trialParentName}
                    onChange={(e) => setTrialParentName(e.target.value)}
                    placeholder="مثال: رامي عبد العزيز (اختياري)"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">هاتف ولي الأمر (واتساب)*</label>
                  <input
                    type="text"
                    required
                    value={trialParentPhone}
                    onChange={(e) => setTrialParentPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">معلم الكورس المخصص</label>
                  <select
                    value={trialTeacherId}
                    onChange={(e) => setTrialTeacherId(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white"
                  >
                    {db.teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.nameAr} {t.tenantId === 'tenant-zakirly-courses' ? '(مدرب كورسات)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الحصة</label>
                  <input
                    type="date"
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="pt-1">
                  <Time12HPicker
                    value={trialTime}
                    onChange={setTrialTime}
                    label="وقت الحصة (توقيت 12 ساعة)"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setIsQuickTrialOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
                  <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                    حفظ في شيت الكورسات
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
