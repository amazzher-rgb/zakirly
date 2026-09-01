import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PackageSubscription } from '../types';
import { Repeat, AlertTriangle, CheckCircle2, Sparkles, Plus, RefreshCw, X, Trash2, FileText, Printer, Calculator, Download, LayoutGrid, List } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol } from '../utils/currencyUtils';
import { generatePaymentReceiptPDF, generatePrePaymentNoticePDF } from '../utils/pdfGenerator';
import { PaymentInvoice } from '../types';

export const SubscriptionsModule: React.FC = () => {
  const { db, lang, processPayment, currencySymbol, activeTenantId, updateDatabaseState } = useApp();
  const [selectedSub, setSelectedSub] = useState<PackageSubscription | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');

  // Quick Renew Modal options
  const [renewSessions, setRenewSessions] = useState<number>(20);
  const [renewPrice, setRenewPrice] = useState<number>(0);
  const [renewCurrency, setRenewCurrency] = useState<string>('SAR');

  useEffect(() => {
    if (selectedSub) {
      const student = db.students.find((s) => s.id === selectedSub.studentId);
      setRenewSessions(selectedSub.totalSessions || 12);
      setRenewPrice(selectedSub.price || 0);
      setRenewCurrency(selectedSub.currency || student?.currency || 'SAR');
    }
  }, [selectedSub, db.students]);

  // Add subscription modal
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [courseId, setCourseId] = useState(db.courseSubjects[0]?.id || '');
  const [totalSessions, setTotalSessions] = useState(12);
  const [price, setPrice] = useState(1800);
  const [subCurrency, setSubCurrency] = useState('SAR');
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    const student = db.students.find((s) => s.id === studentId);
    const course = db.courseSubjects.find((c) => c.id === courseId);
    if (!student || !course) return;

    const newSub: PackageSubscription = {
      id: `sub-${Date.now()}`,
      tenantId: 'tenant-zakirly-main',
      studentId: student.id,
      studentNameAr: student.nameAr,
      courseId: course.id,
      courseTitleAr: course.titleAr,
      totalSessions: Number(totalSessions),
      remainingSessions: Number(totalSessions),
      price: Number(price),
      paidAmount: Number(price),
      currency: subCurrency,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'active',
      autoRenewal: true,
    };

    updateDatabaseState((draft) => {
      draft.subscriptions.unshift(newSub);
      const st = draft.students.find((s) => s.id === studentId);
      if (st) {
        st.remainingSessions = (st.remainingSessions || 0) + Number(totalSessions);
      }
    });
    setIsAddSubOpen(false);
  };

  const handleDeleteSub = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.subscriptions.findIndex((s) => s.id === id);
      if (idx !== -1) {
        draft.subscriptions.splice(idx, 1);
      }
    });
    setDeletingSubId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'إدارة باقات الحصص وتجديد الاشتراكات' : 'Subscriptions & Renewals'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة الباقات النشطة، التنبيه بالتجديد قبل النفاد، وإصدار تجديدات الحصص بضغطة زر'
              : 'Monitor package balances, auto-alert on low sessions, and process quick renewals.'}
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
                  ? 'bg-amber-600 text-white shadow-sm'
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
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض قائمة رأسية"
            >
              <List className="w-4 h-4" />
              <span className="text-[10px]">قائمة</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddSubOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>اشتراك باقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className={
        mobileViewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }>
        {db.subscriptions.map((sub) => {
          const isLow = sub.remainingSessions <= 2;
          return (
            <div
              key={sub.id}
              className={`p-3 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isLow
                  ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{sub.studentNameAr}</h3>
                    <div className="text-[10px] sm:text-xs font-bold text-blue-700 truncate">{sub.courseTitleAr}</div>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <span
                      className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                        isLow ? 'bg-amber-200 text-amber-900 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLow ? 'يلزم التجديد' : 'نشط'}
                    </span>

                    <button
                      onClick={() => setDeletingSubId(sub.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="حذف الباقة"
                    >
                      <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs">
                  <div className="p-2 sm:p-3 bg-white/80 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">المتبقي:</span>
                    <span className={`font-black text-xs sm:text-sm ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                      {sub.remainingSessions} / {sub.totalSessions}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-slate-600">
                    <span>القيمة: <strong>{sub.price} {getCurrencySymbol(sub.currency)}</strong></span>
                    <span>المسدد: <strong className="text-emerald-700">{sub.paidAmount}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                  <span className="truncate">ينتهي: {sub.endDate}</span>
                  <span className="font-bold text-slate-600 truncate">{sub.studentNameAr}</span>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1">
                  {/* Pre-Payment Notice Button */}
                  <button
                    onClick={() => {
                      const student = db.students.find((s) => s.id === sub.studentId);
                      const inv: PaymentInvoice = {
                        id: `inv-${sub.id}`,
                        tenantId: sub.tenantId || 'tenant-zakirly-main',
                        invoiceNumber: `INV-${sub.id.slice(-6).toUpperCase()}`,
                        studentId: sub.studentId,
                        studentNameAr: sub.studentNameAr,
                        parentId: student?.parentId || '',
                        parentNameAr: student?.parentNameAr || 'ولي أمر الطالب',
                        subjectNameAr: sub.courseTitleAr,
                        sessionsCount: sub.totalSessions,
                        amount: sub.price,
                        paidAmount: sub.paidAmount || 0,
                        remainingAmount: Math.max(0, sub.price - (sub.paidAmount || 0)),
                        currency: sub.currency || 'SAR',
                        type: 'subscription',
                        status: sub.paidAmount >= sub.price ? 'paid' : 'unpaid',
                        createdAt: sub.startDate || new Date().toISOString().split('T')[0],
                        dueDate: sub.endDate,
                      };
                      generatePrePaymentNoticePDF(inv, 'أكاديمية ذاكرلي', getCurrencySymbol(inv.currency));
                    }}
                    className="p-1 sm:px-2 sm:py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 truncate"
                    title="تحميل إشعار المطالبة لولي الأمر قبل الدفع"
                  >
                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
                    <span className="truncate">إشعار مطالبة</span>
                  </button>

                  {/* Post-Payment Receipt Button */}
                  <button
                    onClick={() => {
                      const student = db.students.find((s) => s.id === sub.studentId);
                      const inv: PaymentInvoice = {
                        id: `inv-${sub.id}`,
                        tenantId: sub.tenantId || 'tenant-zakirly-main',
                        invoiceNumber: `INV-${sub.id.slice(-6).toUpperCase()}`,
                        receiptNumber: `REC-${sub.id.slice(-6).toUpperCase()}`,
                        studentId: sub.studentId,
                        studentNameAr: sub.studentNameAr,
                        parentId: student?.parentId || '',
                        parentNameAr: student?.parentNameAr || 'ولي أمر الطالب',
                        subjectNameAr: sub.courseTitleAr,
                        sessionsCount: sub.totalSessions,
                        amount: sub.price,
                        paidAmount: sub.paidAmount || sub.price,
                        remainingAmount: 0,
                        currency: sub.currency || 'SAR',
                        type: 'subscription',
                        status: 'paid',
                        createdAt: sub.startDate || new Date().toISOString().split('T')[0],
                        paidDate: new Date().toISOString().split('T')[0],
                        dueDate: sub.endDate || new Date().toISOString().split('T')[0],
                      };
                      generatePaymentReceiptPDF(inv, 'أكاديمية ذاكرلي', getCurrencySymbol(inv.currency));
                    }}
                    className="p-1 sm:px-2 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 truncate"
                    title="تحميل إيصال سداد وتأكيد الاشتراك لولي الأمر بعد الدفع"
                  >
                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">إيصال سداد</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedSub(sub)}
                  className="w-full py-1 sm:py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 mt-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تجديد الباقة</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Renew Modal */}
      {selectedSub && (() => {
        const student = db.students.find((s) => s.id === selectedSub.studentId);
        const course = db.courseSubjects.find((c) => c.id === selectedSub.courseId);

        const handleAutoCalculate = () => {
          if (course && course.pricePerSession) {
            setRenewPrice(course.pricePerSession * renewSessions);
          } else {
            setRenewPrice(selectedSub.price || 0);
          }
        };

        const handleConfirmRenewal = () => {
          updateDatabaseState((draft) => {
            const st = draft.students.find((s) => s.id === selectedSub.studentId);
            if (st) {
              st.remainingSessions = (st.remainingSessions || 0) + Number(renewSessions);
              st.status = 'active';
              st.packageNameAr = selectedSub.courseTitleAr;
              st.currency = renewCurrency;
            }

            const sub = draft.subscriptions.find((s) => s.id === selectedSub.id);
            if (sub) {
              sub.remainingSessions = (sub.remainingSessions || 0) + Number(renewSessions);
              sub.totalSessions = (sub.totalSessions || 0) + Number(renewSessions);
              sub.price = Number(renewPrice);
              sub.paidAmount = Number(renewPrice);
              sub.currency = renewCurrency;
              sub.status = 'active';
            }

            // Create Renewal Invoice/Payment Record
            const newInvoice: PaymentInvoice = {
              id: `inv-renew-${Date.now()}`,
              tenantId: selectedSub.tenantId || activeTenantId || 'tenant-zakirly-main',
              invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
              receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
              studentId: selectedSub.studentId,
              studentNameAr: selectedSub.studentNameAr,
              parentId: student?.parentId || '',
              parentNameAr: student ? student.parentNameAr || 'ولي أمر الطالب' : 'ولي الأمر',
              subjectNameAr: selectedSub.courseTitleAr,
              sessionsCount: Number(renewSessions),
              amount: Number(renewPrice),
              paidAmount: Number(renewPrice),
              remainingAmount: 0,
              currency: renewCurrency,
              type: 'subscription' as const,
              status: 'paid' as const,
              createdAt: new Date().toISOString().split('T')[0],
              paidDate: new Date().toISOString().split('T')[0],
              dueDate: selectedSub.endDate || new Date().toISOString().split('T')[0],
              paymentMethod: 'bank_transfer',
              notes: `تجديد باقة حصص (${renewSessions} حصة) - ${selectedSub.courseTitleAr}`,
            };
            draft.invoices.unshift(newInvoice);
            generatePaymentReceiptPDF(newInvoice, 'أكاديمية ذاكرلي', getCurrencySymbol(newInvoice.currency));
          });

          setSelectedSub(null);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-600 animate-spin-slow" />
                  <h3 className="font-extrabold text-slate-900 text-base font-serif">تجديد باقة الحصص</h3>
                </div>
                <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Registered Subscription Info Card */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>الطالب: <strong className="text-amber-900">{selectedSub.studentNameAr}</strong></span>
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
                    المتبقي: {selectedSub.remainingSessions} حصة
                  </span>
                </div>
                <div className="text-slate-600">
                  المادة / الباقة المسجلة: <strong className="text-blue-800">{selectedSub.courseTitleAr}</strong>
                </div>
                <div className="text-slate-700 pt-1 border-t border-amber-200/60 flex items-center justify-between">
                  <span>سعر اشتراك الطالب المسجل:</span>
                  <strong className="text-emerald-800 text-sm">
                    {selectedSub.price} {getCurrencySymbol(selectedSub.currency || student?.currency || 'SAR')}
                  </strong>
                </div>
              </div>

              {/* Editable Renewal Options */}
              <div className="space-y-3.5 text-xs">
                {/* Number of Sessions */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    عدد الحصص المراد إضافتها/تجديدها*
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={renewSessions}
                      onChange={(e) => setRenewSessions(Math.max(1, Number(e.target.value)))}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">خيارات سريعة:</span>
                    {[8, 12, 16, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setRenewSessions(num);
                          if (course && course.pricePerSession) {
                            setRenewPrice(course.pricePerSession * num);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          renewSessions === num
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {num} حصة
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price and Auto-Calculate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold">سعر التجديد / المبلغ المطلوبة*</label>
                    {course && course.pricePerSession > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoCalculate}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>احتساب تلقائي ({course.pricePerSession} {getCurrencySymbol(renewCurrency)}/حصة)</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={renewPrice}
                    onChange={(e) => setRenewPrice(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-extrabold text-emerald-800 text-sm focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Currency Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">العملة*</label>
                  <select
                    value={renewCurrency}
                    onChange={(e) => setRenewCurrency(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-amber-500/30"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameAr} ({c.symbolAr})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Summary Notice */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl font-medium text-xs leading-relaxed">
                  سيتم إضافة <strong className="text-blue-950 font-black">{renewSessions} حصة جديدة</strong> لحساب الطالب <strong>{selectedSub.studentNameAr}</strong> بقيمة تجديد <strong className="text-emerald-800 font-black">{renewPrice} {getCurrencySymbol(renewCurrency)}</strong> وتحديث حالة الحساب إلى نشط.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenewal}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التجديد الآن</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Subscription Modal */}
      {isAddSubOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateSub} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">تسجيل اشتراك باقة جديدة</h3>
              <button type="button" onClick={() => setIsAddSubOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر الطالب*</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                >
                  {db.students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الكورس / المادة*</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الحصص</label>
                  <input
                    type="number"
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">إجمالي السعر</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عملة الاشتراك*</label>
                <select
                  value={subCurrency}
                  onChange={(e) => setSubCurrency(e.target.value)}
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
              <button type="button" onClick={() => setIsAddSubOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-amber-600 text-white rounded-xl shadow-md">حفظ الباقة</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد حذف الباقة</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من إلغاء وحذف هذه الباقة؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingSubId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDeleteSub(deletingSubId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
