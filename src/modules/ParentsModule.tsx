import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Parent, Student } from '../types';
import {
  UserCheck,
  Phone,
  MessageSquare,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  X,
  LayoutGrid,
  List,
  Table as TableIcon,
  Download,
  Search,
  Building2,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExporter';

export const ParentsModule: React.FC = () => {
  const { db, lang, searchQuery, setSearchQuery, currencySymbol, updateDatabaseState, activeTenantId, role } = useApp();

  // View state: 'table' (شيت أولياء الأمور) or 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters
  const [branchFilter, setBranchFilter] = useState<'all' | 'curriculum' | 'courses'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'with_due' | 'zero_due'>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [relationship, setRelationship] = useState('والد / ولي أمر');
  const [selectedTenant, setSelectedTenant] = useState<string>(activeTenantId || 'tenant-zakirly-curriculum');
  const [totalDue, setTotalDue] = useState(0);

  // Filtered Parents
  const filteredParents = (db?.parents || []).filter((p) => {
    if (!p) return false;
    const q = (searchQuery || '').toLowerCase().trim();

    // Find linked children
    const parentChildrenIds = Array.isArray(p.childrenIds) ? p.childrenIds : [];
    const children = (db?.students || []).filter(
      (s) => parentChildrenIds.includes(s.id) || s.parentId === p.id
    );

    const nameMatch = (p.nameAr || '').toLowerCase().includes(q);
    const phoneMatch = (p.phone || '').includes(q);
    const codeMatch = (p.code || '').toLowerCase().includes(q);
    const childMatch = children.some((c) => (c.nameAr || '').toLowerCase().includes(q));

    const matchesSearch = !q || nameMatch || phoneMatch || codeMatch || childMatch;

    // Branch filter
    let matchesBranch = true;
    if (branchFilter === 'curriculum') {
      matchesBranch = p.tenantId === 'tenant-zakirly-curriculum' || children.some((c) => c.tenantId === 'tenant-zakirly-curriculum');
    } else if (branchFilter === 'courses') {
      matchesBranch = p.tenantId === 'tenant-zakirly-courses' || children.some((c) => c.tenantId === 'tenant-zakirly-courses');
    }

    // Debt filter
    let matchesDebt = true;
    if (debtFilter === 'with_due') {
      matchesDebt = Number(p.totalDue || 0) > 0;
    } else if (debtFilter === 'zero_due') {
      matchesDebt = Number(p.totalDue || 0) <= 0;
    }

    return matchesSearch && matchesBranch && matchesDebt;
  });

  // Stats calculation
  const totalParentsCount = db?.parents?.length || 0;
  const parentsWithDueCount = (db?.parents || []).filter((p) => Number(p.totalDue || 0) > 0).length;
  const totalDueSum = (db?.parents || []).reduce((sum, p) => sum + Number(p.totalDue || 0), 0);
  const totalEnrolledStudents = db?.students?.length || 0;

  const handleOpenAdd = () => {
    setEditingParent(null);
    setNameAr('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setOccupation('');
    setRelationship('والد / ولي أمر');
    setSelectedTenant(activeTenantId || 'tenant-zakirly-curriculum');
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
    setRelationship(p.relationship || 'والد / ولي أمر');
    setSelectedTenant(p.tenantId || activeTenantId || 'tenant-zakirly-curriculum');
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
            relationship,
            tenantId: selectedTenant,
            totalDue: Number(totalDue),
          };
        }
      });
    } else {
      const newParent: Parent = {
        id: `par-${Date.now()}`,
        tenantId: selectedTenant,
        code: `PAR-${Math.floor(2000 + Math.random() * 8000)}`,
        nameAr,
        nameEn: nameAr,
        phone,
        whatsapp: whatsapp || phone,
        email: email || `parent.${Date.now()}@gmail.com`,
        occupation,
        relationship,
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

  const handleExportExcel = () => {
    const exportData = filteredParents.map((p) => {
      const parentChildrenIds = Array.isArray(p.childrenIds) ? p.childrenIds : [];
      const children = (db?.students || []).filter(
        (s) => parentChildrenIds.includes(s.id) || s.parentId === p.id
      );
      const branchName =
        p.tenantId === 'tenant-zakirly-courses' ? 'الكورسات والدورات' : 'المناهج الدراسية';

      return {
        'كود ولي الأمر': p.code || 'PAR-0000',
        'اسم ولي الأمر': p.nameAr || '',
        'صلة القرابة': p.relationship || 'ولي أمر',
        'رقم الهاتف': p.phone || '',
        'رقم الواتساب': p.whatsapp || p.phone || '',
        'الأبناء المسجلين': children.map((c) => c.nameAr).join('، ') || 'لا يوجد',
        'عدد الأبناء': children.length,
        'الفرع / المسار': branchName,
        'المهنة': p.occupation || 'غير محدد',
        'المديونية المستحقة': p.totalDue || 0,
        'تاريخ التسجيل': p.createdAt || '',
      };
    });

    exportToExcel(exportData, 'شيت_أولياء_الأمور_أكاديمية_ذاكرلي', 'أولياء الأمور');
  };

  const getBranchLabel = (tenantId?: string) => {
    if (tenantId === 'tenant-zakirly-courses') {
      return {
        label: 'الكورسات والدورات',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    return {
      label: 'المناهج الدراسية',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 font-serif">
                {lang === 'ar' ? 'شيت أولياء الأمور وسجل العائلات' : 'Parents Directory & Sheet'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة شيت أولياء الأمور، ربط الأبناء، التواصل المباشر عبر الواتساب، والمديونيات.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* View mode toggle: Table (Sheet) vs Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الشيت (جدول)"
            >
              <TableIcon className="w-4 h-4" />
              <span>عرض الشيت</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض البطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>بطاقات</span>
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="تصدير شيت أولياء الأمور إلى Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Add parent button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ولي أمر جديد</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">إجمالي أولياء الأمور</div>
            <div className="text-lg font-black text-slate-900">{totalParentsCount}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">الأبناء المسجلين</div>
            <div className="text-lg font-black text-blue-700">{totalEnrolledStudents}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">أولياء أمور بمديونية</div>
            <div className="text-lg font-black text-rose-600">{parentsWithDueCount}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">إجمالي المستحقات</div>
            <div className="text-lg font-black text-slate-900">
              {totalDueSum.toLocaleString()} <span className="text-[10px] font-medium">{currencySymbol}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم ولي الأمر، الهاتف، الكود، أو اسم الابن..."
            className="w-full bg-slate-50 border border-slate-200 ps-9 pe-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Branch filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 outline-none text-xs cursor-pointer"
            >
              <option value="all">جميع الفروع والمسارات</option>
              <option value="curriculum">المناهج الدراسية</option>
              <option value="courses">الكورسات والدورات</option>
            </select>
          </div>

          {/* Debt filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 outline-none text-xs cursor-pointer"
            >
              <option value="all">جميع الحسابات</option>
              <option value="with_due">عليهم مديونية فقط</option>
              <option value="zero_due">مسددين بالكامل</option>
            </select>
          </div>

          {/* Mobile sub-toggle for cards */}
          {viewMode === 'cards' && (
            <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  mobileViewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض عمودان"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
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
                title="عرض قائمة"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[10px]">قائمة</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredParents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">لا يوجد أولياء أمور يطابقون خيارات البحث</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            يمكنك إضافة أولياء أمور جدد أو مسح عبارة البحث لرؤية كافة المسجلين في الشيت.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ولي أمر جديد</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE / SHEET VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold select-none">
                  <th className="py-3 px-4 text-start font-mono">الكود</th>
                  <th className="py-3 px-4 text-start">ولي الأمر</th>
                  <th className="py-3 px-4 text-start">رقم الهاتف</th>
                  <th className="py-3 px-4 text-center">تواصل واتساب</th>
                  <th className="py-3 px-4 text-start">الأبناء المسجلين</th>
                  <th className="py-3 px-4 text-start">الفرع الأكاديمي</th>
                  <th className="py-3 px-4 text-start">المهنة / الوظيفة</th>
                  <th className="py-3 px-4 text-end">المديونية</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParents.map((parent) => {
                  const parentChildrenIds = Array.isArray(parent.childrenIds) ? parent.childrenIds : [];
                  const children = (db?.students || []).filter(
                    (s) => parentChildrenIds.includes(s.id) || s.parentId === parent.id
                  );
                  const whatsappNum = (parent.whatsapp || parent.phone || '').replace(/[^0-9]/g, '');
                  const branch = getBranchLabel(parent.tenantId);
                  const isDue = Number(parent.totalDue || 0) > 0;

                  return (
                    <tr
                      key={parent.id}
                      className="hover:bg-indigo-50/40 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {parent.code || 'PAR-0000'}
                        </span>
                      </td>

                      {/* Parent Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{parent.nameAr || 'ولي أمر'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {parent.relationship || 'والد / ولي أمر'}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {parent.phone || 'غير مسجل'}
                      </td>

                      {/* Direct WhatsApp Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {whatsappNum ? (
                          <a
                            href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                              `السلام عليكم أستاذ ${parent.nameAr}، بخصوص متابعة الطلاب في أكاديمية ذاكرلي...`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition-all shadow-sm"
                            title="مراسلة واتساب فورية"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>واتساب</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Linked Children */}
                      <td className="py-3.5 px-4">
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {children.map((child) => (
                              <span
                                key={child.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold"
                              >
                                <GraduationCap className="w-3 h-3 text-indigo-500" />
                                <span>{child.nameAr}</span>
                                <span className="text-[9px] text-indigo-400 font-normal">({child.grade})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">لا يوجد أبناء مسجلين</span>
                        )}
                      </td>

                      {/* Academic Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${branch.bg}`}>
                          {branch.label}
                        </span>
                      </td>

                      {/* Occupation */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {parent.occupation || 'ولي أمر'}
                      </td>

                      {/* Outstanding Due */}
                      <td className="py-3.5 px-4 text-end whitespace-nowrap">
                        <span
                          className={`font-black px-2 py-0.5 rounded-lg text-xs ${
                            isDue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {(parent.totalDue || 0).toLocaleString()} {currencySymbol}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(parent)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="تعديل بيانات ولي الأمر"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingParentId(parent.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف ولي الأمر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>عدد النتائج المعروضة: <strong>{filteredParents.length}</strong></span>
            <span>أكاديمية ذاكرلي - شيت أولياء الأمور والعائلات</span>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div
          className={
            mobileViewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-4'
              : 'grid grid-cols-1 md:grid-cols-2 gap-4'
          }
        >
          {filteredParents.map((parent) => {
            const parentChildrenIds = Array.isArray(parent.childrenIds) ? parent.childrenIds : [];
            const children = (db?.students || []).filter(
              (s) => parentChildrenIds.includes(s.id) || s.parentId === parent.id
            );
            const whatsappNum = (parent.whatsapp || parent.phone || '').replace(/[^0-9]/g, '');
            const branch = getBranchLabel(parent.tenantId);

            return (
              <div
                key={parent.id}
                className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all text-start"
              >
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {parent.nameAr || 'ولي أمر'}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${branch.bg}`}>
                          {branch.label}
                        </span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate">
                        {parent.code || 'PAR-0000'} • {parent.occupation || 'ولي أمر'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {whatsappNum && (
                        <a
                          href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                            `السلام عليكم أستاذ ${parent.nameAr}، بخصوص متابعة الطلاب في أكاديمية ذاكرلي...`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 sm:py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-0.5"
                        >
                          <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                          <span className="hidden sm:inline">واتساب</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenEdit(parent)}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
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
                  <span className="text-slate-500 font-bold">المديونية المستحقة:</span>
                  <span className={`font-black ${parent.totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {(parent.totalDue || 0).toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingParent ? 'تعديل بيانات ولي الأمر في الشيت' : 'إضافة ولي أمر جديد إلى الشيت'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800"
              >
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
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفرع الأكاديمي*</label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-slate-700"
                  >
                    <option value="tenant-zakirly-curriculum">المناهج الدراسية</option>
                    <option value="tenant-zakirly-courses">الكورسات والدورات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">صلة القرابة</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-medium text-slate-700"
                  >
                    <option value="والد / ولي أمر">والد / ولي أمر</option>
                    <option value="والدة الطالب">والدة الطالب</option>
                    <option value="أخ / أخت أكبر">أخ / أخت أكبر</option>
                    <option value="وصي قانوني">وصي قانوني</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المهنة / الوظيفة</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="مثال: طبيب بشري / مهندس / رائد أعمال"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الواتساب</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+201000000000"
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المديونية المستحقة ({currencySymbol})</label>
                <input
                  type="number"
                  value={totalDue}
                  onChange={(e) => setTotalDue(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors"
              >
                {editingParent ? 'حفظ التعديلات' : 'إضافة إلى الشيت'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingParentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-serif">تأكيد حذف ولي الأمر</h3>
              <p className="text-xs text-slate-600 mt-1">
                هل أنت متأكد من رغبتك في حذف هذا الحساب من شيت أولياء الأمور؟ سيتم إزالة السجل نهائياً.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingParentId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deletingParentId)}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-sm"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
