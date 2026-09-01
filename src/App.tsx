import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { testFirebaseConnection } from './lib/firebase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ERDiagramModal } from './components/ERDiagramModal';

import { DashboardModule } from './modules/DashboardModule';
import { StudentsModule } from './modules/StudentsModule';
import { TeachersModule } from './modules/TeachersModule';
import { ParentsModule } from './modules/ParentsModule';
import { CoursesModule } from './modules/CoursesModule';
import { LanguagesModule } from './modules/LanguagesModule';
import { SchedulingModule } from './modules/SchedulingModule';
import { AttendanceModule } from './modules/AttendanceModule';
import { FinanceModule } from './modules/FinanceModule';
import { PayrollModule } from './modules/PayrollModule';
import { SubscriptionsModule } from './modules/SubscriptionsModule';
import { TrialLessonsModule } from './modules/TrialLessonsModule';
import { ReportsModule } from './modules/ReportsModule';
import { UserManagementModule } from './modules/UserManagementModule';
import { AuditLogModule } from './modules/AuditLogModule';
import { SettingsModule } from './modules/SettingsModule';

import { LoginPage } from './components/LoginPage';

const MainContent: React.FC = () => {
  const { activeModule, role, setActiveModule } = useApp();

  const supervisorAllowedModules = [
    'students',
    'teachers',
    'courses',
    'languages',
    'attendance',
    'scheduling',
    'subscriptions',
    'trial_lessons',
  ];

  const isSupervisorRole =
    role === 'supervisor' ||
    role === 'supervisor_courses' ||
    role === 'supervisor_curriculum';

  if (isSupervisorRole && !supervisorAllowedModules.includes(activeModule)) {
    return (
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-3xl border border-amber-200 p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            🛡️
          </div>
          <h2 className="text-xl font-black text-slate-900 font-serif">
            صلاحيات محددة للمشرف الأكاديمي
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            تم تحديد نطاق عمل المشرف في متابعة المناهج والدورات، الطلاب، المعلمين، شيت الحصص التجريبية، تسجيل الغياب والحضور، وجدولة الحصص والمواعيد. باقي أقسام النظام (المالية، التقارير، الإعدادات) خارج نطاق صلاحيات المشرف.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              onClick={() => setActiveModule('courses')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              الانتقال إلى المناهج الدراسية
            </button>
            <button
              onClick={() => setActiveModule('trial_lessons')}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              الانتقال إلى شيت التجريبي
            </button>
          </div>
        </div>
      </main>
    );
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'students':
        return <StudentsModule />;
      case 'teachers':
        return <TeachersModule />;
      case 'parents':
        return <ParentsModule />;
      case 'courses':
        return <CoursesModule />;
      case 'languages':
        return <LanguagesModule />;
      case 'scheduling':
        return <SchedulingModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'finance':
        return <FinanceModule />;
      case 'payroll':
        return <PayrollModule />;
      case 'subscriptions':
        return <SubscriptionsModule />;
      case 'trial_lessons':
        return <TrialLessonsModule />;
      case 'reports':
        return <ReportsModule />;
      case 'user_management':
        return <UserManagementModule />;
      case 'audit_logs':
        return <AuditLogModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-6 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
      {renderModule()}
    </main>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useApp();

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-100 text-slate-800 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white relative">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row min-w-0 max-w-full">
        <Sidebar />
        <MainContent />
      </div>
      <MobileBottomNav />
      <NotificationDrawer />
      <ERDiagramModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
