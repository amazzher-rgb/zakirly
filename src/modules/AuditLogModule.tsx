import React from 'react';
import { useApp } from '../context/AppContext';
import { History, Shield, Lock } from 'lucide-react';

export const AuditLogModule: React.FC = () => {
  const { db, lang } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'سجل الأمان والعمليات (Audit Trail)' : 'Audit Trail & Operations Log'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل حظي لجميع إجراءات النظام، التعديلات المالية، إكمال الحصص وعمليات التغيير.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-3.5 text-start">الوقت والتاريخ</th>
                <th className="p-3.5 text-start">المستخدم والدور</th>
                <th className="p-3.5 text-start">الإجراء</th>
                <th className="p-3.5 text-start">التفاصيل</th>
                <th className="p-3.5 text-center">عنوان IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {db.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-mono text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3.5 font-bold text-slate-900">{log.userName} ({log.userRole})</td>
                  <td className="p-3.5 font-extrabold text-blue-800">{log.actionAr}</td>
                  <td className="p-3.5 text-slate-600">{log.details}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
