import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Calendar,
  SlidersHorizontal,
  Download,
  Navigation,
  Volume2,
  Square,
} from 'lucide-react';
import {
  CityLocation,
  VERIFIED_CITIES,
  CalculationMethodId,
  CALCULATION_METHODS,
  AsrJuristicMethod,
  calculateAstronomicalPrayerTimes,
  calculateQiblaDirection,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
  getNextPrayerInfo,
  gregorianToHijri,
  PRAYER_METADATA,
  MainPrayerKey,
} from '../utils/astronomy';
import {
  PrayerAlertItemConfig,
  getDefaultPrayerAlertsConfig,
  checkActivePrayerAlert,
} from '../utils/khatmahAndAlerts';
import {
  playAlertSoundTone,
  stopActiveAdhanAudio,
  subscribeAdhanPlaybackState,
  getAdhanPlaybackState,
  AdhanPlaybackState,
  syncAndPinExistingAdhanAudio,
} from '../utils/soundPlayer';
import { PrayerAlertsPanel } from './PrayerAlertsPanel';
import { TravelerModePanel } from './TravelerModePanel';
import { SmartIslamicWidgets } from './SmartIslamicWidgets';
import {
  detectUserLocation,
  EXTENDED_ARAB_AND_WORLD_CITIES,
} from '../utils/geolocationService';
import { calculateSunnahAndNightWindows } from '../utils/islamicFeatures';
import {
  evaluateScheduledNotificationsForMinute,
  dispatchSystemAndInAppNotification,
  loadPushChannelsConfig,
} from '../utils/notificationDispatcher';

const ALERTS_STORAGE_KEY = 'almihrab_prayer_alerts_v1';

export type PrayersSubScreen = 'widgets' | 'alerts' | 'monthly_travel';

