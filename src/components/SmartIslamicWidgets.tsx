import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Pin,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  CityLocation,
  DailyPrayerTimes,
  NextPrayerStatus,
  HijriDateDetails,
  PRAYER_METADATA,
  toArabicNumerals,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
} from '../utils/astronomy';
import {
  WidgetSizePreset,
  WidgetThemeId,
  WidgetCardId,
  WIDGET_THEMES,
  WIDGET_CATALOG,
  calculatePrayerIntervalProgress,
  getWidgetDailyAyah,
  getUpcomingHijriNoteAr,
} from '../utils/widgetEngine';

const WIDGET_PREFS_KEY = 'almihrab_smart_widget_prefs_v1';

const QUICK_DHIKR_LIST = [
  'سبحان الله وبحمده',
  'سبحان الله العظيم',
  'أستغفر الله وأتوب إليه',
  'لا إله إلا الله وحده لا شريك له',
  'اللهم صلِّ وسلم على نبينا محمد',
];

interface SmartIslamicWidgetsProps {
  selectedCity: CityLocation;
  todayTimes: DailyPrayerTimes;
  nextPrayerInfo: NextPrayerStatus;
  hijriDate: HijriDateDetails;
  qiblaAngle: number;
  now: Date;
  onOpenMushafPage?: (page: number) => void;
  onNavigateToQibla?: () => void;
  onDetectLocation?: () => void;
  standaloneMode?: boolean;
  initialSize?: WidgetSizePreset;
  initialTheme?: WidgetThemeId;
}

