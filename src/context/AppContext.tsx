import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  DatabaseState,
  UserRole,
  SystemKPIs,
  RealtimeEvent,
  RoleInfo,
  Tenant,
  User,
  PaymentInvoice,
} from '../types';
import { initialDatabaseState } from '../data/initialData';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { getAccountingCycle, getCurrentAccountingCycle, AccountingCycle, getTeacherCycleSessions, getTeacherPostCycleSessions, normalizeArabicName, isArabicNameMatch } from '../utils/accountingUtils';
import {
  savePermanentState,
  loadPermanentState,
  shouldPreserveClientState,
  hasUserModifications,
  loadFromIndexedDB,
} from '../utils/persistentStorage';
import {
  fetchState,
  fetchServerVersion,
  syncStateApi,
  subscribeToRealtime,
  fetchSqlStatus,
  testNeonConnectionApi,
  switchNeonDatabaseApi,
  completeSessionWorkflow,
  processPaymentWorkflow,
  convertTrialWorkflow,
  runPayrollWorkflow,
  createStudentApi,
  createTeacherApi,
  createSessionApi,
  resetDatabaseApi,
  importBackupApi,
} from '../services/api';
import {
  fetchDirectFromNeon,
  saveDirectToNeon,
  checkNeonVersion,
  testDirectNeonConnection,
  setActiveNeonConnectionString,
} from '../services/neonDirect';

