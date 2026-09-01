import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLE_DEFINITIONS } from '../context/AppContext';
import { ShieldCheck, Check, X, User, Plus, Edit2, Trash2, Key, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';

export const UserManagementModule: React.FC = () => {
  const { lang, db, updateDatabaseState } = useApp();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [changePasswordUserId, setChangePasswordUserId] = useState<string | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<UserRole>('administrative_director');
  const [showPassword, setShowPassword] = useState(false);
  const [newDirectPassword, setNewDirectPassword] = useState('');

  const [msg, setMsg] = useState<string | null>(null);

  const permissionsMatrix = [
    { module: 'لوحة التحكم والتحليلات', super_admin: true, academic_director: true, administrative_director: true, supervisor: true, teacher: true, parent: true, student: true, accountant: true },
    { module: 'إدارة الطلاب وسجل الحصص', super_admin: true, academic_director: true, administrative_director: true, supervisor: true, teacher: false, parent: true, student: false, accountant: true },
    { module: 'إدارة المعلمين وهيئة التدريس', super_admin: true, academic_director: true, administrative_director: true, supervisor: true, teacher: false, parent: false, student: false, accountant: true },
    { module: 'المناهج الدراسية والدورات', super_admin: true, academic_director: true, administrative_director: true, supervisor: true, teacher: true, parent: false, student: false, accountant: false },
    { module: 'شيت الحصص التجريبية والإشراف', super_admin: true, academic_director: true, administrative_director: true, supervisor: true, teacher: false, parent: false, student: false, accountant: false },
    { module: 'المالية والفواتير والتحصيل', super_admin: true, academic_director: false, administrative_director: true, supervisor: false, teacher: false, parent: true, student: false, accountant: true },
    { module: 'مسير رواتب المعلمين', super_admin: true, academic_director: false, administrative_director: false, supervisor: false, teacher: true, parent: false, student: false, accountant: true },
    { module: 'إدارة الصلاحيات والكلمات المرور', super_admin: true, academic_director: false, administrative_director: false, supervisor: false, teacher: false, parent: false, student: false, accountant: false },
  ];

  const roles: UserRole[] = [
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

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !email) return;

    if (editingUserId) {
      updateDatabaseState((draft) => {
        const u = draft.users.find((user) => user.id === editingUserId);
        if (u) {
          u.name = nameAr;
          u.nameAr = nameAr;
          u.email = email;
          u.role = role;
          if (password) {
            u.password = password;
          }
        }
      });
      setMsg(`تم تحديث بيانات الحساب وكلمة المرور للموظف ${nameAr} بنجاح.`);
    } else {
      const newUser = {
        id: `usr-${Date.now()}`,
        tenantId: 'tenant-zakirly-main',
        name: nameAr,
        nameAr,
        email,
        password: password || '123456',
        role,
        status: 'active' as const,
        createdAt: new Date().toISOString().split('T')[0],
      };
      updateDatabaseState((draft) => {
        draft.users.unshift(newUser);
      });
      setMsg(`تم إيقاد وتفعيل حساب الموظف ${nameAr} بكلمة المرور: (${newUser.password}).`);
    }

    setTimeout(() => setMsg(null), 5000);
    setIsAddUserOpen(false);
    setEditingUserId(null);
  };

  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordUserId || !newDirectPassword) return;

    updateDatabaseState((draft) => {
      const u = draft.users.find((user) => user.id === changePasswordUserId);
      if (u) {
        u.password = newDirectPassword;
      }
    });
    const targetUser = db.users.find((user) => user.id === changePasswordUserId);
    setMsg(`تم تغيير كلمة المرور للمستخدم (${targetUser?.nameAr || targetUser?.name || ''}) إلى: (${newDirectPassword}) بنجاح.`);
    setTimeout(() => setMsg(null), 5000);

    setChangePasswordUserId(null);
    setNewDirectPassword('');
  };

  const handleDeleteUser = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        draft.users.splice(idx, 1);
      }
    });
    setDeletingUserId(null);
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-purple-500/10 border border-purple-500/30 text-purple-900 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-purple-700 font-black">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'إدارة الموظفين والكلمات المرور والصلاحيات' : 'Roles & Users Management'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إضافة الموظفين وتحديد كلمات المرور الابتدائية، إمكانية تعديل وتعيين كلمة المرور لأي حساب، ومصفوفة التحكم في الوصول.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUserId(null);
            setNameAr('');
            setEmail('');
            setPassword('123456');
            setRole('administrative_director');
            setIsAddUserOpen(true);
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موظف / حساب جديد</span>
        </button>
      </div>

      {/* Staff Users List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm">قائمة حسابات الموظفين والمستخدمين بالحسابات الموحدة</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.users.map((u) => (
            <div key={u.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between hover:bg-white transition-all shadow-xs">
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>{u.nameAr || u.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">
                    {ROLE_DEFINITIONS[u.role]?.titleAr || u.role}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">
                    🔑 {u.password || '******'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setChangePasswordUserId(u.id);
                    setNewDirectPassword(u.password || '123456');
                  }}
                  className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100 rounded-lg"
                  title="تغيير كلمة المرور لهذا الحساب"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setEditingUserId(u.id);
                    setNameAr(u.nameAr || u.name);
                    setEmail(u.email);
                    setPassword(u.password || '123456');
                    setRole(u.role);
                    setIsAddUserOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="تعديل البيانات"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeletingUserId(u.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="حذف الحساب"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-extrabold text-slate-900 text-sm">
          مصفوفة صلاحيات النظام الرسمية
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-900 text-white font-bold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="p-3.5 text-start">الوحدة والوظيفية</th>
                {roles.map((r) => (
                  <th key={r} className="p-3.5 text-center whitespace-nowrap">
                    {ROLE_DEFINITIONS[r].titleAr.split('(')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-extrabold text-slate-900">{row.module}</td>
                  {roles.map((r) => {
                    const allowed = (row as any)[r];
                    return (
                      <td key={r} className="p-3.5 text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal with Initial Password */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveUser} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingUserId ? 'تعديل بيانات الحساب' : 'إضافة حساب موظف جديد'}
              </h3>
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الموظف الكامل*</label>
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
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني للذكيرلي*</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@zakirly.academy"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور الحساب*</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full border border-slate-200 p-2.5 pe-10 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الدور والصلاحية (Role)*</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-purple-900"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_DEFINITIONS[r].titleAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl shadow-md">حفظ والحساب</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Quick Change Password Modal */}
      {changePasswordUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdminResetPassword} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تغيير كلمة المرور بواسطة المدير</h3>
              </div>
              <button type="button" onClick={() => setChangePasswordUserId(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                الحساب المستهدف:{' '}
                <strong className="text-slate-900 font-bold">
                  {db.users.find((u) => u.id === changePasswordUserId)?.nameAr || db.users.find((u) => u.id === changePasswordUserId)?.name}
                </strong>
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور الجديدة*</label>
                <input
                  type="text"
                  required
                  value={newDirectPassword}
                  onChange={(e) => setNewDirectPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setChangePasswordUserId(null)} className="px-4 py-2 border rounded-xl">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl shadow-md">حفظ كلمة المرور الجديدة</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد حذف المستخدم</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف هذا الحساب؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingUserId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDeleteUser(deletingUserId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