interface PrayerTimesViewProps {
  selectedCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  methodId: CalculationMethodId;
  onChangeMethod: (method: CalculationMethodId) => void;
  asrMethod: AsrJuristicMethod;
  onChangeAsrMethod: (asr: AsrJuristicMethod) => void;
  hijriAdjustment: number;
  onNavigateTab: (tab: 'prayers' | 'quran' | 'adhkar' | 'duas' | 'qibla') => void;
  onOpenMushafPage?: (page: number) => void;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  selectedCity,
  onSelectCity,
  methodId,
  onChangeMethod,
  asrMethod,
  onChangeAsrMethod,
  hijriAdjustment,
  onNavigateTab,
  onOpenMushafPage,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeSubScreen, setActiveSubScreen] =
    useState<PrayersSubScreen>('alerts');
  const [showAdvancedSettings, setShowAdvancedSettings] =
    useState<boolean>(false);
  const [showMonthlyTable, setShowMonthlyTable] = useState<boolean>(false);
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [alertsConfig, setAlertsConfig] = useState<
    Record<MainPrayerKey, PrayerAlertItemConfig>
  >(() => {
    try {
      const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fajr && parsed.dhuhr) return parsed;
      }
    } catch {
      // ignore
    }
    return getDefaultPrayerAlertsConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertsConfig));
    } catch {
      // ignore
    }
  }, [alertsConfig]);

  const [playbackState, setPlaybackState] = useState<AdhanPlaybackState>(() =>
    getAdhanPlaybackState()
  );
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState<string>('');

  useEffect(() => {
    syncAndPinExistingAdhanAudio().catch(() => {});
    return subscribeAdhanPlaybackState((st) => setPlaybackState(st));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayTimes = useMemo(() => {
    return calculateAstronomicalPrayerTimes(
      now,
      selectedCity.latitude,
      selectedCity.longitude,
      selectedCity.timezoneOffsetHours,
      methodId,
      asrMethod
    );
  }, [now, selectedCity, methodId, asrMethod]);

  const nextPrayerInfo = useMemo(() => {
    return getNextPrayerInfo(
      todayTimes,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }, [todayTimes, now]);

  const hijriDate = useMemo(() => {
    return gregorianToHijri(now, hijriAdjustment);
  }, [now, hijriAdjustment]);

  const sunnahWindows = useMemo(() => {
    return calculateSunnahAndNightWindows({
      fajr: todayTimes.fajr,
      sunrise: todayTimes.sunrise,
      dhuhr: todayTimes.dhuhr,
      asr: todayTimes.asr,
      maghrib: todayTimes.maghrib,
      currentHours: now.getHours(),
      currentMinutes: now.getMinutes(),
    });
  }, [todayTimes, now]);
  const [showProhibitedDetails, setShowProhibitedDetails] = useState<boolean>(false);

  const qiblaAngle = useMemo(() => {
    return calculateQiblaDirection(
      selectedCity.latitude,
      selectedCity.longitude
    );
  }, [selectedCity]);

  const distanceToMakkah = useMemo(() => {
    return calculateDistanceToKaaba(
      selectedCity.latitude,
      selectedCity.longitude
    );
  }, [selectedCity]);

  const gregorianFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      return now.toLocaleDateString('ar');
    }
  }, [now]);

  const monthlySchedule = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d, 12, 0, 0);
      const t = calculateAstronomicalPrayerTimes(
        dateObj,
        selectedCity.latitude,
        selectedCity.longitude,
        selectedCity.timezoneOffsetHours,
        methodId,
        asrMethod
      );
      const h = gregorianToHijri(dateObj, hijriAdjustment);
      rows.push({
        dayNumber: d,
        isToday: d === now.getDate(),
        gregorianDay: `${d}/${month + 1}`,
        hijriDay: `${h.day} ${h.monthNameAr}`,
        ...t,
      });
    }
    return rows;
  }, [now, selectedCity, methodId, asrMethod, hijriAdjustment]);

  const handleGeolocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    setGeoStatus('جاري تحديد موقعك وحساب المواقيت واتجاه القبلة...');
    try {
      const result = await detectUserLocation();
      onSelectCity(result.city);
      onChangeMethod(result.city.defaultMethod);
      setGeoStatus(result.statusMessageAr);
    } catch {
      setGeoStatus('تعذّر الوصول للموقع التلقائي؛ اختر مدينتك من القائمة.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleDownloadMonthlyCsv = () => {
    const headers = [
      'اليوم الميلادي',
      'التاريخ الهجري',
      'الفجر',
      'الشروق',
      'الظهر',
      'العصر',
      'المغرب',
      'العشاء',
    ];
    const csvRows = [
      headers.join(','),
      ...monthlySchedule.map((r) =>
        [
          r.gregorianDay,
          r.hijriDay,
          r.fajr,
          r.sunrise,
          r.dhuhr,
          r.asr,
          r.maghrib,
          r.isha,
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imsakiya-${selectedCity.id}-${now.getMonth() + 1}-${now.getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMethodSpec = CALCULATION_METHODS[methodId];

  // Automatically trigger Push Notifications & Adhan audio when current HH:MM matches an enabled schedule
  useEffect(() => {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentHHMM = `${hh}:${mm}`;
    if (now.getSeconds() === 0 && currentHHMM !== lastTriggeredMinute) {
      const scheduledNotif = evaluateScheduledNotificationsForMinute({
        currentHHMM,
        todayTimes,
        alertsConfig,
        channelsConfig: loadPushChannelsConfig(),
        cityNameAr: selectedCity.nameAr,
        lastThirdStartHHMM: sunnahWindows.lastThirdStartHHMM,
        isFriday: now.getDay() === 5,
      });
      if (scheduledNotif) {
        setLastTriggeredMinute(currentHHMM);
        dispatchSystemAndInAppNotification(scheduledNotif).catch(() => {});
      }
    }
  }, [
    now,
    todayTimes,
    alertsConfig,
    lastTriggeredMinute,
    selectedCity.nameAr,
    sunnahWindows.lastThirdStartHHMM,
  ]);

  const handleHeroPlayAdhan = () => {
    if (playbackState.isPlaying) {
      stopActiveAdhanAudio();
      return;
    }
    playAlertSoundTone('custom_file', nextPrayerInfo.nextPrayerNameAr);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* 1. Unified Hero Card: Date, City Selector, Next Prayer Countdown & Adhan Trigger */}
      <div className="bg-[#14532D] text-[#FBF9F5] rounded-2xl p-4 sm:p-6 relative overflow-hidden border border-[#14532D] space-y-4">
        {/* Top Row inside Hero: Date & Qibla on Right | City & Calc Settings on Left */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-white/15">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-200">
            <span className="font-bold text-[#FDE68A]">
              {hijriDate.formattedAr}
            </span>
            <span aria-hidden="true" className=" opacity-50">
              ·
            </span>
            <span>{gregorianFormatted}</span>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('qibla')}
              className="text-[#FDE68A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {distanceToMakkah === 0
                  ? 'الكعبة المشرفة'
                  : `القبلة ${qiblaAngle}° (${getCardinalDirectionAr(qiblaAngle)})`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <label htmlFor="city-select" className="sr-only">
              المدينة المعتمدة
            </label>
            <select
              id="city-select"
              aria-label="المدينة المعتمدة"
              value={selectedCity.id}
              onChange={(e) => {
                const found = EXTENDED_ARAB_AND_WORLD_CITIES.find(
                  (c) => c.id === e.target.value
                );
                if (found) {
                  onSelectCity(found);
                  onChangeMethod(found.defaultMethod);
                  setGeoStatus('');
                }
              }}
              className="flex-1 sm:flex-initial min-w-0 min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-black/25 border border-white/20 rounded-xl text-white focus:outline-none cursor-pointer truncate"
            >
              {!EXTENDED_ARAB_AND_WORLD_CITIES.some(
                (c) => c.id === selectedCity.id
              ) && (
                <option
                  value={selectedCity.id}
                  className="text-stone-900 bg-white font-bold"
                >
                  موقعي: {selectedCity.nameAr} — {selectedCity.countryAr}
                </option>
              )}
              {EXTENDED_ARAB_AND_WORLD_CITIES.map((city) => (
                <option key={city.id} value={city.id} className="text-stone-900 bg-white">
                  {city.nameAr} — {city.countryAr}
                </option>
              ))}
            </select>

            <button
              type="button"
              data-testid="detect-location-btn"
              onClick={handleGeolocation}
              disabled={isLocating}
              title="تحديد موقعي تلقائياً وحساب القبلة"
              aria-label="تحديد موقعي تلقائياً"
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-[#FDE68A]/20 hover:bg-[#FDE68A]/30 border border-[#FDE68A]/40 text-[#FDE68A] rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'جاري التحديد...' : 'موقعي'}</span>
            </button>

            <button
              type="button"
              data-testid="toggle-calc-settings-btn"
              onClick={() => setShowAdvancedSettings((prev) => !prev)}
              aria-expanded={showAdvancedSettings}
              className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showAdvancedSettings
                  ? 'bg-[#FDE68A] text-stone-950 font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>ضبط</span>
            </button>
          </div>
        </div>

        {/* Main Hero Row: Next Prayer & Live Countdown */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#D6CEBE] block mb-0.5">
              الصلاة القادمة في {selectedCity.nameAr}
            </span>
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
                صلاة {nextPrayerInfo.nextPrayerNameAr}
              </h1>
              <span className="font-tabular text-xl sm:text-2xl font-bold text-[#FDE68A]">
                {nextPrayerInfo.nextPrayerTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="bg-black/20 px-3.5 py-2 rounded-xl border border-white/15 text-left">
              <span className="text-[10px] text-[#D6CEBE] block">
                المتبقي للأذان
              </span>
              <div
                className="font-tabular text-2xl sm:text-3xl font-bold tracking-wider text-white"
                data-testid="next-prayer-countdown"
              >
                {nextPrayerInfo.remainingFormatted}
              </div>
            </div>

            <button
              type="button"
              data-testid="hero-play-adhan-btn"
              onClick={handleHeroPlayAdhan}
              className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                playbackState.isPlaying
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/15'
              }`}
            >
              {playbackState.isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف الأذان</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  <span>تشغيل الأذان</span>
                </>
              )}
            </button>
          </div>
        </div>

        {geoStatus && (
          <p
            className="relative z-10 text-xs text-[#D6CEBE] bg-black/20 px-3 py-1 rounded-lg inline-block"
            role="status"
          >
            {geoStatus}
          </p>
        )}
      </div>

      {/* Collapsible Calculation Method Drawer (Only shown when requested) */}
      {showAdvancedSettings && (
        <div
          data-testid="calc-settings-drawer"
          className="bg-white border border-stone-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end"
        >
          <div>
            <label
              htmlFor="method-select"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              الهيئة الفلكية المعتمدة لحساب الفجر والعشاء
            </label>
            <select
              id="method-select"
              aria-label="الهيئة الفلكية لحساب الفجر والعشاء"
              value={methodId}
              onChange={(e) =>
                onChangeMethod(e.target.value as CalculationMethodId)
              }
              className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900"
            >
              {Object.values(CALCULATION_METHODS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameAr} ({m.authorityAr})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5">
              المذهب الفقهي لحساب وقت العصر
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeAsrMethod('STANDARD')}
                className={`min-h-[32px] py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  asrMethod === 'STANDARD'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                جمهور الفقهاء
              </button>
              <button
                type="button"
                onClick={() => onChangeAsrMethod('HANAFI')}
                className={`min-h-[32px] py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  asrMethod === 'HANAFI'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                المذهب الحنفي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Minimal 6 Daily Prayer Times Strip */}
      <section aria-label="مواقيت الصلوات لليوم">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {PRAYER_METADATA.map((item) => {
            const timeStr = todayTimes[item.key];
            const isNext = nextPrayerInfo.nextPrayerKey === item.key;
            const isCurrent = nextPrayerInfo.currentPrayerKey === item.key;

            return (
              <div
                key={item.key}
                data-testid={`prayer-card-${item.key}`}
                className={`rounded-2xl p-3 sm:p-3.5 border transition-colors text-center ${
                  isNext
                    ? 'bg-[#14532D]/10 border-[#14532D] ring-1 ring-[#14532D]'
                    : isCurrent
                    ? 'bg-white border-stone-300'
                    : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="font-display text-sm sm:text-base font-bold text-stone-900">
                    {item.nameAr}
                  </span>
                  {isNext && (
                    <span className="text-[10px] font-bold text-[#14532D]">
                      • القادمة
                    </span>
                  )}
                </div>

                <div className="font-tabular text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  {timeStr}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2B. Astronomical Night Thirds, Duha Window & Prohibited Times Strip */}
      <section
        aria-label="المواقيت النورانية والسنن اليومية"
        data-testid="sunnah-night-windows-section"
        className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                sunnahWindows.activeStatus.kind === 'last_third'
                  ? 'bg-[#14532D] text-[#FDE68A]'
                  : sunnahWindows.activeStatus.kind === 'duha'
                  ? 'bg-[#14532D]/15 text-[#14532D] border border-[#14532D]/25'
                  : sunnahWindows.activeStatus.kind === 'prohibited'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'bg-[#F7F4EE] text-[#78350F] border border-stone-200'
              }`}
            >
              {sunnahWindows.activeStatus.badgeAr}
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-stone-900">
              {sunnahWindows.activeStatus.titleAr}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowProhibitedDetails((prev) => !prev)}
            className="text-[11px] font-semibold text-[#78350F] hover:underline cursor-pointer"
          >
            {showProhibitedDetails
              ? 'إخفاء أوقات النهي الثلاثة'
              : 'عرض أوقات النهي عن النافلة (٣)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Card 1: Last Third of the Night */}
          <div
            data-testid="night-last-third-card"
            className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[11px] font-bold text-[#14532D] block">
                الثلث الأخير من الليل (التهجّد والأسحار)
              </span>
              <span className="text-[10px] text-stone-600 block mt-0.5">
                يمتد حتى أذان الفجر ({sunnahWindows.fajrHHMM})
              </span>
            </div>
            <span className="font-tabular tabular-nums text-base sm:text-lg font-bold text-[#14532D] whitespace-nowrap">
              {sunnahWindows.lastThirdStartHHMM}
            </span>
          </div>

          {/* Card 2: Duha & Ishraq Prayer Window */}
          <div
            data-testid="duha-window-card"
            className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[11px] font-bold text-[#78350F] block">
                وقت صلاة الضحى والإشراق (الأوابين)
              </span>
              <span className="text-[10px] text-stone-600 block mt-0.5">
                من ارتفاع الشمس قيد رمح إلى قبيل الزوال
              </span>
            </div>
            <span className="font-tabular tabular-nums text-sm sm:text-base font-bold text-stone-900 whitespace-nowrap">
              {sunnahWindows.duhaStartHHMM} – {sunnahWindows.duhaEndHHMM}
            </span>
          </div>

          {/* Card 3: Shariah Islamic Midnight */}
          <div
            data-testid="islamic-midnight-card"
            className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[11px] font-bold text-stone-800 block">
                منتصف الليل الشرعي
              </span>
              <span className="text-[10px] text-stone-600 block mt-0.5">
                نهاية الثلث الأول: {sunnahWindows.firstThirdEndHHMM}
              </span>
            </div>
            <span className="font-tabular tabular-nums text-base sm:text-lg font-bold text-stone-900 whitespace-nowrap">
              {sunnahWindows.islamicMidnightHHMM}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-stone-600 leading-relaxed">
          {sunnahWindows.activeStatus.virtueOrRulingAr}
        </p>

        {showProhibitedDetails && (
          <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {sunnahWindows.prohibitedWindows.map((pw) => (
              <div
                key={pw.id}
                className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-950">
                  <span>{pw.titleAr}</span>
                  <span className="font-tabular tabular-nums whitespace-nowrap">
                    {pw.fromHHMM} – {pw.toHHMM}
                  </span>
                </div>
                <p className="text-[10px] text-amber-900">{pw.hadithNoteAr}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Concise 3-Tab Sub-Screen Switcher (No duplicate prayer clocks on default view) */}
      <div
        role="tablist"
        aria-label="أقسام التنبيهات والإمساكية والويدجت"
        className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4EFE6] border border-stone-200 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          data-testid="subtab-alerts"
          aria-selected={activeSubScreen === 'alerts'}
          onClick={() => setActiveSubScreen('alerts')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubScreen === 'alerts'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>الأذان والتنبيهات</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="subtab-monthly-travel"
          aria-selected={activeSubScreen === 'monthly_travel'}
          onClick={() => setActiveSubScreen('monthly_travel')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubScreen === 'monthly_travel'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>الإمساكية والمسافر</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="subtab-widgets"
          aria-selected={activeSubScreen === 'widgets'}
          onClick={() => setActiveSubScreen('widgets')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubScreen === 'widgets'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>ويدجت الهاتف</span>
        </button>
      </div>

      {/* SUB-SCREEN 1: Multi-Widget Suite (6 Simultaneous Interactive Widgets) */}
      {activeSubScreen === 'widgets' && (
        <SmartIslamicWidgets
          selectedCity={selectedCity}
          todayTimes={todayTimes}
          nextPrayerInfo={nextPrayerInfo}
          hijriDate={hijriDate}
          qiblaAngle={qiblaAngle}
          now={now}
          onOpenMushafPage={onOpenMushafPage}
          onNavigateToQibla={() => onNavigateTab('qibla')}
          onDetectLocation={handleGeolocation}
        />
      )}

      {/* SUB-SCREEN 2: Clean Adhan Player & Prayer Alerts */}
      {activeSubScreen === 'alerts' && (
        <PrayerAlertsPanel
          todayTimes={todayTimes}
          alertsConfig={alertsConfig}
          onChangeAlertsConfig={setAlertsConfig}
          cityNameAr={selectedCity.nameAr}
          nextPrayerNameAr={nextPrayerInfo.nextPrayerNameAr}
          nextPrayerTime={nextPrayerInfo.nextPrayerTime}
        />
      )}

      {/* SUB-SCREEN 3: Monthly Schedule (Imsakiya) & Traveler Mode */}
      {activeSubScreen === 'monthly_travel' && (
        <div className="space-y-4">
          {/* Monthly Prayer Schedule */}
          <section
            aria-labelledby="monthly-schedule-heading"
            className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                id="monthly-schedule-heading"
                className="font-display text-base sm:text-lg font-bold text-stone-900"
              >
                إمساكية الشهر — {selectedCity.nameAr}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMonthlyCsv}
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-stone-700 bg-[#F7F4EE] hover:bg-stone-200/70 border border-stone-300 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonthlyTable((prev) => !prev)}
                  aria-expanded={showMonthlyTable}
                  className="min-h-[34px] px-3.5 py-1 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {showMonthlyTable ? 'إخفاء الجدول' : 'عرض جدول ٣٠ يوماً'}
                  </span>
                </button>
              </div>
            </div>

            {showMonthlyTable && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-right text-xs border-collapse min-w-[540px]">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 bg-[#FBF9F5]">
                      <th className="py-2.5 px-2.5 font-semibold">الميلادي</th>
                      <th className="py-2.5 px-2.5 font-semibold">الهجري</th>
                      <th className="py-2.5 px-2.5 font-semibold">الفجر</th>
                      <th className="py-2.5 px-2.5 font-semibold">الشروق</th>
                      <th className="py-2.5 px-2.5 font-semibold">الظهر</th>
                      <th className="py-2.5 px-2.5 font-semibold">العصر</th>
                      <th className="py-2.5 px-2.5 font-semibold">المغرب</th>
                      <th className="py-2.5 px-2.5 font-semibold">العشاء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {monthlySchedule.map((row) => (
                      <tr
                        key={row.dayNumber}
                        className={
                          row.isToday
                            ? 'bg-[#14532D]/10 font-semibold text-stone-900'
                            : 'hover:bg-stone-50 text-stone-700'
                        }
                      >
                        <td className="py-2 px-2.5 font-tabular">
                          {row.gregorianDay}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {row.hijriDay}
                        </td>
                        <td className="py-2 px-2.5 font-tabular">{row.fajr}</td>
                        <td className="py-2 px-2.5 font-tabular">
                          {row.sunrise}
                        </td>
                        <td className="py-2 px-2.5 font-tabular">{row.dhuhr}</td>
                        <td className="py-2 px-2.5 font-tabular">{row.asr}</td>
                        <td className="py-2 px-2.5 font-tabular">
                          {row.maghrib}
                        </td>
                        <td className="py-2 px-2.5 font-tabular">{row.isha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Traveler Mode Panel */}
          <TravelerModePanel
            selectedCity={selectedCity}
            onSelectCity={(city) => {
              onSelectCity(city);
              onChangeMethod(city.defaultMethod);
            }}
          />
        </div>
      )}
    </div>
  );
};
