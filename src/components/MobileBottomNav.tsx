import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CheckCircle2,
  CalendarDays,
  Receipt,
  Menu,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeModule, setActiveModule, isMobileMenuOpen, setIsMobileMenuOpen, lang, role } = useApp();

  const allNavItems = [
    { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Home', icon: LayoutDashboard, supervisor: false },
    { id: 'students', labelAr: 'الطلاب', labelEn: 'Students', icon: GraduationCap, supervisor: true },
    { id: 'teachers', labelAr: 'المعلمين', labelEn: 'Teachers', icon: Users, supervisor: true },
    { id: 'attendance', labelAr: 'الغياب', labelEn: 'Attendance', icon: CheckCircle2, supervisor: true },
    { id: 'scheduling', labelAr: 'الجداول', labelEn: 'Schedule', icon: CalendarDays, supervisor: true },
    { id: 'finance', labelAr: 'المالية', labelEn: 'Finance', icon: Receipt, supervisor: false },
  ];

  const primaryNavItems = allNavItems.filter((item) => {
    if (role === 'supervisor') {
      return item.supervisor;
    }
    return ['dashboard', 'students', 'scheduling', 'finance'].includes(item.id);
  });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {primaryNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[48px] ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-600/20' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </span>
          </button>
        );
      })}

      {/* Menu Trigger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[48px] ${
          isMobileMenuOpen ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className={`p-1 rounded-lg ${isMobileMenuOpen ? 'bg-blue-600/20' : ''}`}>
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 leading-tight">
          {lang === 'ar' ? 'القائمة' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};
