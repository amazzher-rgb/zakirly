import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { CURRENCIES } from '../utils/currencyUtils';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  Globe,
  CalendarDays,
  CheckCircle2,
  Receipt,
  Banknote,
  Repeat,
  Sparkles,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  X,
  Building2,
  Coins,
  LogOut,
} from 'lucide-react';

interface MenuItem {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  allowedRoles: UserRole[];
}

export const Sidebar: React.FC = () => {
  const {
    role,
    lang,
    setLang,
    activeModule,
    setActiveModule,
    db,
    kpis,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    activeTenantId,
    setActiveTenantId,
    currency,
    setCurrency,
    logout,
    currentUser,
  } = useApp();

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

  const pendingRenewals = db.subscriptions.filter((s) => s.remainingSessions <= 2).length;
  const pendingTrials = db.trialLessons.filter((t) => t.status === 'scheduled').length;

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      titleAr: 'لوحة التحكم الرئيسيّة',
      titleEn: 'Dashboard Overview',
      icon: LayoutDashboard,
      allowedRoles: [
        'super_admin',
        'academic_director',
        'administrative_director',
        'teacher',
        'parent',
        'student',
        'accountant',
      ],
    },
    {
      id: 'students',
      titleAr: 'إدارة الطلاب',
      titleEn: 'Students Directory',
      icon: GraduationCap,
      badge: kpis.totalStudents,
      badgeColor: 'bg-blue-100 text-blue-800',
      allowedRoles: ['super_admin', 'academic_director', 'administrative_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum', 'parent', 'accountant'],
    },
    {
      id: 'teachers',
      titleAr: 'إدارة المعلمين',
      titleEn: 'Teachers Management',
      icon: Users,
      badge: db.teachers.length,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      allowedRoles: ['super_admin', 'academic_director', 'administrative_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum', 'accountant'],
    },
    {
      id: 'parents',
      titleAr: 'أولياء الأمور',
      titleEn: 'Parents Portal',
      icon: UserCheck,
      badge: db.parents.length,
      allowedRoles: ['super_admin', 'administrative_director', 'accountant'],
    },
    {
      id: 'courses',
      titleAr: 'المناهج الدراسية',
      titleEn: 'Academic Curricula',
      icon: BookOpen,
      allowedRoles: ['super_admin', 'academic_director', 'teacher', 'administrative_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum'],
    },
    {
      id: 'scheduling',
      titleAr: 'جدول الحصص والمواعيد',
      titleEn: 'Sessions & Schedule',
      icon: CalendarDays,
      badge: kpis.todaySessionsCount > 0 ? `${kpis.todaySessionsCount} اليوم` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
      allowedRoles: [
        'super_admin',
        'academic_director',
        'administrative_director',
        'supervisor',
        'supervisor_courses',
        'supervisor_curriculum',
        'teacher',
        'parent',
        'student',
      ],
    },
    {
      id: 'attendance',
      titleAr: 'سجل الحضور والغياب',
      titleEn: 'Attendance Log',
      icon: CheckCircle2,
      allowedRoles: ['super_admin', 'academic_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum', 'teacher', 'parent'],
    },
    {
      id: 'finance',
      titleAr: 'المالية والفواتير',
      titleEn: 'Finance & Invoices',
      icon: Receipt,
      badge: kpis.outstandingPayments > 0 ? 'مستحقات' : undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
      allowedRoles: ['super_admin', 'administrative_director', 'accountant', 'parent'],
    },
    {
      id: 'payroll',
      titleAr: 'مسير رواتب المعلمين',
      titleEn: 'Teacher Payroll',
      icon: Banknote,
      allowedRoles: ['super_admin', 'accountant', 'teacher'],
    },
    {
      id: 'subscriptions',
      titleAr: 'الاشتراكات والتجديد',
      titleEn: 'Subscriptions',
      badge: pendingRenewals > 0 ? `${pendingRenewals} تنبيه` : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 font-bold',
      icon: Repeat,
      allowedRoles: ['super_admin', 'academic_director', 'administrative_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum'],
    },
    {
      id: 'trial_lessons',
      titleAr: 'الحصص التجريبية',
      titleEn: 'Trial Lessons Funnel',
      icon: Sparkles,
      badge: pendingTrials > 0 ? pendingTrials : undefined,
      badgeColor: 'bg-purple-100 text-purple-800',
      allowedRoles: ['super_admin', 'academic_director', 'administrative_director', 'supervisor', 'supervisor_courses', 'supervisor_curriculum'],
    },
    {
      id: 'reports',
      titleAr: 'التقارير والتحليلات',
      titleEn: 'Reports & Analytics',
      icon: BarChart3,
      allowedRoles: ['super_admin', 'academic_director', 'administrative_director', 'accountant'],
    },
    {
      id: 'user_management',
      titleAr: 'إدارة المستخدمين والصلاحيات',
      titleEn: 'Roles & Permissions',
      icon: ShieldCheck,
      allowedRoles: ['super_admin'],
    },
    {
      id: 'audit_logs',
      titleAr: 'سجل العمليات والأمان',
      titleEn: 'Audit Trail',
      icon: History,
      allowedRoles: ['super_admin', 'administrative_director', 'accountant'],
    },
    {
      id: 'settings',
      titleAr: 'الإعدادات والنسخ الاحتياطي',
      titleEn: 'Settings & Backups',
      icon: Settings,
      allowedRoles: ['super_admin'],
    },
  ];

  const visibleItems = menuItems.filter((item) => item.allowedRoles.includes(role));

  const handleSelectModule = (id: string) => {
    setActiveModule(id);
    setIsMobileMenuOpen(false);
  };

  const renderNavList = () => (
    <div className="space-y-1">
      <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        {lang === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
      </div>

      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSelectModule(item.id)}
            className={`w-full flex items-center justify-between px-3.5 py-3 md:py-2.5 rounded-xl text-xs font-medium transition-all group min-h-[44px] ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`}
              />
              <span>{lang === 'ar' ? item.titleAr : item.titleEn}</span>
            </div>

            {item.badge !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white text-blue-700' : item.badgeColor || 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 border-e border-slate-800 min-h-[calc(100vh-65px)] flex-col justify-between p-3 select-none shrink-0">
        {renderNavList()}

        {/* Footer Branding Card */}
        <div className="mt-6 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center text-xs">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ذاكرلي ERP</span>
          </div>
          <p className="text-[10px] text-slate-400">
            نظام متكامل ومحرك تحديث لحظي للأكاديميات التعليمية
          </p>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar Container */}
          <aside className="fixed inset-y-0 start-0 w-80 max-w-[88vw] bg-slate-900 text-slate-300 h-full overflow-y-auto p-4 flex flex-col justify-between shadow-2xl z-50 animate-slideInStart border-e border-slate-800">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-white text-sm">أكاديمية ذاكرلي</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700"
                  aria-label="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Controls Box (Tenant + Currency + Language) */}
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>فرع الأكاديمية:</span>
                  </label>
                  {availableTenants.length > 1 ? (
                    <select
                      value={activeTenantId}
                      onChange={(e) => setActiveTenantId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs p-2 rounded-lg outline-none"
                    >
                      {availableTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {lang === 'ar' ? t.nameAr : t.nameEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-extrabold text-xs p-2 rounded-lg">
                      {lang === 'ar' ? currentTenant.nameAr : currentTenant.nameEn}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>العملة:</span>
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs p-2 rounded-lg outline-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbolAr})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>اللغة:</span>
                    </label>
                    <button
                      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs p-2 rounded-lg text-center hover:bg-slate-800 transition-colors"
                    >
                      {lang === 'ar' ? 'العربية 🇸🇦' : 'English 🇬🇧'}
                    </button>
                  </div>
                </div>
              </div>

              {renderNavList()}
            </div>

            {/* Drawer Footer */}
            <div className="mt-6 pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs border border-rose-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من الحساب</span>
              </button>

              <div className="p-2.5 rounded-xl bg-slate-800/80 text-center text-[11px] text-slate-400">
                <span className="text-amber-400 font-bold">ذاكرلي ERP - للهاتف</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
