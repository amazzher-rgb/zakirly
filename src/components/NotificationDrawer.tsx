import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Bell, AlertTriangle, CheckCircle2, Info, ArrowRight, CheckCheck } from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationOpen, setIsNotificationOpen, db, lang, setActiveModule, markAllNotificationsRead } = useApp();

  if (!isNotificationOpen) return null;

  const unreadCount = db.notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 end-0 max-w-full flex ps-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-s border-slate-200">
          
          {/* Drawer Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold">
                {lang === 'ar' ? 'مركز التنبيهات والإشعارات' : 'Notification Center'}
              </h2>
            </div>
            <button
              onClick={() => setIsNotificationOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Header / Mark All As Read Bar */}
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {lang === 'ar' ? `غير المقروءة: (${unreadCount})` : `Unread: (${unreadCount})`}
            </span>
            <button
              onClick={markAllNotificationsRead}
              disabled={unreadCount === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                unreadCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تعيين الكل كـ مقروء' : 'Mark all as read'}</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {db.notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                {lang === 'ar' ? 'لا توجد تنبيهات جديدة حالياً' : 'No new notifications'}
              </div>
            ) : (
              db.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-xs transition-all hover:shadow-md ${
                    n.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : n.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {n.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                      <span>{lang === 'ar' ? n.titleAr : n.titleEn}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-[11px] mb-2">
                    {lang === 'ar' ? n.messageAr : n.messageEn}
                  </p>

                  {n.linkModule && (
                    <button
                      onClick={() => {
                        setActiveModule(n.linkModule!);
                        setIsNotificationOpen(false);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      <span>{lang === 'ar' ? 'الانتقال للقسم' : 'View module'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
            {lang === 'ar' ? 'تحديث تلقائي عبر محرك Realtime' : 'Realtime System Alerts Active'}
          </div>

        </div>
      </div>
    </div>
  );
};
