import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CourseSubject } from '../types';
import {
  Globe,
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Award,
  Filter,
} from 'lucide-react';

export const LanguagesModule: React.FC = () => {
  const { db, lang, role, searchQuery, currencySymbol, activeTenantId, updateDatabaseState } = useApp();
  const [localSearch, setLocalSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  
  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseSubject | null>(null);
  
  // Modal State for Delete Confirmation
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    code: '',
    titleAr: '',
    titleEn: '',
    level: 'A1 - Beginner',
    pricePerSession: 250,
    suggestedDurationMinutes: 60,
    status: 'active' as 'active' | 'inactive',
    descriptionAr: '',
  });

  // Filter only Language & Quran courses
  const languageCourses = db.courseSubjects.filter((c) => {
    const isLangOrQuran =
      c.category === 'language' ||
      c.category === 'quran' ||
      c.code.startsWith('LANG') ||
      c.code.startsWith('ENG') ||
      c.code.startsWith('FRN') ||
      c.code.startsWith('GER') ||
      c.code.startsWith('QUR');
    
    const query = (localSearch || searchQuery).toLowerCase();
    const matchesQuery =
      c.titleAr.toLowerCase().includes(query) ||
      c.titleEn.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query);

    const matchesLevel = filterLevel === 'all' || c.level.includes(filterLevel);

    return isLangOrQuran && matchesQuery && matchesLevel;
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({
      code: `LANG-${Math.floor(100 + Math.random() * 900)}`,
      titleAr: '',
      titleEn: '',
      level: 'A1 - Beginner',
      pricePerSession: 250,
      suggestedDurationMinutes: 60,
      status: 'active',
      descriptionAr: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: CourseSubject) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      level: course.level,
      pricePerSession: course.pricePerSession,
      suggestedDurationMinutes: course.suggestedDurationMinutes,
      status: course.status,
      descriptionAr: course.descriptionAr || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleAr.trim()) return;

    if (editingCourse) {
      // Update existing course
      updateDatabaseState((draft) => {
        const idx = draft.courseSubjects.findIndex((c) => c.id === editingCourse.id);
        if (idx !== -1) {
          draft.courseSubjects[idx] = {
            ...draft.courseSubjects[idx],
            code: formData.code,
            titleAr: formData.titleAr.trim(),
            titleEn: formData.titleEn.trim() || formData.titleAr.trim(),
            level: formData.level,
            pricePerSession: Number(formData.pricePerSession),
            suggestedDurationMinutes: Number(formData.suggestedDurationMinutes),
            status: formData.status,
            descriptionAr: formData.descriptionAr,
          };
        }
      });
    } else {
      // Add new course
      const newCourse: CourseSubject = {
        id: `cs-lang-${Date.now()}`,
        tenantId: activeTenantId,
        code: formData.code,
        titleAr: formData.titleAr.trim(),
        titleEn: formData.titleEn.trim() || formData.titleAr.trim(),
        category: 'language',
        level: formData.level,
        pricePerSession: Number(formData.pricePerSession),
        suggestedDurationMinutes: Number(formData.suggestedDurationMinutes),
        status: formData.status,
        descriptionAr: formData.descriptionAr,
      };
      updateDatabaseState((draft) => {
        draft.courseSubjects.unshift(newCourse);
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteCourse = (id: string) => {
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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>فرع اللغات الدولية والقرآن الكريم - Zakirly Languages</span>
            </div>
            <h1 className="text-2xl font-black font-serif tracking-tight">
              إدارة برامج اللغات والشهادات المعتمدة
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              فرع مستقل مخصص لدورات اللغات (English IGCSE/IELTS, French DELF, German Goethe) وحلقات تحفيظ القرآن الكريم والتجويد.
            </p>
          </div>

          {(role === 'super_admin' || role === 'academic_director' || role === 'supervisor' || role === 'supervisor_courses' || role === 'supervisor_curriculum') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مسار لغوي جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">إجمالي المسارات</div>
            <div className="text-lg font-black text-slate-900">{languageCourses.length} دورة</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">الشهادات الدولية</div>
            <div className="text-lg font-black text-slate-900">IGCSE, DELF, Goethe</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">فرع القرآن الكريم</div>
            <div className="text-lg font-black text-slate-900">التجويد والقراءات</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">معلمون معتمدون</div>
            <div className="text-lg font-black text-slate-900">{db.teachers.length} معلم</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="بحث باسم اللغة أو الكود أو المستوى..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">جميع المستويات</option>
            <option value="A1">مستوى A1 / مبتدئ</option>
            <option value="A2">مستوى A2 / متوسط</option>
            <option value="B1">مستوى B1 / فوق المتوسط</option>
            <option value="Advanced">متقدم Advanced</option>
          </select>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {languageCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {course.code}
                </span>

                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      course.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {course.status === 'active' ? 'مفعل' : 'غير مفعل'}
                  </span>

                  {(role === 'super_admin' || role === 'academic_director' || role === 'supervisor' || role === 'supervisor_courses' || role === 'supervisor_curriculum') && (
                    <div className="flex items-center gap-1 ms-2">
                      <button
                        onClick={() => handleOpenEdit(course)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCourseId(course.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mb-1 font-serif">
                {course.titleAr}
              </h3>
              <p className="text-xs text-slate-400 font-sans mb-3">{course.titleEn}</p>

              {course.descriptionAr && (
                <p className="text-xs text-slate-600 line-clamp-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {course.descriptionAr}
                </p>
              )}

              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>المستوى:</span>
                  </span>
                  <span className="font-bold text-slate-800">{course.level}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>مدة الحصة:</span>
                  </span>
                  <span className="font-bold text-slate-800">{course.suggestedDurationMinutes} دقيقة</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>سعر الحصة:</span>
                  </span>
                  <span className="font-black text-emerald-700 text-sm">
                    {course.pricePerSession} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                فرع اللغات والشهادات
              </span>
              <span className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer">
                عرض الطلاب المسجلين &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-slate-900 mb-4 font-serif">
              {editingCourse ? 'تعديل مسار لغوي' : 'إضافة مسار لغوي جديد'}
            </h2>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود الدورة</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="active">مفعل</option>
                    <option value="inactive">غير مفعل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المسار اللغوي (عربي)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اللغة الإنجليزية IGCSE / IELTS"
                  value={formData.titleAr}
                  onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالإنجليزي (English Title)</label>
                <input
                  type="text"
                  placeholder="e.g. English IGCSE & IELTS Preparation"
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المستوى</label>
                  <input
                    type="text"
                    required
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سعر الحصة ({currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.pricePerSession}
                    onChange={(e) => setFormData({ ...formData, pricePerSession: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدة (دقيقة)</label>
                  <input
                    type="number"
                    required
                    value={formData.suggestedDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, suggestedDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف الدورة والأهداف</label>
                <textarea
                  rows={3}
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  placeholder="اكتب نبذة مختصرة عن المنهج والمكتسبات..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">
              تأكيد حذف المسار اللغوي
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              هل أنت أخيرًا متأكد من حذف هذا المسار اللغوي؟ لن تتمكن من التراجع عن هذه العملية.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingCourseId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteCourse(deletingCourseId)}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
