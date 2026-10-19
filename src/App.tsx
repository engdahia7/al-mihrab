import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  Moon,
  Heart,
  Compass,
  MapPin,
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
      {/* Top Bar: 3-Zone Desktop Contract + Compact Mobile App Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FBF9F5]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-8 px-3.5 sm:px-8 h-14 sm:h-16">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('prayers');
            }}
            className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            المحراب
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

      {/* Quiet Editorial Footer (Desktop & Tablet) */}
      <footer className="hidden md:block border-t border-stone-200 bg-[#F7F4EE] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600">
          <div>
            <span className="font-display font-bold text-stone-900">المحراب</span>
            <span aria-hidden="true"> · </span>
            <span>
              مصحف المدينة النبوية (مجمع الملك فهد) · أذكار حصن المسلم والأدعية المأثورة · الحسابات الفلكية والمواريث الشرعية
            </span>
          </div>
          <div className="flex items-center gap-4">
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
