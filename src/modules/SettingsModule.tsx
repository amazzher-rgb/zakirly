import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Download, Upload, Database, RotateCcw, Building2, CheckCircle2, Coins } from 'lucide-react';
import { CURRENCIES, getCurrencyInfo } from '../utils/currencyUtils';

export const SettingsModule: React.FC = () => {
  const { db, lang, resetDatabase, importBackup, currency, setCurrency, currencySymbol } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCurrencyInfo = getCurrencyInfo(currency);

  const handleDownloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(db, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `Zakirly_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          importBackup(parsed);
          alert(lang === 'ar' ? 'تم استعادة النسخة الاحتياطية بنجاح!' : 'Database restored successfully!');
        } catch (err) {
          alert('ملف غير صالح');
        }
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-extrabold text-slate-900 font-serif">
              {lang === 'ar' ? 'إعدادات الأكاديمية والعملات والنسخ الاحتياطي' : 'Settings & Currency Config'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة عملة الحسابات والرواتب، بيانات الأكاديمية، النسخ الاحتياطي وإعادة الضبط.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Currency Selection Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
              <Coins className="w-5 h-5 text-amber-600" />
              <span>اختيار العملة المعتمدة للأكاديمية</span>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full border border-amber-200">
              {activeCurrencyInfo.nameAr} ({activeCurrencyInfo.symbolAr})
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            اختر العملة الرسمية التي وسيتم استخدامها وحسابها عبر جميع الوحدات المالية (الفواتير، سندات القبض، الباقات، مسير الرواتب، وكشوف الحساب PDF).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {CURRENCIES.map((c) => {
              const isSelected = activeCurrencyInfo.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={`p-3 rounded-xl text-start text-xs font-bold transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-extrabold">{c.nameAr} ({c.symbolAr})</div>
                    <div className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                      {c.code} • الرمز: {c.symbolAr}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Backup & Restore Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm border-b pb-3">
            <Database className="w-5 h-5 text-blue-600" />
            <span>{lang === 'ar' ? 'النسخ الاحتياطي والاستعادة الآلية' : 'Backup & Restore'}</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            يمكنك تحميل نسخة احتياطية كاملة بصيغة JSON تحتوي على جميع الطلاب، المعلمين، الحصص، الفواتير والسجلات.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleDownloadBackup}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نسخة احتياطية JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>استعادة من ملف</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={() => {
                if (confirm('هل أنت تأكد من استعادة البيانات الافتراضية الأولية؟')) {
                  resetDatabase();
                }
              }}
              className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة ضبط المصنع للبيانات (Reset Database)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Tenant Information Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm border-b pb-3">
          <Building2 className="w-5 h-5 text-amber-600" />
          <span>بيانات الفرع / الأكاديمية النشطة (Multi-Tenant)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {db.tenants.map((t) => (
            <div key={t.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-extrabold text-slate-900">{t.nameAr}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                رمز الفرع: {t.code} • العملة النشطة: {getCurrencyInfo(t.currency).nameAr} ({getCurrencyInfo(t.currency).symbolAr})
              </div>
              <div className="text-[11px] text-slate-600">{t.email} | {t.phone}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
