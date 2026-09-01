import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CourseSubject } from '../types';
import { BookOpen, Plus, Edit2, Trash2, Clock, DollarSign, X, Layers, Search, LayoutGrid, List } from 'lucide-react';

export const CoursesModule: React.FC = () => {
  const { db, lang, searchQuery, currencySymbol, activeTenantId, updateDatabaseState } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseSubject | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');

  // Form State
  const [code, setCode] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [level, setLevel] = useState('المرحلة الثانوية');
  const [pricePerSession, setPricePerSession] = useState(220);
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState(60);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [descriptionAr, setDescriptionAr] = useState('');

  // Academic curricula only (not languages)
  const academicCourses = db.courseSubjects.filter((c) => {
    const isAcademic =
      c.category === 'academic' ||
      c.category === 'curriculum' ||
      !c.category ||
      c.code.startsWith('ACAD') ||
      c.code.startsWith('MTH') ||
      c.code.startsWith('CS') ||
      c.code.startsWith('PHY');
    const matchesQuery =
      c.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    return isAcademic && matchesQuery;
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setCode(`ACAD-${Math.floor(100 + Math.random() * 900)}`);
    setTitleAr('');
    setTitleEn('');
    setLevel('المرحلة الثانوية');
    setPricePerSession(220);
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
        id: `cs-acad-${Date.now()}`,
        tenantId: activeTenantId,
        code,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        category: 'academic',
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
              {lang === 'ar' ? 'المناهج والمسارات الأكاديمية' : 'Academic Curricula'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة المناهج الأكاديمية والمواد المدرسية (الرياضيات، العلوم، الفيزياء، المواد الأكاديمية).
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

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منهج أكاديمي</span>
          </button>
        </div>
      </div>

      <div className={
        mobileViewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }>
        {academicCourses.map((course) => (
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
              
              <div className="flex items-center gap-1 shrink-0">
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
                {editingCourse ? 'تعديل منهج أكاديمي' : 'إضافة منهج أكاديمي جديد'}
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
                <label className="block text-slate-700 font-bold mb-1">اسم المنهج (عربي)*</label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="مثال: الرياضيات المتقدمة والفيزياء"
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

    </div>
  );
};
