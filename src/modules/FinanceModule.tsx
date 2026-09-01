import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentInvoice } from '../types';
import { Receipt, DollarSign, Plus, Printer, CheckCircle2, AlertCircle, FileText, Download, X, Trash2, Edit2, TrendingUp, BookOpen, User, Clock, Package, ArrowLeftRight } from 'lucide-react';
import { generatePaymentReceiptPDF, generatePrePaymentNoticePDF } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelExporter';
import { CURRENCIES, getCurrencySymbol, getDefaultExchangeRate, calculateInvoiceProfitInEgp } from '../utils/currencyUtils';

export const FinanceModule: React.FC = () => {
  const { db, lang, processPayment, updateDatabaseState, currencySymbol } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(500);
  const [payMethod, setPayMethod] = useState<string>('vodafone_cash');

  // Add Invoice Modal State
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [studentId, setStudentId] = useState(db.students[0]?.id || '');
  const [subjectNameAr, setSubjectNameAr] = useState('لغة إنجليزية مكثف');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [teacherNameAr, setTeacherNameAr] = useState(db.teachers[0]?.nameAr || 'د. نورهان الشاذلي');
  const [teacherRate, setTeacherRate] = useState<number>(db.teachers[0]?.perSessionRate || 250);
  const [sessionsCount, setSessionsCount] = useState<number>(12);
  const [amount, setAmount] = useState<number>(350);
  const [invoiceCurrency, setInvoiceCurrency] = useState('SAR');
  const [exchangeRate, setExchangeRate] = useState<number>(getDefaultExchangeRate('SAR'));
  const [description, setDescription] = useState('رسوم باقة حصص جديدة - 12 حصة');
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  // Currency change handler
  const handleCurrencyChange = (currCode: string) => {
    setInvoiceCurrency(currCode);
    setExchangeRate(getDefaultExchangeRate(currCode));
  };

  // Auto populate teacher and subject when selecting a student
  const handleStudentSelect = (stId: string) => {
    setStudentId(stId);
    const st = db.students.find((s) => s.id === stId);
    if (st) {
      setSubjectNameAr(st.curriculumAr || st.gradeAr || 'لغة إنجليزية مكثف');
      const assignedTeacher = db.teachers.find((t) => t.id === st.assignedTeacherId) || db.teachers[0];
      if (assignedTeacher) {
        setTeacherId(assignedTeacher.id);
        setTeacherNameAr(assignedTeacher.nameAr);
        setTeacherRate(assignedTeacher.perSessionRate || 250);
      }
    }
  };

  // Auto populate teacher details when selecting a teacher
  const handleTeacherSelect = (tId: string) => {
    setTeacherId(tId);
    const t = db.teachers.find((teacher) => teacher.id === tId);
    if (t) {
      setTeacherNameAr(t.nameAr);
      setTeacherRate(t.perSessionRate || 250);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || payAmount <= 0) return;

    try {
      const res = await processPayment(selectedInvoice.id, payAmount, payMethod, 'تم التحصيل بمركز الخدمة');
      const invToPrint = res?.invoice || db.invoices.find((i) => i.id === selectedInvoice.id) || selectedInvoice;
      if (invToPrint) {
        generatePaymentReceiptPDF(invToPrint, 'أكاديمية ذاكرلي', getCurrencySymbol(invToPrint.currency));
      }
    } catch (err) {
      console.error('Error processing payment:', err);
    } finally {
      setSelectedInvoice(null);
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const st = db.students.find((s) => s.id === studentId);
    if (!st) return;

    const newInvoice: PaymentInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: 'tenant-zakirly-main',
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: st.id,
      studentNameAr: st.nameAr,
      parentId: st.parentId,
      parentNameAr: st.parentNameAr,
      subjectNameAr,
      teacherId,
      teacherNameAr,
      teacherRate: Number(teacherRate),
      sessionsCount: Number(sessionsCount),
      amount: Number(amount),
      paidAmount: 0,
      remainingAmount: Number(amount),
      currency: invoiceCurrency,
      exchangeRate: Number(exchangeRate),
      status: 'unpaid',
      type: 'subscription',
      notes: description,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
    };

    updateDatabaseState((draft) => {
      draft.invoices.unshift(newInvoice);
    });
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInvoice),
    }).catch(() => {});
    setIsAddInvoiceOpen(false);
  };

  const handleDeleteInvoice = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.invoices.findIndex((inv) => inv.id === id);
      if (idx !== -1) {
        draft.invoices.splice(idx, 1);
      }
    });
    setDeletingInvoiceId(null);
  };

  const handleExport = () => {
    const data = db.invoices.map((inv) => {
      const profitData = calculateInvoiceProfitInEgp(inv);
      return {
        'رقم الفاتورة': inv.invoiceNumber,
        'اسم الطالب': inv.studentNameAr,
        'ولي الأمر': inv.parentNameAr,
        'المادة / الكورس': inv.subjectNameAr || 'عام',
        'المعلم المخصص': inv.teacherNameAr || 'غير مخصص',
        'سعر حصة المعلم (ج.م)': inv.teacherRate || 0,
        'عدد الحصص': inv.sessionsCount || 0,
        'إجمالي أجر المعلم (ج.م)': profitData.teacherTotalCostEgp,
        'عملة التحصيل': inv.currency || 'EGP',
        'مبلغ الفاتورة بالعملة': inv.amount,
        'سعر الصرف (مقابل الجنيه)': profitData.exchangeRate,
        'إجمالي تحصيل الطالب (ج.م)': profitData.totalInvoiceEgp,
        'الربح الصافي للأكاديمية (ج.م)': profitData.netProfitEgp,
        'المسدد': inv.paidAmount,
        'المتبقي': inv.remainingAmount,
        'الحالة': inv.status,
        'تاريخ الاستحقاق': inv.dueDate,
      };
    });
    exportToExcel(data, 'تقرير_الفواتير_والأرباح_بالجنيه_المصري', 'الفواتير');
  };

  // KPIs calculated in EGP (Since teacher costs are in EGP and final profit is in EGP)
  const totalInvoicedEgp = db.invoices.reduce((acc, inv) => acc + calculateInvoiceProfitInEgp(inv).totalInvoiceEgp, 0);
  const totalCollectedEgp = db.invoices.reduce((acc, inv) => {
    const rate = inv.exchangeRate && inv.exchangeRate > 0 ? inv.exchangeRate : getDefaultExchangeRate(inv.currency);
    return acc + Math.round((inv.paidAmount || 0) * rate);
  }, 0);
  const totalTeacherCostsEgp = db.invoices.reduce((acc, inv) => acc + calculateInvoiceProfitInEgp(inv).teacherTotalCostEgp, 0);
  const totalNetProfitEgp = totalInvoicedEgp - totalTeacherCostsEgp;

  // Live Modal calculations
  const liveTotalEgp = Math.round((amount || 0) * (exchangeRate || 1));
  const liveTeacherCostEgp = Math.round((sessionsCount || 0) * (teacherRate || 0));
  const liveNetProfitEgp = liveTotalEgp - liveTeacherCostEgp;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 font-serif">
                {lang === 'ar' ? 'إدارة المالية والأرباح الصافية (تحصيل بالعملة / أجر المعلم بالجنيه)' : 'Finance & Profit Management'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'تحصيل الرسوم بالعملات الخليجية، احتساب أجر المعلم بالجنيه المصري تلقائياً، والربح الصافي بالجنيه المصري بعد فرق العملة'
                  : 'Student foreign currency invoicing, teacher rate in EGP, and real net profit calculation after currency conversion.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddInvoiceOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة جديدة</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'تصدير كشف الأرباح (ج.م)' : 'Export Finance'}</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Stats Cards (In EGP) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold block">إجمالي التحصيل المحول (ج.م)</span>
            <span className="text-xl font-black text-slate-900">{totalInvoicedEgp.toLocaleString()} ج.م</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-emerald-700 text-[11px] font-bold block">إجمالي المتحصل النقدي (ج.م)</span>
            <span className="text-xl font-black text-emerald-900">{totalCollectedEgp.toLocaleString()} ج.م</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold block">إجمالي مستحقات المعلمين (ج.م)</span>
            <span className="text-xl font-black text-purple-900">{totalTeacherCostsEgp.toLocaleString()} ج.م</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <User className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-indigo-700 text-[11px] font-bold block">الربح الصافي الفعلي بالجنيه</span>
            <span className="text-xl font-black text-indigo-900">{totalNetProfitEgp.toLocaleString()} ج.م</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <h3 className="font-black text-slate-900 text-sm">جدول الفواتير والتحصيل بالعملة والربح الصافي بالجنيه المصري</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">عدد الفواتير: ({db.invoices.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-3.5 text-start">رقم الفاتورة والتاريخ</th>
                <th className="p-3.5 text-start">الطالب وتفاصيل الكورس والمعلم</th>
                <th className="p-3.5 text-center">المبلغ المطلق من الطالب</th>
                <th className="p-3.5 text-center bg-amber-50/40 border-x border-amber-100">تحصيل الطالب بالجنيه</th>
                <th className="p-3.5 text-center bg-purple-50/50 border-x border-purple-100">أجر المعلم والربح الصافي بالجنيه</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">سند القبض وإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {db.invoices.map((inv) => {
                const profitData = calculateInvoiceProfitInEgp(inv);
                const symbol = getCurrencySymbol(inv.currency);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-black font-mono text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.dueDate}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">{inv.studentNameAr}</div>
                      <div className="text-[11px] text-slate-500 font-medium">ولي الأمر: {inv.parentNameAr}</div>

                      {/* Course & Teacher Metadata Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-bold border border-blue-200 inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          <span>{inv.subjectNameAr || 'كورس عام'}</span>
                        </span>

                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold border border-slate-200 inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-600" />
                          <span>{inv.teacherNameAr || 'معلم غير مخصص'}</span>
                        </span>

                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded-md font-bold border border-emerald-200 inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{inv.teacherRate || 0} ج.م /حصة</span>
                        </span>

                        <span className="px-2 py-0.5 bg-purple-50 text-purple-900 rounded-md font-bold border border-purple-200 inline-flex items-center gap-1 font-mono">
                          <Package className="w-3 h-3 text-purple-600" />
                          <span>{inv.sessionsCount || 0} حصة</span>
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center space-y-1">
                      <div className="font-black text-slate-900 text-sm">
                        {inv.amount.toLocaleString()} {symbol}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        مسدد: {inv.paidAmount.toLocaleString()} {symbol}
                      </div>
                      {inv.remainingAmount > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold">
                          متبقي: {inv.remainingAmount.toLocaleString()} {symbol}
                        </div>
                      )}
                    </td>

                    {/* Equivalent in EGP based on Exchange Rate */}
                    <td className="p-3.5 text-center bg-amber-50/20 border-x border-amber-100 space-y-0.5">
                      <div className="font-extrabold text-amber-950 text-xs">
                        {profitData.totalInvoiceEgp.toLocaleString()} ج.م
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        سعر الصرف: {profitData.exchangeRate}
                      </div>
                    </td>

                    {/* Teacher Cost & Net Profit Calculation in EGP */}
                    <td className="p-3.5 text-center bg-purple-50/20 border-x border-purple-100 space-y-1">
                      <div className="text-[11px] text-slate-600 font-bold">
                        أجر المعلم: <span className="font-mono text-purple-900 font-black">{profitData.teacherTotalCostEgp.toLocaleString()} ج.م</span>
                      </div>
                      <div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 ${
                            profitData.netProfitEgp >= 0
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>الصافي: {profitData.netProfitEgp.toLocaleString()} ج.م</span>
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status === 'paid' ? 'مسددة بالكامل' : inv.status === 'partial' ? 'سداد جزئي' : 'غير مسددة'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Pre-payment renewal notice button (Download for parent BEFORE payment) */}
                        <button
                          onClick={() => generatePrePaymentNoticePDF(inv, 'أكاديمية ذاكرلي', getCurrencySymbol(inv.currency))}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                          title="تحميل إشعار تجديد الاشتراك والمطالبة لإرسالها لولي الأمر قبل الدفع"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600" />
                          <span>تحميل إشعار الدفع</span>
                        </button>

                        {/* Post-payment receipt button (Download for parent AFTER payment) */}
                        <button
                          onClick={() => generatePaymentReceiptPDF(inv, 'أكاديمية ذاكرلي', getCurrencySymbol(inv.currency))}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1.5 border shadow-sm ${
                            inv.paidAmount > 0
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 opacity-70'
                          }`}
                          title="تحميل إيصال السداد وتأكيد تفعيل الاشتراك لإرساله لولي الأمر بعد الدفع"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تحميل تأكيد السداد</span>
                        </button>

                        {inv.remainingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayAmount(inv.remainingAmount);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>تحصيل دفع</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDeletingInvoiceId(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="حذف الفاتورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleProcessPayment} className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">تسجيل تحصيل قسط مالي وإصدار سند</h3>
              <button type="button" onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="text-slate-500">الفاتورة: <strong className="text-slate-900 font-mono">{selectedInvoice.invoiceNumber}</strong></div>
              <div className="text-slate-500">الطالب: <strong className="text-slate-900">{selectedInvoice.studentNameAr}</strong></div>
              <div className="text-slate-500">المتبقي المطلق: <strong className="text-rose-600">{selectedInvoice.remainingAmount} {getCurrencySymbol(selectedInvoice.currency)}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">المبلغ المحصل حالياً ({getCurrencySymbol(selectedInvoice.currency)})*</label>
                <input
                  type="number"
                  required
                  max={selectedInvoice.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setSelectedInvoice(null)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">تأكيد وطباعة السند PDF</button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Invoice Modal */}
      {isAddInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleCreateInvoice} className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">إصدار فاتورة باقة جديدة وحساب أرباحها</h3>
              <button type="button" onClick={() => setIsAddInvoiceOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر الطالب*</label>
                <select
                  value={studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800"
                >
                  {db.students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameAr} - (ولي الأمر: {s.parentNameAr})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المادة / الكورس*</label>
                  <input
                    type="text"
                    required
                    value={subjectNameAr}
                    onChange={(e) => setSubjectNameAr(e.target.value)}
                    placeholder="مثال: لغة إنجليزية / لغة ألمانية"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المعلم المخصص*</label>
                  <select
                    value={teacherId}
                    onChange={(e) => handleTeacherSelect(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800"
                  >
                    {db.teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.nameAr} ({t.perSessionRate || 250} ج.م/حصة)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سعر حصة المعلم (بالجنيه المصري ج.م)*</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={teacherRate}
                      onChange={(e) => setTeacherRate(Number(e.target.value))}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-sm bg-emerald-50/30 text-emerald-950"
                    />
                    <span className="absolute left-3 top-2.5 text-[11px] font-bold text-emerald-700">ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الحصص في الباقة*</label>
                  <input
                    type="number"
                    required
                    value={sessionsCount}
                    onChange={(e) => setSessionsCount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-sm"
                  />
                </div>
              </div>

              {/* Student Invoice Amount & Currency */}
              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="text-[11px] font-black text-amber-950 border-b border-amber-200/60 pb-1 flex items-center justify-between">
                  <span>تفاصيل تحصيل رسوم الطالب</span>
                  <span className="text-[10px] text-amber-700">العملة الأجنبية / الخليجية</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">عملة الفاتورة*</label>
                    <select
                      value={invoiceCurrency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      className="w-full border border-slate-200 p-2 rounded-xl font-bold bg-white text-slate-800 text-xs"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">إجمالي الفاتورة ({getCurrencySymbol(invoiceCurrency)})*</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full border border-slate-200 p-2 rounded-xl font-extrabold text-sm text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">سعر الصرف (1 {getCurrencySymbol(invoiceCurrency)} = ج.م)*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="w-full border border-slate-200 p-2 rounded-xl font-bold text-xs bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Live Profit Calculator Box in EGP */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs">
                <div className="font-extrabold text-purple-950 flex items-center justify-between border-b border-purple-200 pb-1.5">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-purple-700" />
                    <span>ملخص الأرباح والخصومات بالجنيه المصري (EGP)</span>
                  </span>
                  <span className="text-[10px] bg-purple-200/60 text-purple-900 px-2 py-0.5 rounded-md font-bold">الربح الصافي للأكاديمية</span>
                </div>

                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span>إجمالي أجر المعلم ({sessionsCount} حصة × {teacherRate} ج.م):</span>
                    <strong className="text-purple-900 font-mono font-black">{liveTeacherCostEgp.toLocaleString()} ج.م</strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>تحصيل الطالب ({amount} {getCurrencySymbol(invoiceCurrency)} بسعر صرف {exchangeRate}):</span>
                    <strong className="text-slate-900 font-mono font-black">{liveTotalEgp.toLocaleString()} ج.م</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-900 pt-2 border-t border-purple-200 font-black text-sm">
                  <span>الربح الصافي للأكاديمية بالجنيه:</span>
                  <span className={`font-mono font-black px-2.5 py-1 rounded-xl text-xs ${liveNetProfitEgp >= 0 ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-rose-100 text-rose-950 border border-rose-300'}`}>
                    {liveNetProfitEgp >= 0 ? '+' : ''}{liveNetProfitEgp.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">بيان/وصف الفاتورة</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddInvoiceOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md font-extrabold">إصدار الفاتورة وتثبيت الأرباح</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {deletingInvoiceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد حذف الفاتورة</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف الفاتورة نهائياً؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingInvoiceId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDeleteInvoice(deletingInvoiceId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

