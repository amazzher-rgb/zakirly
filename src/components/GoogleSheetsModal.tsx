import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excelExporter';
import { calculateInvoiceProfitInEgp } from '../utils/currencyUtils';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { db } = useApp();
  const [selectedEntity, setSelectedEntity] = useState<'students' | 'teachers' | 'invoices' | 'sessions' | 'attendance' | 'payrolls' | 'trialLessons'>('students');
  const [isExporting, setIsExporting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ url?: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportToGoogleSheets = async () => {
    setIsExporting(true);
    setSuccessResult(null);
    setErrorMsg(null);

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let title = '';

    if (selectedEntity === 'students') {
      title = 'قائمة الطلاب - أكاديمية ذاكرلي';
      headers = ['كود الطالب', 'اسم الطالب', 'الصف الدراسي', 'المعلم المسؤول', 'ولي الأمر', 'الهاتف', 'الحصص المتبقية', 'الرصيد المالي', 'الحالة'];
      rows = db.students.map((s) => [
        s.code,
        s.nameAr,
        s.grade,
        s.assignedTeacherNameAr || 'غير محدد',
        s.parentNameAr,
        s.phone,
        s.remainingSessions,
        s.balance,
        s.status === 'active' ? 'نشط' : 'غير نشط',
      ]);
    } else if (selectedEntity === 'teachers') {
      title = 'قائمة المعلمين - أكاديمية ذاكرلي';
      headers = ['كود المعلم', 'اسم المعلم', 'الهاتف', 'البريد الإلكتروني', 'المواد والتخصصات', 'أجر الحصة (ج.م)', 'إجمالي المستحقات (ج.م)', 'الحصص المكتملة', 'التقييم', 'الحالة'];
      rows = db.teachers.map((t) => [
        t.code || '',
        t.nameAr || '',
        t.phone || '',
        t.email || '',
        Array.isArray(t.subjects) ? t.subjects.join(' - ') : (t.subjects || ''),
        t.perSessionRate || 0,
        t.totalEarned || 0,
        t.completedSessionsCount || 0,
        t.rating || 5,
        t.status === 'active' ? 'نشط' : 'غير نشط',
      ]);
    } else if (selectedEntity === 'invoices') {
      title = 'السجل المالي والفواتير والأرباح الصافية (بالجنيه المصري EGP) - أكاديمية ذاكرلي';
      headers = [
        'رقم الفاتورة',
        'اسم الطالب',
        'اسم ولي الأمر',
        'المادة / الكورس',
        'المعلم المخصص',
        'سعر حصة المعلم (ج.م)',
        'عدد الحصص',
        'تكلفة المعلم الإجمالية (ج.م)',
        'عملة التحصيل',
        'مبلغ الفاتورة بالعملة',
        'سعر الصرف (للجنيه)',
        'إجمالي قيمة الفاتورة (ج.م)',
        'الربح الصافي للأكاديمية (ج.م)',
        'المبلغ المدفوع بالعملة',
        'المتبقي بالعملة',
        'الحالة',
        'التاريخ',
      ];
      rows = db.invoices.map((inv) => {
        const profitData = calculateInvoiceProfitInEgp(inv);
        return [
          inv.invoiceNumber,
          inv.studentNameAr,
          inv.parentNameAr,
          inv.subjectNameAr || 'عام',
          inv.teacherNameAr || 'غير مخصص',
          inv.teacherRate || 0,
          inv.sessionsCount || 0,
          profitData.teacherTotalCostEgp,
          inv.currency || 'EGP',
          inv.amount,
          profitData.exchangeRate,
          profitData.totalInvoiceEgp,
          profitData.netProfitEgp,
          inv.paidAmount,
          inv.remainingAmount,
          inv.status === 'paid' ? 'مدفوع' : inv.status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع',
          inv.createdAt,
        ];
      });
    } else if (selectedEntity === 'sessions') {
      title = 'جدول الحصص والمواعيد - أكاديمية ذاكرلي';
      headers = ['كود الحصة', 'المادة', 'المعلم', 'الطالب', 'التاريخ', 'الوقت', 'المدة (دقيقة)', 'رابط الاجتماع', 'الحالة'];
      rows = db.sessions.map((ses) => [
        ses.code,
        ses.subjectNameAr,
        ses.teacherNameAr,
        ses.studentNameAr,
        ses.date,
        `${ses.startTime} - ${ses.endTime}`,
        ses.durationMinutes,
        ses.meetingUrl || '',
        ses.status === 'completed' ? 'مكتملة' : ses.status === 'scheduled' ? 'مجدولة' : 'ملغاة',
      ]);
    } else if (selectedEntity === 'attendance') {
      title = 'سجل الحضور والغياب - أكاديمية ذاكرلي';
      headers = ['اسم الطالب', 'التاريخ', 'حالة الحضور', 'دقائق التأخير', 'ملاحظات', 'سُجل بواسطة'];
      rows = db.attendance.map((att) => [
        att.studentNameAr,
        att.date,
        att.status === 'present' ? 'حاضر' : att.status === 'late' ? 'متأخر' : 'غائب',
        att.minutesLate || 0,
        att.notes || '',
        att.loggedBy,
      ]);
    } else if (selectedEntity === 'payrolls') {
      title = 'مسير الرواتب والمستحقات - أكاديمية ذاكرلي';
      headers = ['اسم المعلم', 'الشهر/السنة', 'الحصص المنفذة', 'أجر الحصة (ج.م)', 'الإجمالي (ج.م)', 'المكافآت', 'الخصومات', 'صافي المستحق (ج.م)', 'الحالة'];
      rows = (db.payrolls || []).map((p) => [
        p.teacherNameAr,
        `${p.month}/${p.year}`,
        p.sessionsCount,
        p.ratePerSession,
        p.grossAmount,
        p.bonus || 0,
        p.deductions || 0,
        p.netSalary,
        p.status === 'paid' ? 'تمت المحاسبة / مدفوع' : 'معلق / قيد الصرف',
      ]);
    } else if (selectedEntity === 'trialLessons') {
      title = 'شيت الحصص التجريبية والتحويلات - أكاديمية ذاكرلي';
      headers = ['كود الطلب', 'اسم الطالب', 'اسم ولي الأمر', 'هاتف ولي الأمر', 'المادة / الدورة', 'المعلم المعين', 'تاريخ الحصة', 'الموعد', 'الحالة', 'تاريخ الطلب'];
      rows = (db.trialLessons || []).map((t) => [
        t.id,
        t.studentNameAr,
        t.parentNameAr,
        t.parentPhone,
        t.courseTitleAr,
        t.assignedTeacherNameAr,
        t.scheduledDate,
        t.scheduledTime,
        t.status === 'converted' ? 'تم التحويل لطالب مدفوع' : t.status === 'completed' ? 'مكتملة (جاهزة للتحويل)' : t.status === 'cancelled' ? 'ملغاة' : 'مجدولة',
        t.createdAt || t.scheduledDate,
      ]);
    }

    try {
      const response = await fetch('/api/google-sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetTitle: title,
          headers,
          rows,
        }),
      });

      const res = await response.json();
      if (res.success) {
        setSuccessResult({
          url: res.spreadsheetUrl,
          message: res.message || 'تم تجهيز وتصدير البيانات بنجاح إلى Google Sheets!',
        });
      } else {
        setErrorMsg(res.message || 'حدث خطأ أثناء تصدير البيانات');
      }
    } catch (err: any) {
      setErrorMsg('فشل الاتصال بخادم Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcelFallback = () => {
    let data: any[] = [];
    let fileName = '';

    if (selectedEntity === 'students') {
      fileName = 'Zakirly_Students_Report';
      data = db.students.map((s) => ({
        'كود الطالب': s.code,
        'اسم الطالب': s.nameAr,
        'الصف الدراسي': s.grade,
        'المعلم المسؤول': s.assignedTeacherNameAr || 'غير محدد',
        'ولي الأمر': s.parentNameAr,
        'الهاتف': s.phone,
        'الحصص المتبقية': s.remainingSessions,
        'الرصيد المالي': s.balance,
        'الحالة': s.status === 'active' ? 'نشط' : 'غير نشط',
      }));
    } else if (selectedEntity === 'teachers') {
      fileName = 'Zakirly_Teachers_Report';
      data = db.teachers.map((t) => ({
        'كود المعلم': t.code,
        'اسم المعلم': t.nameAr,
        'الهاتف': t.phone,
        'البريد الإلكتروني': t.email,
        'التخصصات والمواد': Array.isArray(t.subjects) ? t.subjects.join(' - ') : (t.subjects || ''),
        'أجر الحصة (ج.م)': t.perSessionRate,
        'إجمالي المستحقات (ج.م)': t.totalEarned,
        'الحصص المكتملة': t.completedSessionsCount,
        'التقييم': t.rating,
        'الحالة': t.status === 'active' ? 'نشط' : 'غير نشط',
      }));
    } else if (selectedEntity === 'invoices') {
      fileName = 'Zakirly_Invoices_Net_Profit_Report';
      data = db.invoices.map((inv) => {
        const profitData = calculateInvoiceProfitInEgp(inv);
        return {
          'رقم الفاتورة': inv.invoiceNumber,
          'اسم الطالب': inv.studentNameAr,
          'اسم ولي الأمر': inv.parentNameAr,
          'المادة / الكورس': inv.subjectNameAr || 'عام',
          'المعلم المخصص': inv.teacherNameAr || 'غير مخصص',
          'سعر حصة المعلم (ج.م)': inv.teacherRate || 0,
          'عدد الحصص': inv.sessionsCount || 0,
          'تكلفة المعلم الإجمالية (ج.م)': profitData.teacherTotalCostEgp,
          'عملة الفاتورة': inv.currency || 'EGP',
          'المبلغ بالعملة': inv.amount,
          'سعر الصرف (مقابل الجنيه)': profitData.exchangeRate,
          'إجمالي قيمة الفاتورة (ج.م)': profitData.totalInvoiceEgp,
          'الربح الصافي للأكاديمية (ج.م)': profitData.netProfitEgp,
          'المبلغ المدفوع بالعملة': inv.paidAmount,
          'المتبقي بالعملة': inv.remainingAmount,
          'الحالة': inv.status === 'paid' ? 'مدفوع' : inv.status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع',
          'التاريخ': inv.createdAt,
        };
      });
    } else if (selectedEntity === 'sessions') {
      fileName = 'Zakirly_Sessions_Report';
      data = db.sessions.map((ses) => ({
        'كود الحصة': ses.code,
        'المادة': ses.subjectNameAr,
        'المعلم': ses.teacherNameAr,
        'الطالب': ses.studentNameAr,
        'التاريخ': ses.date,
        'الوقت': `${ses.startTime} - ${ses.endTime}`,
        'المدة (دقيقة)': ses.durationMinutes,
        'رابط الاجتماع': ses.meetingUrl || '',
        'الحالة': ses.status === 'completed' ? 'مكتملة' : ses.status === 'scheduled' ? 'مجدولة' : 'ملغاة',
      }));
    } else if (selectedEntity === 'attendance') {
      fileName = 'Zakirly_Attendance_Report';
      data = db.attendance.map((att) => ({
        'اسم الطالب': att.studentNameAr,
        'التاريخ': att.date,
        'حالة الحضور': att.status === 'present' ? 'حاضر' : att.status === 'late' ? 'متأخر' : 'غائب',
        'دقائق التأخير': att.minutesLate || 0,
        'ملاحظات': att.notes || '',
        'سُجل بواسطة': att.loggedBy,
      }));
    } else if (selectedEntity === 'payrolls') {
      fileName = 'Zakirly_Payrolls_Report';
      data = (db.payrolls || []).map((p) => ({
        'اسم المعلم': p.teacherNameAr,
        'الشهر/السنة': `${p.month}/${p.year}`,
        'الحصص المنفذة': p.sessionsCount,
        'أجر الحصة (ج.م)': p.ratePerSession,
        'الإجمالي (ج.م)': p.grossAmount,
        'المكافآت (ج.م)': p.bonus || 0,
        'الخصومات (ج.م)': p.deductions || 0,
        'صافي المستحق (ج.م)': p.netSalary,
        'الحالة': p.status === 'paid' ? 'تمت المحاسبة' : 'قيد الصرف',
      }));
    } else if (selectedEntity === 'trialLessons') {
      fileName = 'Zakirly_Trial_Lessons_Sheet';
      data = (db.trialLessons || []).map((t) => ({
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
    }

    exportToExcel(data, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">مزامنة وتصدير Google Sheets</h3>
              <p className="text-xs text-slate-500">ربط وتصدير بيانات الأكاديمية مباشرة لجداول بيانات جوجل</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-slate-700">اختر السجل أو البيانات المراد تصديرها:</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'students', label: 'سجل الطلاب (Students)', count: db.students.length },
              { id: 'teachers', label: 'سجل المعلمين (Teachers)', count: db.teachers.length },
              { id: 'invoices', label: 'الفواتير والمالية (Invoices)', count: db.invoices.length },
              { id: 'payrolls', label: 'سجل الرواتب (Payrolls)', count: (db.payrolls || []).length },
              { id: 'sessions', label: 'جدول الحصص (Sessions)', count: db.sessions.length },
              { id: 'attendance', label: 'سجل الحضور والغياب', count: db.attendance.length },
              { id: 'trialLessons', label: 'شيت الحصص التجريبية (Trial Sheet)', count: (db.trialLessons || []).length },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedEntity(item.id as any)}
                className={`p-3 rounded-2xl text-xs font-bold text-start border transition-all flex items-center justify-between ${
                  selectedEntity === item.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                }`}
              >
                <span>{item.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedEntity === item.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {successResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-extrabold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successResult.message}</span>
            </div>
            {successResult.url && (
              <a
                href={successResult.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
              >
                <span>فتح الجدول في Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <button
            onClick={handleExportToGoogleSheets}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري المزامنة مع Google Sheets...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير ومزامنة مع Google Sheets</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadExcelFallback}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تحميل ملف Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
