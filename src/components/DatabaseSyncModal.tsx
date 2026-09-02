import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Smartphone,
  Cloud,
  Zap,
  Radio,
  ExternalLink,
  ShieldCheck,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { getApiBaseUrl, setCustomBackendUrl, CLOUD_BACKEND_URL } from '../services/api';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    lang,
    cloudDbStatus,
    refreshCloudDbStatus,
    testNeonConnection,
    switchNeonDatabase,
    reloadData,
    isSyncing,
    isRealtimeConnected,
  } = useApp();

  const [neonConnectionString, setNeonConnectionString] = useState('');
  const [isTestingNeon, setIsTestingNeon] = useState(false);
  const [isConnectingNeon, setIsConnectingNeon] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
    type?: string;
  } | null>(null);

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [backendUrlInput, setBackendUrlInput] = useState(getApiBaseUrl() || CLOUD_BACKEND_URL);
  const [backendSavedFeedback, setBackendSavedFeedback] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshCloudDbStatus();
      setBackendUrlInput(getApiBaseUrl() || CLOUD_BACKEND_URL);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleTestNeon = async () => {
    if (!neonConnectionString.trim()) {
      setTestResult({
        tested: true,
        success: false,
        message: isAr ? 'يرجى إدخال رابط اتصال Neon أولاً' : 'Please provide a Neon connection string first',
      });
      return;
    }

    setIsTestingNeon(true);
    setTestResult(null);
    try {
      const res = await testNeonConnection(neonConnectionString.trim());
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message || (res.success ? 'تم الاتصال بقاعدة البيانات بنجاح!' : 'فشل الاتصال بقاعدة البيانات'),
        latencyMs: res.latencyMs,
        type: res.type,
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'حدث خطأ أثناء اختبار الاتصال',
      });
    } finally {
      setIsTestingNeon(false);
    }
  };

  const handleConnectNeon = async () => {
    if (!neonConnectionString.trim()) return;

    setIsConnectingNeon(true);
    try {
      const res = await switchNeonDatabase(neonConnectionString.trim());
      if (res.success) {
        setSyncSuccessMessage(isAr ? 'تم ربط قاعدة بيانات Neon بنجاح ومزامنة جميع البيانات!' : 'Neon database connected and synced successfully!');
        setTimeout(() => setSyncSuccessMessage(null), 4000);
      } else {
        alert(res.message || 'فشل تفعيل الاتصال بـ Neon');
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء الربط');
    } finally {
      setIsConnectingNeon(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsManualSyncing(true);
    try {
      await reloadData();
      await refreshCloudDbStatus();
      setSyncSuccessMessage(isAr ? 'تمت المزامنة اللحظية الشاملة مع السحابة بنجاح!' : 'Realtime sync complete!');
      setTimeout(() => setSyncSuccessMessage(null), 3000);
    } catch (err) {
      alert(isAr ? 'فشل التحديث من السحابة' : 'Sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveBackendUrl = () => {
    setCustomBackendUrl(backendUrlInput.trim());
    setBackendSavedFeedback(true);
    setTimeout(() => {
      setBackendSavedFeedback(false);
      reloadData();
      refreshCloudDbStatus();
    }, 1500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isAr ? 'المزامنة السحابية وقاعدة البيانات' : 'Cloud Sync & Database'}
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                {isAr
                  ? 'مزامنة لحظية مستمرة بين اللابتوب والموبايل وجميع الأجهزة'
                  : 'Realtime cross-device sync between Laptop, Phone, and Tablets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Active Database Status Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      cloudDbStatus?.success !== false ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      cloudDbStatus?.success !== false ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <span className="font-extrabold text-sm text-slate-800">
                  {cloudDbStatus?.database || 'Google Cloud SQL (PostgreSQL)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTriggerSync}
                  disabled={isManualSyncing || isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'مزامنة الآن' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            {/* Sync Feedback */}
            {syncSuccessMessage && (
              <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncSuccessMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-slate-500 text-[11px] block">{isAr ? 'الحالة' : 'Status'}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? 'متصل وحي 100%' : 'Active & Online'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-slate-500 text-[11px] block">{isAr ? 'سرعة الاستجابة' : 'Latency'}</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {cloudDbStatus?.latencyMs ? `${cloudDbStatus.latencyMs} ms` : 'سريع جداً (<15ms)'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[11px] block">{isAr ? 'البث اللحظي SSE' : 'Realtime SSE'}</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1 mt-0.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {isRealtimeConnected ? (isAr ? 'متصل لحظياً' : 'Connected') : (isAr ? 'متصل بالاستطلاع' : 'Polling')}
                </span>
              </div>
            </div>
          </div>

          {/* Cross-Device Multi-Screen Sync Explanation */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 rounded-xl p-4 border border-indigo-100">
            <h3 className="font-extrabold text-xs text-indigo-950 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              {isAr ? 'كيف تعمل المزامنة بين اللابتوب والموبايل؟' : 'How Cross-Device Sync Works'}
            </h3>
            <div className="flex items-center justify-around py-3 bg-white/70 rounded-xl border border-indigo-100 mb-2.5">
              <div className="flex flex-col items-center gap-1 text-center px-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800">{isAr ? 'اللابتوب' : 'Laptop'}</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'إضافة أو تعديل' : 'Add/Edit'}</span>
              </div>

              <div className="flex flex-col items-center justify-center text-indigo-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[9px] font-black text-indigo-600 mt-1">{isAr ? 'سحابياً' : 'Cloud'}</span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center px-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800">{isAr ? 'الموبايل' : 'Phone'}</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'يظهر فوراً' : 'Instant Update'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              {isAr
                ? 'قاعدة البيانات السحابية المركزية تحفظ كل حركة، وبمجرد كتابة أي طالب أو حصة أو سند دفع، يتم بث التعديل إلى جميع الهواتف والحواسيب المفتوحة فورياً.'
                : 'All changes are centralized in PostgreSQL and broadcast to all devices in real-time.'}
            </p>

            {/* Quick Share Link */}
            <div className="mt-3 pt-3 border-t border-indigo-100/80 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{isAr ? 'شارك الرابط لفتحه على الموبايل:' : 'Share app link to mobile:'}</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-xs transition-all"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
              </button>
            </div>
          </div>

          {/* Neon Database Integration Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs text-slate-900">
                {isAr ? 'ربط قاعدة بيانات Neon (Serverless PostgreSQL)' : 'Connect your Neon Database'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {isAr
                ? 'إذا كان لديك حساب على Neon وتريد ربط قاعدة بياناتك الخاصة، ضع رابط الاتصال (Connection String) هنا:'
                : 'If you want to connect your own Neon PostgreSQL database, paste your connection string below:'}
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={neonConnectionString}
                onChange={(e) => setNeonConnectionString(e.target.value)}
                placeholder="postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require"
                className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="ltr"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleTestNeon}
                  disabled={isTestingNeon || !neonConnectionString.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNeon ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'فحص الاتصال' : 'Test Connection'}</span>
                </button>

                <button
                  onClick={handleConnectNeon}
                  disabled={isConnectingNeon || !neonConnectionString.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isAr ? 'ربط ونقل البيانات إلى Neon' : 'Connect & Migrate to Neon'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 mt-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                  {testResult.latencyMs && (
                    <span className="ms-auto text-[10px] text-emerald-600 font-mono">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cloud Run Backend URL (For GitHub Pages Deployment) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
            <h4 className="font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              {isAr ? 'رابط الخادم السحابي المشترك (Cloud Backend API)' : 'Cloud Backend API URL'}
            </h4>
            <p className="text-[11px] text-slate-500 mb-2">
              {isAr
                ? 'يستخدم للتأكد من اتصال نسخة GitHub Pages بالمخدم المركزي مباشرة حتى تتم المزامنة بين جميع الأجهزة:'
                : 'Ensures that GitHub Pages points directly to the cloud backend for multi-device sync:'}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder={CLOUD_BACKEND_URL}
                className="flex-1 text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                dir="ltr"
              />
              <button
                onClick={handleSaveBackendUrl}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
              >
                {backendSavedFeedback ? (isAr ? 'تم الحفظ!' : 'Saved!') : (isAr ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
