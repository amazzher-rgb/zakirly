import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Repeat,
  ArrowUpRight,
  Clock,
  Play,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardModule: React.FC = () => {
  const { kpis, db, lang, completeSession, convertTrial, processPayment, setActiveModule, currencySymbol } = useApp();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Filter today's sessions
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = db.sessions.filter((s) => s.date === todayStr);

  // Subscriptions needing renewal (remaining sessions <= 2)
  const pendingRenewals = db.subscriptions.filter((s) => s.remainingSessions <= 2);

  // Scheduled trial lessons
  const activeTrials = db.trialLessons.filter((t) => t.status === 'scheduled');

  // Dynamic Chart Data based on actual invoices & payrolls
  const financialTrendData = useMemo(() => {
    const months = ['مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس'];
    const currentMonthRevenue = kpis.monthlyRevenue || 0;
    const currentMonthPayroll = kpis.teacherPayrollTotal || 0;

    return months.map((month, idx) => {
      if (idx === months.length - 1) {
        return { month, revenue: currentMonthRevenue, payroll: currentMonthPayroll };
      }
      // Past months reflect real historical records if any exist
      const monthNum = idx + 3;
      const rev = (db.invoices || [])
        .filter((inv) => inv.createdAt && new Date(inv.createdAt).getMonth() + 1 === monthNum)
        .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const pay = (db.payrolls || [])
        .filter((p) => p.month === monthNum)
        .reduce((sum, p) => sum + (p.netSalary || 0), 0);

      return { month, revenue: rev, payroll: pay };
    });
  }, [kpis.monthlyRevenue, kpis.teacherPayrollTotal, db.invoices, db.payrolls]);

  const subjectsDistribution = useMemo(() => {
    const defaultColors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#e11d48', '#0891b2'];
    const counts: Record<string, number> = {};

    (db.students || []).forEach((s) => {
      const courseName = s.packageNameAr || 'كورس عام';
      counts[courseName] = (counts[courseName] || 0) + 1;
    });

    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return (db.courseSubjects || []).slice(0, 5).map((cs, i) => ({
        name: cs.titleAr,
        count: 0,
        color: defaultColors[i % defaultColors.length],
      }));
    }

    return entries.map(([name, count], i) => ({
      name,
      count,
      color: defaultColors[i % defaultColors.length],
    }));
  }, [db.students, db.courseSubjects]);

  const handleQuickCompleteSession = async (sessionId: string) => {
    setCompleting(true);
    await completeSession(sessionId, 'present', 'تم الحضور والتأكيد عبر لوحة التحكم');
    setCompleting(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute end-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full border border-blue-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'نظام ذاكرلي التشغيلي Zakirly OS' : 'Zakirly Management Engine'}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight">
              {lang === 'ar' ? 'مرحباً بك في الأكاديمية التعليمية' : 'Welcome to Academy Dashboard'}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              {lang === 'ar'
                ? 'متابعة حية وشاملة للحصص، الاشتراكات، الحضور، الإيرادات، ومسير رواتب المعلمين بالتحديث اللحظي.'
                : 'Realtime telemetry for sessions, subscriptions, attendance, revenue, and teacher payroll.'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveModule('scheduling')}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>{lang === 'ar' ? 'جدولة حصة' : 'Schedule'}</span>
            </button>
            <button
              onClick={() => setActiveModule('subscriptions')}
              className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs backdrop-blur-sm border border-white/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Repeat className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تجديد باقة' : 'Renew'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Students */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>{lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{kpis.totalStudents}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <span>{kpis.activeStudents} نشط</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">{kpis.inactiveStudents} متوقف</span>
          </div>
        </div>

        {/* Today's Sessions */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>{lang === 'ar' ? 'حصص اليوم المجدولة' : "Today's Sessions"}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{kpis.todaySessionsCount}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            موزعة على المعلمين
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>{lang === 'ar' ? `إيرادات الشهر (${currencySymbol})` : 'Monthly Revenue'}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {kpis.monthlyRevenue.toLocaleString()} {currencySymbol}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% عن الشهر السابق</span>
          </div>
        </div>

        {/* Outstanding Debt */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>{lang === 'ar' ? 'مستحقات غير محصلة' : 'Outstanding Debt'}</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {kpis.outstandingPayments.toLocaleString()} {currencySymbol}
          </div>
          <div className="mt-1 text-[11px] text-rose-700 font-medium">
            تستوجب متابعة أولياء الأمور
          </div>
        </div>

        {/* Teacher Payroll */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>{lang === 'ar' ? 'مسير رواتب المعلمين' : 'Teacher Payroll'}</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis.teacherPayrollTotal.toLocaleString()} {currencySymbol}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            حصة إجمالي المنفذ
          </div>
        </div>

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue vs Payroll Trends (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-serif">
                {lang === 'ar' ? `نمو الإيرادات مقابل الرواتب (${currencySymbol})` : 'Revenue vs Payroll Trends'}
              </h3>
              <p className="text-xs text-slate-500">تحليل التدفق النقدي الشهري في الأكاديمية</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {lang === 'ar' ? 'تحديث لحظي' : 'Live Data'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="payroll" name="الرواتب" stroke="#059669" fillOpacity={1} fill="url(#colorPay)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subjects Popularity (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-serif">
              {lang === 'ar' ? 'توزيع الطلاب على المواد' : 'Subjects Enrollment'}
            </h3>
            <p className="text-xs text-slate-500">نسب الإقبال على الكورسات واللغات</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjectsDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="count">
                  {subjectsDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Operations Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Scheduled Sessions Action Box */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                {lang === 'ar' ? 'جدول حصص اليوم (تأكيد الإكمال الحظي)' : "Today's Live Sessions"}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {todaySessions.length} {lang === 'ar' ? 'حصص مجدولة' : 'sessions'}
            </span>
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              {lang === 'ar' ? 'لا توجد حصص إضافية مجدولة لليوم' : 'No remaining sessions for today'}
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{session.subjectNameAr}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {session.startTime} - {session.endTime}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          session.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {session.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                      </span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-3 text-[11px]">
                      <span>الطالب: <strong>{session.studentNameAr}</strong></span>
                      <span>المعلم: <strong>{session.teacherNameAr}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {session.meetingUrl && (
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-[11px] hover:bg-slate-700 transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span>رابط الحصة</span>
                      </a>
                    )}

                    {session.status === 'scheduled' && (
                      <button
                        disabled={completing}
                        onClick={() => handleQuickCompleteSession(session.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>إكمال وتأكيد الحضور</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Renewals & Trial Funnel Column */}
        <div className="space-y-6">
          
          {/* Subscription Renewal Alert Card */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{lang === 'ar' ? 'تنبيهات تجديد الاشتراكات' : 'Pending Package Renewals'}</span>
              </div>
              <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                {pendingRenewals.length}
              </span>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              الطلاب التالية أسماؤهم شارف رصيد حصصهم على الانتهاء (أقل من حصتان):
            </p>

            <div className="space-y-2">
              {pendingRenewals.map((sub) => (
                <div key={sub.id} className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900">{sub.studentNameAr}</div>
                    <div className="text-[10px] text-slate-500">متبقي {sub.remainingSessions} حصة ({sub.courseTitleAr})</div>
                  </div>
                  <button
                    onClick={() => setActiveModule('subscriptions')}
                    className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700 transition-colors"
                  >
                    تجديد
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trial Lessons Funnel Card */}
          <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{lang === 'ar' ? 'الحصص التجريبية الجاهزة للتحويل' : 'Trial Lessons Funnel'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveModule('trial_lessons')}
                  className="text-[11px] font-extrabold text-purple-700 hover:text-purple-900 underline"
                >
                  فتح شيت التجريبي
                </button>
                <span className="text-[10px] font-black bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                  {activeTrials.length}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {activeTrials.map((trial) => (
                <div key={trial.id} className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900">{trial.studentNameAr}</div>
                    <div className="text-[10px] text-slate-500">{trial.courseTitleAr} - {trial.assignedTeacherNameAr}</div>
                  </div>
                  <button
                    onClick={() => setActiveModule('trial_lessons')}
                    className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors"
                  >
                    تحويل باقة
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
