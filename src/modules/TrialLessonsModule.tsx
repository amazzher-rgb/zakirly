import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrialLesson } from '../types';
import { Sparkles, CheckCircle2, ArrowLeftRight, UserCheck, Plus, X, Trash2, FileSpreadsheet, Search, Phone, Calendar, Clock, LayoutGrid, Table, Download, MessageSquare } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol } from '../utils/currencyUtils';
import { GoogleSheetsModal } from '../components/GoogleSheetsModal';
import { exportToExcel } from '../utils/excelExporter';

export const TrialLessonsModule: React.FC = () => {
  const { db, lang, convertTrial, currencySymbol, updateDatabaseState } = useApp();
  const [selectedTrial, setSelectedTrial] = useState<TrialLesson | null>(null);
  const [numSessions, setNumSessions] = useState(16);
  const [pkgPrice, setPkgPrice] = useState(3200);
  const [paidAmt, setPaidAmt] = useState(3200);
  const [trialCurrency, setTrialCurrency] = useState('SAR');

  // View state: 'table' (Sheet View) or 'cards' (Cards View)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'converted' | 'cancelled'>('all');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Add trial modal
  const [isAddTrialOpen, setIsAddTrialOpen] = useState(false);
  const [studentNameAr, setStudentNameAr] = useState('');
  const [parentNameAr, setParentNameAr] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [courseId, setCourseId] = useState(db.courseSubjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [deletingTrialId, setDeletingTrialId] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrial) return;
    await convertTrial(selectedTrial.id, selectedTrial.courseId, numSessions, pkgPrice, paidAmt, trialCurrency);
    setSelectedTrial(null);
  };

  const handleCreateTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameAr || !parentPhone) return;
    const course = db.courseSubjects.find((c) => c.id === courseId);
    const teacher = db.teachers.find((t) => t.id === teacherId);

    const newTrial: TrialLesson = {
      id: `tr-${Date.now()}`,
      tenantId: 'tenant-zakirly-main',
      studentNameAr,
      parentNameAr,
      parentPhone,
      courseId,
      courseTitleAr: course?.titleAr || 'لغة إنجليزية',
      assignedTeacherId: teacherId,
      assignedTeacherNameAr: teacher?.nameAr || 'م. إبراهيم الفقي',
      scheduledDate,
      scheduledTime,
      status: 'scheduled',
      createdAt: new Date().toISOString().split('T')[0],
    };

    updateDatabaseState((draft) => {
      draft.trialLessons.unshift(newTrial);
    });
    setIsAddTrialOpen(false);
    setStudentNameAr('');
    setParentNameAr('');
    setParentPhone('');
  };

  const handleDeleteTrial = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.trialLessons.findIndex((t) => t.id === id);
      if (idx !== -1) {
        draft.trialLessons.splice(idx, 1);
      }
    });
    setDeletingTrialId(null);
  };

  // Filtered trial lessons
  const filteredTrials = (db.trialLessons || []).filter((trial) => {
    const matchesSearch =
      trial.studentNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.parentNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.parentPhone?.includes(searchTerm) ||
      trial.assignedTeacherNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.courseTitleAr?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || trial.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalTrials = (db.trialLessons || []).length;
  const scheduledCount = (db.trialLessons || []).filter((t) => t.status === 'scheduled').length;
  const convertedCount = (db.trialLessons || []).filter((t) => t.status === 'converted').length;
  const conversionRate = totalTrials > 0 ? Math.round((convertedCount / totalTrials) * 100) : 0;

  const exportDirectExcel = () => {
    const data = (db.trialLessons || []).map((t) => ({
      'كود الطلب': t.id,
      'اسم الطالب': t.studentNameAr,
      'اسم ولي الأمر': t.parentNameAr,
      'هاتف ولي الأمر': t.parentPhone,
      'المادة / الدورة': t.courseTitleAr,
      'المعلم المعين': t.assignedTeacherNameAr,
      'تاريخ الحصة': t.scheduledDate,
      'الموعد': t.scheduledTime,
      'الحالة': t.status === 'converted' ? 'تم التحويل لطالب مدفوع' : t.status === 'completed' ? 'مكتملة' : t.status === 'cancelled' ? 'ملغاة' : 'مجدولة',
      'تاريخ الطلب': t.createdAt || t.scheduledDate,
    }));
    exportToExcel(data, 'شيت_الحصص_التجريبية_أكاديمية_ذاكرلي');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 font-serif">
                {lang === 'ar' ? 'شيت ومسار الحصص التجريبية (لوحة الإشراف)' : 'Trial Lessons Sheet & Supervision'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'متابعة شيت الحصص التجريبية المباشرة، تصدير لـ Google Sheets، ومتابعة تحويل الطلاب للاشتراكات المدفوعة'
                  : 'Live supervision sheet for trial lessons, Google Sheets sync, and student subscription funnel.'}
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
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
            title="تنزيل شيت تجريبي بصيغة Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تنزيل Excel</span>
          </button>

          <button
            onClick={() => setIsAddTrialOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>حجز حصة تجريبية جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold block">إجمالي الطلبات التجريبية</span>
            <span className="text-xl font-black text-slate-900">{totalTrials}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
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
              placeholder="ابحث بالطالب، ولي الأمر، الهواتف، أو اسم المعلم..."
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              viewMode === 'table' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>جدول الشيت الإشرافي</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'cards' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>بطاقات التحويل</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: Table (شيت الحصص التجريبية الإشرافي) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">شيت متابعة الحصص التجريبية - الإشراف</h3>
            </div>
            <span className="text-xs font-extrabold text-slate-500">
              عدد السجلات المعروضة: ({filteredTrials.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
                  <th className="p-3 text-center">#</th>
                  <th className="p-3 text-start">اسم الطالب</th>
                  <th className="p-3 text-start">ولي الأمر والواتساب</th>
                  <th className="p-3 text-start">المادة / الدورة</th>
                  <th className="p-3 text-start">المعلم المخصص</th>
                  <th className="p-3 text-center">تاريخ وموعد الحصة</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات والإشراف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTrials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد حصص تجريبية تطابق معايير البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredTrials.map((trial, index) => (
                    <tr key={trial.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

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
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded-md font-bold text-[11px] border border-purple-200">
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
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-extrabold shadow-sm transition-all inline-flex items-center gap-1"
                              title="تحويل الطالب إلى اشتراك رسمي باقة"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: Cards View */
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filteredTrials.map((trial) => (
            <div key={trial.id} className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-all text-start relative">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{trial.studentNameAr}</h3>
                    <div className="text-[10px] sm:text-xs font-bold text-purple-700 truncate">{trial.courseTitleAr}</div>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <span
                      className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                        trial.status === 'converted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
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
                  <div className="truncate font-mono text-indigo-900 font-bold">{trial.scheduledDate} ({trial.scheduledTime})</div>
                </div>
              </div>

              {trial.status === 'scheduled' && (
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedTrial(trial)}
                    className="w-full py-1.5 sm:py-2 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] sm:text-xs font-bold shadow-sm flex items-center justify-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">تحويل لاشتراك</span>
                  </button>
                </div>
              )}
            </div>
          ))}
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

            <p className="text-xs text-slate-600">
              سيتم إنشاء حساب طالب جديد باسم <strong>{selectedTrial.studentNameAr}</strong>، وربطه بولي الأمر، وتنشيط باقة ({numSessions} حصة) وإصدار فاتورة تلقائياً.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عدد حصص الباقة المشترك فيها*</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={numSessions}
                  onChange={(e) => setNumSessions(Number(e.target.value))}
                  placeholder="مثال: 16"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-purple-900 bg-purple-50/50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سعر الباقة الإجمالي*</label>
                <input
                  type="number"
                  required
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المبلغ المحصل مقدماً*</label>
                <input
                  type="number"
                  required
                  value={paidAmt}
                  onChange={(e) => setPaidAmt(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عملة اشتراك الطالب*</label>
                <select
                  value={trialCurrency}
                  onChange={(e) => setTrialCurrency(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-slate-50 text-slate-800"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setSelectedTrial(null)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl shadow-md">تأكيد التحويل الآن</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Trial Modal */}
      {isAddTrialOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTrial} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">حجز حصة تجريبية جديدة</h3>
              <button type="button" onClick={() => setIsAddTrialOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطالب المستهدف*</label>
                <input
                  type="text"
                  required
                  value={studentNameAr}
                  onChange={(e) => setStudentNameAr(e.target.value)}
                  placeholder="مثال: عمر طارق"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم ولي الأمر*</label>
                <input
                  type="text"
                  required
                  value={parentNameAr}
                  onChange={(e) => setParentNameAr(e.target.value)}
                  placeholder="مثال: أ. طارق عبد المجيد"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">هاتف ولي الأمر (واتساب)*</label>
                <input
                  type="text"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+201000000000"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكورس / اللغة</label>
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

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المعلم المخصص</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  >
                    {db.teachers.map((t) => (
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
              <button type="button" onClick={() => setIsAddTrialOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl shadow-md">حفظ الحصة التجريبية</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingTrialId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد الحذف</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف الحصة التجريبية؟</p>
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
