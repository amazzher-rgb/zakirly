import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import { DatabaseSyncModal } from './DatabaseSyncModal';
import {
  Bell,
  Search,
  Globe,
  Radio,
  Building2,
  Sparkles,
  BookOpenCheck,
  RotateCcw,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Key,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  Coins,
  Database,
} from 'lucide-react';
import { CURRENCIES } from '../utils/currencyUtils';

export const Header: React.FC = () => {
  const {
    lang,
    setLang,
    activeTenantId,
    setActiveTenantId,
    currency,
    setCurrency,
    db,
    isRealtimeConnected,
    searchQuery,
    setSearchQuery,
    setIsNotificationOpen,
    role,
    resetDatabase,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    currentUser,
    logout,
  } = useApp();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passFeedback, setPassFeedback] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const availableTenants =
    role === 'supervisor_courses'
      ? db.tenants.filter((t) => t.id === 'tenant-zakirly-courses')
      : role === 'supervisor_curriculum'
      ? db.tenants.filter((t) => t.id === 'tenant-zakirly-curriculum')
      : role === 'supervisor' && currentUser?.tenantId
      ? db.tenants.filter((t) => t.id === currentUser.tenantId)
      : role === 'supervisor'
      ? db.tenants.filter((t) => t.id === 'tenant-zakirly-curriculum')
      : db.tenants;

  const currentTenant = availableTenants.find((t) => t.id === activeTenantId) || availableTenants[0] || db.tenants[0];
  const unreadCount = db.notifications.filter((n) => !n.read).length;

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword.length < 4) {
      setPassError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' : 'Password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (currentUser) {
      currentUser.password = newPassword;
      const userInDb = db.users.find((u) => u.id === currentUser.id || u.email === currentUser.email);
      if (userInDb) {
        userInDb.password = newPassword;
      }

      setPassFeedback(lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
      setTimeout(() => {
        setPassFeedback(null);
        setIsChangePassOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            aria-label="القائمة الرئيسية"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-rose-600" /> : <Menu className="w-5 h-5" />}
          </button>

          <Logo variant="full" size="md" showSlogan={true} />
        </div>

        {/* Tenant Branch Selector */}
        {availableTenants.length > 1 ? (
          <div className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-blue-600" />
            <select
              value={activeTenantId}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {lang === 'ar' ? t.nameAr : t.nameEn}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-slate-800">
              {lang === 'ar' ? currentTenant.nameAr : currentTenant.nameEn}
            </span>
          </div>
        )}

        {/* Currency Switcher Selector */}
        <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100/80 transition-colors px-2.5 py-1.5 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold" title="تغيير عملة الأكاديمية والعمليات المالية">
          <Coins className="w-4 h-4 text-amber-600 shrink-0" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-transparent border-none outline-none font-black text-amber-950 cursor-pointer text-xs"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameAr} ({c.symbolAr})
              </option>
            ))}
          </select>
        </div>

        {/* Search Everywhere (Desktop) */}
        <div className="flex-1 max-w-xs relative hidden lg:block">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث شامل (طلاب، معلمين، مواد، حصص)...'
                : 'Search everywhere (students, teachers, subjects)...'
            }
            className="w-full bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 ps-9 pe-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="lg:hidden p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200"
            title={lang === 'ar' ? 'بحث' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Realtime Live Sync & Database Status Button */}
          <button
            onClick={() => setIsDbModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer shadow-xs hover:shadow-sm ${
              isRealtimeConnected
                ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border-amber-200'
            }`}
            title={lang === 'ar' ? 'إعدادات المزامنة السحابية وقاعدة البيانات (Cloud SQL / Neon)' : 'Cloud Sync & Database Settings'}
          >
            <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="hidden sm:inline">
              {lang === 'ar' ? 'مزامنة السحابة' : 'Cloud Sync'}
            </span>
          </button>

          {/* Google Sheets Sync Button */}
          <button
            onClick={() => setIsSheetsModalOpen(true)}
            className="hidden sm:flex p-2 min-h-[38px] items-center gap-1.5 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200"
            title="مزامنة وتصدير مع Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets</span>
          </button>

          {/* Reset Demo Data Button (Super Admin) */}
          {role === 'super_admin' && (
            <button
              onClick={() => {
                if (confirm(lang === 'ar' ? 'هل تريد استعادة البيانات الافتراضية للأكاديمية؟' : 'Reset database to default seed state?')) {
                  resetDatabase();
                }
              }}
              className="hidden sm:flex p-2 min-h-[38px] min-w-[38px] items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-200"
              title={lang === 'ar' ? 'إعادة ضبط البيانات للوضع الافتراضي' : 'Reset Database'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200"
            title={lang === 'ar' ? 'التنبيهات والإشعارات' : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 bg-rose-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-all min-h-[38px]"
            title="تغيير اللغة / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Profile, Change Password & Logout Button */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 ps-1 sm:ps-2 border-s border-slate-200">
              <div className="hidden xl:flex flex-col text-end text-[11px] leading-tight">
                <span className="font-extrabold text-slate-900">{currentUser.name}</span>
                <span className="text-slate-500 text-[10px]">{currentUser.email}</span>
              </div>

              <button
                onClick={() => setIsChangePassOpen(true)}
                className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all border border-slate-200"
                title={lang === 'ar' ? 'تغيير كلمة المرور الشخصية' : 'Change Password'}
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-200 transition-all min-h-[38px]"
                title={lang === 'ar' ? 'تسجيل الخروج' : 'Log out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Mobile Search Bar Expandable Drawer */}
      {isMobileSearchOpen && (
        <div className="lg:hidden px-3 py-2 bg-slate-50 border-t border-slate-200 animate-fadeIn">
          <div className="relative max-w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'بحث شامل (طلاب، معلمين، مواد، حصص)...'
                  : 'Search everywhere...'
              }
              className="w-full bg-white text-xs font-medium text-slate-800 placeholder-slate-400 ps-9 pe-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal for Current User */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleChangePasswordSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {lang === 'ar' ? 'تغيير كلمة المرور للحساب' : 'Change Password'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsChangePassOpen(false);
                  setPassError(null);
                  setPassFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passFeedback}</span>
              </div>
            )}

            {passError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {passError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'كلمة المرور الجديدة*' : 'New Password*'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة*' : 'Confirm New Password*'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsChangePassOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
              >
                {lang === 'ar' ? 'تأكيد وتحديث' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsModal isOpen={isSheetsModalOpen} onClose={() => setIsSheetsModalOpen(false)} />

      {/* Cloud Database & Realtime Sync Modal */}
      <DatabaseSyncModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} />
    </header>
  );
};
