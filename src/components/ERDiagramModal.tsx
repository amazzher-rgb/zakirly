import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Layers, Database, ArrowRight, Key, Link2 } from 'lucide-react';

export const ERDiagramModal: React.FC = () => {
  const { isERDiagramOpen, setIsERDiagramOpen, lang } = useApp();

  if (!isERDiagramOpen) return null;

  const tables = [
    {
      name: 'tenants (الأكاديميات والفروع)',
      pk: 'id',
      fields: ['name_ar', 'name_en', 'code', 'currency', 'status'],
      color: 'border-purple-300 bg-purple-50',
    },
    {
      name: 'students (الطلاب)',
      pk: 'id',
      fk: 'parent_id -> parents.id',
      fields: ['code', 'name_ar', 'grade', 'balance', 'remaining_sessions', 'package_id'],
      color: 'border-blue-300 bg-blue-50',
    },
    {
      name: 'parents (أولياء الأمور)',
      pk: 'id',
      fields: ['code', 'name_ar', 'phone', 'whatsapp', 'total_due'],
      color: 'border-indigo-300 bg-indigo-50',
    },
    {
      name: 'teachers (المعلمين)',
      pk: 'id',
      fields: ['code', 'name_ar', 'subjects[]', 'per_session_rate', 'total_earned'],
      color: 'border-emerald-300 bg-emerald-50',
    },
    {
      name: 'course_subjects (المواد واللغات)',
      pk: 'id',
      fields: ['code', 'title_ar', 'category', 'level', 'price_per_session'],
      color: 'border-teal-300 bg-teal-50',
    },
    {
      name: 'subscriptions (الاشتراكات والباقات)',
      pk: 'id',
      fk: 'student_id -> students.id, course_id -> course_subjects.id',
      fields: ['total_sessions', 'remaining_sessions', 'price', 'status'],
      color: 'border-amber-300 bg-amber-50',
    },
    {
      name: 'sessions (الحصص والمواعيد)',
      pk: 'id',
      fk: 'teacher_id -> teachers.id, student_id -> students.id',
      fields: ['date', 'start_time', 'end_time', 'status', 'meeting_url'],
      color: 'border-sky-300 bg-sky-50',
    },
    {
      name: 'attendance (سجل الحضور)',
      pk: 'id',
      fk: 'session_id -> sessions.id, student_id -> students.id',
      fields: ['date', 'status [present/absent]', 'notes'],
      color: 'border-cyan-300 bg-cyan-50',
    },
    {
      name: 'payments_invoices (الفواتير والتحصيل)',
      pk: 'id',
      fk: 'student_id -> students.id, parent_id -> parents.id',
      fields: ['invoice_number', 'amount', 'paid_amount', 'receipt_number'],
      color: 'border-rose-300 bg-rose-50',
    },
    {
      name: 'payroll (مسير الرواتب)',
      pk: 'id',
      fk: 'teacher_id -> teachers.id',
      fields: ['month', 'year', 'sessions_count', 'gross_amount', 'net_salary'],
      color: 'border-lime-300 bg-lime-50',
    },
    {
      name: 'trial_lessons (الحصص التجريبية)',
      pk: 'id',
      fk: 'assigned_teacher_id -> teachers.id',
      fields: ['student_name_ar', 'scheduled_date', 'status [converted]'],
      color: 'border-fuchsia-300 bg-fuchsia-50',
    },
    {
      name: 'audit_logs (سجل الأمان والعمليات)',
      pk: 'id',
      fields: ['user_name', 'action_ar', 'module', 'timestamp', 'ip'],
      color: 'border-slate-300 bg-slate-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Database className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-black font-serif">
                {lang === 'ar' ? 'مخطط قاعدة البيانات والعلاقات (ER Diagram)' : 'Database ER Diagram'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'هيكلية الجداول والعلاقات المفتاحية في نظام Zakirly ERP'
                  : 'Relational Database Schema & Primary/Foreign Keys'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsERDiagramOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ER Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto p-1">
          {tables.map((t, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${t.color} text-xs shadow-sm space-y-2`}>
              <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-300/60 pb-1.5">
                <span>{t.name}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                  PK: {t.pk}
                </span>
              </div>

              {t.fk && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100/70 px-2 py-1 rounded border border-blue-200">
                  <Link2 className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>FK: {t.fk}</span>
                </div>
              )}

              <div className="space-y-1 text-slate-700">
                <span className="font-bold text-[10px] text-slate-500 uppercase">
                  {lang === 'ar' ? 'الأعمدة الرئيسية:' : 'Key Fields:'}
                </span>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 font-mono text-slate-800">
                  {t.fields.map((f, fi) => (
                    <li key={fi}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {lang === 'ar'
                ? 'يدعم النظام العلاقات والمزامنة اللحظية بين جميع الجداول أعلاه'
                : 'Realtime synchronized relational architecture'}
            </span>
          </div>
          <button
            onClick={() => setIsERDiagramOpen(false)}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
          >
            {lang === 'ar' ? 'إغلاق المخطط' : 'Close Diagram'}
          </button>
        </div>

      </div>
    </div>
  );
};
