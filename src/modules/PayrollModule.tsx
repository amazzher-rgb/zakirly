import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PayrollRecord } from '../types';
import { Banknote, Printer, CheckCircle2, Calendar, Sparkles, Lock, Users, Award, Clock, Eye, Check, RotateCcw, Gift, Save, Download } from 'lucide-react';
import { generateSalarySlipPDF } from '../utils/pdfGenerator';
import { getTeacherCycleSessions, getTeacherPostCycleSessions, getTeacherCompletedSessions } from '../utils/accountingUtils';
import { CompletedSessionsDetailsModal } from '../components/CompletedSessionsDetailsModal';
import { AccountingCycleSelectorBar } from '../components/AccountingCycleSelectorBar';
import { Teacher } from '../types';

export const PayrollModule: React.FC = () => {
  const { db, lang, runPayroll, settleTeacherPayroll, unsettleTeacherPayroll, reopenAccountingCycle, updatePayrollAdjustment, currencySymbol, activeCycle } = useApp();

  const [isCalculating, setIsCalculating] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewingDetailsTeacher, setViewingDetailsTeacher] = useState<Teacher | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{
    teacherId: string;
    teacherNameAr: string;
    bonus: number;
    deductions: number;
    grossAmount: number;
    notes: string;
  } | null>(null);

  const handleSettleTeacher = async (teacherId: string, teacherName: string) => {
    await settleTeacherPayroll(teacherId, activeCycle.month, activeCycle.year);
    setSuccessMsg(`تمت المحاسبة وتسوية مستحقات المعلم (${teacherName}) بنجاح. تظهر الآن الحصص الجديدة للشهر الجديد.`);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const handleUnsettleTeacher = async (teacherId: string, teacherName: string) => {
    await unsettleTeacherPayroll(teacherId, activeCycle.month, activeCycle.year);
    setSuccessMsg(`تم إلغاء المحاسبة وإعادة فتح الدورة المحاسبية للمعلم (${teacherName}) بنجاح.`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleRunPayroll = async () => {
    setIsCalculating(true);
    setSuccessMsg(null);
    await runPayroll(activeCycle.month, activeCycle.year);
    setIsCalculating(false);
    setSuccessMsg(`تم تثبيت واحتساب رواتب الدورة المحاسبية لشهر (${activeCycle.shortLabelAr}) بنجاح.`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleReopenCycle = async () => {
    setIsReopening(true);
    setSuccessMsg(null);
    await reopenAccountingCycle(activeCycle.month, activeCycle.year);
    setIsReopening(false);
    setSuccessMsg(`تم إعادة فتح الدورة المحاسبية لشهر (${activeCycle.shortLabelAr}) بنجاح، وأصبحت الحصص والرواتب قابلة للتعديل.`);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  // Build payroll list for all teachers (either saved or live calculated preview)
  const teachers = db.teachers || [];
  const payrollsList: (PayrollRecord & { isSaved?: boolean; carriedOverForNextCycle?: number })[] = teachers.map((teacher) => {
    const saved = db.payrolls.find(
      (p) => p.teacherId === teacher.id && p.month === activeCycle.month && p.year === activeCycle.year
    );

    const postCycleCount = getTeacherPostCycleSessions(teacher.id, activeCycle, db.attendance || [], db.sessions || []);
    const rate = Number(saved?.ratePerSession || teacher.perSessionRate || teacher.hourlyRate || 200);

    if (saved) {
      const isSettled = saved.status === 'paid' || saved.isSettled;
      return {
        ...saved,
        isSaved: true,
        isSettled,
        carriedOverForNextCycle: postCycleCount,
      };
    }

    const count = getTeacherCycleSessions(teacher.id, activeCycle, db.attendance || [], db.sessions || [], teacher);
    const gross = count * rate;

    return {
      id: `preview-${teacher.id}-${activeCycle.month}-${activeCycle.year}`,
      tenantId: teacher.tenantId || 'tenant-zakirly-curriculum',
      teacherId: teacher.id,
      teacherNameAr: teacher.nameAr,
      month: activeCycle.month,
      year: activeCycle.year,
      sessionsCount: count,
      totalHours: count,
      ratePerSession: rate,
      grossAmount: gross,
      bonus: 0,
      deductions: 0,
      netSalary: gross,
      status: 'pending',
      notes: `احتساب آلي مباشر للدورة المحاسبية حتى 25 (${activeCycle.startDate} إلى ${activeCycle.endDate})`,
      isSaved: false,
      carriedOverForNextCycle: postCycleCount,
    };
  });

  // KPI Summary
  const totalTeachers = payrollsList.length;
  const totalSessions = payrollsList.reduce((acc, p) => acc + (p.sessionsCount || 0), 0);
  const totalGross = payrollsList.reduce((acc, p) => acc + (p.grossAmount || 0), 0);
  const totalNet = payrollsList.reduce((acc, p) => acc + (p.netSalary || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'مسير رواتب ومستحقات المعلمين' : 'Teacher Payroll Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'تثبيت واحتساب عدد الحصص المنفذة حتى يوم 25 فقط لكل شهر محاسبي. الحصص المنفذة بعد يوم 25 تُرحل تلقائياً للشهر الجديد.'
              : 'Automated payroll calculation locked to the 26th - 25th accounting cycle.'}
          </p>
        </div>

        {/* Run Payroll Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            disabled={isCalculating || isReopening}
            onClick={handleRunPayroll}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            title="تثبيت واحتساب مستحقات الدورة الحالية حتى يوم 25"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isCalculating ? 'جارٍ الحساب الآلي...' : 'تثبيت واحتساب رواتب الدورة'}</span>
          </button>

          <button
            disabled={isCalculating || isReopening}
            onClick={handleReopenCycle}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            title="إعادة فتح الدورة وإلغاء تثبيت الرواتب لتعديل الحصص والمستحقات"
          >
            <RotateCcw className={`w-4 h-4 ${isReopening ? 'animate-spin' : ''}`} />
            <span>{isReopening ? 'جارٍ الفتح...' : 'إعادة فتح الدورة'}</span>
          </button>
        </div>
      </div>

      {/* Global Accounting Cycle Selector Bar */}
      <AccountingCycleSelectorBar />

      {/* Cycle Banner */}
      {successMsg && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-md font-bold text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-300" />
            <span>{successMsg}</span>
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>المعلمون المستحقون</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{totalTeachers} معلم</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>الحصص المنفذة حتى 25</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{totalSessions} حصة</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>إجمالي المستحقات (Gross)</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{totalGross.toLocaleString()} {currencySymbol}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>صافي الرواتب القابلة للصرف</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-800">{totalNet.toLocaleString()} {currencySymbol}</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            الفترة المحاسبية لشهر {activeCycle.shortLabelAr}: من {activeCycle.startDate} إلى {activeCycle.endDate}
          </span>
        </div>
        {activeCycle.isClosed ? (
          <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-black text-[10px] flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>دورة محاسبية مغلقة ومثبتة</span>
          </span>
        ) : (
          <span className="px-3 py-1 bg-emerald-200/80 text-emerald-900 rounded-full font-black text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>دورة محاسبية جارية حتى 25 الشهر</span>
          </span>
        )}
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-3.5 text-start">المعلم</th>
                <th className="p-3.5 text-center">الشهر المحاسبي</th>
                <th className="p-3.5 text-center">الحصص المنفذة حتى 25</th>
                <th className="p-3.5 text-center">سعر الحصة (ج.م)</th>
                <th className="p-3.5 text-center">الإجمالي (ج.م)</th>
                <th className="p-3.5 text-center">المكافآت والخصومات</th>
                <th className="p-3.5 text-center">الصافي المستحق</th>
                <th className="p-3.5 text-center">الإجراءات والمحاسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {payrollsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                    لا يوجد معلمون مسجلون في النظام حالياً.
                  </td>
                </tr>
              ) : (
                payrollsList.map((pay) => {
                  const teacher = db.teachers.find((t) => t.id === pay.teacherId);
                  const isSettled = pay.status === 'paid' || pay.isSettled;

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{pay.teacherNameAr}</div>
                        {isSettled ? (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <div className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>تمت المحاسبة عن هذه الدورة ({pay.sessionsCount} حصة)</span>
                            </div>
                            {typeof pay.carriedOverForNextCycle === 'number' && pay.carriedOverForNextCycle > 0 && (
                              <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-extrabold inline-flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>مرحّل بعد 25: {pay.carriedOverForNextCycle} حصة (لم يُحاسب عليها بعد)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          typeof pay.carriedOverForNextCycle === 'number' && pay.carriedOverForNextCycle > 0 && (
                            <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-extrabold inline-flex items-center gap-1 mt-0.5 w-fit">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>مرحّل بعد 25: {pay.carriedOverForNextCycle} حصة</span>
                            </div>
                          )
                        )}
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {activeCycle.shortLabelAr}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="font-black text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {pay.sessionsCount} حصة
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-800">
                        {pay.ratePerSession} ج.م
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-900">
                        {pay.grossAmount.toLocaleString()} ج.م
                      </td>

                      <td className="p-3.5 text-center text-slate-600 text-[11px]">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {(pay.bonus > 0 || pay.deductions > 0) && (
                            <div className="flex items-center gap-1 flex-wrap justify-center font-bold">
                              {pay.bonus > 0 && (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  +{pay.bonus} ج.م
                                </span>
                              )}
                              {pay.deductions > 0 && (
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  -{pay.deductions} ج.م
                                </span>
                              )}
                            </div>
                          )}
                          {pay.bonus === 0 && pay.deductions === 0 && (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                          <button
                            onClick={() =>
                              setEditingAdjustment({
                                teacherId: pay.teacherId,
                                teacherNameAr: pay.teacherNameAr,
                                bonus: pay.bonus || 0,
                                deductions: pay.deductions || 0,
                                grossAmount: pay.grossAmount || 0,
                                notes: pay.notes || '',
                              })
                            }
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200 transition-all inline-flex items-center gap-1 mt-0.5"
                            title="إضافة أو تعديل مكافأة وخصومات المعلم"
                          >
                            <Gift className="w-3 h-3 text-indigo-600" />
                            <span>
                              {pay.bonus > 0 || pay.deductions > 0 ? 'تعديل المكافأة' : '+ مكافأة / خصم'}
                            </span>
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-black text-emerald-800 text-sm">
                        {pay.netSalary.toLocaleString()} ج.م
                      </td>

                      <td className="p-3.5 text-center flex flex-wrap items-center justify-center gap-1.5">
                        {/* View Details Button */}
                        <button
                          onClick={() => teacher && setViewingDetailsTeacher(teacher)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold transition-all inline-flex items-center gap-1 shrink-0 border border-blue-200"
                          title="عرض تفاصيل الحصص المنفذة"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>تفاصيل الحصص</span>
                        </button>

                        {/* Accounting Completed Button */}
                        {!isSettled ? (
                          <button
                            onClick={() => handleSettleTeacher(pay.teacherId, pay.teacherNameAr)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all inline-flex items-center gap-1 shrink-0 shadow-sm"
                            title="اضغط لتأكيد تمت المحاسبة وترحيل الحصص للشهر الجديد"
                          >
                            <Check className="w-3.5 h-3.5 text-amber-300" />
                            <span>تمت المحاسبة</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-black border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>محاسَب ✓</span>
                            </span>
                            <button
                              onClick={() => handleUnsettleTeacher(pay.teacherId, pay.teacherNameAr)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold border border-amber-300 transition-all inline-flex items-center gap-1"
                              title="إلغاء المحاسبة وإعادة فتح الدورة لتعديل الحصص"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-600" />
                              <span>إعادة فتح الدورة</span>
                            </button>
                          </div>
                        )}

                        {/* PDF Slip Button */}
                        <button
                          onClick={() => generateSalarySlipPDF(pay, teacher, 'ج.م')}
                          className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5 shrink-0"
                          title="تحميل كشف راتب تفصيلي PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>تحميل PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for viewing teacher executed sessions details from payroll */}
      {viewingDetailsTeacher && (
        <CompletedSessionsDetailsModal
          isOpen={!!viewingDetailsTeacher}
          onClose={() => setViewingDetailsTeacher(null)}
          title={`تفاصيل الحصص المنفذة للمعلم: ${viewingDetailsTeacher.nameAr}`}
          subtitle={`كود المعلم: ${viewingDetailsTeacher.code} | أجر الحصة: ${viewingDetailsTeacher.perSessionRate} ج.م`}
          sessions={getTeacherCompletedSessions(viewingDetailsTeacher, db.sessions, db.attendance)}
        />
      )}

      {/* Modal for adding/editing bonus and deductions */}
      {editingAdjustment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">إضافة / تعديل مكافأة وخصم</h3>
                  <p className="text-xs text-slate-500 font-bold">{editingAdjustment.teacherNameAr} - شهر {activeCycle.shortLabelAr}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdjustment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updatePayrollAdjustment(
                  editingAdjustment.teacherId,
                  activeCycle.month,
                  activeCycle.year,
                  editingAdjustment.bonus,
                  editingAdjustment.deductions,
                  editingAdjustment.notes
                );
                setSuccessMsg(`تم تحديث المكافآت والخصومات للمعلم (${editingAdjustment.teacherNameAr}) بنجاح.`);
                setTimeout(() => setSuccessMsg(null), 5000);
                setEditingAdjustment(null);
              }}
              className="mt-4 space-y-4 text-xs font-bold"
            >
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>مستحقات الحصص المنفذة:</span>
                  <span className="font-extrabold text-slate-900">{editingAdjustment.grossAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  🎁 مبلغ المكافأة / الحافز الإضافي (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={editingAdjustment.bonus || ''}
                  onChange={(e) =>
                    setEditingAdjustment({
                      ...editingAdjustment,
                      bonus: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  placeholder="أدخل مبلغ المكافأة (مثال: 200)"
                  className="w-full p-2.5 bg-emerald-50/40 border border-emerald-300 rounded-xl text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  🔻 مبلغ الخصم / الاستقطاعات (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={editingAdjustment.deductions || ''}
                  onChange={(e) =>
                    setEditingAdjustment({
                      ...editingAdjustment,
                      deductions: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  placeholder="أدخل مبلغ الخصم (مثال: 50)"
                  className="w-full p-2.5 bg-rose-50/40 border border-rose-300 rounded-xl text-slate-900 font-black focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  📝 سبب المكافأة أو الخصم / ملاحظات
                </label>
                <input
                  type="text"
                  value={editingAdjustment.notes || ''}
                  onChange={(e) =>
                    setEditingAdjustment({
                      ...editingAdjustment,
                      notes: e.target.value,
                    })
                  }
                  placeholder="مثال: مكافأة التزام بالحضور وحافز تفوق"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="bg-indigo-50/80 p-3.5 rounded-2xl border border-indigo-200 flex justify-between items-center text-indigo-900">
                <span className="font-extrabold text-xs">الصافي الجديد المستحق:</span>
                <span className="font-black text-base text-indigo-950">
                  {(
                    editingAdjustment.grossAmount +
                    (editingAdjustment.bonus || 0) -
                    (editingAdjustment.deductions || 0)
                  ).toLocaleString()}{' '}
                  ج.م
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditingAdjustment(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-extrabold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتعديل المستحقات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
