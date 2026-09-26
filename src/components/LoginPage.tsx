import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { UserRole } from '../types';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  Globe,
  User,
  ChevronDown,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, db, activeTenantId, setActiveTenantId, lang, setLang } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  const [email, setEmail] = useState(() => {
    try {
      const savedEmail = localStorage.getItem('zakirly_remembered_email');
      if (savedEmail) return savedEmail;
    } catch {}
    return 'admin@zakirly.edu';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Clear any legacy saved plain passwords in browser storage for security
  React.useEffect(() => {
    try {
      localStorage.removeItem('zakirly_remembered_credentials');
    } catch {}
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    let targetEmail = 'supervisor@zakirly.edu';
    if (newRole === 'super_admin') {
      targetEmail = 'admin@zakirly.edu';
    } else if (newRole === 'director_courses') {
      targetEmail = 'courses_director@zakirly.edu';
      setActiveTenantId('tenant-zakirly-courses');
    } else if (newRole === 'director_curriculum') {
      targetEmail = 'curriculum_director@zakirly.edu';
      setActiveTenantId('tenant-zakirly-curriculum');
    } else if (newRole === 'supervisor_courses') {
      targetEmail = 'courses_supervisor@zakirly.edu';
      setActiveTenantId('tenant-zakirly-courses');
    } else if (newRole === 'supervisor_curriculum') {
      targetEmail = 'curriculum_supervisor@zakirly.edu';
      setActiveTenantId('tenant-zakirly-curriculum');
    } else {
      targetEmail = 'supervisor@zakirly.edu';
    }
    setEmail(targetEmail);
    // Explicitly reset password field - user must manually enter password
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني أو اسم الحساب' : 'Please enter email or account name');
      return;
    }

    if (!password.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال كلمة المرور للمتابعة' : 'Please enter password to continue');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(email, password, selectedRole);
      setIsLoading(false);
      if (success) {
        if (rememberMe) {
          try {
            localStorage.setItem('zakirly_remembered_email', email);
          } catch {}
        } else {
          try {
            localStorage.removeItem('zakirly_remembered_email');
          } catch {}
        }
      } else {
        setErrorMessage(
          lang === 'ar'
            ? 'خطأ في تسجيل الدخول: البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى كتابة كلمة المرور الصحيحة.'
            : 'Login failed: Invalid email or password. Please check your credentials.'
        );
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -start-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -end-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <Logo variant="full" size="md" showSlogan={true} />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
              <span>أكاديمية ذاكرلي التعليمية</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              تسجيل الدخول للنظام
            </h1>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Account Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>صفة الدخول (نوع الحساب):</span>
              </label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs font-extrabold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer pe-9"
                >
                  <option value="super_admin" className="bg-slate-900 text-white font-bold">
                    الدخول كـ مدير نظام أقصى (Super Admin)
                  </option>
                  <option value="director_courses" className="bg-slate-900 text-emerald-400 font-bold">
                    الدخول كـ مدير قسم الكورسات (Courses Director)
                  </option>
                  <option value="director_curriculum" className="bg-slate-900 text-blue-400 font-bold">
                    الدخول كـ مدير قسم المناهج (Curriculum Director)
                  </option>
                  <option value="supervisor" className="bg-slate-900 text-white font-bold">
                    الدخول كـ مشرف عام (Supervisor)
                  </option>
                  <option value="supervisor_courses" className="bg-slate-900 text-white font-bold">
                    الدخول كـ مشرف قسم الدورات (Courses Supervisor)
                  </option>
                  <option value="supervisor_curriculum" className="bg-slate-900 text-white font-bold">
                    الدخول كـ مشرف قسم المناهج (Curriculum Supervisor)
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Branch Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>فرع الأكاديمية:</span>
              </label>
              <div className="relative">
                <select
                  value={
                    selectedRole === 'director_courses' || selectedRole === 'supervisor_courses'
                      ? 'tenant-zakirly-courses'
                      : selectedRole === 'director_curriculum' || selectedRole === 'supervisor_curriculum'
                      ? 'tenant-zakirly-curriculum'
                      : activeTenantId
                  }
                  onChange={(e) => setActiveTenantId(e.target.value)}
                  disabled={
                    selectedRole === 'director_courses' ||
                    selectedRole === 'supervisor_courses' ||
                    selectedRole === 'director_curriculum' ||
                    selectedRole === 'supervisor_curriculum'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer pe-9 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {db.tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {lang === 'ar' ? t.nameAr : t.nameEn} ({t.currency})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 3. Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>اسم الحساب / البريد الإلكتروني:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zakirly.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-4 pe-10 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dir-ltr text-start transition-all"
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'ar' ? 'كلمة المرور:' : 'Password:'}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter your password...'}
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-4 pe-10 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dir-ltr text-start transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>{lang === 'ar' ? 'تذكر اسم الحساب' : 'Remember account email'}</span>
              </label>
              <button
                type="button"
                onClick={() => alert(lang === 'ar' ? 'يرجى التواصل مع الدعم الفني أو المدير الأكاديمي.' : 'Please contact administrator.')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group min-h-[48px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </>
              )}
            </button>

          </form>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 py-3 text-center text-xs text-slate-500 border-t border-slate-800/60">
        <span>أكاديمية ذاكرلي التعليمية ERP © {new Date().getFullYear()} - جميع الحقوق محفوظة</span>
      </footer>

    </div>
  );
};

