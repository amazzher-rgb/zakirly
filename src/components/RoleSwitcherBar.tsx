import React from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_DEFINITIONS } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, UserCheck, Layers, Sparkles } from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { role, setRole, lang, setIsERDiagramOpen } = useApp();

  // Hide the role switcher bar completely for supervisor accounts
  if (role === 'supervisor' || role === 'supervisor_courses' || role === 'supervisor_curriculum') {
    return null;
  }

  const currentRoleInfo = ROLE_DEFINITIONS[role];

  const rolesList: UserRole[] = [
    'super_admin',
    'academic_director',
    'administrative_director',
    'supervisor',
    'supervisor_courses',
    'supervisor_curriculum',
    'teacher',
    'parent',
    'student',
    'accountant',
  ];

  return (
    <div className="bg-slate-900 text-white px-2.5 sm:px-4 py-2 border-b border-slate-800 shadow-inner overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 text-xs sm:text-sm">
        
        {/* Active Role Persona Title & Description */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-full border border-slate-700/80 max-w-full">
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium text-[11px] sm:text-xs whitespace-nowrap">
              {lang === 'ar' ? 'المحاكاة:' : 'Role:'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold truncate max-w-[160px] sm:max-w-none ${currentRoleInfo.badgeBg}`}>
              {lang === 'ar' ? currentRoleInfo.titleAr.split('(')[0].trim() : currentRoleInfo.titleEn}
            </span>
          </div>

          <button
            onClick={() => setIsERDiagramOpen(true)}
            className="md:hidden px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
            title="مخطط قاعدة البيانات ERD"
          >
            <Layers className="w-3 h-3" />
            <span>ERD</span>
          </button>

          <p className="hidden xl:block text-slate-400 text-xs">
            {lang === 'ar' ? currentRoleInfo.descriptionAr : ''}
          </p>
        </div>

        {/* Quick Role Switch: Dropdown on Mobile, Tabs on Tablet/Desktop */}
        <div className="w-full md:w-auto flex items-center gap-1.5 min-w-0">
          {/* Mobile Select Dropdown */}
          <div className="sm:hidden w-full flex items-center gap-1 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 ms-1" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              {rolesList.map((r) => {
                const rInfo = ROLE_DEFINITIONS[r];
                return (
                  <option key={r} value={r} className="bg-slate-900 text-white">
                    {lang === 'ar' ? rInfo.titleAr.split('(')[0].trim() : rInfo.titleEn}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tablet & Desktop Horizontal Tab Strip */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar touch-pan-x">
            <span className="text-slate-400 text-xs font-medium whitespace-nowrap hidden lg:inline">
              {lang === 'ar' ? 'تبديل الدور:' : 'Switch:'}
            </span>

            {rolesList.map((r) => {
              const isSelected = r === role;
              const rInfo = ROLE_DEFINITIONS[r];
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 min-h-[34px] ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {r === 'super_admin' && <ShieldCheck className="w-3 h-3 text-amber-400" />}
                  {lang === 'ar' ? rInfo.titleAr.split('(')[0].trim() : rInfo.titleEn}
                </button>
              );
            })}

            <button
              onClick={() => setIsERDiagramOpen(true)}
              className="hidden md:flex ms-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all items-center gap-1 whitespace-nowrap shrink-0"
              title="عرض مخطط قاعدة البيانات والعلاقات بين الجداول"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'مخطط البيانات ERD' : 'ER Diagram'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
