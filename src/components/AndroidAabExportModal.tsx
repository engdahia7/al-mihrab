import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Package,
  Download,
  Copy,
  Check,
  X,
  ShieldCheck,
  Terminal,
  FileCode2,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

interface AndroidAabExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PRODUCTION_HOST =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.hostname
    : 'ais-pre-nju7hiufddutmvceng4hoc-487180125030.europe-west2.run.app';

export const AndroidAabExportModal: React.FC<AndroidAabExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [packageId, setPackageId] = useState('app.almihrab.twa');
  const [hostDomain, setHostDomain] = useState(DEFAULT_PRODUCTION_HOST);
  const [appNameAr, setAppNameAr] = useState(
    'المحراب — مواقيت الصلاة والمصحف والأذكار'
  );
  const [launcherNameAr, setLauncherNameAr] = useState('المحراب');
  const [versionName, setVersionName] = useState('1.1.0');
  const [versionCode, setVersionCode] = useState<number>(2);
  const [sha256Fingerprint, setSha256Fingerprint] = useState(
    '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF'
  );
  const [activeTab, setActiveTab] = useState<'files' | 'steps' | 'cli'>('files');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cleanHost = useMemo(() => {
    return hostDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
  }, [hostDomain]);

  const twaManifestJson = useMemo(() => {
    return JSON.stringify(
      {
        packageId: packageId.trim() || 'app.almihrab.twa',
        host: cleanHost,
        name: appNameAr,
        launcherName: launcherNameAr,
        display: 'standalone',
        themeColor: '#14532D',
        themeColorDark: '#0C1814',
        navigationColor: '#FBF9F5',
        navigationColorDark: '#0C1814',
        navigationDividerColor: '#E7E2D8',
        navigationDividerColorDark: '#1F2E28',
        backgroundColor: '#FBF9F5',
        enableNotifications: true,
        startUrl: '/',
        iconUrl: `https://${cleanHost}/pwa-512x512.png`,
        maskableIconUrl: `https://${cleanHost}/pwa-maskable-512x512.png`,
        monochromeIconUrl: `https://${cleanHost}/pwa-192x192.png`,
        splashScreenFadeOutDuration: 300,
        signingKey: {
          path: './android.keystore',
          alias: 'almihrab-key',
        },
        appVersionName: versionName,
        appVersionCode: versionCode,
        shortcuts: [
          {
            name: 'المصحف الشريف والختمة',
            shortName: 'المصحف',
            url: `https://${cleanHost}/?tab=quran`,
            chosenIconUrl: `https://${cleanHost}/pwa-192x192.png`,
          },
          {
            name: 'مواقيت الصلاة والأذان',
            shortName: 'المواقيت',
            url: `https://${cleanHost}/?tab=prayers`,
            chosenIconUrl: `https://${cleanHost}/pwa-192x192.png`,
          },
          {
            name: 'أذكار المسلم والمنبّه',
            shortName: 'الأذكار',
            url: `https://${cleanHost}/?tab=adhkar`,
            chosenIconUrl: `https://${cleanHost}/pwa-192x192.png`,
          },
          {
            name: 'الأدعية والأحاديث الصحيحة',
            shortName: 'الأحاديث',
            url: `https://${cleanHost}/?tab=duas`,
            chosenIconUrl: `https://${cleanHost}/pwa-192x192.png`,
          },
        ],
        generatorApp: 'bubblewrap-cli',
        webManifestUrl: `https://${cleanHost}/manifest.webmanifest`,
        fallbackType: 'customtabs',
        features: {
          locationDelegation: {
            enabled: true,
          },
        },
        alphaDependencies: {
          enabled: false,
        },
        enableSiteSettingsShortcut: true,
        isChromeOSOnly: false,
        isMetaQuest: false,
        minSdkVersion: 21,
        targetSdkVersion: 35,
        orientation: 'portrait',
      },
      null,
      2
    );
  }, [packageId, cleanHost, appNameAr, launcherNameAr, versionName, versionCode]);

  const assetLinksJson = useMemo(() => {
    return JSON.stringify(
      [
        {
          relation: [
            'delegate_permission/common.handle_all_urls',
            'delegate_permission/common.query_webapk',
          ],
          target: {
            namespace: 'android_app',
            package_name: packageId.trim() || 'app.almihrab.twa',
            sha256_cert_fingerprints: [sha256Fingerprint.trim()],
          },
        },
      ],
      null,
      2
    );
  }, [packageId, sha256Fingerprint]);

  const capacitorConfigJson = useMemo(() => {
    return JSON.stringify(
      {
        appId: packageId.trim() || 'app.almihrab.twa',
        appName: launcherNameAr,
        webDir: 'dist',
        bundledWebRuntime: false,
        server: {
          androidScheme: 'https',
        },
        android: {
          allowMixedContent: false,
          captureInput: true,
          webContentsDebuggingEnabled: false,
          backgroundColor: '#FBF9F5',
          buildOptions: {
            keystorePath: '../android.keystore',
            keystoreAlias: 'almihrab-key',
            releaseType: 'AAB',
          },
        },
      },
      null,
      2
    );
  }, [packageId, launcherNameAr]);

  const buildShellScript = useMemo(() => {
    return `#!/usr/bin/env bash
set -e
KEYSTORE_FILE="android.keystore"
KEY_ALIAS="almihrab-key"
KEYSTORE_PASS="\${KEYSTORE_PASSWORD:-almihrab2026}"

if [ ! -f "$KEYSTORE_FILE" ]; then
  keytool -genkeypair -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" -dname "CN=Al-Mihrab, OU=IslamicWaqf, O=AlMihrab, L=Makkah, S=Makkah, C=SA"
fi

npm run build
npx @bubblewrap/cli build --skipPwaValidation
echo "Ready: ./app-release-bundle.aab"
`;
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDownloadFile = (filename: string, content: string, mime = 'application/json') => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // ignore
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      dir="rtl"
      aria-label="مركز تجهيز وتصدير ملف AAB لمتجر Google Play"
      data-testid="android-aab-export-modal"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#FBF9F5] border border-stone-200 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#14532D] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#FDE68A]/30 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold">
                مركز تجهيز وتصدير حزمة أندرويد (AAB) — Google Play
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-200">
                جميع الملفات والسكربتات جاهزة لتوليد ملف <code className="font-mono text-[#FDE68A]">app-release-bundle.aab</code> الموقّع رسمياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-[#F4EFE6] border-b border-stone-200 flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'files'
                ? 'bg-[#FBF9F5] text-[#14532D] border-t border-x border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>١. تخصيص وتحميل ملفات AAB</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('steps')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'steps'
                ? 'bg-[#FBF9F5] text-[#14532D] border-t border-x border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>٢. استخراج ملف .aab في دقيقة (PWABuilder / GitHub)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'cli'
                ? 'bg-[#FBF9F5] text-[#14532D] border-t border-x border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>٣. أوامر البناء والتوقيع الرقمي (CLI)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'files' && (
            <>
              {/* Package Configuration Inputs */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
                    إعدادات حزمة التطبيق (تُحدّث الملفات تلقائياً)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#14532D]/10 text-[#14532D] text-[11px] font-bold">
                    Target SDK 35 · Android 15 Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      معرّف الحزمة (Package ID):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      نطاق الموقع المنشور (Host Domain):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={hostDomain}
                      onChange={(e) => setHostDomain(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-mono text-left"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        رقم الإصدار (Version Name):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        كود المتجر (Version Code):
                      </label>
                      <input
                        type="number"
                        min={1}
                        dir="ltr"
                        value={versionCode}
                        onChange={(e) =>
                          setVersionCode(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-mono text-left"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      اسم التطبيق المختصر تحت الأيقونة:
                    </label>
                    <input
                      type="text"
                      value={launcherNameAr}
                      onChange={(e) => setLauncherNameAr(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    بصمة شهادة التوقيع SHA-256 (لربط Digital Asset Links):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={sha256Fingerprint}
                    onChange={(e) => setSha256Fingerprint(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-[11px] font-mono text-left"
                  />
                </div>
              </div>

              {/* Ready-to-Download Configuration Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. twa-manifest.json */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#14532D] dir-ltr">
                        twa-manifest.json
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#14532D] border border-emerald-200">
                        أساسي لـ Bubblewrap
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                      ملف إعدادات حزمة أندرويد TWA مع تفويض الموقع الجغرافي للقبلة والإشعارات واختصارات المصحف والأذكار.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="download-twa-manifest-btn"
                      onClick={() =>
                        handleDownloadFile('twa-manifest.json', twaManifestJson)
                      }
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل الملف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('twa', twaManifestJson)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'twa' ? (
                        <Check className="w-3.5 h-3.5 text-[#14532D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'twa' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. assetlinks.json */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#78350F] dir-ltr">
                        .well-known/assetlinks.json
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-[#78350F] border border-amber-200">
                        توثيق النطاق
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                      ملف التحقق الرقمي من ملكية النطاق لإخفاء شريط عنوان المتصفح وتشغيل التطبيق بملء الشاشة الكامل.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="download-assetlinks-btn"
                      onClick={() =>
                        handleDownloadFile('assetlinks.json', assetLinksJson)
                      }
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل الملف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('assetlinks', assetLinksJson)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'assetlinks' ? (
                        <Check className="w-3.5 h-3.5 text-[#14532D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'assetlinks' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. capacitor.config.json */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900 dir-ltr">
                        capacitor.config.json
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                        حزمة أوفلاين كاملة
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                      إعدادات Capacitor لبناء ملف <code className="font-mono">.aab</code> يضم جميع ملفات الواجهة داخل الحزمة ليعمل بدون إنترنت منذ التشغيل الأول.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          'capacitor.config.json',
                          capacitorConfigJson
                        )
                      }
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل الملف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('cap', capacitorConfigJson)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'cap' ? (
                        <Check className="w-3.5 h-3.5 text-[#14532D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'cap' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Automated Build Script */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#14532D] dir-ltr">
                        scripts/build-aab.sh
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#14532D] border border-emerald-200">
                        توليد تلقائي
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                      سكربت يقوم بتوليد مفتاح التوقيع <code className="font-mono">android.keystore</code> وتحديث بصمة SHA-256 وبناء ملف <code className="font-mono">.aab</code> بخطوة واحدة.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          'build-aab.sh',
                          buildShellScript,
                          'text/x-shellscript'
                        )
                      }
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل السكربت</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('sh', buildShellScript)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'sh' ? (
                        <Check className="w-3.5 h-3.5 text-[#14532D]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'sh' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-4">
              {/* Method 1: PWABuilder */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#14532D] text-white text-xs font-bold">
                    الطريقة ١ (الأسرع — خلال ٦٠ ثانية بدون تثبيت أي برامج)
                  </span>
                  <a
                    href={`https://www.pwabuilder.com/reportcard?site=https://${cleanHost}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold"
                  >
                    <span>فتح PWABuilder مع رابط تطبيقك مباشرة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <ol className="text-xs text-stone-700 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    اضغط على الزر أعلاه لفتح <strong>PWABuilder</strong> مفحوصاً عليه رابط تطبيقك:
                    <code className="mx-1 px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[11px]" dir="ltr">
                      https://{cleanHost}
                    </code>
                  </li>
                  <li>
                    اضغط على <strong>Package for stores</strong> ثم اختر منصة <strong>Android (Google Play)</strong>.
                  </li>
                  <li>
                    تأكد أن معرف الحزمة هو <code className="font-mono font-bold">{packageId}</code> وفعّل خيار <strong>Location Delegation</strong> (للبوصلة والمواقيت).
                  </li>
                  <li>
                    اضغط <strong>Download Package</strong>؛ ستجد داخل الملف المضغوط ملف <strong><code className="font-mono">app-release-bundle.aab</code></strong> الجاهز للرفع في Google Play Console مع مفتاح التوقيع.
                  </li>
                </ol>
              </div>

              {/* Method 2: GitHub Actions Cloud Builder */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#14532D]" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
                    الطريقة ٢ (البناء السحابي التلقائي عبر GitHub Actions المدمج في المشروع)
                  </h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  تم تجهيز ملف <code className="font-mono font-bold text-[#14532D]">.github/workflows/build-android-aab.yml</code> داخل المشروع؛ بمجرد رفع الكود إلى GitHub، افتح تبويب <strong>Actions</strong> ثم اختر <strong>Build Android AAB Bundle (Google Play)</strong> واضغط <strong>Run workflow</strong> ليقوم ببناء وتوقيع ملف <code className="font-mono">al-mihrab-release.aab</code> سحابياً وتقديمه لك للتحميل المباشر.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
                  أوامر توليد مفتاح التوقيع وبناء ملف <code className="font-mono">.aab</code> من سطر الأوامر
                </h3>
                <p className="text-xs text-stone-600">
                  تمت إضافة جميع الأوامر في ملف <code className="font-mono">package.json</code> لتتمكن من تشغيلها مباشرة:
                </p>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs space-y-1.5" dir="ltr">
                    <div className="flex items-center justify-between text-[11px] text-stone-400 font-sans">
                      <span>١. بناء شامل (توليد المفتاح + تحديث البصمة + بناء ملف AAB):</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText('cmd1', 'npm run aab:build')}
                        className="text-[#FDE68A] hover:underline cursor-pointer"
                      >
                        {copiedId === 'cmd1' ? 'تم النسخ!' : 'نسخ الأمر'}
                      </button>
                    </div>
                    <div className="text-emerald-400 font-bold">npm run aab:build</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs space-y-1.5" dir="ltr">
                    <div className="flex items-center justify-between text-[11px] text-stone-400 font-sans">
                      <span>٢. توليد مفتاح التوقيع الرقمي (android.keystore) منفرداً:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText('cmd2', 'npm run aab:keygen')}
                        className="text-[#FDE68A] hover:underline cursor-pointer"
                      >
                        {copiedId === 'cmd2' ? 'تم النسخ!' : 'نسخ الأمر'}
                      </button>
                    </div>
                    <div className="text-amber-300">npm run aab:keygen</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs space-y-1.5" dir="ltr">
                    <div className="flex items-center justify-between text-[11px] text-stone-400 font-sans">
                      <span>٣. عرض بصمة الشهادة SHA-256 لملف assetlinks.json:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText('cmd3', 'npm run aab:fingerprint')
                        }
                        className="text-[#FDE68A] hover:underline cursor-pointer"
                      >
                        {copiedId === 'cmd3' ? 'تم النسخ!' : 'نسخ الأمر'}
                      </button>
                    </div>
                    <div className="text-sky-300">npm run aab:fingerprint</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
