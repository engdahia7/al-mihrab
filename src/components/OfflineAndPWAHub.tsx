import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  WifiOff,
  CheckCircle2,
  HardDrive,
  Smartphone,
  X,
  Trash2,
} from 'lucide-react';
import {
  getOfflineCachedPagesCount,
  downloadEntireMushafOffline,
  clearOfflinePagesDB,
  calculateOfflineStorageSummary,
  OfflineMushafSurahBlock,
} from '../utils/offlineQuranStorage';
import { toArabicNumerals } from '../utils/astronomy';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface OfflineAndPWAHubProps {
  onBulkPagesDownloaded?: (
    pagesMap: Record<number, OfflineMushafSurahBlock[]>
  ) => void;
}

export const OfflineAndPWAHub: React.FC<OfflineAndPWAHubProps> = ({
  onBulkPagesDownloaded,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [cachedCount, setCachedCount] = useState<number>(11);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStepAr, setDownloadStepAr] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const refreshCachedCount = async () => {
    const dbCount = await getOfflineCachedPagesCount();
    // 11 pages are bundled natively in code, up to 604 in IndexedDB
    setCachedCount(Math.max(11, dbCount));
  };

  useEffect(() => {
    refreshCachedCount();
  }, []);

  const summary = calculateOfflineStorageSummary(cachedCount);

  const handleDownloadFullQuran = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadPercent(10);
    setDownloadStepAr('جاري الاتصال لتحميل المصحف الكامل والتفسير الميسر...');

    try {
      const pagesMap = await downloadEntireMushafOffline((step, pct) => {
        setDownloadStepAr(step);
        setDownloadPercent(pct);
      });
      onBulkPagesDownloaded?.(pagesMap);
      await refreshCachedCount();
    } catch {
      setDownloadError(
        'تعذّر استكمال التحميل حالياً؛ تأكد من اتصالك بالإنترنت ثم أعد المحاولة.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearOfflineStorage = async () => {
    await clearOfflinePagesDB();
    setCachedCount(11);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Offline Storage Status / Download Trigger Button */}
        <button
          type="button"
          data-testid="open-offline-manager-btn"
          onClick={() => {
            refreshCachedCount();
            setShowManagerModal(true);
          }}
          className={`min-h-[36px] px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
            summary.isFullyCached
              ? 'bg-[#14532D]/10 border-[#14532D]/30 text-[#14532D]'
              : 'bg-[#F7F4EE] border-stone-300 text-stone-800 hover:bg-stone-200/70'
          }`}
          title="إدارة التخزين المحلي للمصحف والتفسير للعمل بدون إنترنت"
        >
          {summary.isFullyCached ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
              <span className="hidden sm:inline">المصحف محفوظ محلياً</span>
              <span className="sm:hidden">محفوظ</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-[#78350F] shrink-0" />
              <span className="hidden sm:inline">
                حفظ المصحف بدون إنترنت ({toArabicNumerals(summary.completionPercent)}٪)
              </span>
              <span className="sm:hidden">بدون إنترنت</span>
            </>
          )}
        </button>

        {/* In-App PWA Install Button */}
        {!isInstalled && isInstallable && (
          <button
            type="button"
            data-testid="pwa-install-btn"
            onClick={install}
            className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>تثبيت التطبيق</span>
          </button>
        )}

        {!isInstalled && !isInstallable && isIOS && (
          <button
            type="button"
            data-testid="pwa-ios-install-btn"
            onClick={() => setShowIOSGuide(true)}
            className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>تثبيت على آيفون</span>
          </button>
        )}
      </div>

      {/* Non-Intrusive Offline Mode Indicator Banner */}
      {!isOnline && (
        <div
          data-testid="offline-mode-indicator"
          className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#78350F] px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>وضع عدم الاتصال — يعمل التطبيق الآن من الذاكرة المحلية</span>
        </div>
      )}

      {/* iOS Safari Guided Install Modal (Portaled to body) */}
      {showIOSGuide &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-[#FBF9F5] border border-stone-200 p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <h3 className="font-display text-lg font-bold text-stone-900">
                  تثبيت تطبيق المحراب على آيفون / آيباد
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-stone-700 space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح
                  سفاري السفلي.
                </li>
                <li>
                  مرّر لأسفل واختر{' '}
                  <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>.
                </li>
                <li>
                  اضغط <strong>إضافة (Add)</strong> ليظهر التطبيق على شاشتك ويعمل
                  بدون إنترنت.
                </li>
              </ol>
            </div>
          </div>,
          document.body
        )}

      {/* Offline Storage & Download Manager Modal (Portaled to body) */}
      {showManagerModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            aria-label="إدارة التخزين المحلي والعمل بدون إنترنت"
            data-testid="offline-manager-modal"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowManagerModal(false)}
          >
            <div
              className="w-full max-w-xl bg-[#FBF9F5] border border-stone-200 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 sm:px-6 py-4 bg-[#14532D] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-[#D6CEBE]" />
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold">
                      التخزين المحلي والعمل بدون إنترنت (Offline)
                    </h2>
                    <p className="text-[11px] text-stone-200">
                      حفظ صفحات المصحف الـ ٦٠٤ والتفسير الميسر والأذكار للعمل الفوري بدون شبكة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagerModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Storage Breakdown Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[#14532D] block">
                        حالة ذاكرة المصحف والتفسير الميسر
                      </span>
                      <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                        محفوظ محلياً: {toArabicNumerals(summary.cachedPagesCount)} من{' '}
                        {toArabicNumerals(summary.totalPages)} صفحة (
                        {toArabicNumerals(summary.completionPercent)}٪)
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-stone-200 text-xs font-sans tabular-nums font-bold text-stone-800">
                      الحجم التقديري: {summary.estimatedSizeLabelAr}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#14532D] transition-all duration-300"
                      style={{ width: `${summary.completionPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-stone-600">
                    <div className="p-2.5 rounded-xl bg-[#FBF9F5] border border-stone-200/80 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
                      <span>
                        مواقيت الصلاة، البوصلة، المواريث، والأذكار:{' '}
                        <strong className="text-stone-900">محفوظة ١٠٠٪ (٢٠٠ ك.ب)</strong>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FBF9F5] border border-stone-200/80 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
                      <span>
                        الخطوط العثمانية والتلاوات المسموعة:{' '}
                        <strong className="text-stone-900">تُحفظ تلقائياً عند التصفح</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Progress or Action Buttons */}
                {isDownloading && (
                  <div className="p-4 rounded-xl bg-[#14532D]/8 border border-[#14532D]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#14532D]">
                      <span>{downloadStepAr}</span>
                      <span className="font-sans tabular-nums">
                        {toArabicNumerals(downloadPercent)}٪
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14532D] transition-all duration-300"
                        style={{ width: `${downloadPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {downloadError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
                    {downloadError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="download-full-quran-btn"
                    disabled={isDownloading || summary.isFullyCached}
                    onClick={handleDownloadFullQuran}
                    className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      summary.isFullyCached
                        ? 'bg-emerald-800/15 text-[#14532D] border border-[#14532D]/30 cursor-default'
                        : 'bg-[#14532D] hover:bg-[#14532D]/90 text-white shadow-sm'
                    }`}
                  >
                    {summary.isFullyCached ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم حفظ المصحف الكامل والتفسير الميسر محلياً (٦٠٤ صفحات)</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>
                          تحميل وحفظ المصحف الكامل + التفسير الميسر محلياً (~٤.٥ ميجابايت)
                        </span>
                      </>
                    )}
                  </button>

                  {cachedCount > 11 && (
                    <button
                      type="button"
                      onClick={handleClearOfflineStorage}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="مسح الصفحات المحملة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تفريغ الذاكرة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
