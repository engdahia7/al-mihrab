import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  Moon,
  Heart,
  Compass,
  MapPin,
  Share2,
  Check,
  Search,
  Bell,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CityLocation,
  VERIFIED_CITIES,
  CalculationMethodId,
  AsrJuristicMethod,
  gregorianToHijri,
  calculateAstronomicalPrayerTimes,
  getNextPrayerInfo,
  calculateQiblaDirection,
} from './utils/astronomy';
import { PrayerTimesView } from './components/PrayerTimesView';
import { QuranView } from './components/QuranView';
import { AdhkarView } from './components/AdhkarView';
import { DuasView } from './components/DuasView';
import { QiblaAndSourcesView } from './components/QiblaAndSourcesView';
import { QuranRadioBar } from './components/QuranRadioBar';
import { OfflineAndPWAHub } from './components/OfflineAndPWAHub';
import { SmartIslamicWidgets } from './components/SmartIslamicWidgets';
import { DawahCardModal } from './components/DawahCardModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import {
  WidgetSizePreset,
  WidgetThemeId,
  WidgetCardId,
} from './utils/widgetEngine';
import { detectUserLocation } from './utils/geolocationService';
import {
  loadWaqfDedicationConfig,
  saveWaqfDedicationConfig,
  formatWaqfDedicationLineAr,
  buildWaqfShareUrl,
  type WaqfDedicationConfig,
  type DawahShareCardPayload,
} from './utils/dawahShareCards';
import {
  subscribePushNotifications,
  dismissActivePushBanner,
  type DispatchedIslamicNotification,
} from './utils/notificationDispatcher';
import { stopActiveAdhanAudio } from './utils/soundPlayer';

export type ActiveTab = 'prayers' | 'quran' | 'adhkar' | 'duas' | 'qibla';

const SETTINGS_STORAGE_KEY = 'almihrab_user_settings_v1';