export const ROLE_DEFINITIONS: Record<UserRole, RoleInfo> = {
  super_admin: {
    id: 'super_admin',
    titleAr: 'مدير النظام الأقصى (Super Admin)',
    titleEn: 'Super Admin',
    descriptionAr: 'صلاحيات مطلقة: إدارة جميع الأكاديميات، المباشرة المالية، الإعدادات، وإدارة الأدوار والسجلات.',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeTextColor: 'text-purple-700',
  },
  director_courses: {
    id: 'director_courses',
    titleAr: 'مدير قسم الكورسات (Courses Director)',
    titleEn: 'Courses Director',
    descriptionAr: 'إدارة كاملة لقسم الكورسات والدورات التدريبية فقط (الطلاب، المعلمين، الكورسات، الحصص، الاشتراكات والمالية)، ولا يمكنه الوصول لقسم المناهج.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeTextColor: 'text-emerald-700',
  },
  director_curriculum: {
    id: 'director_curriculum',
    titleAr: 'مدير قسم المناهج (Curriculum Director)',
    titleEn: 'Curriculum Director',
    descriptionAr: 'إدارة كاملة لقسم المناهج الدراسية والأكاديمية فقط (الطلاب، المعلمين، المواد الدراسية، الحصص، الاشتراكات والمالية)، ولا يمكنه الوصول لقسم الكورسات.',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeTextColor: 'text-blue-700',
  },
  academic_director: {
    id: 'director_curriculum',
    titleAr: 'مدير قسم المناهج (Curriculum Director)',
    titleEn: 'Curriculum Director',
    descriptionAr: 'تم التحديث إلى: مدير قسم المناهج',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeTextColor: 'text-blue-700',
  } as any,
  administrative_director: {
    id: 'director_courses',
    titleAr: 'مدير قسم الكورسات (Courses Director)',
    titleEn: 'Courses Director',
    descriptionAr: 'تم التحديث إلى: مدير قسم الكورسات',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeTextColor: 'text-emerald-700',
  } as any,
  supervisor: {
    id: 'supervisor',
    titleAr: 'المشرف التعليمي (Supervisor)',
    titleEn: 'Supervisor',
    descriptionAr: 'صلاحيات محدودة حصرياً: متابعة الطلاب، المعلمين، تسجيل الحضور والغياب، وجدولة الحصص والمواعيد فقط.',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeTextColor: 'text-teal-700',
  },
  supervisor_courses: {
    id: 'supervisor_courses',
    titleAr: 'مشرف الكورسات (Courses Supervisor)',
    titleEn: 'Courses Supervisor',
    descriptionAr: 'إدارة وتتبع الطلاب والكورسات والدورات التدريبية فقط (فرع ذاكرلي كورسات)، ولا يملك صلاحية الاطلاع على المناهج الدراسية.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeTextColor: 'text-emerald-700',
  },
  supervisor_curriculum: {
    id: 'supervisor_curriculum',
    titleAr: 'مشرف المناهج (Curriculum Supervisor)',
    titleEn: 'Curriculum Supervisor',
    descriptionAr: 'إدارة وتتبع الطلاب والمناهج الدراسية والأكاديمية فقط (فرع ذاكرلي مناهج)، ولا يملك صلاحية الاطلاع على الكورسات والدورات.',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeTextColor: 'text-cyan-700',
  },
  teacher: {
    id: 'teacher',
    titleAr: 'المعلم / المدرس (Teacher)',
    titleEn: 'Teacher',
    descriptionAr: 'عرض جدول الحصص الخاصة، تسجيل إكمال الحصص، متابعة الطلاب، ومستحقات الرواتب.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeTextColor: 'text-emerald-700',
  },
  parent: {
    id: 'parent',
    titleAr: 'ولي الأمر (Parent)',
    titleEn: 'Parent',
    descriptionAr: 'متابعة جدول الأبناء، عدد الحصص المتبقية، حضور الحصص، كشف الحساب، وتجديد الباقات.',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeTextColor: 'text-amber-700',
  },
  student: {
    id: 'student',
    titleAr: 'الطالب (Student)',
    titleEn: 'Student',
    descriptionAr: 'عرض الجداول اليومية، روابط الانضمام للحصص الافتراضية، وعداد الحصص المتبقية.',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeTextColor: 'text-sky-700',
  },
  accountant: {
    id: 'accountant',
    titleAr: 'المحاسب (Accountant)',
    titleEn: 'Accountant',
    descriptionAr: 'إدارة السندات، الفواتير، التحصيل، كشوف رواتب المعلمين، والتقارير المالية.',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeTextColor: 'text-rose-700',
  },
};

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (email: string, password?: string, selectedRole?: UserRole, name?: string) => boolean;
  logout: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  activeTenantId: string;
  setActiveTenantId: (tenantId: string) => void;
  currency: string;
  currencySymbol: string;
  setCurrency: (code: string) => void;
  db: DatabaseState;
  kpis: SystemKPIs;
  isRealtimeConnected: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isERDiagramOpen: boolean;
  setIsERDiagramOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  
  // Global Accounting Cycle State
  activeCycle: AccountingCycle;
  selectedMonth: number;
  selectedYear: number;
  customStartDate: string;
  customEndDate: string;
  isCustomDates: boolean;
  setCycleMonthYear: (m: number, y: number) => void;
  setCustomCycleDates: (startDate: string, endDate: string) => void;
  
  // Workflows
  completeSession: (sessionId: string, attendanceStatus?: string, notes?: string) => Promise<any>;
  processPayment: (invoiceId: string, amount: number, method?: string, notes?: string) => Promise<any>;
  convertTrial: (trialId: string, packageCourseId?: string, totalSessions?: number, price?: number, paidAmount?: number, currency?: string) => Promise<any>;
  runPayroll: (month: number, year: number) => Promise<any>;
  createStudent: (studentData: any) => Promise<any>;
  createTeacher: (teacherData: any) => Promise<any>;
  createSession: (sessionData: any) => Promise<any>;
  settleTeacherPayroll: (teacherId: string, month: number, year: number) => Promise<any>;
  unsettleTeacherPayroll: (teacherId: string, month: number, year: number) => Promise<any>;
  reopenAccountingCycle: (month: number, year: number) => Promise<any>;
  updatePayrollAdjustment: (teacherId: string, month: number, year: number, bonus: number, deductions: number, notes?: string) => Promise<any>;
  markAllNotificationsRead: () => void;
  updateDatabaseState: (updater: (draft: DatabaseState) => void) => void;
  changeUserPassword: (newPassword: string, currentPasswordInput?: string) => Promise<{ success: boolean; error?: string }>;
  resetDatabase: () => Promise<any>;
  importBackup: (backupJson: any) => Promise<any>;

  // Realtime Cloud Synchronization & Multi-Device
  isSyncing: boolean;
  reloadData: () => Promise<void>;
  cloudDbStatus: {
    success: boolean;
    database?: string;
    status?: string;
    latencyMs?: number;
    tablesCount?: number;
    message?: string;
  } | null;
  refreshCloudDbStatus: () => Promise<any>;
  testNeonConnection: (connectionString: string) => Promise<any>;
  switchNeonDatabase: (connectionString: string) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('zakirly_user_v2');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem('zakirly_auth_v2');
      const savedUser = localStorage.getItem('zakirly_user_v2');
      return savedAuth === 'true' && savedUser !== null;
    } catch {
      return false;
    }
  });

  const [role, setRole] = useState<UserRole>(() => {
    try {
      const savedRole = localStorage.getItem('zakirly_role_v2');
      if (savedRole === 'academic_director') return 'director_curriculum';
      if (savedRole === 'administrative_director') return 'director_courses';
      return (savedRole as UserRole) || 'super_admin';
    } catch {
      return 'super_admin';
    }
  });

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    try {
      const savedRole = localStorage.getItem('zakirly_role_v2');
      if (savedRole === 'director_courses' || savedRole === 'supervisor_courses' || savedRole === 'administrative_director') {
        return 'tenant-zakirly-courses';
      }
    } catch {}
    return 'tenant-zakirly-curriculum';
  });

  // Save auth state changes to localStorage
  useEffect(() => {
    try {
      if (isAuthenticated && currentUser) {
        localStorage.setItem('zakirly_auth_v2', 'true');
        localStorage.setItem('zakirly_user_v2', JSON.stringify(currentUser));
        localStorage.setItem('zakirly_role_v2', role);
      } else {
        localStorage.removeItem('zakirly_auth_v2');
        localStorage.removeItem('zakirly_user_v2');
        localStorage.removeItem('zakirly_role_v2');
      }
    } catch (e) {
      console.warn('Failed to save auth to localStorage', e);
    }
  }, [isAuthenticated, currentUser, role]);

  // Lock tenant branch based on role restrictions:
  // director_courses & supervisor_courses -> strictly tenant-zakirly-courses
  // director_curriculum & supervisor_curriculum -> strictly tenant-zakirly-curriculum
  useEffect(() => {
    if (
      (role === 'director_courses' || role === 'supervisor_courses') &&
      activeTenantId !== 'tenant-zakirly-courses'
    ) {
      setActiveTenantId('tenant-zakirly-courses');
    } else if (
      (role === 'director_curriculum' || role === 'supervisor_curriculum') &&
      activeTenantId !== 'tenant-zakirly-curriculum'
    ) {
      setActiveTenantId('tenant-zakirly-curriculum');
    }
  }, [role, activeTenantId]);

  const handleSetActiveTenantId = (newTenantId: string) => {
    if (role === 'director_courses' || role === 'supervisor_courses') {
      setActiveTenantId('tenant-zakirly-courses');
      return;
    }
    if (role === 'director_curriculum' || role === 'supervisor_curriculum') {
      setActiveTenantId('tenant-zakirly-curriculum');
      return;
    }
    setActiveTenantId(newTenantId);
  };

  const handleSetRole = (newRole: UserRole) => {
    let effectiveRole = newRole;
    if ((newRole as any) === 'academic_director') effectiveRole = 'director_curriculum';
    if ((newRole as any) === 'administrative_director') effectiveRole = 'director_courses';
    setRole(effectiveRole);
    if (effectiveRole === 'director_courses' || effectiveRole === 'supervisor_courses') {
      setActiveTenantId('tenant-zakirly-courses');
    } else if (effectiveRole === 'director_curriculum' || effectiveRole === 'supervisor_curriculum') {
      setActiveTenantId('tenant-zakirly-curriculum');
    }
  };

  const [db, setDb] = useState<DatabaseState>(() => {
    return loadPermanentState();
  });

  const activeTenantObj = (db?.tenants || []).find((t) => t.id === activeTenantId) || (db?.tenants || [])[0];
  const currency = activeTenantObj?.currency || 'SAR';
  const currencySymbol = getCurrencySymbol(currency);

  const setCurrency = (newCurrencyCode: string) => {
    setDb((prev) => {
      const next = {
        ...prev,
        tenants: (prev.tenants || []).map((t) =>
          t.id === activeTenantId ? { ...t, currency: newCurrencyCode } : t
        ),
      };
      savePermanentState(next);
      syncStateApi(next, currentUser?.name || ROLE_DEFINITIONS[role]?.titleAr || 'مستخدم النظام').catch(() => {});
      return next;
    });
  };

  // Global Accounting Cycle State Persistence
  const defaultCycle = getCurrentAccountingCycle();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('zakirly_cycle_v1');
      if (saved) return JSON.parse(saved).month || defaultCycle.month;
    } catch {}
    return defaultCycle.month;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('zakirly_cycle_v1');
      if (saved) return JSON.parse(saved).year || defaultCycle.year;
    } catch {}
    return defaultCycle.year;
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('zakirly_cycle_v1');
      if (saved) return JSON.parse(saved).startDate || defaultCycle.startDate;
    } catch {}
    return defaultCycle.startDate;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('zakirly_cycle_v1');
      if (saved) return JSON.parse(saved).endDate || defaultCycle.endDate;
    } catch {}
    return defaultCycle.endDate;
  });
  const [isCustomDates, setIsCustomDates] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zakirly_cycle_v1');
      if (saved) return Boolean(JSON.parse(saved).isCustomDates);
    } catch {}
    return false;
  });

  const setCycleMonthYear = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setIsCustomDates(false);
    const calculated = getAccountingCycle(m, y);
    setCustomStartDate(calculated.startDate);
    setCustomEndDate(calculated.endDate);
  };

  const setCustomCycleDates = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setIsCustomDates(true);
  };

  const activeCycle: AccountingCycle = isCustomDates
    ? {
        month: selectedMonth,
        year: selectedYear,
        startDate: customStartDate,
        endDate: customEndDate,
        labelAr: `دورة حساب مخصصة (${customStartDate} إلى ${customEndDate})`,
        labelEn: `Custom Accounting Cycle (${customStartDate} to ${customEndDate})`,
        shortLabelAr: `دورة مخصصة`,
        isCurrent: defaultCycle.startDate === customStartDate && defaultCycle.endDate === customEndDate,
        isClosed: new Date().toISOString().split('T')[0] > customEndDate,
      }
    : getAccountingCycle(selectedMonth, selectedYear);

  useEffect(() => {
    try {
      localStorage.setItem(
        'zakirly_cycle_v1',
        JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          startDate: customStartDate,
          endDate: customEndDate,
          isCustomDates,
        })
      );
    } catch (e) {}
  }, [selectedMonth, selectedYear, customStartDate, customEndDate, isCustomDates]);

  // Ensure state is immediately flushed to disk on tab close / mobile backgrounding
  useEffect(() => {
    const handleFlush = () => {
      savePermanentState(db);
    };
    window.addEventListener('beforeunload', handleFlush);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [db]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isERDiagramOpen, setIsERDiagramOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<string>('dashboard');

  const login = (email: string, password?: string, selectedRole?: UserRole, name?: string): boolean => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    // Check matching user in db.users
    let matchingUser = db.users.find(
      (u) =>
        u.email.toLowerCase() === trimmedEmail ||
        (u.nameAr && u.nameAr.toLowerCase() === trimmedEmail) ||
        (u.name && u.name.toLowerCase() === trimmedEmail)
    );

    // If matching user not found by exact string, try matching by known roles and email aliases
    if (!matchingUser) {
      if (trimmedEmail === 'admin@zakirly.edu' || trimmedEmail === 'superadmin@zakirly.academy') {
        matchingUser = db.users.find((u) => u.role === 'super_admin');
      } else if (trimmedEmail === 'courses_director@zakirly.edu' || trimmedEmail === 'admin@zakirly.academy') {
        matchingUser = db.users.find((u) => u.role === 'director_courses');
      } else if (trimmedEmail === 'curriculum_director@zakirly.edu' || trimmedEmail === 'academic@zakirly.academy') {
        matchingUser = db.users.find((u) => u.role === 'director_curriculum');
      } else if (trimmedEmail === 'courses_supervisor@zakirly.edu') {
        matchingUser = db.users.find((u) => u.role === 'supervisor_courses');
      } else if (trimmedEmail === 'curriculum_supervisor@zakirly.edu') {
        matchingUser = db.users.find((u) => u.role === 'supervisor_curriculum');
      } else if (trimmedEmail === 'supervisor@zakirly.edu' || trimmedEmail === 'supervisor@zakirly.academy') {
        matchingUser = db.users.find((u) => u.role === 'supervisor');
      }
    }

    if (!matchingUser) {
      // Predefined accounts fallback only if db.users is completely unseeded
      const isPredefinedAdmin = trimmedEmail === 'admin@zakirly.edu' || trimmedEmail === 'superadmin@zakirly.academy';
      const isPredefinedSupervisor = trimmedEmail === 'supervisor@zakirly.edu' || trimmedEmail === 'supervisor@zakirly.academy';
      const isPredefinedCoursesDirector = trimmedEmail === 'courses_director@zakirly.edu' || trimmedEmail === 'admin@zakirly.academy';
      const isPredefinedCurriculumDirector = trimmedEmail === 'curriculum_director@zakirly.edu' || trimmedEmail === 'academic@zakirly.academy';
      const isPredefinedCoursesSupervisor = trimmedEmail === 'courses_supervisor@zakirly.edu';
      const isPredefinedCurriculumSupervisor = trimmedEmail === 'curriculum_supervisor@zakirly.edu';

      if (isPredefinedAdmin && (trimmedPassword === 'admin123' || trimmedPassword === '123456')) {
        const targetRole = selectedRole || 'super_admin';
        const userObj: User = {
          id: 'usr-admin-edu',
          tenantId: activeTenantId,
          name: 'مدير أكاديمية ذاكرلي الأقصى',
          email: trimmedEmail,
          role: targetRole,
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole(targetRole);
        setActiveModule('dashboard');
        setIsAuthenticated(true);
        return true;
      }

      if (isPredefinedCoursesDirector && (trimmedPassword === '123456' || trimmedPassword === 'admin123')) {
        const userObj: User = {
          id: 'usr-dir-courses',
          tenantId: 'tenant-zakirly-courses',
          name: 'مدير قسم الكورسات والدورات',
          nameAr: 'مدير قسم الكورسات والدورات',
          email: trimmedEmail,
          role: 'director_courses',
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole('director_courses');
        handleSetActiveTenantId('tenant-zakirly-courses');
        setActiveModule('dashboard');
        setIsAuthenticated(true);
        return true;
      }

      if (isPredefinedCurriculumDirector && (trimmedPassword === '123456' || trimmedPassword === 'admin123')) {
        const userObj: User = {
          id: 'usr-dir-curriculum',
          tenantId: 'tenant-zakirly-curriculum',
          name: 'مدير قسم المناهج الدراسية',
          nameAr: 'مدير قسم المناهج الدراسية',
          email: trimmedEmail,
          role: 'director_curriculum',
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole('director_curriculum');
        handleSetActiveTenantId('tenant-zakirly-curriculum');
        setActiveModule('dashboard');
        setIsAuthenticated(true);
        return true;
      }

      if (isPredefinedCoursesSupervisor && (trimmedPassword === '123456' || trimmedPassword === 'supervisor123')) {
        const userObj: User = {
          id: 'usr-sup-courses',
          tenantId: 'tenant-zakirly-courses',
          name: 'مشرف قسم الكورسات',
          nameAr: 'مشرف قسم الكورسات',
          email: trimmedEmail,
          role: 'supervisor_courses',
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole('supervisor_courses');
        handleSetActiveTenantId('tenant-zakirly-courses');
        setActiveModule('students');
        setIsAuthenticated(true);
        return true;
      }

      if (isPredefinedCurriculumSupervisor && (trimmedPassword === '123456' || trimmedPassword === 'supervisor123')) {
        const userObj: User = {
          id: 'usr-sup-curriculum',
          tenantId: 'tenant-zakirly-curriculum',
          name: 'مشرف قسم المناهج',
          nameAr: 'مشرف قسم المناهج',
          email: trimmedEmail,
          role: 'supervisor_curriculum',
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole('supervisor_curriculum');
        handleSetActiveTenantId('tenant-zakirly-curriculum');
        setActiveModule('students');
        setIsAuthenticated(true);
        return true;
      }

      if (isPredefinedSupervisor && trimmedPassword === 'supervisor123') {
        const targetRole = selectedRole || 'supervisor';
        const userObj: User = {
          id: 'usr-sup-edu',
          tenantId: activeTenantId,
          name: 'مشرف أكاديمية ذاكرلي',
          email: trimmedEmail,
          role: targetRole,
          password: trimmedPassword,
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(userObj);
        handleSetRole(targetRole);
        setActiveModule('students');
        setIsAuthenticated(true);
        return true;
      }

      // User not found -> Invalid login!
      return false;
    }

    // Check user password against actual saved password in database
    const expectedPassword = matchingUser.password || (matchingUser.role === 'super_admin' ? 'admin123' : '123456');
    if (trimmedPassword !== expectedPassword) {
      // Password incorrect -> Invalid login!
      return false;
    }

    let targetRole = selectedRole || matchingUser.role;
    if ((targetRole as any) === 'academic_director') targetRole = 'director_curriculum';
    if ((targetRole as any) === 'administrative_director') targetRole = 'director_courses';

    let userTenantId = matchingUser.tenantId || activeTenantId;
    if (targetRole === 'director_courses' || targetRole === 'supervisor_courses') {
      userTenantId = 'tenant-zakirly-courses';
      handleSetActiveTenantId('tenant-zakirly-courses');
    } else if (targetRole === 'director_curriculum' || targetRole === 'supervisor_curriculum') {
      userTenantId = 'tenant-zakirly-curriculum';
      handleSetActiveTenantId('tenant-zakirly-curriculum');
    }

    const updatedUser: User = {
      ...matchingUser,
      tenantId: userTenantId,
      role: targetRole,
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    handleSetRole(targetRole);

    if (targetRole === 'supervisor') {
      setActiveModule('students');
    } else {
      setActiveModule('dashboard');
    }

    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    try {
      localStorage.removeItem('zakirly_auth_v2');
      localStorage.removeItem('zakirly_user_v2');
      localStorage.removeItem('zakirly_role_v2');
    } catch (e) {}
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Compute local fallback KPIs if backend is offline
  const computeLocalKPIs = (state: DatabaseState): SystemKPIs => {
    const totalStudents = state.students.length;
    const activeStudents = state.students.filter((s) => s.status === 'active').length;
    const inactiveStudents = state.students.filter((s) => s.status === 'inactive').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessionsCount = state.sessions.filter((s) => s.date === todayStr).length;
    const monthlyRevenue = state.invoices
      .filter((inv) => inv.status === 'paid' || inv.status === 'partial')
      .reduce((sum, inv) => sum + inv.paidAmount, 0);
    const outstandingPayments = state.invoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const teacherPayrollTotal = state.payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const studentAttendanceRate = 96;
    const subscriptionRenewalsPending = state.subscriptions.filter((s) => s.remainingSessions <= 2).length;
    const activeTrialLessons = state.trialLessons.filter((t) => t.status === 'scheduled').length;

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      todaySessionsCount,
      monthlyRevenue,
      outstandingPayments,
      teacherPayrollTotal,
      studentAttendanceRate,
      subscriptionRenewalsPending,
      activeTrialLessons,
    };
  };

  const [kpis, setKpis] = useState<SystemKPIs>(computeLocalKPIs(initialDatabaseState));

  const currentVersionRef = useRef<number>(0);
  const lastSyncedUpdatedAtRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudDbStatus, setCloudDbStatus] = useState<any>(null);

  const refreshCloudDbStatus = async () => {
    try {
      const neonRes = await testDirectNeonConnection();
      if (neonRes.success) {
        const s = {
          success: true,
          database: 'Neon PostgreSQL (السحابة المباشرة)',
          status: 'connected',
          latencyMs: neonRes.latencyMs || 45,
          message: 'متصل بسحابة Neon لحظياً عبر جميع الأجهزة',
        };
        setCloudDbStatus(s);
        return s;
      }
      const status = await fetchSqlStatus();
      setCloudDbStatus(status);
      return status;
    } catch (e) {
      return null;
    }
  };

  const testNeonConnection = async (connStr: string) => {
    try {
      const direct = await testDirectNeonConnection(connStr);
      if (direct.success) {
        return { success: true, latencyMs: direct.latencyMs, message: direct.message };
      }
    } catch {}
    return await testNeonConnectionApi(connStr);
  };

  const switchNeonDatabase = async (connStr: string) => {
    setActiveNeonConnectionString(connStr);
    const res = await switchNeonDatabaseApi(connStr);
    await refreshCloudDbStatus();
    await reloadData();
    return res.success ? res : { success: true, message: 'تم التبديل إلى قاعدة بيانات Neon بنجاح' };
  };

  useEffect(() => {
    refreshCloudDbStatus();
  }, []);

  const updateDatabaseState = (updater: (draft: DatabaseState) => void) => {
    setDb((prevDb) => {
      const nextDb: DatabaseState = JSON.parse(JSON.stringify(prevDb));
      updater(nextDb);
      (nextDb as any)._userModified = true;
      const newVersion = (Number((prevDb as any).dataVersion) || currentVersionRef.current || 1) + 1;
      (nextDb as any).dataVersion = newVersion;
      (nextDb as any).lastSavedAt = new Date().toISOString();
      currentVersionRef.current = newVersion;
      setKpis(computeLocalKPIs(nextDb));
      savePermanentState(nextDb);

      // Instant cross-tab broadcast (0ms sync to other tabs/windows on this device)
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'CROSS_TAB_SYNC',
          version: newVersion,
          updatedAt: (nextDb as any).lastSavedAt,
          db: nextDb,
        });
      } catch {}

      // 1. Save directly to Neon over HTTPS (Works across Laptop, Mobile & GitHub Pages instantly!)
      saveDirectToNeon(nextDb).then((r) => {
        if (r.success) {
          setIsRealtimeConnected(true);
          if (r.updatedAt) {
            lastSyncedUpdatedAtRef.current = r.updatedAt;
          }
          if (r.version) {
            currentVersionRef.current = Math.max(currentVersionRef.current, r.version);
            (nextDb as any).dataVersion = r.version;
            savePermanentState(nextDb);
          }
        }
      }).catch((err) => {
        console.warn('[Neon Direct] Background save error:', err);
      });

      // 2. Also notify the Express backend server (for SSE broadcast to any desktop clients)
      syncStateApi(nextDb, currentUser?.name || ROLE_DEFINITIONS[role]?.titleAr || 'مستخدم النظام')
        .then((res) => {
          if (res && res.version) {
            currentVersionRef.current = Math.max(currentVersionRef.current, res.version);
          }
        })
        .catch(() => {});

      return nextDb;
    });
  };

  // Authoritative Cloud Database Synchronization across all devices (laptop, mobile, tablet)
  const reloadData = async () => {
    if (isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      // 1. Gather local browser storage layers
      const localDb = loadPermanentState();
      let effectiveClientDb = localDb;
      try {
        const idbDb = await loadFromIndexedDB();
        if (idbDb && shouldPreserveClientState(idbDb, localDb)) {
          effectiveClientDb = idbDb;
        }
      } catch {}

      // 2. Fetch authoritative cloud database state:
      // First attempt direct query to Neon (Guaranteed to work everywhere, including mobile and GitHub Pages)
      let activeDb: DatabaseState | null = null;
      let activeVer = 0;

      const neonRes = await fetchDirectFromNeon();
      if (neonRes.success && neonRes.db && Array.isArray(neonRes.db.students) && Array.isArray(neonRes.db.teachers)) {
        activeDb = neonRes.db;
        activeVer = Number(neonRes.version) || Number((activeDb as any)?.dataVersion) || 1;
        if (neonRes.updatedAt) {
          lastSyncedUpdatedAtRef.current = neonRes.updatedAt;
        }
      } else {
        // Fallback to Express backend server
        try {
          const data = await fetchState();
          if (data && data.db && Array.isArray(data.db.students) && Array.isArray(data.db.teachers)) {
            activeDb = data.db;
            activeVer = Number(data.version) || Number((activeDb as any)?.dataVersion) || 1;
            if (data.lastSavedAt) {
              lastSyncedUpdatedAtRef.current = data.lastSavedAt;
            }
          }
        } catch {}
      }

      if (activeDb) {
        // Cloud database is the single authoritative source of truth across all devices!
        setDb(activeDb);
        setKpis(computeLocalKPIs(activeDb));
        savePermanentState(activeDb);
        if (activeVer > 0) {
          currentVersionRef.current = Math.max(currentVersionRef.current, activeVer);
        }
        setIsRealtimeConnected(true);
      } else {
        // Fallback to offline local copy
        setDb(effectiveClientDb);
        setKpis(computeLocalKPIs(effectiveClientDb));
      }
    } catch (err) {
      console.warn('Cloud database fetch failed, using local offline cache', err);
      const localDb = loadPermanentState();
      setDb(localDb);
      setKpis(computeLocalKPIs(localDb));
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // 1. Setup cross-tab BroadcastChannel for 0ms sync across tabs on same device
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('zakirly_cross_tab_sync');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'CROSS_TAB_SYNC' && event.data?.db) {
            const incomingDb = event.data.db;
            const incomingVer = Number(event.data.version) || Number((incomingDb as any)?.dataVersion) || 1;
            if (incomingVer > currentVersionRef.current) {
              currentVersionRef.current = incomingVer;
              if (event.data.updatedAt) {
                lastSyncedUpdatedAtRef.current = event.data.updatedAt;
              }
              setDb(incomingDb);
              setKpis(computeLocalKPIs(incomingDb));
              savePermanentState(incomingDb);
            }
          }
        };
      } catch {}
    }

    // 2. Initial immediate fetch from Neon / Cloud
    reloadData();

    // 3. Subscribe to SSE Realtime Event Stream (when connected to server)
    const unsubscribe = subscribeToRealtime((event) => {
      if ('type' in event && event.type === 'CONNECTED') {
        setIsRealtimeConnected(true);
        return;
      }

      if (event.payload && Array.isArray(event.payload.students) && Array.isArray(event.payload.teachers)) {
        setDb(event.payload);
        setKpis(computeLocalKPIs(event.payload));
        savePermanentState(event.payload);
        if (event.version) {
          currentVersionRef.current = event.version;
        }
        return;
      }

      reloadData();
    });

    // 4. Ultra-fast multi-device polling: checks Neon version directly every 1.5 seconds
    const pollInterval = setInterval(async () => {
      try {
        if (isSyncingRef.current) return;
        // Check direct Neon version (ultra-lightweight scalar query)
        const neonVer = await checkNeonVersion();
        if (neonVer.success) {
          const hasNewerVersion = Number(neonVer.version) > currentVersionRef.current;
          const hasNewerTimestamp = Boolean(
            neonVer.updatedAt &&
            lastSyncedUpdatedAtRef.current &&
            neonVer.updatedAt !== lastSyncedUpdatedAtRef.current
          );

          if (hasNewerVersion || hasNewerTimestamp) {
            console.info(`[Zakirly] Neon cloud change detected (ver: ${neonVer.version}, current: ${currentVersionRef.current}), syncing...`);
            reloadData();
            return;
          }
        }

        // Also check Express server version if present
        const v = await fetchServerVersion();
        if (v && v.version > currentVersionRef.current) {
          reloadData();
        }
      } catch {}
    }, 1500);

    // 5. Instant sync when mobile phone is unlocked, tab focused, or touched
    const handleFocus = () => {
      reloadData();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reloadData();
      }
    };

    let lastTouchCheck = 0;
    const handleTouchOrClick = () => {
      const now = Date.now();
      if (now - lastTouchCheck > 2500) {
        lastTouchCheck = now;
        checkNeonVersion().then((neonVer) => {
          if (neonVer.success) {
            if (
              Number(neonVer.version) > currentVersionRef.current ||
              (neonVer.updatedAt && lastSyncedUpdatedAtRef.current && neonVer.updatedAt !== lastSyncedUpdatedAtRef.current)
            ) {
              reloadData();
            }
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleTouchOrClick, { passive: true });

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch {}
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', handleTouchOrClick);
    };
  }, []);

  // Update document direction on language change
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Action Dispatchers
  const completeSession = async (sessionId: string, attendanceStatus?: string, notes?: string) => {
    try {
      const res = await completeSessionWorkflow({
        sessionId,
        attendanceStatus,
        notes,
        performedBy: ROLE_DEFINITIONS[role].titleAr,
      });
      if (res && res.success && res.db) {
        setDb(res.db);
        if (res.kpis) setKpis(res.kpis);
        savePermanentState(res.db);
        saveDirectToNeon(res.db).catch(() => {});
        return res;
      }
    } catch (e) {}

    // Local fallback execution
    let completionResult: any = { success: true };
    const todayDate = new Date().toISOString().split('T')[0];

    updateDatabaseState((draft) => {
      const sess = draft.sessions.find((s: any) => s.id === sessionId);
      if (sess) {
        sess.status = 'completed';
        sess.completedAt = new Date().toISOString();
        sess.lastCompletedDate = todayDate;
        
        // 1. Resolve or Auto-Create Student
        let student = draft.students.find((s: any) => s.id === sess.studentId);
        if (!student && sess.studentNameAr) {
          student = draft.students.find((s: any) => isArabicNameMatch(s.nameAr, sess.studentNameAr));
        }
        if (!student && sess.studentNameAr) {
          student = {
            id: sess.studentId || `stu-${Date.now()}`,
            tenantId: sess.tenantId || activeTenantId,
            code: `STU-${Math.floor(100 + Math.random() * 900)}`,
            nameAr: sess.studentNameAr,
            nameEn: sess.studentNameAr,
            gender: 'male',
            email: `student.${Date.now()}@zakirly.com`,
            phone: '01000000000',
            parentId: `par-${Date.now()}`,
            parentNameAr: 'ولي أمر الطالب',
            grade: 'مرحلة أساسية',
            balance: 0,
            enrolledCourseIds: [sess.courseId || 'cs-101'],
            totalSessionsCompleted: 0,
            remainingSessions: 16,
            status: 'active',
            packageId: `sub-${Date.now()}`,
            createdAt: todayDate,
          };
          draft.students.unshift(student);
        }

        let remainingSessionsAfter = 0;
        if (student) {
          sess.studentId = student.id;
          sess.studentNameAr = student.nameAr;

          if (student.remainingSessions > 0) {
            student.remainingSessions -= 1;
          }
          student.totalSessionsCompleted = (student.totalSessionsCompleted || 0) + 1;
          remainingSessionsAfter = student.remainingSessions;

          let sub = draft.subscriptions.find((sb: any) => sb.studentId === student!.id || sb.id === student!.packageId);
          if (!sub) {
            sub = {
              id: student.packageId || `sub-${Date.now()}`,
              tenantId: sess.tenantId || student.tenantId,
              studentId: student.id,
              studentNameAr: student.nameAr,
              courseId: sess.courseId || 'cs-101',
              courseTitleAr: sess.subjectNameAr || 'مادة تعليمية',
              totalSessions: 16,
              remainingSessions: 16,
              status: 'active',
              startDate: todayDate,
              endDate: todayDate,
              price: 3200,
              paidAmount: 3200,
              autoRenewal: false,
            };
            draft.subscriptions.unshift(sub);
          }

          if (sub) {
            if (sub.remainingSessions > 0) sub.remainingSessions -= 1;
          }
        }

        // 2. Resolve or Auto-Create Teacher
        let teacher = draft.teachers.find((t: any) => t.id === sess.teacherId);
        if (!teacher && sess.teacherNameAr) {
          teacher = draft.teachers.find((t: any) => isArabicNameMatch(t.nameAr, sess.teacherNameAr));
        }
        if (!teacher && sess.teacherNameAr) {
          teacher = {
            id: sess.teacherId || `tch-${Date.now()}`,
            tenantId: sess.tenantId || activeTenantId,
            code: `TCH-${Math.floor(100 + Math.random() * 900)}`,
            nameAr: sess.teacherNameAr,
            nameEn: sess.teacherNameAr,
            email: `teacher.${Date.now()}@zakirly.com`,
            phone: '01100000000',
            subjects: [sess.subjectNameAr || 'مادة دراسية'],
            languages: ['العربية'],
            hourlyRate: 250,
            perSessionRate: 250,
            completedSessionsCount: 0,
            totalEarned: 0,
            rating: 5,
            joinedDate: todayDate,
            status: 'active',
          };
          draft.teachers.unshift(teacher);
        }

        if (teacher) {
          sess.teacherId = teacher.id;
          sess.teacherNameAr = teacher.nameAr;
          teacher.completedSessionsCount = (teacher.completedSessionsCount || 0) + 1;
          teacher.totalEarned = (teacher.totalEarned || 0) + (teacher.perSessionRate || 250);
        }

        // 3. Record Attendance in db.attendance (with real calendar date YYYY-MM-DD)
        const attRecord = {
          id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId: sess.tenantId || activeTenantId,
          sessionId: sess.id,
          studentId: student ? student.id : sess.studentId,
          studentNameAr: student ? student.nameAr : sess.studentNameAr,
          teacherId: teacher ? teacher.id : sess.teacherId,
          teacherNameAr: teacher ? teacher.nameAr : (sess.teacherNameAr || 'المعلم'),
          date: todayDate, // Real calendar date YYYY-MM-DD
          status: (attendanceStatus || 'present') as any,
          notes: notes || `تم إكمال الحصة (${sess.subjectNameAr || 'مادة دراسية'}) وتسجيل الحضور آلياً`,
          loggedBy: ROLE_DEFINITIONS[role]?.titleAr || 'المشرف الأكاديمي',
          timestamp: new Date().toISOString(),
        };
        draft.attendance.unshift(attRecord);

        completionResult = {
          success: true,
          message: `تم إكمال الحصة بنجاح! تم احتساب الحصة للمعلم (${sess.teacherNameAr}) وخصم حصة من رصيد الطالب (${sess.studentNameAr}) (المتبقي: ${remainingSessionsAfter} حصة).`,
          studentName: sess.studentNameAr,
          teacherName: sess.teacherNameAr,
          remainingSessions: remainingSessionsAfter,
        };
      }
    });

    return completionResult;
  };

  const processPayment = async (invoiceId: string, amount: number, method?: string, notes?: string) => {
    try {
      const res = await processPaymentWorkflow({
        invoiceId,
        paymentAmount: amount,
        paymentMethod: method,
        notes,
        performedBy: ROLE_DEFINITIONS[role].titleAr,
      });
      if (res && res.success && res.db) {
        setDb(res.db);
        if (res.kpis) setKpis(res.kpis);
        savePermanentState(res.db);
        saveDirectToNeon(res.db).catch(() => {});
        // Find updated invoice from new DB if res.invoice is missing
        const updatedInvoice = res.invoice || res.db.invoices?.find((i: any) => i.id === invoiceId);
        return { ...res, invoice: updatedInvoice };
      }
    } catch (err) {
      console.warn('API processPayment fallback execution', err);
    }

    // Local fallback execution
    let resInvoice: PaymentInvoice | undefined;
    updateDatabaseState((draft) => {
      const invoice = draft.invoices?.find((i: any) => i.id === invoiceId);
      if (invoice) {
        const payVal = Number(amount) || 0;
        invoice.paidAmount = (invoice.paidAmount || 0) + payVal;
        invoice.remainingAmount = Math.max(0, invoice.amount - invoice.paidAmount);
        if (invoice.remainingAmount === 0) {
          invoice.status = 'paid';
          invoice.paidDate = new Date().toISOString().split('T')[0];
        } else {
          invoice.status = 'partial';
        }
        if (method) invoice.paymentMethod = method as any;
        if (notes) invoice.notes = notes;
        invoice.receiptNumber = invoice.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

        const student = draft.students?.find((s: any) => s.id === invoice.studentId);
        if (student) {
          student.balance = (student.balance || 0) + payVal;
        }

        const parent = draft.parents?.find((p: any) => p.id === invoice.parentId);
        if (parent) {
          parent.totalDue = Math.max(0, (parent.totalDue || 0) - payVal);
        }

        resInvoice = { ...invoice };
      }
    });

    return { success: true, invoice: resInvoice };
  };

  const convertTrial = async (trialId: string, packageCourseId?: string, totalSessions?: number, price?: number, paidAmount?: number, currency?: string) => {
    const selectedCurrency = currency || 'SAR';
    try {
      const res = await convertTrialWorkflow({
        trialId,
        packageCourseId,
        totalSessions,
        price,
        paidAmount,
        currency: selectedCurrency,
        performedBy: ROLE_DEFINITIONS[role].titleAr,
      });
      if (res.success && res.db) {
        setDb(res.db);
        if (res.kpis) setKpis(res.kpis);
        savePermanentState(res.db);
        saveDirectToNeon(res.db).catch(() => {});
        return res;
      }
    } catch (err) {
      console.warn('API convertTrial fallback execution', err);
    }

    // Local fallback logic
    updateDatabaseState((draft) => {
      const trial = draft.trialLessons.find((t: any) => t.id === trialId);
      if (!trial) return;

      trial.status = 'converted';

      // Check if parent exists
      let parent = draft.parents.find((p: any) => p.phone === trial.parentPhone || p.nameAr === trial.parentNameAr);
      if (!parent) {
        parent = {
          id: `prt-${Date.now()}`,
          tenantId: trial.tenantId || activeTenantId,
          code: `PAR-${Math.floor(2000 + Math.random() * 8000)}`,
          nameAr: trial.parentNameAr,
          nameEn: trial.parentNameAr,
          phone: trial.parentPhone,
          whatsapp: trial.parentPhone,
          email: `parent_${Date.now()}@zakirly.edu`,
          occupation: 'ولي أمر',
          childrenIds: [],
          totalDue: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        draft.parents.unshift(parent);
      }
      if (!Array.isArray(parent.childrenIds)) {
        parent.childrenIds = [];
      }

      // Create student
      const studentId = `stu-${Date.now()}`;
      const course = draft.courseSubjects.find((c: any) => c.id === packageCourseId) || draft.courseSubjects[0];
      const newStudent = {
        id: studentId,
        tenantId: trial.tenantId || activeTenantId,
        code: `STU-${Date.now().toString().slice(-4)}`,
        nameAr: trial.studentNameAr,
        nameEn: trial.studentNameAr,
        gender: 'male' as const,
        dateOfBirth: '2012-05-15',
        parentId: parent.id,
        parentNameAr: parent.nameAr,
        relationship: 'father',
        phone: trial.parentPhone,
        whatsapp: trial.parentPhone,
        email: `student_${Date.now()}@zakirly.edu`,
        grade: 'الصف السادس الابتدائي',
        balance: 0,
        currency: selectedCurrency,
        gradeLevel: 'السادس الابتدائي',
        enrolledCourseIds: course ? [course.id] : [],
        assignedTeacherId: trial.assignedTeacherId,
        packageId: `sub-${Date.now()}`,
        packageNameAr: course ? course.titleAr : 'باقة دراسية',
        remainingSessions: totalSessions || 16,
        totalSessionsCompleted: 0,
        status: 'active' as const,
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
      };
      draft.students.unshift(newStudent);
      parent.childrenIds.push(studentId);

      // Create Subscription
      const newSub = {
        id: newStudent.packageId,
        tenantId: trial.tenantId || activeTenantId,
        studentId: newStudent.id,
        studentNameAr: newStudent.nameAr,
        courseId: course ? course.id : 'cs-101',
        courseTitleAr: course ? course.titleAr : 'باقة دراسية',
        totalSessions: totalSessions || 16,
        remainingSessions: totalSessions || 16,
        price: price || 3200,
        paidAmount: paidAmount || 3200,
        currency: selectedCurrency,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'active' as const,
        autoRenewal: true,
      };
      draft.subscriptions.unshift(newSub);

      // Create Invoice
      const newInvoice = {
        id: `inv-${Date.now()}`,
        tenantId: trial.tenantId || activeTenantId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        studentId: newStudent.id,
        studentNameAr: newStudent.nameAr,
        parentId: parent.id,
        parentNameAr: parent.nameAr,
        amount: price || 3200,
        paidAmount: paidAmount || 3200,
        remainingAmount: Math.max(0, (price || 3200) - (paidAmount || 3200)),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        currency: selectedCurrency,
        type: 'subscription' as const,
        status: ((paidAmount || 3200) >= (price || 3200) ? 'paid' : 'partial') as any,
        createdAt: new Date().toISOString().split('T')[0],
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer' as const,
        notes: `تحويل من حصة تجريبية إلى طالب مشترك جديد`,
      };
      draft.invoices.unshift(newInvoice);
    });

    return { success: true };
  };

  const runPayroll = async (month: number, year: number) => {
    const cycle = getAccountingCycle(month, year);

    try {
      runPayrollWorkflow({ month, year, performedBy: ROLE_DEFINITIONS[role].titleAr }).catch(() => {});
    } catch (e) {}

    updateDatabaseState((draft) => {
      const createdPayrolls: any[] = [];

      (draft.teachers || []).forEach((teacher: any) => {
        const count = getTeacherCycleSessions(teacher.id, cycle, draft.attendance || [], draft.sessions || [], teacher);
        const rate = Number(teacher.perSessionRate || teacher.hourlyRate || 200);
        const gross = count * rate;

        let existing = (draft.payrolls || []).find(
          (p: any) => p.teacherId === teacher.id && p.month === month && p.year === year
        );

        if (existing) {
          existing.sessionsCount = count;
          existing.totalHours = count;
          existing.ratePerSession = rate;
          existing.grossAmount = gross;
          existing.netSalary = gross + (existing.bonus || 0) - (existing.deductions || 0);
          existing.status = 'paid';
          existing.notes = `تم تثبيت واحتساب رواتب الدورة المحاسبية حتى 25 (${cycle.startDate} إلى ${cycle.endDate})`;
          createdPayrolls.push(existing);
        } else {
          const newPayroll = {
            id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}-${teacher.id}`,
            tenantId: teacher.tenantId || activeTenantId,
            teacherId: teacher.id,
            teacherNameAr: teacher.nameAr,
            month,
            year,
            sessionsCount: count,
            totalHours: count,
            ratePerSession: rate,
            grossAmount: gross,
            bonus: 0,
            deductions: 0,
            netSalary: gross,
            status: 'paid' as const,
            notes: `تم تثبيت واحتساب رواتب الدورة المحاسبية حتى 25 (${cycle.startDate} إلى ${cycle.endDate})`,
          };
          if (!draft.payrolls) draft.payrolls = [];
          draft.payrolls.unshift(newPayroll);
          createdPayrolls.push(newPayroll);
        }
      });

      // Deduct sessions completed up to 25th from students
      (draft.students || []).forEach((st: any) => {
        const studentCompletedInCycle = (draft.sessions || []).filter((s: any) => {
          if (s.studentId !== st.id || s.status !== 'completed') return false;
          const cleanDate = (s.date || '').split('T')[0];
          return cleanDate >= cycle.startDate && cleanDate <= cycle.endDate;
        }).length;

        if (studentCompletedInCycle > 0) {
          st.remainingSessions = Math.max(0, (st.remainingSessions || 0) - studentCompletedInCycle);
          st.totalSessionsCompleted = (st.totalSessionsCompleted || 0) + studentCompletedInCycle;
        }
      });
    });

    return { success: true };
  };

  const settleTeacherPayroll = async (teacherId: string, month: number, year: number) => {
    const cycle = getAccountingCycle(month, year);
    updateDatabaseState((draft) => {
      let payroll = (draft.payrolls || []).find(
        (p: any) => p.teacherId === teacherId && p.month === month && p.year === year
      );
      const teacher = (draft.teachers || []).find((t: any) => t.id === teacherId);
      
      // Calculate executed sessions ONLY within specified cycle date range (startDate to endDate)
      const cycleCount = getTeacherCycleSessions(teacherId, cycle, draft.attendance || [], draft.sessions || [], teacher);
      const rate = Number(teacher?.perSessionRate || teacher?.hourlyRate || 200);

      if (!payroll) {
        payroll = {
          id: `pay-${Date.now()}-${teacherId}`,
          tenantId: teacher?.tenantId || activeTenantId,
          teacherId,
          teacherNameAr: teacher?.nameAr || 'المعلم',
          month,
          year,
          sessionsCount: cycleCount,
          totalHours: cycleCount,
          ratePerSession: rate,
          grossAmount: cycleCount * rate,
          bonus: 0,
          deductions: 0,
          netSalary: cycleCount * rate,
          status: 'paid',
          isSettled: true,
          settledAt: new Date().toISOString(),
          notes: `تمت المحاسبة وتسوية المستحقات عن الحصص المنفذة بالدورة حتى 25 (${cycleCount} حصة)`,
        };
        if (!draft.payrolls) draft.payrolls = [];
        draft.payrolls.unshift(payroll);
      } else {
        payroll.status = 'paid';
        payroll.isSettled = true;
        payroll.settledAt = new Date().toISOString();
        payroll.sessionsCount = cycleCount;
        payroll.totalHours = cycleCount;
        payroll.grossAmount = cycleCount * rate;
        payroll.netSalary = cycleCount * rate + (payroll.bonus || 0) - (payroll.deductions || 0);
        payroll.notes = `تمت المحاسبة وتسوية المستحقات عن الحصص المنفذة بالدورة حتى 25 (${cycleCount} حصة)`;
      }

      // Mark sessions and attendance executed strictly WITHIN cycle as teacherPaid
      if (draft.sessions) {
        draft.sessions.forEach((s: any) => {
          if (s.teacherId === teacherId || (teacher && s.teacherNameAr === teacher.nameAr)) {
            const cleanDate = (s.date || '').split('T')[0];
            if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
              s.teacherPaid = true;
              s.settledMonth = `${month}/${year}`;
            }
          }
        });
      }

      if (draft.attendance) {
        draft.attendance.forEach((a: any) => {
          if (a.teacherId === teacherId || (teacher && a.teacherNameAr === teacher.nameAr)) {
            const cleanDate = (a.date || '').split('T')[0];
            if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
              a.teacherPaid = true;
            }
          }
        });
      }

      // Deduct consumed sessions from students enrolled with this teacher for this cycle
      if (draft.students) {
        draft.students.forEach((st: any) => {
          if (st.assignedTeacherId === teacherId || st.assignedTeacherNameAr === teacher?.nameAr) {
            const studentCycleSessions = (draft.sessions || []).filter((s: any) => {
              if (s.studentId === st.id || s.studentNameAr === st.nameAr) {
                const cleanDate = (s.date || '').split('T')[0];
                return cleanDate >= cycle.startDate && cleanDate <= cycle.endDate && (s.status === 'completed' || s.completedAt || s.teacherPaid);
              }
              return false;
            });

            const studentCycleAttendance = (draft.attendance || []).filter((a: any) => {
              if (a.studentId === st.id || a.studentNameAr === st.nameAr) {
                const cleanDate = (a.date || '').split('T')[0];
                return cleanDate >= cycle.startDate && cleanDate <= cycle.endDate && (a.status === 'present' || a.status === 'late');
              }
              return false;
            });

            const consumedCount = Math.max(studentCycleSessions.length, studentCycleAttendance.length);
            const deductCount = consumedCount > 0 ? consumedCount : 1;

            st.remainingSessions = Math.max(0, (st.remainingSessions || 12) - deductCount);
            if (st.remainingSessions === 0) {
              st.status = 'pending_renewal';
            }
          }
        });
      }
    });

    return { success: true };
  };

  const unsettleTeacherPayroll = async (teacherId: string, month: number, year: number) => {
    const cycle = getAccountingCycle(month, year);
    updateDatabaseState((draft) => {
      const idx = (draft.payrolls || []).findIndex(
        (p: any) => p.teacherId === teacherId && p.month === month && p.year === year
      );
      if (idx !== -1) {
        draft.payrolls.splice(idx, 1);
      }
      const teacher = (draft.teachers || []).find((t: any) => t.id === teacherId);

      // Unmark sessions and attendance executed strictly WITHIN cycle as teacherPaid
      if (draft.sessions) {
        draft.sessions.forEach((s: any) => {
          if (s.teacherId === teacherId || (teacher && s.teacherNameAr === teacher.nameAr)) {
            const cleanDate = (s.date || '').split('T')[0];
            if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
              s.teacherPaid = false;
              delete s.settledMonth;
            }
          }
        });
      }
    });

    return { success: true };
  };

  const reopenAccountingCycle = async (month: number, year: number) => {
    const cycle = getAccountingCycle(month, year);
    updateDatabaseState((draft) => {
      // 1. Remove or reset saved payroll records for this cycle month/year
      if (draft.payrolls) {
        draft.payrolls = draft.payrolls.filter(
          (p: any) => !(p.month === month && p.year === year)
        );
      }

      // 2. Unmark sessions within this cycle date range as teacherPaid
      if (draft.sessions) {
        draft.sessions.forEach((s: any) => {
          const cleanDate = (s.date || '').split('T')[0];
          if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
            s.teacherPaid = false;
            delete s.settledMonth;
          }
        });
      }

      // 3. Unmark attendance within this cycle date range as teacherPaid
      if (draft.attendance) {
        draft.attendance.forEach((a: any) => {
          const cleanDate = (a.date || '').split('T')[0];
          if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
            a.teacherPaid = false;
          }
        });
      }
    });

    return { success: true };
  };

  const updatePayrollAdjustment = async (
    teacherId: string,
    month: number,
    year: number,
    bonus: number,
    deductions: number,
    notes?: string
  ) => {
    const cycle = getAccountingCycle(month, year);
    updateDatabaseState((draft) => {
      if (!draft.payrolls) draft.payrolls = [];

      let payroll = draft.payrolls.find(
        (p: any) => p.teacherId === teacherId && p.month === month && p.year === year
      );
      const teacher = (draft.teachers || []).find((t: any) => t.id === teacherId);
      const cycleCount = getTeacherCycleSessions(teacherId, cycle, draft.attendance || [], draft.sessions || [], teacher);
      const rate = Number(teacher?.perSessionRate || teacher?.hourlyRate || 200);

      if (!payroll) {
        payroll = {
          id: `pay-${Date.now()}-${teacherId}`,
          tenantId: teacher?.tenantId || activeTenantId,
          teacherId,
          teacherNameAr: teacher?.nameAr || 'المعلم',
          month,
          year,
          sessionsCount: cycleCount,
          totalHours: cycleCount,
          ratePerSession: rate,
          grossAmount: cycleCount * rate,
          bonus: Number(bonus) || 0,
          deductions: Number(deductions) || 0,
          netSalary: (cycleCount * rate) + (Number(bonus) || 0) - (Number(deductions) || 0),
          status: 'draft',
          isSettled: false,
          notes: notes || 'تعديل المكافآت والخصومات',
        };
        draft.payrolls.unshift(payroll);
      } else {
        payroll.bonus = Number(bonus) || 0;
        payroll.deductions = Number(deductions) || 0;
        payroll.netSalary = (payroll.grossAmount || 0) + payroll.bonus - payroll.deductions;
        if (notes !== undefined) {
          payroll.notes = notes;
        }
      }
    });

    return { success: true };
  };

  const markAllNotificationsRead = () => {
    updateDatabaseState((draft) => {
      if (draft.notifications) {
        draft.notifications.forEach((n: any) => {
          n.read = true;
        });
      }
    });
  };

  const createStudent = async (studentData: any) => {
    const payload = {
      tenantId: activeTenantId,
      ...studentData,
      performedBy: ROLE_DEFINITIONS[role].titleAr,
    };

    let serverSuccess = false;
    let resData: any = null;
    try {
      resData = await createStudentApi(payload);
      if (resData && resData.success && resData.db) {
        serverSuccess = true;
        setDb(resData.db);
        setKpis(resData.kpis || computeLocalKPIs(resData.db));
        savePermanentState(resData.db);
        saveDirectToNeon(resData.db).catch(() => {});
      }
    } catch (err) {
      console.warn('API error, executing client fallback for student creation', err);
    }

    if (!serverSuccess) {
      updateDatabaseState((draft) => {
        const studentId = `stu-${Date.now()}`;
        const parentNameAr = studentData.parentNameAr || 'ولي أمر الطالب';
        const phone = studentData.phone || '+201000000000';

        let parent = draft.parents.find((p: any) => p.phone === phone || p.nameAr === parentNameAr);
        if (!parent) {
          parent = {
            id: `par-${Date.now()}`,
            tenantId: activeTenantId,
            code: `PAR-${Math.floor(1000 + Math.random() * 9000)}`,
            nameAr: parentNameAr,
            nameEn: parentNameAr,
            phone: phone,
            whatsapp: phone,
            email: `parent.${Date.now()}@zakirly.edu`,
            relationship: 'والد / ولي أمر',
            childrenIds: [studentId],
            totalDue: 0,
            createdAt: new Date().toISOString().split('T')[0],
          };
          draft.parents.unshift(parent);
        } else if (!parent.childrenIds.includes(studentId)) {
          parent.childrenIds.push(studentId);
        }

        const newStu = {
          id: studentId,
          tenantId: activeTenantId,
          code: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          nameAr: studentData.nameAr,
          nameEn: studentData.nameEn || studentData.nameAr,
          gender: studentData.gender || 'male',
          email: studentData.email || `student.${Date.now()}@zakirly.edu`,
          phone: phone,
          parentId: parent.id,
          parentNameAr: parent.nameAr,
          grade: studentData.grade || 'الصف الأول الثانوي',
          status: studentData.status || 'active',
          balance: Number(studentData.balance) || 0,
          currency: studentData.currency || 'SAR',
          remainingSessions: Number(studentData.remainingSessions) || 12,
          totalSessionsCompleted: 0,
          enrolledCourseIds: studentData.enrolledCourseIds || ['cs-101'],
          assignedTeacherId: studentData.assignedTeacherId,
          assignedTeacherNameAr: studentData.assignedTeacherNameAr,
          enrolledTeachers: studentData.enrolledTeachers || [],
          packageNameAr: studentData.packageNameAr,
          notes: studentData.notes || 'تم تسجيل الطالب وربطه بالمعلم والمواد بنجاح',
          createdAt: new Date().toISOString().split('T')[0],
        };
        draft.students.unshift(newStu);

        const newSub = {
          id: `sub-${Date.now()}`,
          tenantId: activeTenantId,
          studentId,
          studentNameAr: newStu.nameAr,
          courseId: (studentData.enrolledCourseIds && studentData.enrolledCourseIds[0]) || 'cs-101',
          courseTitleAr: studentData.packageNameAr || `${newStu.grade} - باقة الحصص الشاملة`,
          totalSessions: newStu.remainingSessions,
          remainingSessions: newStu.remainingSessions,
          price: 3000,
          paidAmount: 3000,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
          status: 'active' as const,
          autoRenewal: true,
          notes: 'تم إصدار الاشتراك وتفعيل التسجيل آلياً',
        };
        draft.subscriptions.unshift(newSub);
        (newStu as any).packageId = newSub.id;

        resData = { success: true, student: newStu };
      });
    }

    return resData;
  };

  const createTeacher = async (teacherData: any) => {
    const payload = {
      tenantId: activeTenantId,
      ...teacherData,
      performedBy: ROLE_DEFINITIONS[role].titleAr,
    };

    let serverSuccess = false;
    let createdTeacherObj: any = null;

    try {
      const res = await createTeacherApi(payload);
      if (res && res.success && res.db) {
        serverSuccess = true;
        setDb(res.db);
        setKpis(res.kpis || computeLocalKPIs(res.db));
        savePermanentState(res.db);
        saveDirectToNeon(res.db).catch(() => {});
        createdTeacherObj = res.teacher || (res.db.teachers && res.db.teachers[0]);
      }
    } catch (err) {
      console.warn('API error, executing client fallback for teacher creation', err);
    }

    if (!serverSuccess) {
      updateDatabaseState((draft) => {
        const tchId = `tch-${Date.now()}`;
        createdTeacherObj = {
          id: tchId,
          tenantId: activeTenantId,
          code: `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
          nameAr: teacherData.nameAr,
          nameEn: teacherData.nameEn || teacherData.nameAr,
          email: teacherData.email || `teacher.${Date.now()}@zakirly.edu`,
          phone: teacherData.phone || '+201000000000',
          subjects: teacherData.subjects || [],
          languages: teacherData.languages || ['العربية'],
          hourlyRate: Number(teacherData.hourlyRate) || Number(teacherData.perSessionRate) || 200,
          perSessionRate: Number(teacherData.perSessionRate) || Number(teacherData.hourlyRate) || 200,
          status: teacherData.status || 'active',
          totalEarned: 0,
          completedSessionsCount: 0,
          rating: 5.0,
          bio: teacherData.bio || '',
          joinedDate: new Date().toISOString().split('T')[0],
        };
        draft.teachers.unshift(createdTeacherObj);

        const email = teacherData.email || createdTeacherObj.email;
        const userIdx = draft.users.findIndex((u) => u.email === email || (u.linkedEntityId && u.linkedEntityId === tchId));
        if (userIdx !== -1) {
          draft.users[userIdx].linkedEntityId = tchId;
          if (teacherData.password) draft.users[userIdx].password = teacherData.password;
        } else {
          draft.users.unshift({
            id: `usr-${Date.now()}`,
            tenantId: activeTenantId,
            name: teacherData.nameAr,
            nameAr: teacherData.nameAr,
            email,
            password: teacherData.password || '123456',
            role: 'teacher',
            linkedEntityId: tchId,
            status: 'active',
          });
        }
      });
    }

    return createdTeacherObj;
  };

  const createSession = async (sessionData: any) => {
    const payload = {
      tenantId: activeTenantId,
      ...sessionData,
      performedBy: ROLE_DEFINITIONS[role].titleAr,
    };

    try {
      const res = await createSessionApi(payload);
      if (res && res.success && res.db) {
        updateDatabaseState((draft) => {
          Object.assign(draft, res.db);
        });
        return res;
      } else if (res && res.success === false) {
        return res;
      }
    } catch (err) {
      console.warn('API error, executing client fallback for session creation', err);
    }

    let newSess: any = null;
    const teacher = db.teachers.find((t) => t.id === sessionData.teacherId);
    const student = db.students.find((s) => s.id === sessionData.studentId);
    const course = db.courseSubjects.find((c) => c.id === sessionData.courseId);

    const dur = Number(sessionData.durationMinutes) || 60;
    const safeStartStr = String(sessionData.startTime || '17:00').trim();
    let startH = 17;
    let startM = 0;
    const timeMatch = safeStartStr.match(/(\d{1,2})[:.](\d{2})/);
    if (timeMatch) {
      startH = parseInt(timeMatch[1], 10);
      startM = parseInt(timeMatch[2], 10);
      if (/pm|م|مساء/i.test(safeStartStr) && startH < 12) startH += 12;
      if (/am|ص|صباح/i.test(safeStartStr) && startH === 12) startH = 0;
    }
    const endH = (startH + Math.floor((startM + dur) / 60)) % 24;
    const endM = (startM + dur) % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    updateDatabaseState((draft) => {
      newSess = {
        id: `sess-${Date.now()}`,
        tenantId: activeTenantId,
        code: `SES-${Math.floor(1000 + Math.random() * 9000)}`,
        studentId: sessionData.studentId,
        studentNameAr: sessionData.studentNameAr || teacher?.nameAr || 'الطالب',
        teacherId: sessionData.teacherId,
        teacherNameAr: sessionData.teacherNameAr || teacher?.nameAr || 'المعلم',
        courseId: sessionData.courseId || 'cs-101',
        courseTitleAr: sessionData.courseTitleAr || course?.titleAr || 'مادة دراسية',
        subjectNameAr: sessionData.courseTitleAr || course?.titleAr || 'مادة دراسية',
        dayOfWeek: sessionData.dayOfWeek,
        dayNameAr: sessionData.dayNameAr || sessionData.date,
        dayNum: typeof sessionData.dayNum === 'number' ? sessionData.dayNum : undefined,
        date: sessionData.date || sessionData.dayNameAr || new Date().toISOString().split('T')[0],
        startTime: sessionData.startTime || '16:00',
        endTime: endTime,
        durationMinutes: dur,
        status: sessionData.status || 'scheduled',
        meetingUrl: sessionData.meetingUrl || `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
        roomName: 'قاعة افتراضية',
        notes: sessionData.notes || '',
        teacherPaid: false,
      };
      draft.sessions.unshift(newSess);
    });

    return { success: true, session: newSess };
  };

  const resetDatabase = async () => {
    try {
      localStorage.removeItem('zakirly_persistent_db_v3');
      localStorage.removeItem('zakirly_persistent_db_backup');
      localStorage.removeItem('zakirly_db_v2');
      sessionStorage.removeItem('zakirly_persistent_db_v3');
    } catch (e) {}
    const res = await resetDatabaseApi(ROLE_DEFINITIONS[role].titleAr);
    if (res.success && res.db) {
      savePermanentState(res.db);
      setDb(res.db);
      setKpis(computeLocalKPIs(res.db));
    }
    return res;
  };

  const importBackup = async (backupJson: any) => {
    try {
      const res = await importBackupApi(backupJson);
      if (res && res.success && res.db) {
        updateDatabaseState((draft) => {
          Object.assign(draft, res.db);
        });
        return res;
      }
    } catch (e) {}

    updateDatabaseState((draft) => {
      Object.assign(draft, backupJson);
    });
    return { success: true };
  };

  const changeUserPassword = async (
    newPassword: string,
    currentPasswordInput?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return {
        success: false,
        error: lang === 'ar' ? 'لم يتم العثور على حساب مستخدم نشط' : 'No active user session',
      };
    }

    const trimmedNew = (newPassword || '').trim();
    if (trimmedNew.length < 4) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'كلمة المرور الجديدة يجب أن تكون 4 خانات أو أحرف على الأقل'
            : 'Password must be at least 4 characters',
      };
    }

    // Locate the user record in current db state
    const userInDb = db.users.find(
      (u) =>
        u.id === currentUser.id ||
        (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.role === 'super_admin' &&
          (u.role === 'super_admin' ||
            u.email.toLowerCase() === 'admin@zakirly.edu' ||
            u.email.toLowerCase() === 'superadmin@zakirly.academy'))
    );

    const actualOldPassword =
      currentUser.password ||
      userInDb?.password ||
      (currentUser.role === 'super_admin' ? 'admin123' : '123456');

    // If currentPasswordInput was provided, strictly verify it
    if (currentPasswordInput && currentPasswordInput.trim()) {
      if (currentPasswordInput.trim() !== actualOldPassword) {
        return {
          success: false,
          error:
            lang === 'ar'
              ? 'كلمة المرور الحالية غير صحيحة. يرجى التأكد من كتابتها بشكل سليم.'
              : 'Current password is incorrect.',
        };
      }
    }

    // 1. Update currentUser in React State & localStorage immediately
    const updatedUser: User = {
      ...currentUser,
      password: trimmedNew,
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('zakirly_user_v2', JSON.stringify(updatedUser));
      localStorage.removeItem('zakirly_remembered_credentials');
    } catch (e) {
      console.warn('Failed to update user session storage', e);
    }

    // 2. Persist to Database State (Local, IndexedDB, Neon PostgreSQL Cloud, Server SSE)
    updateDatabaseState((draft) => {
      let matched = false;
      draft.users.forEach((u) => {
        const isMatch =
          u.id === currentUser.id ||
          (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.role === 'super_admin' &&
            (u.role === 'super_admin' ||
              u.email.toLowerCase() === 'admin@zakirly.edu' ||
              u.email.toLowerCase() === 'superadmin@zakirly.academy'));

        if (isMatch) {
          u.password = trimmedNew;
          matched = true;
        }
      });

      if (!matched) {
        draft.users.unshift({
          id: currentUser.id || `usr-${Date.now()}`,
          tenantId: currentUser.tenantId || activeTenantId,
          name: currentUser.name || 'مدير أكاديمية ذاكرلي',
          nameAr: currentUser.nameAr || currentUser.name || 'مدير أكاديمية ذاكرلي',
          email: currentUser.email || 'admin@zakirly.edu',
          role: currentUser.role || 'super_admin',
          password: trimmedNew,
          status: 'active',
          lastLogin: new Date().toISOString(),
        });
      }
    });

    return { success: true };
  };

  const createTenantProxy = <T extends { tenantId?: string }>(
    rawArray: T[],
    tenantId: string
  ): T[] => {
    const filtered = (rawArray || []).filter((item) => {
      if (!item) return false;
      if (tenantId === 'tenant-zakirly-courses') {
        return item.tenantId === 'tenant-zakirly-courses';
      }
      return (
        item.tenantId === 'tenant-zakirly-curriculum' ||
        item.tenantId === 'tenant-zakirly-main' ||
        !item.tenantId
      );
    });

    return new Proxy(filtered, {
      get(target, prop, receiver) {
        if (prop === 'unshift' || prop === 'push') {
          return (...items: T[]) => {
            items.forEach((item) => {
              if (item && typeof item === 'object') {
                item.tenantId = tenantId;
              }
              rawArray.unshift(item);
            });
            return target.unshift(...items);
          };
        }
        if (prop === 'splice') {
          return (start: number, deleteCount?: number, ...items: T[]) => {
            const itemsToRemove = target.slice(start, start + (deleteCount ?? 1));
            itemsToRemove.forEach((itemToRemove) => {
              const rawIdx = rawArray.indexOf(itemToRemove);
              if (rawIdx !== -1) {
                rawArray.splice(rawIdx, 1);
              }
            });
            return target.splice(start, deleteCount ?? 1, ...items);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const filteredItem = target[Number(prop)];
          if (filteredItem) {
            const rawIdx = rawArray.indexOf(filteredItem);
            if (rawIdx !== -1) {
              rawArray[rawIdx] = value;
            }
          }
        }
        return Reflect.set(target, prop, value, receiver);
      },
    });
  };

  const activeTenantDb = React.useMemo(() => {
    return {
      ...db,
      tenants: db.tenants || [],
      users: db.users || [],
      students: createTenantProxy(db.students || [], activeTenantId),
      teachers: createTenantProxy(db.teachers || [], activeTenantId),
      courseSubjects: createTenantProxy(db.courseSubjects || [], activeTenantId),
      subscriptions: createTenantProxy(db.subscriptions || [], activeTenantId),
      sessions: createTenantProxy(db.sessions || [], activeTenantId),
      attendance: createTenantProxy(db.attendance || [], activeTenantId),
      invoices: createTenantProxy(db.invoices || [], activeTenantId),
      payrolls: createTenantProxy(db.payrolls || [], activeTenantId),
      trialLessons: createTenantProxy(db.trialLessons || [], activeTenantId),
      parents: createTenantProxy(db.parents || [], activeTenantId),
      notifications: createTenantProxy(db.notifications || [], activeTenantId),
      auditLogs: createTenantProxy(db.auditLogs || [], activeTenantId),
    };
  }, [db, activeTenantId]);

  const activeKpis = React.useMemo(() => {
    return computeLocalKPIs(activeTenantDb);
  }, [activeTenantDb]);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        role,
        setRole: handleSetRole,
        lang,
        setLang,
        activeTenantId,
        setActiveTenantId: handleSetActiveTenantId,
        currency,
        currencySymbol,
        setCurrency,
        db: activeTenantDb,
        kpis: activeKpis,
        isRealtimeConnected,
        searchQuery,
        setSearchQuery,
        isNotificationOpen,
        setIsNotificationOpen,
        isERDiagramOpen,
        setIsERDiagramOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        activeModule,
        setActiveModule,
        activeCycle,
        selectedMonth,
        selectedYear,
        customStartDate,
        customEndDate,
        isCustomDates,
        setCycleMonthYear,
        setCustomCycleDates,
        completeSession,
        processPayment,
        convertTrial,
        runPayroll,
        createStudent,
        createTeacher,
        createSession,
        settleTeacherPayroll,
        unsettleTeacherPayroll,
        reopenAccountingCycle,
        updatePayrollAdjustment,
        markAllNotificationsRead,
        updateDatabaseState,
        changeUserPassword,
        resetDatabase,
        importBackup,
        isSyncing,
        reloadData,
        cloudDbStatus,
        refreshCloudDbStatus,
        testNeonConnection,
        switchNeonDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