export const SmartIslamicWidgets: React.FC<SmartIslamicWidgetsProps> = ({
  selectedCity,
  todayTimes,
  nextPrayerInfo,
  hijriDate,
  qiblaAngle,
  now,
  onOpenMushafPage,
  onNavigateToQibla,
  onDetectLocation,
  standaloneMode = false,
  initialSize,
  initialTheme,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | WidgetCardId>('all');

  const [sizePreset] = useState<WidgetSizePreset>(() => {
    if (initialSize) return initialSize;
    return 'large';
  });

  const [themeId, setThemeId] = useState<WidgetThemeId>(() => {
    if (initialTheme) return initialTheme;
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeId && WIDGET_THEMES[parsed.themeId as WidgetThemeId]) {
          return parsed.themeId;
        }
      }
    } catch {
      // ignore
    }
    return 'emerald';
  });

  const [floatingPinned, setFloatingPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.floatingPinned);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [tasbihCount, setTasbihCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.tasbihCount === 'number') return parsed.tasbihCount;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [dhikrIndex, setDhikrIndex] = useState<number>(0);
  const [ayahOffset, setAyahOffset] = useState<number>(0);
  const [standbyFullscreen, setStandbyFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (standaloneMode) return;
    try {
      localStorage.setItem(
        WIDGET_PREFS_KEY,
        JSON.stringify({
          sizePreset,
          themeId,
          floatingPinned,
          tasbihCount,
        })
      );
    } catch {
      // ignore
    }
  }, [sizePreset, themeId, floatingPinned, tasbihCount, standaloneMode]);

  const theme = WIDGET_THEMES[themeId] || WIDGET_THEMES.emerald;

  const intervalProgress = useMemo(() => {
    return calculatePrayerIntervalProgress(
      todayTimes,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }, [todayTimes, now]);

  const dailyAyah = useMemo(() => {
    return getWidgetDailyAyah(hijriDate.day, ayahOffset);
  }, [hijriDate.day, ayahOffset]);

  const distanceToKaaba = useMemo(() => {
    return calculateDistanceToKaaba(selectedCity.latitude, selectedCity.longitude);
  }, [selectedCity]);

  const cardinalAr = useMemo(() => {
    return getCardinalDirectionAr(qiblaAngle);
  }, [qiblaAngle]);

  const hijriOccasionNote = useMemo(() => {
    return getUpcomingHijriNoteAr(hijriDate.day, hijriDate.monthNameAr);
  }, [hijriDate.day, hijriDate.monthNameAr]);

  const currentClockFormatted = useMemo(() => {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [now]);

  // Export High-DPI PNG Card using HTML5 Canvas
  const handleDownloadWidgetImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1200, 675);
    grad.addColorStop(0, theme.canvasBgStart);
    grad.addColorStop(1, theme.canvasBgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 675);

    ctx.strokeStyle = theme.canvasAccent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(36, 36, 1128, 603);

    ctx.beginPath();
    ctx.arc(600, 210, 150, Math.PI, 0, false);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 34px Cairo, sans-serif';
    ctx.fillText(`المحراب · ${selectedCity.nameAr}`, 1110, 105);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '24px Cairo, sans-serif';
    ctx.fillText(
      `${toArabicNumerals(hijriDate.day)} ${hijriDate.monthNameAr} ${toArabicNumerals(
        hijriDate.year
      )} هـ  |  القبلة ${toArabicNumerals(Math.round(qiblaAngle))}°`,
      1110,
      148
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '26px Cairo, sans-serif';
    ctx.fillText(
      `الصلاة القادمة: صلاة ${nextPrayerInfo.nextPrayerNameAr} (${nextPrayerInfo.nextPrayerTime})`,
      600,
      235
    );

    ctx.fillStyle = theme.canvasTextPrimary;
    ctx.font = 'bold 74px monospace';
    ctx.fillText(`-${nextPrayerInfo.remainingFormatted}`, 600, 320);

    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 30px Amiri, serif';
    ctx.fillText(`﴿ ${dailyAyah.ayahText} ﴾`, 600, 405);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '20px Cairo, sans-serif';
    ctx.fillText(
      `${dailyAyah.surahNameAr} · آية ${toArabicNumerals(dailyAyah.ayahNumber)}`,
      600,
      442
    );

    const prayers = PRAYER_METADATA.map((meta) => ({
      name: meta.nameAr,
      time: todayTimes[meta.key],
      isNext: nextPrayerInfo.nextPrayerKey === meta.key,
    }));

    const slotWidth = 170;
    const startX = 1110;
    prayers.forEach((p, idx) => {
      const boxRight = startX - idx * 182;
      const boxLeft = boxRight - slotWidth;
      ctx.fillStyle = p.isNext
        ? 'rgba(253, 230, 138, 0.22)'
        : 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(boxLeft, 490, slotWidth, 110);

      if (p.isNext) {
        ctx.strokeStyle = theme.canvasAccent;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxLeft, 490, slotWidth, 110);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = p.isNext ? theme.canvasAccent : theme.canvasTextSecondary;
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillText(p.name, boxLeft + slotWidth / 2, 532);

      ctx.fillStyle = theme.canvasTextPrimary;
      ctx.font = 'bold 28px monospace';
      ctx.fillText(p.time, boxLeft + slotWidth / 2, 576);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `mihrab-widget-${selectedCity.id}.png`;
    link.click();
  };

  // ============================================================================
  // WIDGET 1: الصلاة القادمة والقوس الفلكي (Next Prayer & Horizon Arc)
  // ============================================================================
  const renderNextPrayerArcWidget = () => {
    const arcRadius = 70;
    const arcLength = Math.PI * arcRadius;
    const arcOffset =
      arcLength - (intervalProgress.progressPercent / 100) * arcLength;
    const angleRad = (intervalProgress.progressPercent / 100) * Math.PI;
    const orbX = 100 + arcRadius * Math.cos(angleRad);
    const orbY = 86 - arcRadius * Math.sin(angleRad);

    return (
      <article
        data-testid="widget-card-next_prayer_arc"
        className={`rounded-3xl border p-5 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            الصلاة القادمة
          </span>
          <span className={`text-[11px] ${theme.textSecondaryClass}`}>
            {selectedCity.nameAr}
          </span>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold">
              صلاة {nextPrayerInfo.nextPrayerNameAr}
            </h3>
            <div
              data-testid="widget-live-countdown"
              className="font-tabular text-2xl font-bold tracking-tight"
            >
              -{nextPrayerInfo.remainingFormatted}
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <svg className="w-32 h-16 overflow-visible" viewBox="0 0 200 95">
              <path
                d="M 170 86 A 70 70 0 0 0 30 86"
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 170 86 A 70 70 0 0 0 30 86"
                fill="none"
                stroke={theme.arcFillHex}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={arcOffset}
              />
              <circle cx={orbX} cy={orbY} r="6.5" fill={theme.arcFillHex} />
              <text
                x="100"
                y="74"
                textAnchor="middle"
                fill="currentColor"
                className="text-xs font-bold"
              >
                {toArabicNumerals(intervalProgress.progressPercent)}٪
              </text>
            </svg>
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>السابقة: {intervalProgress.previousPrayerNameAr}</span>
          <span className="font-tabular font-semibold">
            الأذان: {nextPrayerInfo.nextPrayerTime}
          </span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 2: مواقيت اليوم (Daily 6 Prayers Schedule)
  // ============================================================================
  const renderDailyScheduleWidget = () => {
    return (
      <article
        data-testid="widget-card-daily_schedule"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            مواقيت اليوم
          </span>
          <span className={`text-[11px] ${theme.textSecondaryClass}`}>
            {toArabicNumerals(hijriDate.day)} {hijriDate.monthNameAr}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 my-auto py-2">
          {PRAYER_METADATA.map((item) => {
            const isNext = nextPrayerInfo.nextPrayerKey === item.key;
            return (
              <div
                key={item.key}
                className={`rounded-2xl border p-2 text-center transition-colors ${
                  isNext ? theme.activeSlotBgClass : theme.cardInnerBgClass
                }`}
              >
                <span className="text-[11px] font-bold block">
                  {item.nameAr}
                </span>
                <span className="font-tabular text-sm font-bold block">
                  {todayTimes[item.key]}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>
            منتصف الليل: <strong className="font-tabular">{todayTimes.midnight}</strong>
          </span>
          <span className={theme.accentTextClass}>
            الثلث الأخير: <strong className="font-tabular">{todayTimes.lastThird}</strong>
          </span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 3: آية اليوم (Daily Quranic Ayah)
  // ============================================================================
  const renderQuranWirdWidget = () => {
    return (
      <article
        data-testid="widget-card-quran_wird"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${theme.accentTextClass}`}>
            آية اليوم
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="widget-next-ayah-btn"
              onClick={() => setAyahOffset((prev) => prev + 1)}
              className="px-2 py-1 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              title="آية أخرى"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تغيير</span>
            </button>
            {onOpenMushafPage && (
              <button
                type="button"
                data-testid="widget-open-mushaf-btn"
                onClick={() => onOpenMushafPage(dailyAyah.mushafPage)}
                className="px-2 py-1 rounded-lg bg-current/15 hover:bg-current/25 text-[11px] font-semibold cursor-pointer"
              >
                ص {toArabicNumerals(dailyAyah.mushafPage)}
              </button>
            )}
          </div>
        </div>

        <div className="my-auto py-2">
          <p
            data-testid="widget-daily-ayah-text"
            className="font-quran text-lg sm:text-xl leading-relaxed"
          >
            ﴿ {dailyAyah.ayahText} ﴾
          </p>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span className="font-semibold">
            {dailyAyah.surahNameAr} · آية {toArabicNumerals(dailyAyah.ayahNumber)}
          </span>
          <span>{dailyAyah.reflectionAr}</span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 4: المسبحة الإلكترونية (Interactive Digital Tasbih)
  // ============================================================================
  const renderTasbihDhikrWidget = () => {
    const cycleProgress = ((tasbihCount % 33) / 33) * 100;
    return (
      <article
        data-testid="widget-card-tasbih_dhikr"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${theme.accentTextClass}`}>
            المسبحة
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setDhikrIndex((prev) => (prev + 1) % QUICK_DHIKR_LIST.length)
              }
              className="px-2 py-1 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-medium cursor-pointer"
            >
              تغيير الذكر
            </button>
            <button
              type="button"
              onClick={() => setTasbihCount(0)}
              aria-label="تصفير عداد التسبيح"
              className="p-1.5 rounded-lg bg-current/10 hover:bg-current/20 cursor-pointer"
              title="تصفير العداد"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="my-auto py-2 text-center space-y-2">
          <p className="font-display text-lg font-bold">
            {QUICK_DHIKR_LIST[dhikrIndex]}
          </p>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-current/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${cycleProgress}%`,
                backgroundColor: theme.arcFillHex,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          data-testid="widget-tasbih-btn"
          onClick={() => setTasbihCount((prev) => prev + 1)}
          className={`w-full min-h-[42px] py-2 px-4 rounded-2xl border font-bold text-xs flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer ${theme.activeSlotBgClass}`}
        >
          <span>اضغط للتسبيح</span>
          <span
            data-testid="widget-tasbih-count"
            className="font-sans tabular-nums text-lg font-bold"
          >
            {toArabicNumerals(tasbihCount)}
          </span>
        </button>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 5: اتجاه القبلة والتقويم (Qibla Compass & Hijri)
  // ============================================================================
  const renderQiblaHijriWidget = () => {
    return (
      <article
        data-testid="widget-card-qibla_hijri"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            اتجاه القبلة · {selectedCity.nameAr}
          </span>
          <div className="flex items-center gap-1">
            {onDetectLocation && (
              <button
                type="button"
                onClick={onDetectLocation}
                className="px-2 py-0.5 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-semibold cursor-pointer"
                title="تحديد موقعي الحالي لحساب القبلة"
              >
                موقعي
              </button>
            )}
            {onNavigateToQibla && (
              <button
                type="button"
                onClick={onNavigateToQibla}
                className="px-2 py-0.5 rounded-lg bg-current/15 hover:bg-current/25 text-[11px] font-semibold cursor-pointer"
              >
                البوصلة
              </button>
            )}
          </div>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-tabular text-2xl font-bold">
              {selectedCity.id === 'makkah'
                ? 'جوار الكعبة (٠°)'
                : `${toArabicNumerals(Math.round(qiblaAngle))}° ${cardinalAr}`}
            </div>
            <span className={`text-xs block ${theme.accentTextClass}`}>
              {distanceToKaaba === 0
                ? 'مكة المكرمة — المسجد الحرام'
                : `المسافة للكعبة: ${distanceToKaaba.toLocaleString('en-US')} كم`}
            </span>
          </div>

          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="3"
              />
              <text
                x="50"
                y="21"
                textAnchor="middle"
                fill="currentColor"
                className="text-[9px] font-bold opacity-75"
              >
                ش
              </text>
              <g transform={`rotate(${qiblaAngle} 50 50)`}>
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="20"
                  stroke={theme.arcFillHex}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <polygon
                  points="50,11 44,23 56,23"
                  fill={theme.arcFillHex}
                />
              </g>
              <circle cx="50" cy="50" r="4" fill={theme.arcFillHex} />
            </svg>
          </div>
        </div>

        <div
          className={`text-[11px] pt-2 border-t border-current/10 truncate ${theme.textSecondaryClass}`}
        >
          {hijriOccasionNote}
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 6: شاشة القفل والساعة (Lock-Screen Circular Widget)
  // ============================================================================
  const renderLockscreenCompactWidget = () => {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (intervalProgress.progressPercent / 100) * circumference;

    return (
      <article
        data-testid="widget-card-lockscreen_compact"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            شاشة القفل
          </span>
          <span className="font-tabular text-xs font-bold">
            {currentClockFormatted}
          </span>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-4">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="5.5"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={theme.arcFillHex}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-[10px] font-semibold ${theme.textSecondaryClass}`}>
                {nextPrayerInfo.nextPrayerNameAr}
              </span>
              <span className="font-tabular text-xs font-bold">
                {nextPrayerInfo.nextPrayerTime}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <span className={`text-[11px] block ${theme.textSecondaryClass}`}>
              المتبقي للأذان
            </span>
            <div className="font-tabular text-2xl font-bold tracking-tight">
              -{nextPrayerInfo.remainingFormatted}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>انقضى {toArabicNumerals(intervalProgress.progressPercent)}٪</span>
          <button
            type="button"
            onClick={() => setFloatingPinned((prev) => !prev)}
            className="font-semibold underline cursor-pointer"
          >
            {floatingPinned ? 'إلغاء التثبيت' : 'تثبيت عائم'}
          </button>
        </div>
      </article>
    );
  };

  const renderCardById = (cardId: WidgetCardId) => {
    switch (cardId) {
      case 'next_prayer_arc':
        return renderNextPrayerArcWidget();
      case 'daily_schedule':
        return renderDailyScheduleWidget();
      case 'quran_wird':
        return renderQuranWirdWidget();
      case 'tasbih_dhikr':
        return renderTasbihDhikrWidget();
      case 'qibla_hijri':
        return renderQiblaHijriWidget();
      case 'lockscreen_compact':
        return renderLockscreenCompactWidget();
    }
  };

  if (standaloneMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-transparent" dir="rtl">
        <div className="w-full max-w-xl" data-testid="live-widget-card">
          {renderNextPrayerArcWidget()}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="مجموعة ويدجت المحراب التفاعلية"
      data-testid="smart-widgets-studio"
      className="space-y-4"
    >
      {/* Single Compact Control Bar: Widget Filter + Theme Dots + Quick Actions */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Filter Pills */}
        <div className="flex flex-nowrap overflow-x-auto items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
          <button
            type="button"
            data-testid="widget-filter-all"
            onClick={() => setActiveFilter('all')}
            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            الكل (٦)
          </button>
          {WIDGET_CATALOG.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`widget-filter-${item.id}`}
              onClick={() => setActiveFilter(item.id)}
              className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === item.id
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {item.shortTitleAr}
            </button>
          ))}
        </div>

        {/* Themes & Utility Actions */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Theme Switcher */}
          <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
            {Object.values(WIDGET_THEMES).map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`widget-theme-${t.id}`}
                onClick={() => setThemeId(t.id)}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  themeId === t.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.nameAr.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="toggle-floating-widget-btn"
              onClick={() => setFloatingPinned((prev) => !prev)}
              title="تثبيت ويدجت عائمة"
              className={`min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                floatingPinned
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-[#FBF9F5] text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">عائمة</span>
            </button>

            <button
              type="button"
              data-testid="open-standby-mode-btn"
              onClick={() => setStandbyFullscreen(true)}
              title="وضع ساعة المكتب"
              className="min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FBF9F5] hover:bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#78350F]" />
              <span className="hidden sm:inline">ملء الشاشة</span>
            </button>

            <button
              type="button"
              data-testid="export-widget-png-btn"
              onClick={handleDownloadWidgetImage}
              title="حفظ كبطاقة صورة"
              className="min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FBF9F5] hover:bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#14532D]" />
              <span className="hidden sm:inline">صورة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct 6-Widget Bento Grid (No Nested Wrapper Boxes) */}
      <div
        data-testid="live-widget-card"
        data-widget-theme={themeId}
      >
        {activeFilter === 'all' ? (
          <div
            data-testid="multi-widgets-bento-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {renderNextPrayerArcWidget()}
            {renderDailyScheduleWidget()}
            {renderQuranWirdWidget()}
            {renderTasbihDhikrWidget()}
            {renderQiblaHijriWidget()}
            {renderLockscreenCompactWidget()}
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            {renderCardById(activeFilter)}
          </div>
        )}
      </div>

      {/* Portaled Floating Mini-Widget (Stays visible in corner when pinned) */}
      {floatingPinned &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            dir="rtl"
            data-testid="floating-mini-widget"
            className={`fixed bottom-20 md:bottom-5 left-4 z-40 w-72 rounded-2xl border p-3.5 shadow-2xl transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock className={`w-3.5 h-3.5 ${theme.accentTextClass}`} />
                <span>
                  صلاة {nextPrayerInfo.nextPrayerNameAr} ({nextPrayerInfo.nextPrayerTime})
                </span>
              </div>
              <button
                type="button"
                aria-label="إغلاق الويدجت العائمة"
                onClick={() => setFloatingPinned(false)}
                className="p-1 rounded-lg bg-current/10 hover:bg-current/20 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-tabular text-xl font-bold tracking-tight">
                -{nextPrayerInfo.remainingFormatted}
              </span>
              <span className={`text-[11px] ${theme.textSecondaryClass}`}>
                {selectedCity.nameAr} · {toArabicNumerals(hijriDate.day)}{' '}
                {hijriDate.monthNameAr}
              </span>
            </div>
          </div>,
          document.body
        )}

      {/* Portaled Full-Screen Desk / StandBy Clock Mode */}
      {standbyFullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="وضع ساعة المكتب بملء الشاشة"
            dir="rtl"
            data-testid="widget-standby-fullscreen"
            className="fixed inset-0 z-50 bg-[#090D0B] flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <div className="w-full max-w-6xl space-y-5">
              <div className="flex items-center justify-between text-white border-b border-white/15 pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-amber-300">
                    وضع ساعة المكتب الدائمة — محراب {selectedCity.nameAr}
                  </h3>
                  <p className="text-xs text-stone-300">
                    الساعة الآن {currentClockFormatted} · {toArabicNumerals(hijriDate.day)}{' '}
                    {hijriDate.monthNameAr} {toArabicNumerals(hijriDate.year)} هـ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStandbyFullscreen(false)}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>إنهاء وضع الشاشة الدائمة</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderNextPrayerArcWidget()}
                {renderDailyScheduleWidget()}
                {renderQuranWirdWidget()}
                {renderTasbihDhikrWidget()}
                {renderQiblaHijriWidget()}
                {renderLockscreenCompactWidget()}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