const NAV_ITEMS: {
  id: ActiveTab;
  labelDesktop: string;
  labelMobile: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'prayers',
    labelDesktop: 'المواقيت',
    labelMobile: 'المواقيت',
    icon: Clock,
  },
  {
    id: 'quran',
    labelDesktop: 'المصحف',
    labelMobile: 'المصحف',
    icon: BookOpen,
  },
  {
    id: 'adhkar',
    labelDesktop: 'الأذكار',
    labelMobile: 'الأذكار',
    icon: Moon,
  },
  {
    id: 'duas',
    labelDesktop: 'الأدعية',
    labelMobile: 'الأدعية',
    icon: Heart,
  },
  {
    id: 'qibla',
    labelDesktop: 'القبلة',
    labelMobile: 'القبلة',
    icon: Compass,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (
        tabParam === 'prayers' ||
        tabParam === 'quran' ||
        tabParam === 'adhkar' ||
        tabParam === 'duas' ||
        tabParam === 'qibla'
      ) {
        return tabParam;
      }
    }
    return 'prayers';
  });
  const [targetMushafPage, setTargetMushafPage] = useState<number | null>(null);

  const [selectedCity, setSelectedCity] = useState<CityLocation>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.city && parsed.city.latitude !== undefined) {
          return parsed.city;
        }
      }
    } catch {
      // ignore
    }
    return VERIFIED_CITIES[0]; // Makkah al-Mukarramah default
  });

  const [methodId, setMethodId] = useState<CalculationMethodId>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.methodId) return parsed.methodId;
      }
    } catch {
      // ignore
    }
    return 'UMM_AL_QURA';
  });

  const [asrMethod, setAsrMethod] = useState<AsrJuristicMethod>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.asrMethod) return parsed.asrMethod;
      }
    } catch {
      // ignore
    }
    return 'STANDARD';
  });

  const [hijriAdjustment, setHijriAdjustment] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.hijriAdjustment === 'number')
          return parsed.hijriAdjustment;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          city: selectedCity,
          methodId,
          asrMethod,
          hijriAdjustment,
        })
      );
    } catch {
      // ignore
    }
  }, [selectedCity, methodId, asrMethod, hijriAdjustment]);

  // Scroll to top smoothly when switching main screens on mobile
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const todayHijri = gregorianToHijri(new Date(), hijriAdjustment);

  // Check if URL requests standalone embeddable / mobile Home Screen widget mode (?widget=1)
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const isStandaloneWidget = Boolean(
    searchParams && searchParams.get('widget') === '1'
  );
  const [standaloneNow, setStandaloneNow] = useState<Date>(() => new Date());
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [copiedWaqfShare, setCopiedWaqfShare] = useState<boolean>(false);

  const [waqfConfig, setWaqfConfig] = useState<WaqfDedicationConfig>(() =>
    loadWaqfDedicationConfig()
  );
  const [dawahModalState, setDawahModalState] = useState<{
    isOpen: boolean;
    payload: DawahShareCardPayload | null;
    mode: 'card' | 'waqf_settings';
  }>({
    isOpen: false,
    payload: null,
    mode: 'card',
  });
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [activePushBanner, setActivePushBanner] =
    useState<DispatchedIslamicNotification | null>(null);

  useEffect(() => {
    return subscribePushNotifications((active) => {
      setActivePushBanner(active);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSaveWaqfConfig = (next: WaqfDedicationConfig) => {
    setWaqfConfig(next);
    saveWaqfDedicationConfig(next);
  };

  const handleOpenDawahCard = (payload: DawahShareCardPayload) => {
    setDawahModalState({
      isOpen: true,
      payload,
      mode: 'card',
    });
  };

  const handleOpenWaqfModal = () => {
    setDawahModalState({
      isOpen: true,
      payload: null,
      mode: 'waqf_settings',
    });
  };

  const handleShareWaqfApp = async () => {
    const shareUrl = buildWaqfShareUrl(
      window.location.origin + window.location.pathname,
      waqfConfig
    );
    const shareTitle = waqfConfig.enabled
      ? `المحراب — ${formatWaqfDedicationLineAr(waqfConfig)}`
      : 'المحراب — في محراب الطاعة.. خالصاً لوجه الله وابتغاءَ مرضاته';
    const shareText = waqfConfig.enabled
      ? `${formatWaqfDedicationLineAr(waqfConfig)}\n«${waqfConfig.customDuaAr}»\nتطبيق «المحراب» — نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله:`
      : 'تطبيق «المحراب» — في محراب الطاعة.. خالصاً لوجه الله وابتغاءَ مرضاته | نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله. هذا العمل خالصٌ لوجه الله.. لا تنسونا من صالح دعائكم:';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy if user cancels or share fails
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopiedWaqfShare(true);
      window.setTimeout(() => setCopiedWaqfShare(false), 3000);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    if (!isStandaloneWidget) return;
    const timer = window.setInterval(() => {
      setStandaloneNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStandaloneWidget]);

  if (isStandaloneWidget && searchParams) {
    const queryCityId = searchParams.get('city');
    const queryCity =
      VERIFIED_CITIES.find((c) => c.id === queryCityId) || selectedCity;
    const queryTheme = (searchParams.get('theme') as WidgetThemeId) || 'emerald';
    const querySize = (searchParams.get('size') as WidgetSizePreset) || 'medium';
    const queryCard =
      (searchParams.get('card') as WidgetCardId | 'all') ||
      (searchParams.get('type') as WidgetCardId) ||
      'next_prayer_arc';

    const times = calculateAstronomicalPrayerTimes(
      standaloneNow,
      queryCity.latitude,
      queryCity.longitude,
      queryCity.timezoneOffsetHours,
      queryCity.defaultMethod,
      asrMethod
    );
    const nextInfo = getNextPrayerInfo(
      times,
      standaloneNow.getHours(),
      standaloneNow.getMinutes(),
      standaloneNow.getSeconds()
    );
    const qibla = calculateQiblaDirection(queryCity.latitude, queryCity.longitude);

    return (
      <SmartIslamicWidgets
        selectedCity={queryCity}
        todayTimes={times}
        nextPrayerInfo={nextInfo}
        hijriDate={todayHijri}
        qiblaAngle={qibla}
        now={standaloneNow}
        standaloneMode={true}
        initialSize={querySize}
        initialTheme={queryTheme}
        initialCard={queryCard}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917] overflow-x-hidden"
      dir="rtl"
    >
      {gmpQuotaExceeded && (
        <div
          className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm"
          dir="ltr"
        >
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar: 3-Zone Desktop Contract + Compact Mobile App Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FBF9F5]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-8 px-3.5 sm:px-8 h-14 sm:h-16">
          {/* Zone 1: Official Al-Mihrab Logo + Brand Wordmark + Combined Slogan */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('prayers');
            }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <img
              src="/icon.svg"
              alt="شعار المحراب"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs border border-[#14532D]/20 shrink-0"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap group-hover:text-[#14532D] transition-colors">
                  المحراب
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-[#14532D]/10 text-[#14532D] border border-[#14532D]/20 whitespace-nowrap">
                  في محراب الطاعة · لوجه الله
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-stone-600 font-medium leading-tight mt-0.5 whitespace-nowrap">
                نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله.. لا تنسونا من صالح دعائكم
              </span>
            </div>
          </a>

          {/* Mobile Left Slot: Global Search, Active City & Offline Storage / PWA Install */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              data-testid="mobile-global-search-btn"
              onClick={() => setIsGlobalSearchOpen(true)}
              aria-label="البحث الشامل في المحراب"
              className="p-1.5 rounded-lg bg-[#F7F4EE] border border-stone-200 text-stone-700 hover:text-[#14532D] cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#14532D]" />
            </button>
            <OfflineAndPWAHub />
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await detectUserLocation();
                  setSelectedCity(res.city);
                  setMethodId(res.city.defaultMethod);
                } catch {
                  handleSelectTab('prayers');
                }
              }}
              title="اضغط لتحديد موقعك الحالي تلقائياً"
              className="flex items-center gap-1 text-xs text-stone-700 bg-[#F7F4EE] border border-stone-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
              <span className="font-semibold text-stone-900">
                {selectedCity.nameAr}
              </span>
            </button>
          </div>

          {/* Zone 2 (Desktop): 5 concise single-line text navigation links */}
          <nav
            aria-label="التنقل الرئيسي لسطح المكتب"
            data-testid="desktop-top-nav"
            className="hidden md:flex items-center gap-5 text-sm font-medium text-stone-600"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-${item.id}-desktop`}
                onClick={() => handleSelectTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeTab === item.id
                    ? 'text-[#14532D] border-[#14532D] font-semibold'
                    : 'border-transparent hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                {item.labelDesktop}
              </button>
            ))}
          </nav>

          {/* Zone 3 (Desktop): Global Search + Offline Storage Manager & PWA Install */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="desktop-global-search-btn"
              onClick={() => setIsGlobalSearchOpen(true)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200/70 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 cursor-pointer"
              title="البحث الشامل في القرآن والأذكار والأدعية والأدوات (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-[#14532D]" />
              <span>بحث شامل</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-stone-300 rounded text-stone-500">
                ⌘K
              </kbd>
            </button>
            <OfflineAndPWAHub />
          </div>
        </div>
      </header>

      {/* Top-of-Phone Heads-Up Push Notification Card with Official Al-Mihrab Logo */}
      {activePushBanner && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="global-push-notification-banner"
          className="fixed top-2.5 inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[120] rounded-2xl bg-[#14532D] text-[#FBF9F5] border-2 border-[#FDE68A]/60 shadow-2xl p-3.5 sm:p-4 space-y-2.5"
        >
          {/* Top Phone Notification Header: App Logo + App Name + Timestamp + Close */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
            <div className="flex items-center gap-2">
              <img
                src="/icon.svg"
                alt="شعار برنامج المحراب"
                data-testid="notification-app-logo"
                className="w-7 h-7 rounded-lg border border-[#FDE68A]/50 shadow-xs shrink-0 bg-[#14532D]"
              />
              <span className="font-display text-xs font-bold text-[#FDE68A]">
                المحراب · في محراب الطاعة
              </span>
              <span className="text-[10px] text-[#D6CEBE] bg-black/25 px-2 py-0.5 rounded-md font-tabular">
                الآن · {activePushBanner.timestampHHMM}
              </span>
            </div>

            <button
              type="button"
              aria-label="إغلاق الإشعار"
              onClick={() => {
                stopActiveAdhanAudio();
                dismissActivePushBanner();
              }}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification Body with Large App Icon & Content */}
          <div className="flex items-start gap-3">
            <img
              src="/pwa-192x192.png"
              alt="لوجو المحراب"
              className="w-11 h-11 rounded-xl border border-[#FDE68A]/40 shadow-sm shrink-0 mt-0.5"
            />
            <div className="space-y-1 min-w-0 flex-1">
              <h4 className="font-display text-sm sm:text-base font-bold text-white leading-snug">
                {activePushBanner.titleAr}
              </h4>
              <p className="text-xs text-stone-200 leading-relaxed">
                {activePushBanner.bodyAr}
              </p>
              {activePushBanner.subtitleOrHadithAr && (
                <p className="text-[11px] font-quran text-[#FDE68A] leading-relaxed bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/10">
                  {activePushBanner.subtitleOrHadithAr}
                </p>
              )}
            </div>
          </div>

          {/* Notification Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {activePushBanner.shouldPlayFullAdhan && (
              <button
                type="button"
                onClick={() => stopActiveAdhanAudio()}
                className="min-h-[32px] px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>إيقاف الأذان</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activePushBanner.mushafPage) {
                  setTargetMushafPage(activePushBanner.mushafPage);
                }
                handleSelectTab(activePushBanner.actionTab);
                dismissActivePushBanner();
              }}
              className="min-h-[32px] px-3.5 py-1 rounded-xl bg-[#FDE68A] text-stone-950 text-xs font-bold hover:bg-[#FDE68A]/90 transition-colors cursor-pointer"
            >
              {activePushBanner.actionLabelAr}
            </button>
          </div>

          {/* Bottom Handle Pill (iOS / Android Heads-Up Indicator) */}
          <div className="w-10 h-1 rounded-full bg-white/30 mx-auto" />
        </div>
      )}

      {/* Persistent 24/7 Live Quran Radio Player (Continues playing in background across tabs) */}
      <div className={activeTab === 'quran' ? 'hidden' : 'block'}>
        <QuranRadioBar />
      </div>

      {/* Main Content Container (pb-24 on mobile leaves clearance for fixed bottom thumb nav) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-8 py-4 sm:py-8 pb-24 md:pb-10">
        {activeTab === 'prayers' && (
          <PrayerTimesView
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            methodId={methodId}
            onChangeMethod={setMethodId}
            asrMethod={asrMethod}
            onChangeAsrMethod={setAsrMethod}
            hijriAdjustment={hijriAdjustment}
            onNavigateTab={handleSelectTab}
            onOpenMushafPage={(pageNum) => {
              setTargetMushafPage(pageNum);
              handleSelectTab('quran');
            }}
          />
        )}

        {activeTab === 'quran' && (
          <QuranView
            initialPage={targetMushafPage}
            onExitMushaf={() => handleSelectTab('prayers')}
            waqfConfig={waqfConfig}
            onOpenDawahCard={handleOpenDawahCard}
            onOpenWaqfModal={handleOpenWaqfModal}
          />
        )}

        {activeTab === 'adhkar' && (
          <AdhkarView
            selectedCity={selectedCity}
            onOpenDawahCard={handleOpenDawahCard}
          />
        )}

        {activeTab === 'duas' && (
          <DuasView
            onOpenMushafPage={(pageNum) => {
              setTargetMushafPage(pageNum);
              handleSelectTab('quran');
            }}
            onOpenDawahCard={handleOpenDawahCard}
            onOpenWaqfModal={handleOpenWaqfModal}
          />
        )}

        {activeTab === 'qibla' && (
          <QiblaAndSourcesView
            selectedCity={selectedCity}
            onSelectCity={(city) => {
              setSelectedCity(city);
              setMethodId(city.defaultMethod);
            }}
            hijriAdjustment={hijriAdjustment}
            onChangeHijriAdjustment={setHijriAdjustment}
          />
        )}
      </main>

      {/* Waqf & Sadaqah Jariyah Dedication Footer (Visible on Mobile & Desktop) */}
      <footer className="border-t border-stone-200 bg-[#F7F4EE] mt-6 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">
          {/* Combined Slogan & Waqf Dedication Card */}
          <div className="rounded-2xl bg-[#FBF9F5] border border-[#14532D]/20 px-4 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#14532D] text-white">
                  ما كان لله دام واتصل.. تطبيقٌ خالصٌ لوجه الله
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#14532D]">
                  «في محراب الطاعة.. خالصاً لوجه الله وابتغاءَ مرضاته»
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله — هذا العمل خالصٌ لوجه الله.. لا تنسونا من صالح دعائكم.
              </p>
              {waqfConfig.enabled && (
                <div
                  data-testid="active-waqf-dedication-strip"
                  className="mt-2 pt-2 border-t border-[#14532D]/15 text-xs text-[#78350F] font-semibold"
                >
                  <span>{formatWaqfDedicationLineAr(waqfConfig)}</span>
                  {waqfConfig.customDuaAr && (
                    <span className="block text-stone-700 font-normal mt-0.5">
                      «{waqfConfig.customDuaAr}»
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto">
              <button
                type="button"
                data-testid="footer-open-waqf-modal-btn"
                onClick={handleOpenWaqfModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#78350F] hover:bg-[#78350F]/90 text-white transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4" />
                <span>
                  {waqfConfig.enabled
                    ? 'بطاقة الوقف وتعديل الإهداء'
                    : 'إهداء الصدقة الجارية (وقف للوالدين أو متوفى)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShareWaqfApp}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#14532D]/10 hover:bg-[#14532D]/15 text-[#14532D] border border-[#14532D]/25 transition-colors cursor-pointer"
              >
                {copiedWaqfShare ? (
                  <>
                    <Check className="w-4 h-4 text-[#14532D]" />
                    <span>تم نسخ رابط الوقف للمشاركة في الأجر</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#14532D]" />
                    <span>شاركه صدقةً جاريةً ليعمّ الأجر</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editorial Links & Sources Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 pt-1">
            <div className="text-center sm:text-right">
              <span className="font-display font-bold text-stone-900">المحراب</span>
              <span aria-hidden="true"> · </span>
              <span>
                مصحف المدينة النبوية (مجمع الملك فهد) · أذكار حصن المسلم والأدعية المأثورة · الحسابات الفلكية والمواريث الشرعية
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className="hover:text-stone-900 cursor-pointer whitespace-nowrap"
                >
                  {item.labelDesktop}
                </button>
              ))}
              <span aria-hidden="true" className="text-stone-300">|</span>
              <a
                href="./privacy-policy.html"
                className="hover:text-[#14532D] underline-offset-4 hover:underline whitespace-nowrap"
              >
                سياسة الخصوصية
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (< 768px) */}
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-t border-stone-200 shadow-lg"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#14532D] font-bold'
                    : 'text-stone-500 hover:text-stone-900 font-medium'
                }`}
              >
                <div
                  className={`px-3 py-0.5 rounded-full transition-colors ${
                    isActive ? 'bg-[#14532D]/12' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
                  {item.labelMobile}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Da'wah Share Card & Waqf Dedication Studio Modal */}
      <DawahCardModal
        isOpen={dawahModalState.isOpen}
        onClose={() =>
          setDawahModalState((prev) => ({ ...prev, isOpen: false }))
        }
        initialPayload={dawahModalState.payload}
        waqfConfig={waqfConfig}
        onSaveWaqfConfig={handleSaveWaqfConfig}
        initialMode={dawahModalState.mode}
      />

      {/* Global Command & Multi-Domain Search Modal (Ctrl+K / Cmd+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigateTab={handleSelectTab}
        onOpenMushafPage={(pageNum) => {
          setTargetMushafPage(pageNum);
          handleSelectTab('quran');
        }}
        onOpenDawahCard={handleOpenDawahCard}
        onOpenWaqfModal={handleOpenWaqfModal}
      />
    </div>
  );
}
