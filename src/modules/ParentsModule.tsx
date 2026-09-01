import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Parent } from '../types';
import { UserCheck, Phone, MessageSquare, CreditCard, ExternalLink, Plus, Edit2, Trash2, X, LayoutGrid, List } from 'lucide-react';

export const ParentsModule: React.FC = () => {
  const { db, lang, searchQuery, currencySymbol, updateDatabaseState } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');

  // Form
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [totalDue, setTotalDue] = useState(0);

  const filteredParents = (db?.parents || []).filter((p) => {
    if (!p) return false;
    const q = (searchQuery || '').toLowerCase();
    const nameMatch = (p.nameAr || '').toLowerCase().includes(q);
    const phoneMatch = (p.phone || '').includes(q);
    const codeMatch = (p.code || '').toLowerCase().includes(q);
    return nameMatch || phoneMatch || codeMatch;
  });

  const handleOpenAdd = () => {
    setEditingParent(null);
    setNameAr('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setOccupation('');
    setTotalDue(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Parent) => {
    setEditingParent(p);
    setNameAr(p.nameAr || '');
    setPhone(p.phone || '');
    setWhatsapp(p.whatsapp || p.phone || '');
    setEmail(p.email || '');
    setOccupation(p.occupation || '');
    setTotalDue(p.totalDue || 0);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !phone) return;

    if (editingParent) {
      updateDatabaseState((draft) => {
        const idx = draft.parents.findIndex((p) => p.id === editingParent.id);
        if (idx !== -1) {
          draft.parents[idx] = {
            ...draft.parents[idx],
            nameAr,
            nameEn: nameAr,
            phone,
            whatsapp: whatsapp || phone,
            email: email || `parent.${Date.now()}@gmail.com`,
            occupation,
            totalDue: Number(totalDue),
          };
        }
      });
    } else {
      const newParent: Parent = {
        id: `par-${Date.now()}`,
        tenantId: 'tenant-zakirly-main',
        code: `PAR-${Math.floor(2000 + Math.random() * 8000)}`,
        nameAr,
        nameEn: nameAr,
        phone,
        whatsapp: whatsapp || phone,
        email: email || `parent.${Date.now()}@gmail.com`,
        occupation,
        childrenIds: [],
        totalDue: Number(totalDue),
        createdAt: new Date().toISOString().split('T')[0],
      };
      updateDatabaseState((draft) => {
        draft.parents.unshift(newParent);
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateDatabaseState((draft) => {
      const idx = draft.parents.findIndex((p) => p.id === id);
      if (idx !== -1) {
        draft.parents.splice(idx, 1);
      }
    });
    setDeletingParentId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'سجل أولياء الأمور والربط العائلي' : 'Parents Directory'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حسابات أولياء الأمور، الأبناء المسجلين، الرصيد المالي والتواصل المباشر عبر الواتساب.
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
                  ? 'bg-indigo-600 text-white shadow-sm'
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
                  ? 'bg-indigo-600 text-white shadow-sm'
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ولي أمر جديد</span>
          </button>
        </div>
      </div>

      <div className={
        mobileViewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-4'
          : 'grid grid-cols-1 md:grid-cols-2 gap-4'
      }>
        {filteredParents.map((parent) => {
          const parentChildrenIds = Array.isArray(parent.childrenIds) ? parent.childrenIds : [];
          const children = (db?.students || []).filter(
            (s) => parentChildrenIds.includes(s.id) || s.parentId === parent.id
          );
          const whatsappNum = (parent.whatsapp || parent.phone || '').replace(/[^0-9]/g, '');

          return (
            <div key={parent.id} className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all text-start">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{parent.nameAr || 'ولي أمر'}</h3>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate">
                      {parent.code || 'PAR-0000'} • {parent.occupation || 'ولي أمر'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={whatsappNum ? `https://wa.me/${whatsappNum}` : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 sm:py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-0.5"
                    >
                      <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                      <span className="hidden sm:inline">واتساب</span>
                    </a>

                    <button
                      onClick={() => handleOpenEdit(parent)}
                      className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="تعديل"
                    >
                      <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingParentId(parent.id)}
                      className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] sm:text-xs text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                  <div className="truncate">
                    <span className="text-slate-500 font-bold">الهاتف:</span>{' '}
                    <span className="font-mono font-bold text-slate-700">{parent.phone || 'غير مسجل'}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500 font-bold">الأبناء:</span>{' '}
                    {children.length > 0 ? (
                      <span className="text-indigo-700 font-bold truncate">
                        {children.map((c) => c.nameAr).join('، ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">لا يوجد أبناء</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500">المديونية:</span>
                <span className={`font-black ${parent.totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {(parent.totalDue || 0).toLocaleString()} {currencySymbol}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingParent ? 'تعديل بيانات ولي الأمر' : 'إضافة ولي أمر جديد'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم ولي الأمر*</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: المهندس أحمد علي"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المهنة / الوظيفة</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="مثال: طبيب بشري / مهندس"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف*</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+201000000000"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الواتساب</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+201000000000"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المديونية المستحقة ({currencySymbol})</label>
                <input
                  type="number"
                  value={totalDue}
                  onChange={(e) => setTotalDue(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-rose-700"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-slate-50">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-md">حفظ</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingParentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2 font-serif">تأكيد الحذف</h3>
            <p className="text-xs text-slate-600 mb-6">هل أنت متأكد من حذف حساب ولي الأمر هذا؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingParentId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">إلغاء</button>
              <button onClick={() => handleDelete(deletingParentId)} className="px-4 py-2 text-xs font-black bg-rose-600 text-white rounded-xl">حذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
