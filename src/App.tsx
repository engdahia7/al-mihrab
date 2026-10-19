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
import {
  WidgetSizePreset,
  WidgetThemeId,
  WidgetCardId,
} from './utils/widgetEngine';
import { detectUserLocation } from './utils/geolocationService';

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

  const handleShareWaqfApp = async () => {
    const shareUrl = window.location.origin + window.location.pathname;
    const shareTitle = 'المحراب — في محراب الطاعة.. خالصاً لوجه الله وابتغاءَ مرضاته';
    const shareText =
      'تطبيق «المحراب» — في محراب الطاعة.. خالصاً لوجه الله وابتغاءَ مرضاته | نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله. هذا العمل خالصٌ لوجه الله.. لا تنسونا من صالح دعائكم:';

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
          {/* Zone 1: Brand Wordmark + Combined Slogan */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('prayers');
            }}
            className="flex flex-col justify-center shrink-0 group"
          >
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
          </a>

          {/* Mobile Left Slot: Active City & Offline Storage / PWA Install */}
          <div className="flex md:hidden items-center gap-1.5">
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

          {/* Zone 3 (Desktop): Offline Storage Manager & PWA Install */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <OfflineAndPWAHub />
          </div>
        </div>
      </header>

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
          />
        )}

        {activeTab === 'adhkar' && <AdhkarView selectedCity={selectedCity} />}

        {activeTab === 'duas' && (
          <DuasView
            onOpenMushafPage={(pageNum) => {
              setTargetMushafPage(pageNum);
              handleSelectTab('quran');
            }}
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
          {/* Combined Slogan Card */}
          <div className="rounded-2xl bg-[#FBF9F5] border border-[#14532D]/20 px-4 py-4 sm:px-6 sm:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
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
            </div>

            <button
              type="button"
              onClick={handleShareWaqfApp}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#14532D]/10 hover:bg-[#14532D]/15 text-[#14532D] border border-[#14532D]/25 transition-colors cursor-pointer shrink-0 w-full md:w-auto"
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
    </div>
  );
}
