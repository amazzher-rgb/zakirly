import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import { Users, Plus, Search, Star, Phone, Mail, BookOpen, DollarSign, Award, X, Edit2, Trash2, Key, Check, Calendar, ChevronDown, ChevronUp, Layers, Clock, Eye, CheckCircle2, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { getCurrentAccountingCycle, getTeacherCycleSessions, getTeacherPostCycleSessions, getTeacherCompletedSessions } from '../utils/accountingUtils';
import { CompletedSessionsDetailsModal } from '../components/CompletedSessionsDetailsModal';
import { AccountingCycleSelectorBar } from '../components/AccountingCycleSelectorBar';

export const TeachersModule: React.FC = () => {
  const { db, lang, createTeacher, updateDatabaseState, searchQuery, setSearchQuery, currencySymbol, activeCycle, activeTenantId } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [resetPassTeacher, setResetPassTeacher] = useState<Teacher | null>(null);
  const [viewingDetailsTeacher, setViewingDetailsTeacher] = useState<Teacher | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [phone, setPhone] = useState('');
  const [subjectsStr, setSubjectsStr] = useState('اللغة الإنجليزية IGCSE');
  const [perSessionRate, setPerSessionRate] = useState(250);
  const [status, setStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');

  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredTeachers = db.teachers.filter((t) =>
    t.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derive unique subjects list from courseSubjects and teacher subjects
  const allSubjectTitles = Array.from(
    new Set([
      ...db.courseSubjects.map((cs) => cs.titleAr),
      ...db.teachers.flatMap((t) => (Array.isArray(t.subjects) ? t.subjects : [t.subjects])).filter(Boolean),
    ])
  );

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setNameAr('');
    setEmail('');
    setPassword('123456');
    setPhone('');
    setSubjectsStr('اللغة الإنجليزية IGCSE');
    setPerSessionRate(250);
    setStatus('active');
    setIsAddOpen(true);
  };

  const handleOpenAddForSubject = (subjTitle: string) => {
    handleOpenAdd();
    setSubjectsStr(subjTitle);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setNameAr(teacher.nameAr);
    setEmail(teacher.email);
    const existingUser = db.users.find((u) => u.linkedEntityId === teacher.id || u.email === teacher.email);
    setPassword(existingUser?.password || '123456');
    setPhone(teacher.phone);
    setSubjectsStr(Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : teacher.subjects || '');
    setPerSessionRate(teacher.perSessionRate);
    setStatus(teacher.status);
    setIsAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !nameAr.trim()) {
      alert('يرجى كتابة اسم المعلم');
      return;
    }

    let targetEmail = email.trim();
    if (!targetEmail) {
      targetEmail = `teacher.${Date.now()}@zakirly.academy`;
    } else if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@zakirly.academy`;
    } else if (!targetEmail.includes('.')) {
      targetEmail = `${targetEmail}.com`;
    }

    const finalPhone = phone.trim() || '+201000000000';
    const finalRate = Number(perSessionRate) || 200;

    try {
      if (editingTeacher) {
        // Edit teacher
        updateDatabaseState((draft) => {
          const idx = draft.teachers.findIndex((t) => t.id === editingTeacher.id);
          if (idx !== -1) {
            draft.teachers[idx] = {
              ...draft.teachers[idx],
              nameAr: nameAr.trim(),
              email: targetEmail,
              phone: finalPhone,
              subjects: subjectsStr.split(',').map((s) => s.trim()).filter(Boolean),
              perSessionRate: finalRate,
              hourlyRate: finalRate,
              status,
            };
          }

          // Sync user password
          const user = draft.users.find((u) => u.linkedEntityId === editingTeacher.id || u.email === editingTeacher.email);
          if (user) {
            user.nameAr = nameAr.trim();
            user.email = targetEmail;
            if (password) user.password = password;
          }
        });

        fetch(`/api/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameAr: nameAr.trim(),
            email: targetEmail,
            phone: finalPhone,
            subjects: subjectsStr.split(',').map((s) => s.trim()).filter(Boolean),
            perSessionRate: finalRate,
            status,
          }),
        }).catch(() => {});

        setFeedbackMsg(`تم تحديث بيانات المعلم (${nameAr.trim()}) وكلمة مرور حسابه بنجاح.`);
      } else {
        // Add teacher
        await createTeacher({
          tenantId: activeTenantId,
          nameAr: nameAr.trim(),
          email: targetEmail,
          password: password || '123456',
          phone: finalPhone,
          subjects: subjectsStr.split(',').map((s) => s.trim()).filter(Boolean),
          perSessionRate: finalRate,
          hourlyRate: finalRate,
          status,
        });

        setFeedbackMsg(`تم إضافة المعلم (${nameAr.trim()}) وإنشاء حساب له بكلمة المرور: (${password || '123456'}) بنجاح!`);
      }

      setTimeout(() => setFeedbackMsg(null), 5000);
      setIsAddOpen(false);
      setEditingTeacher(null);
    } catch (err) {
      console.error('Error saving teacher:', err);
      alert('حدث خطأ أثناء حفظ المعلم. يرجى التكرار مرة أخرى.');
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTeacher || !newTeacherPassword) return;

    updateDatabaseState((draft) => {
      const u = draft.users.find((user) => user.linkedEntityId === resetPassTeacher.id || user.email === resetPassTeacher.email);
      if (u) {
        u.password = newTeacherPassword;
      } else {
        draft.users.unshift({
          id: `usr-${Date.now()}`,
          tenantId: 'tenant-zakirly-main',
          name: resetPassTeacher.nameAr,
          nameAr: resetPassTeacher.nameAr,
          email: resetPassTeacher.email,
          password: newTeacherPassword,
          role: 'teacher',
          linkedEntityId: resetPassTeacher.id,
          status: 'active',
        });
      }
    });

    setFeedbackMsg(`تم تغيير كلمة مرور حساب المعلم (${resetPassTeacher.nameAr}) إلى: (${newTeacherPassword}) بنجاح.`);
    setTimeout(() => setFeedbackMsg(null), 5000);
    setResetPassTeacher(null);
    setNewTeacherPassword('');
  };

  const handleDelete = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.teachers.findIndex((t) => t.id === id);
      if (idx !== -1) {
        draft.teachers.splice(idx, 1);
      }
    });
    setDeletingTeacherId(null);
  };

  const currentCycle = getCurrentAccountingCycle();

  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 font-black">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'إدارة المعلمين وهيئة التدريس والكلمات المرور' : 'Teachers Directory'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة المعلمين، التخصصات، إنشاء الحسابات بكلمات مرور مخصصة، وتقييم الأداء والمستحقات'
              : 'Manage faculty teachers, session rates, passwords, and performance.'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mobile View Toggle: 2 Columns Side by Side vs 1 Column */}
          <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                mobileViewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض عمودان جنباً لجنب"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px]">عمودان</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                mobileViewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض قائمة رأسية"
            >
              <List className="w-4 h-4" />
              <span className="text-[10px]">قائمة</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة معلم جديد' : 'Add Teacher'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Accounting Cycle Selector Bar */}
      <AccountingCycleSelectorBar />

      {/* Teachers Organized by Subject Accordions */}
      <div className="space-y-4">
        {allSubjectTitles.map((subjTitle) => {
          const isCollapsed = !!collapsedSubjects[subjTitle];
          const teachersInSubj = filteredTeachers.filter((t) => {
            const subjList = Array.isArray(t.subjects)
              ? t.subjects
              : typeof t.subjects === 'string'
              ? [t.subjects]
              : [];
            return subjList.some(
              (s) => s.toLowerCase().includes(subjTitle.toLowerCase()) || subjTitle.toLowerCase().includes(s.toLowerCase())
            );
          });

          return (
            <div key={subjTitle} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => setCollapsedSubjects((prev) => ({ ...prev, [subjTitle]: !prev[subjTitle] }))}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>مادة: {subjTitle}</span>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-black rounded-full border border-emerald-200">
                        {teachersInSubj.length} معلم
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      المدرسون المعتمدون لتدريس مادة {subjTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddForSubject(subjTitle);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة معلم لهذه المادة</span>
                  </button>

                  <div className="p-1.5 text-slate-400 hover:text-slate-700">
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Accordion Content */}
              {!isCollapsed && (
                <div className="p-4 bg-white">
                  {teachersInSubj.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium space-y-2">
                      <p>لا يوجد معلمون مضافون لمادة ({subjTitle}) حتى الآن.</p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddForSubject(subjTitle)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors"
                      >
                        + إضافة أول معلم لـ {subjTitle}
                      </button>
                    </div>
                  ) : (
                    <div className={
                      mobileViewMode === 'grid'
                        ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    }>
                      {teachersInSubj.map((teacher) => {
                        const teacherUser = db.users.find(
                          (u) => u.linkedEntityId === teacher.id || u.email === teacher.email
                        );
                        const isSettled = (db.payrolls || []).some(
                          (p) => p.teacherId === teacher.id && p.month === activeCycle.month && p.year === activeCycle.year && (p.status === 'paid' || p.isSettled)
                        );
                        const cycleSessions = getTeacherCycleSessions(teacher.id, activeCycle, db.attendance, db.sessions, teacher, db.payrolls);
                        const postCycleSessions = getTeacherPostCycleSessions(teacher.id, activeCycle, db.attendance, db.sessions, teacher, db.payrolls);
                        const allCompletedSessions = getTeacherCompletedSessions(teacher, db.sessions, db.attendance, activeCycle, db.payrolls);
                        const totalCompletedCount = allCompletedSessions.length;

                        return (
                          <div
                            key={teacher.id}
                            className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group"
                          >
                            <div className="space-y-2 sm:space-y-3">
                              {/* Header: Avatar, Name & Code */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center text-xs sm:text-sm shrink-0">
                                    {teacher.nameAr.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{teacher.nameAr}</h4>
                                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate">{teacher.code}</div>
                                  </div>
                                </div>

                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 shrink-0">
                                  {teacher.status === 'active' ? 'نشط' : teacher.status === 'on_leave' ? 'إجازة' : 'متوقف'}
                                </span>
                              </div>

                              {/* Subject & Rate */}
                              <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-700 truncate font-bold text-[10px] sm:text-xs">
                                  <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span className="truncate">
                                    {Array.isArray(teacher.subjects) ? teacher.subjects.join(' • ') : teacher.subjects || 'عام'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-slate-200/60">
                                  <span className="text-slate-500">سعر الحصة:</span>
                                  <span className="font-black text-emerald-700">{teacher.perSessionRate} {currencySymbol}</span>
                                </div>
                              </div>

                              {/* Sessions breakdown */}
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between bg-blue-50/80 p-1.5 sm:p-2 rounded-xl border border-blue-100 text-[10px] sm:text-[11px]">
                                  <span className="text-blue-950 font-bold truncate">الحصص بالدورة:</span>
                                  <span className="font-black text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">{cycleSessions} ح</span>
                                </div>

                                <div className="flex items-center justify-between bg-amber-50/90 p-1.5 sm:p-2 rounded-xl border border-amber-200 text-[10px] sm:text-[11px]">
                                  <span className="text-amber-950 font-bold truncate">مُرحل (بعد 25):</span>
                                  <span className="font-black text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">{postCycleSessions} ح</span>
                                </div>

                                <div className="flex items-center justify-between bg-indigo-50/90 p-1.5 sm:p-2 rounded-xl border border-indigo-200 text-[10px] sm:text-[11px]">
                                  <span className="text-indigo-950 font-bold truncate">مستحق حالياً:</span>
                                  <span className="font-black text-indigo-950 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                                    {isSettled ? postCycleSessions : (cycleSessions + postCycleSessions)} ح
                                  </span>
                                </div>
                              </div>

                              {/* Executed Sessions Button */}
                              <button
                                onClick={() => setViewingDetailsTeacher(teacher)}
                                className="w-full py-1.5 sm:py-2 px-2 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-xl text-[10px] sm:text-xs font-black border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate">كشف الحصص ({totalCompletedCount})</span>
                              </button>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                              <span className="font-mono text-[9px] sm:text-xs text-slate-500 truncate">
                                🔑 {teacherUser?.password || '123456'}
                              </span>

                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <button
                                  onClick={() => {
                                    setResetPassTeacher(teacher);
                                    setNewTeacherPassword(teacherUser?.password || '123456');
                                  }}
                                  className="p-1 sm:p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                  title="تغيير كلمة المرور"
                                >
                                  <Key className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(teacher)}
                                  className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingTeacherId(teacher.id)}
                                  className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Teacher Modal with Password */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingTeacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد وإنشاء حساب'}
              </h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المعلم*</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: د. إبراهيم الفقي"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني للمعلم</label>
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@zakirly.academy"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور للحساب (Initial Password)*</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للحساب"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المواد والتخصصات (مفصولة بـ فاصلة)</label>
                <input
                  type="text"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                  placeholder="مثال: الرياضيات, الفيزياء"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سعر الحصة (ج.م)*</label>
                  <input
                    type="number"
                    required
                    value={perSessionRate}
                    onChange={(e) => setPerSessionRate(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحالة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="on_leave">في إجازة (On Leave)</option>
                    <option value="inactive">متوقف (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md">حفظ المعلم</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Change Teacher Password Modal */}
      {resetPassTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleResetPasswordSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تغيير كلمة مرور المعلم</h3>
              </div>
              <button type="button" onClick={() => setResetPassTeacher(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                المعلم المستهدف: <strong className="text-slate-900 font-bold">{resetPassTeacher.nameAr}</strong>
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور الجديدة*</label>
                <input
                  type="text"
                  required
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setResetPassTeacher(null)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl shadow-md">حفظ كلمة المرور</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingTeacherId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">
              تأكيد حذف المعلم
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              هل أنت متأكد من حذف هذا المعلم؟
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingTeacherId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deletingTeacherId)}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing teacher executed sessions details */}
      {viewingDetailsTeacher && (
        <CompletedSessionsDetailsModal
          isOpen={!!viewingDetailsTeacher}
          onClose={() => setViewingDetailsTeacher(null)}
          title={`تفاصيل الحصص المنفذة للمعلم: ${viewingDetailsTeacher.nameAr}`}
          subtitle={`كود المعلم: ${viewingDetailsTeacher.code} | التخصص: ${Array.isArray(viewingDetailsTeacher.subjects) ? viewingDetailsTeacher.subjects.join(' • ') : viewingDetailsTeacher.subjects || 'عام'}`}
          sessions={getTeacherCompletedSessions(viewingDetailsTeacher, db.sessions, db.attendance, activeCycle, db.payrolls)}
          cycle={activeCycle}
        />
      )}

    </div>
  );
};
