import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Award,
  Flame,
  Calendar,
  Calculator,
  Clock,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Moon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { toArabicNumerals } from '../utils/astronomy';
import {
  FardPrayerKey,
  FardPrayerStatus,
  SunnahRawatibKey,
  ExtraNafilKey,
  FastingStatus,
  DailyWorshipRecord,
  FARD_PRAYERS_META,
  SUNNAH_RAWATIB_META,
  EXTRA_NAFIL_META,
  formatDateKeyISO,
  createEmptyDailyWorshipRecord,
  loadWorshipRecords,
  saveWorshipRecords,
  calculateWorshipAnalytics,
  QadaTrackerState,
  loadQadaTrackerState,
  saveQadaTrackerState,
  calculateQadaProjection,
  KHUSHU_RETREAT_GOALS,
  KhushuRetreatGoalId,
  loadKhushuStats,
  saveKhushuStats,
  PropheticSunnahCategoryId,
  PROPHETIC_SUNNAH_CATEGORIES,
  VERIFIED_PROPHETIC_SUNNAHS,
  PropheticSunnahTrackerState,
  loadSunnahTrackerState,
  saveSunnahTrackerState,
  toggleSunnahAppliedForDate,
  getSunnahOfTheDay,
  calculateSunnahRevivalAnalytics,
  sunnahItemToDawahCardPayload,
} from '../utils/worshipTrackerAndTools';
import { triggerMasbahaTactileFeedback } from '../utils/islamicFeatures';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';

export type WorshipHubSubSection = 'tracker' | 'sunnah' | 'qada' | 'khushu';

interface WorshipAndQadaHubProps {
  hijriDay: number;
  hijriMonthNameAr: string;
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
  initialSubSection?: WorshipHubSubSection;
}

export const WorshipAndQadaHub: React.FC<WorshipAndQadaHubProps> = ({
  hijriDay,
  hijriMonthNameAr,
  onOpenDawahCard,
  initialSubSection,
}) => {
  const [activeSubSection, setActiveSubSection] =
    useState<WorshipHubSubSection>(initialSubSection || 'tracker');

  useEffect(() => {
    if (initialSubSection) {
      setActiveSubSection(initialSubSection);
    }
  }, [initialSubSection]);

  // =========================================================================
  // 1. DAILY WORSHIP, 12 RAWATIB & FASTING STATE
  // =========================================================================
  const [worshipRecords, setWorshipRecords] = useState<
    Record<string, DailyWorshipRecord>
  >(() => loadWorshipRecords());

  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0); // 0 = today, -1 = yesterday, up to -6

  const selectedDateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDateOffset);
    return d;
  }, [selectedDateOffset]);

  const selectedDateISO = useMemo(
    () => formatDateKeyISO(selectedDateObj),
    [selectedDateObj]
  );

  const currentDayRecord: DailyWorshipRecord = useMemo(() => {
    return (
      worshipRecords[selectedDateISO] ||
      createEmptyDailyWorshipRecord(selectedDateISO)
    );
  }, [worshipRecords, selectedDateISO]);

  useEffect(() => {
    saveWorshipRecords(worshipRecords);
  }, [worshipRecords]);

  const analytics = useMemo(() => {
    return calculateWorshipAnalytics(worshipRecords, new Date(), hijriDay);
  }, [worshipRecords, hijriDay]);

  const last7DaysList = useMemo(() => {
    const days = [];
    const dayNamesAr = [
      'الأحد',
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
    ];
    for (let offset = 0; offset >= -6; offset--) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const iso = formatDateKeyISO(d);
      const rec = worshipRecords[iso];
      const fardDone = rec
        ? Object.values(rec.fard).filter((s) => s !== 'none').length
        : 0;
      const rawatibRakaat = rec
        ? SUNNAH_RAWATIB_META.reduce(
            (sum, m) => sum + (rec.rawatib?.[m.key] ? m.rakaat : 0),
            0
          )
        : 0;
      days.push({
        offset,
        iso,
        dayNameAr: offset === 0 ? 'اليوم' : offset === -1 ? 'أمس' : dayNamesAr[d.getDay()],
        dayNumber: d.getDate(),
        fardDone,
        rawatibRakaat,
        fasted: Boolean(rec && rec.fasting !== 'none'),
      });
    }
    return days;
  }, [worshipRecords]);

  const updateCurrentDayRecord = (
    updater: (prev: DailyWorshipRecord) => DailyWorshipRecord
  ) => {
    setWorshipRecords((prev) => {
      const existing =
        prev[selectedDateISO] || createEmptyDailyWorshipRecord(selectedDateISO);
      return {
        ...prev,
        [selectedDateISO]: updater(existing),
      };
    });
  };

  const handleSetFardStatus = (
    prayer: FardPrayerKey,
    status: FardPrayerStatus
  ) => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      fard: {
        ...rec.fard,
        [prayer]: rec.fard[prayer] === status ? 'none' : status,
      },
    }));
  };

  const handleMarkAllFiveMosque = () => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      fard: {
        fajr: 'mosque_jamaah',
        dhuhr: 'mosque_jamaah',
        asr: 'mosque_jamaah',
        maghrib: 'mosque_jamaah',
        isha: 'mosque_jamaah',
      },
    }));
  };

  const handleToggleRawatib = (key: SunnahRawatibKey) => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      rawatib: {
        ...rec.rawatib,
        [key]: !rec.rawatib[key],
      },
    }));
  };

  const handleMarkAll12Rawatib = () => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      rawatib: {
        fajr_pre_2: true,
        dhuhr_pre_2_a: true,
        dhuhr_pre_2_b: true,
        dhuhr_post_2: true,
        maghrib_post_2: true,
        isha_post_2: true,
      },
    }));
  };

  const handleToggleNafil = (key: ExtraNafilKey) => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      nafil: {
        ...rec.nafil,
        [key]: !rec.nafil[key],
      },
    }));
  };

  const handleSetFasting = (status: FastingStatus) => {
    updateCurrentDayRecord((rec) => ({
      ...rec,
      fasting: rec.fasting === status ? 'none' : status,
    }));
  };

  // =========================================================================
  // 2. QADA (MISSED PRAYERS & FASTING) CALCULATOR STATE
  // =========================================================================
  const [qadaState, setQadaState] = useState<QadaTrackerState>(() =>
    loadQadaTrackerState()
  );
  const [calcYears, setCalcYears] = useState<number>(0);
  const [calcMonths, setCalcMonths] = useState<number>(1);
  const [calcDays, setCalcDays] = useState<number>(0);
  const [calcFastingInput, setCalcFastingInput] = useState<number>(5);
  const [qadaToast, setQadaToast] = useState<string | null>(null);

  useEffect(() => {
    saveQadaTrackerState(qadaState);
  }, [qadaState]);

  const qadaProjection = useMemo(
    () => calculateQadaProjection(qadaState),
    [qadaState]
  );

  const showQadaFeedback = (msg: string) => {
    setQadaToast(msg);
    window.setTimeout(() => setQadaToast(null), 3200);
  };

  const handleApplyCalculatedQadaPlan = () => {
    const totalDays =
      Math.max(0, calcYears) * 365 +
      Math.max(0, calcMonths) * 30 +
      Math.max(0, calcDays);
    const fastDays = Math.max(0, calcFastingInput);

    if (totalDays === 0 && fastDays === 0) return;

    const nowTimeAr = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setQadaState((prev) => ({
      ...prev,
      initialPrayers: {
        fajr: totalDays > 0 ? totalDays : prev.initialPrayers.fajr,
        dhuhr: totalDays > 0 ? totalDays : prev.initialPrayers.dhuhr,
        asr: totalDays > 0 ? totalDays : prev.initialPrayers.asr,
        maghrib: totalDays > 0 ? totalDays : prev.initialPrayers.maghrib,
        isha: totalDays > 0 ? totalDays : prev.initialPrayers.isha,
      },
      remainingPrayers: {
        fajr: totalDays > 0 ? totalDays : prev.remainingPrayers.fajr,
        dhuhr: totalDays > 0 ? totalDays : prev.remainingPrayers.dhuhr,
        asr: totalDays > 0 ? totalDays : prev.remainingPrayers.asr,
        maghrib: totalDays > 0 ? totalDays : prev.remainingPrayers.maghrib,
        isha: totalDays > 0 ? totalDays : prev.remainingPrayers.isha,
      },
      initialFastingDays: fastDays > 0 ? fastDays : prev.initialFastingDays,
      remainingFastingDays: fastDays > 0 ? fastDays : prev.remainingFastingDays,
      lastUpdatedISO: new Date().toISOString(),
      historyLog: [
        {
          id: `init-${Date.now()}`,
          timestampAr: nowTimeAr,
          actionAr: `تم إعداد خطة القضاء (${toArabicNumerals(
            totalDays
          )} يوم صلاة · ${toArabicNumerals(fastDays)} يوم صيام)`,
        },
        ...prev.historyLog.slice(0, 7),
      ],
    }));

    showQadaFeedback(
      `تم اعتماد خطة القضاء بنجاح (${toArabicNumerals(
        totalDays * 5
      )} صلاة و${toArabicNumerals(fastDays)} يوم صيام)`
    );
  };

  const handleCompleteFullQadaDay = () => {
    const nowTimeAr = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setQadaState((prev) => {
      const nextRemaining = {
        fajr: Math.max(0, prev.remainingPrayers.fajr - 1),
        dhuhr: Math.max(0, prev.remainingPrayers.dhuhr - 1),
        asr: Math.max(0, prev.remainingPrayers.asr - 1),
        maghrib: Math.max(0, prev.remainingPrayers.maghrib - 1),
        isha: Math.max(0, prev.remainingPrayers.isha - 1),
      };
      return {
        ...prev,
        remainingPrayers: nextRemaining,
        lastUpdatedISO: new Date().toISOString(),
        historyLog: [
          {
            id: `day-${Date.now()}`,
            timestampAr: nowTimeAr,
            actionAr: 'إتمام قضاء يوم كامل (الفجر، الظهر، العصر، المغرب، العشاء)',
          },
          ...prev.historyLog.slice(0, 7),
        ],
      };
    });
    showQadaFeedback('تقبّل الله منك! تم خصم قضاء يوم كامل (٥ صلوات)');
  };

  const handleAdjustSingleQadaPrayer = (
    prayer: FardPrayerKey,
    delta: number
  ) => {
    const meta = FARD_PRAYERS_META.find((p) => p.key === prayer);
    const nowTimeAr = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setQadaState((prev) => {
      const nextVal = Math.max(0, prev.remainingPrayers[prayer] + delta);
      const nextInitial = Math.max(prev.initialPrayers[prayer], nextVal);
      return {
        ...prev,
        initialPrayers: {
          ...prev.initialPrayers,
          [prayer]: nextInitial,
        },
        remainingPrayers: {
          ...prev.remainingPrayers,
          [prayer]: nextVal,
        },
        historyLog:
          delta < 0
            ? [
                {
                  id: `p-${Date.now()}`,
                  timestampAr: nowTimeAr,
                  actionAr: `إتمام قضاء صلاة ${meta?.nameAr || ''}`,
                },
                ...prev.historyLog.slice(0, 7),
              ]
            : prev.historyLog,
      };
    });
  };

  const handleAdjustQadaFasting = (delta: number) => {
    const nowTimeAr = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setQadaState((prev) => {
      const nextVal = Math.max(0, prev.remainingFastingDays + delta);
      const nextInit = Math.max(prev.initialFastingDays, nextVal);
      return {
        ...prev,
        initialFastingDays: nextInit,
        remainingFastingDays: nextVal,
        historyLog:
          delta < 0
            ? [
                {
                  id: `f-${Date.now()}`,
                  timestampAr: nowTimeAr,
                  actionAr: 'إتمام قضاء يوم صيام',
                },
                ...prev.historyLog.slice(0, 7),
              ]
            : prev.historyLog,
      };
    });
  };

  // =========================================================================
  // 3. KHUSHU & SPIRITUAL RETREAT MODE (وضع الاعتكاف والخلوة الإيمانية)
  // =========================================================================
  const [selectedKhushuGoal, setSelectedKhushuGoal] =
    useState<KhushuRetreatGoalId>('quran_tadabbur');
  const [khushuDurationMinutes, setKhushuDurationMinutes] =
    useState<number>(15);
  const [khushuRemainingSeconds, setKhushuRemainingSeconds] = useState<number>(
    15 * 60
  );
  const [isKhushuRunning, setIsKhushuRunning] = useState<boolean>(false);
  const [isKhushuFullScreen, setIsKhushuFullScreen] = useState<boolean>(false);
  const [khushuSessionDhikrCount, setKhushuSessionDhikrCount] =
    useState<number>(0);
  const [khushuStats, setKhushuStats] = useState(() => loadKhushuStats());

  const activeKhushuSpec = useMemo(() => {
    return (
      KHUSHU_RETREAT_GOALS.find((g) => g.id === selectedKhushuGoal) ||
      KHUSHU_RETREAT_GOALS[0]
    );
  }, [selectedKhushuGoal]);

  useEffect(() => {
    if (!isKhushuRunning) return;
    const timer = window.setInterval(() => {
      setKhushuRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsKhushuRunning(false);
          triggerMasbahaTactileFeedback({
            soundEnabled: true,
            hapticEnabled: true,
            isMilestone: true,
          });
          setKhushuStats((old) => {
            const updated = {
              completedSessions: old.completedSessions + 1,
              totalMinutesSpent: old.totalMinutesSpent + khushuDurationMinutes,
              totalDhikrDuringRetreat: old.totalDhikrDuringRetreat,
            };
            saveKhushuStats(updated);
            return updated;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isKhushuRunning, khushuDurationMinutes]);

  const handleSelectKhushuDuration = (mins: number) => {
    setIsKhushuRunning(false);
    setKhushuDurationMinutes(mins);
    setKhushuRemainingSeconds(mins * 60);
  };

  const handleIncrementKhushuDhikr = () => {
    setKhushuSessionDhikrCount((c) => c + 1);
    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: false,
    });
    setKhushuStats((old) => {
      const updated = {
        ...old,
        totalDhikrDuringRetreat: old.totalDhikrDuringRetreat + 1,
      };
      saveKhushuStats(updated);
      return updated;
    });
  };

  const khushuMinutesDisplay = String(
    Math.floor(khushuRemainingSeconds / 60)
  ).padStart(2, '0');
  const khushuSecondsDisplay = String(khushuRemainingSeconds % 60).padStart(
    2,
    '0'
  );
  const khushuProgressPercent =
    khushuDurationMinutes > 0
      ? Math.round(
          ((khushuDurationMinutes * 60 - khushuRemainingSeconds) /
            (khushuDurationMinutes * 60)) *
            100
        )
      : 0;

  // =========================================================================
  // 4. ABANDONED SUNNAHS & DAILY PROPHETIC ETIQUETTE STATE
  // =========================================================================
  const [sunnahState, setSunnahState] = useState<PropheticSunnahTrackerState>(
    () => loadSunnahTrackerState()
  );

  useEffect(() => {
    saveSunnahTrackerState(sunnahState);
  }, [sunnahState]);

  const [selectedSunnahCategory, setSelectedSunnahCategory] =
    useState<PropheticSunnahCategoryId>('all');

  const [featuredSunnahIdx, setFeaturedSunnahIdx] = useState<number>(() => {
    const todaySunnah = getSunnahOfTheDay();
    const idx = VERIFIED_PROPHETIC_SUNNAHS.findIndex(
      (s) => s.id === todaySunnah.id
    );
    return idx >= 0 ? idx : 0;
  });

  const featuredSunnah =
    VERIFIED_PROPHETIC_SUNNAHS[featuredSunnahIdx] ||
    VERIFIED_PROPHETIC_SUNNAHS[0];

  const sunnahAnalytics = useMemo(
    () => calculateSunnahRevivalAnalytics(sunnahState, selectedDateISO),
    [sunnahState, selectedDateISO]
  );

  const filteredPropheticSunnahs = useMemo(() => {
    if (selectedSunnahCategory === 'all') return VERIFIED_PROPHETIC_SUNNAHS;
    return VERIFIED_PROPHETIC_SUNNAHS.filter(
      (item) => item.category === selectedSunnahCategory
    );
  }, [selectedSunnahCategory]);

  const handleToggleSunnahApplied = (sunnahId: string) => {
    const currentlyApplied = (
      sunnahState.appliedByDate[selectedDateISO] || []
    ).includes(sunnahId);

    setSunnahState((prev) =>
      toggleSunnahAppliedForDate(prev, selectedDateISO, sunnahId)
    );

    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: !currentlyApplied,
    });
  };

  return (
    <section
      aria-label="سجل المحاسبة اليومي والسنن النبوية وحاسبة القضاء والخلوة الإيمانية"
      data-testid="worship-and-qada-hub"
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs"
    >
      {/* Top Header & 4-Tab Sub-Navigation Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
            سجل المحاسبة اليومي والسنن النبوية والقضاء
          </h3>
          <span className="text-xs text-stone-500">
            · الفرائض والرواتب · السنن المهجورة · جدولة القضاء · خلوة الخشوع
          </span>
        </div>

        <div
          role="tablist"
          aria-label="أدوات المحاسبة والسنن والقضاء والخلوة"
          className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#F7F4EE] border border-stone-200 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            data-testid="hub-tab-tracker"
            aria-selected={activeSubSection === 'tracker'}
            onClick={() => setActiveSubSection('tracker')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubSection === 'tracker'
                ? 'bg-[#14532D] text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>سجل الصلوات والصيام</span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="hub-tab-sunnah"
            aria-selected={activeSubSection === 'sunnah'}
            onClick={() => setActiveSubSection('sunnah')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubSection === 'sunnah'
                ? 'bg-[#14532D] text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>السنن المهجورة والآداب</span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="hub-tab-qada"
            aria-selected={activeSubSection === 'qada'}
            onClick={() => setActiveSubSection('qada')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubSection === 'qada'
                ? 'bg-[#14532D] text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>حاسبة القضاء</span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="hub-tab-khushu"
            aria-selected={activeSubSection === 'khushu'}
            onClick={() => setActiveSubSection('khushu')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubSection === 'khushu'
                ? 'bg-[#14532D] text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <Moon className="w-3.5 h-3.5 shrink-0" />
            <span>خلوة الخشوع</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: DAILY & WEEKLY WORSHIP, 12 RAWATIB & FASTING TRACKER
         ===================================================================== */}
      {activeSubSection === 'tracker' && (
        <div className="space-y-5" data-testid="section-worship-tracker">
          {/* Motivational KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>إنجاز اليوم الكلي</span>
                <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              </div>
              <div className="font-tabular text-2xl font-bold text-[#14532D]">
                {toArabicNumerals(analytics.todayOverallPercent)}٪
              </div>
              <p className="text-[11px] text-stone-600">
                الفرائض: {toArabicNumerals(analytics.todayFardCompleted)}/٥ · في جماعة:{' '}
                {toArabicNumerals(analytics.todayJamaahCount)}
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-[#14532D]/25 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>السنن الرواتب اليوم</span>
                <Award className="w-4 h-4 text-[#78350F]" />
              </div>
              <div className="font-tabular text-2xl font-bold text-[#78350F]">
                {toArabicNumerals(analytics.todayRawatibRakaat)} / ١٢ ركعة
              </div>
              <p className="text-[11px] text-stone-600">
                {analytics.is12RawatibComplete
                  ? 'هنيئاً! أتممت ١٢ ركعة (بيت في الجنة بإذن الله)'
                  : `أيام إتمام الـ ١٢ ركعة: ${toArabicNumerals(
                      analytics.totalHousesInJannahCompleted
                    )}`}
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>سلسلة المواظبة</span>
                <Flame className="w-4 h-4 text-amber-600" />
              </div>
              <div className="font-tabular text-2xl font-bold text-stone-900">
                {toArabicNumerals(analytics.currentFardStreakDays)} يوم
              </div>
              <p className="text-[11px] text-stone-600">
                أيام متتالية بإتمام الصلوات الخمس كاملة
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>سجل الصيام التطوعي</span>
                <Calendar className="w-4 h-4 text-[#14532D]" />
              </div>
              <div className="font-tabular text-2xl font-bold text-stone-900">
                {toArabicNumerals(analytics.totalFastingDaysLogged)} يوم
              </div>
              <p className="text-[11px] text-stone-600">
                اليوم الهجري: {toArabicNumerals(hijriDay)} {hijriMonthNameAr}
              </p>
            </div>
          </div>

          {/* 7-Day Weekly Table / Selector */}
          <div className="bg-[#FBF9F5] border border-stone-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800">
                الجدول الأسبوعي (اختر أي يوم من الأيام السبعة لتسجيل أو مراجعة عباداتك):
              </span>
              <span className="text-[11px] font-semibold text-[#14532D]">
                التاريخ المحدد: {selectedDateISO}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {last7DaysList.map((day) => {
                const isSelected = day.offset === selectedDateOffset;
                const allFive = day.fardDone === 5;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => setSelectedDateOffset(day.offset)}
                    className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                        : allFive
                        ? 'bg-[#14532D]/10 text-stone-900 border-[#14532D]/30'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">
                      {day.dayNameAr}
                    </div>
                    <div className="font-tabular text-xs opacity-85">
                      {toArabicNumerals(day.dayNumber)}
                    </div>
                    <div
                      className={`mt-1 text-[10px] font-semibold rounded-md px-1 py-0.5 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : allFive
                          ? 'bg-[#14532D] text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {toArabicNumerals(day.fardDone)}/٥
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Five Daily Fard Prayers Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  ١. الصلوات الخمس المفروضة (سجّل أداء كل صلاة في المسجد أو في وقتها)
                </h4>
                <p className="text-xs text-stone-500">
                  «صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً» (متفق عليه)
                </p>
              </div>
              <button
                type="button"
                data-testid="mark-all-fard-mosque-btn"
                onClick={handleMarkAllFiveMosque}
                className="px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تسجيل الخمس كلها في المسجد / جماعة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              {FARD_PRAYERS_META.map((prayer) => {
                const status = currentDayRecord.fard[prayer.key];
                return (
                  <div
                    key={prayer.key}
                    data-testid={`tracker-fard-card-${prayer.key}`}
                    className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
                      status === 'mosque_jamaah'
                        ? 'bg-[#14532D]/8 border-[#14532D]'
                        : status === 'on_time'
                        ? 'bg-amber-50/70 border-amber-300'
                        : status === 'qada'
                        ? 'bg-stone-100 border-stone-300'
                        : 'bg-[#FBF9F5] border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-stone-900">
                        صلاة {prayer.nameAr}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-500">
                        {toArabicNumerals(prayer.rakaat)} ركعات
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        data-testid={`fard-${prayer.key}-mosque`}
                        onClick={() =>
                          handleSetFardStatus(prayer.key, 'mosque_jamaah')
                        }
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          status === 'mosque_jamaah'
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        في المسجد / جماعة
                      </button>

                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          data-testid={`fard-${prayer.key}-ontime`}
                          onClick={() =>
                            handleSetFardStatus(prayer.key, 'on_time')
                          }
                          className={`min-h-[30px] px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            status === 'on_time'
                              ? 'bg-[#78350F] text-white border-[#78350F]'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          في الوقت
                        </button>

                        <button
                          type="button"
                          data-testid={`fard-${prayer.key}-qada`}
                          onClick={() => handleSetFardStatus(prayer.key, 'qada')}
                          className={`min-h-[30px] px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            status === 'qada'
                              ? 'bg-stone-700 text-white border-stone-700'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          قضاء
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. The 12 Sunnah Rawatib Rakaat */}
          <div className="bg-[#FBF9F5] border border-[#14532D]/20 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#14532D]">
                  ٢. السنن الرواتب الاثنتا عشرة ركعة (بيتٌ في الجنة كل يوم)
                </h4>
                <p className="text-xs text-stone-600">
                  قال ﷺ: «مَن صلَّى في يومٍ وليلةٍ ثِنتَيْ عشرةَ ركعةً بُنيَ له بيتٌ في الجنَّة: أربعاً قبل الظهر، وركعتين بعدها، وركعتين بعد المغرب، وركعتين بعد العشاء، وركعتين قبل صلاة الفجر»
                </p>
              </div>
              <button
                type="button"
                data-testid="mark-all-12-rawatib-btn"
                onClick={handleMarkAll12Rawatib}
                className="px-3 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Award className="w-3.5 h-3.5" />
                <span>إتمام الـ ١٢ ركعة كاملة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUNNAH_RAWATIB_META.map((item) => {
                const checked = Boolean(currentDayRecord.rawatib[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    data-testid={`rawatib-toggle-${item.key}`}
                    onClick={() => handleToggleRawatib(item.key)}
                    className={`text-right p-3 rounded-xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      checked
                        ? 'bg-[#14532D] text-white border-[#14532D] shadow-2xs'
                        : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">{item.nameAr}</div>
                      <div
                        className={`text-[11px] ${
                          checked ? 'text-emerald-100' : 'text-stone-500'
                        }`}
                      >
                        {item.hadithNoteAr}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                        checked
                          ? 'bg-white text-[#14532D]'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {checked ? 'تمّت ✓' : `${toArabicNumerals(item.rakaat)} ركعة`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Nawafil (Duha, Witr, Qiyam) & Voluntary Fasting (Mon/Thu & White Days) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Nawafil */}
            <div className="bg-[#FBF9F5] border border-stone-200 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                ٣. نوافل اليوم المؤكدة (الضحى · الوتر · قيام الليل)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {EXTRA_NAFIL_META.map((nf) => {
                  const active = Boolean(currentDayRecord.nafil[nf.key]);
                  return (
                    <button
                      key={nf.key}
                      type="button"
                      data-testid={`nafil-toggle-${nf.key}`}
                      onClick={() => handleToggleNafil(nf.key)}
                      className={`p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? 'bg-[#14532D]/12 border-[#14532D] text-[#14532D] font-bold'
                          : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{nf.nameAr}</div>
                        <div className="text-[11px] text-stone-500">
                          {nf.virtueAr}
                        </div>
                      </div>
                      <span className="text-xs font-bold shrink-0">
                        {active ? 'تمّ بحمد الله ✓' : 'تسجيل'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fasting Tracker */}
            <div className="bg-[#FBF9F5] border border-stone-200 rounded-xl p-4 space-y-2.5">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                  ٤. مُتتبّع الصيام (الاثنين والخميس · الأيام البيض ١٣ و١٤ و١٥)
                </h4>
                {analytics.fastingRecommendationTodayAr ? (
                  <p className="text-xs font-bold text-[#78350F] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    {analytics.fastingRecommendationTodayAr}
                  </p>
                ) : (
                  <p className="text-xs text-stone-600">
                    «مَنْ صَامَ يَوْمًا فِي سَبِيلِ اللَّهِ بَعَّدَ اللَّهُ وَجْهَهُ عَنِ النَّارِ سَبْعِينَ خَرِيفًا»
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  {
                    id: 'monday_thursday' as FastingStatus,
                    label: 'صيام الاثنين / الخميس',
                  },
                  {
                    id: 'white_days' as FastingStatus,
                    label: 'صيام الأيام البيض (١٣-١٥)',
                  },
                  {
                    id: 'qada_fast' as FastingStatus,
                    label: 'صيام قضاء فرض',
                  },
                  {
                    id: 'voluntary' as FastingStatus,
                    label: 'صيام نافلة مطلق',
                  },
                ].map((opt) => {
                  const selected = currentDayRecord.fasting === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`fasting-btn-${opt.id}`}
                      onClick={() => handleSetFasting(opt.id)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#78350F] text-white border-[#78350F]'
                          : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {selected ? `صائم: ${opt.label} ✓` : opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 1B: ABANDONED SUNNAHS & DAILY PROPHETIC ETIQUETTE (السنن المهجورة والآداب النبوية)
         ===================================================================== */}
      {activeSubSection === 'sunnah' && (
        <div className="space-y-5" data-testid="section-prophetic-sunnahs">
          {/* Top KPI & Revival Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#FBF9F5] border border-[#14532D]/25 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>السنن المطبّقة في هذا اليوم</span>
                <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              </div>
              <div
                data-testid="sunnah-today-applied-count"
                className="font-tabular text-2xl font-bold text-[#14532D]"
              >
                {toArabicNumerals(sunnahAnalytics.todayAppliedCount)} /{' '}
                {toArabicNumerals(VERIFIED_PROPHETIC_SUNNAHS.length)} سُنّة
              </div>
              <p className="text-[11px] text-stone-600">
                «مَنْ أَحْيَا سُنَّةً مِنْ سُنَّتِي فَعَمِلَ بِهَا النَّاسُ كَانَ لَهُ مِثْلُ أَجْرِ مَنْ عَمِلَ بِهَا»
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>إجمالي السنن التي أحييتها</span>
                <Award className="w-4 h-4 text-[#78350F]" />
              </div>
              <div className="font-tabular text-2xl font-bold text-[#78350F]">
                {toArabicNumerals(sunnahAnalytics.uniqueSunnahsRevivedCount)} من{' '}
                {toArabicNumerals(VERIFIED_PROPHETIC_SUNNAHS.length)}
              </div>
              <p className="text-[11px] text-stone-600">
                سنن وآداب نبوية مختلفة طبّقتها عملياً في يومك
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>مجموع مرات تطبيق السنن</span>
                <Flame className="w-4 h-4 text-amber-600" />
              </div>
              <div className="font-tabular text-2xl font-bold text-stone-900">
                {toArabicNumerals(sunnahAnalytics.totalAppliedAllTime)} مرة
              </div>
              <p className="text-[11px] text-stone-600">
                عبر {toArabicNumerals(sunnahAnalytics.activeDaysCount)} أيام مسجّلة في المحراب
              </p>
            </div>
          </div>

          {/* Featured "سُنّة اليوم" Hero Card with Switcher */}
          <div
            data-testid="featured-sunnah-of-the-day-card"
            className="bg-gradient-to-br from-[#14532D] to-[#0E3A20] text-white rounded-2xl p-4 sm:p-6 space-y-4 border border-amber-300/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-200">
                  <span>بطاقة سُنّة اليوم المختارة</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredSunnah.categoryLabelAr}</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredSunnah.recommendedTimingAr}</span>
                </div>
                <h4 className="font-display text-lg sm:text-xl font-bold text-white">
                  {featuredSunnah.titleAr}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="cycle-next-sunnah-btn"
                  onClick={() =>
                    setFeaturedSunnahIdx(
                      (prev) => (prev + 1) % VERIFIED_PROPHETIC_SUNNAHS.length
                    )
                  }
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>سُنّة أخرى ({toArabicNumerals(featuredSunnahIdx + 1)}/{toArabicNumerals(VERIFIED_PROPHETIC_SUNNAHS.length)})</span>
                </button>

                <button
                  type="button"
                  data-testid="featured-sunnah-apply-btn"
                  onClick={() => handleToggleSunnahApplied(featuredSunnah.id)}
                  className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    sunnahAnalytics.todayAppliedIds.includes(featuredSunnah.id)
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-white text-[#14532D] hover:bg-amber-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {sunnahAnalytics.todayAppliedIds.includes(featuredSunnah.id)
                      ? 'طبّقتها اليوم ✓'
                      : 'طبّقتها اليوم'}
                  </span>
                </button>

                {onOpenDawahCard && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDawahCard(sunnahItemToDawahCardPayload(featuredSunnah))
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 border border-amber-300/30 text-amber-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>مشاركة كبطاقة (PNG)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-black/25 border border-amber-300/25 rounded-xl p-4 space-y-2">
              <p className="font-quran text-lg sm:text-xl text-amber-100 leading-relaxed">
                {featuredSunnah.hadithArabicText}
              </p>
              <p className="text-xs font-bold text-amber-300">
                الدليل ودرجة الحديث: {featuredSunnah.sourceAndGradingAr}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/10 border border-white/15 rounded-xl p-3.5 space-y-1">
                <span className="font-bold text-amber-200 block">
                  كيفية تطبيقها عملياً في اليوم:
                </span>
                <p className="text-emerald-50 leading-relaxed">
                  {featuredSunnah.practicalHowToAr}
                </p>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-3.5 space-y-1">
                <span className="font-bold text-amber-200 block">
                  الأجر والثمرة من إحيائها:
                </span>
                <p className="text-emerald-50 leading-relaxed">
                  {featuredSunnah.spiritualRewardAr}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Controls */}
          <div
            role="tablist"
            aria-label="تصنيفات السنن المهجورة والآداب النبوية"
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F7F4EE] border border-stone-200 rounded-xl"
          >
            {PROPHETIC_SUNNAH_CATEGORIES.map((cat) => {
              const isSelected = selectedSunnahCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? VERIFIED_PROPHETIC_SUNNAHS.length
                  : VERIFIED_PROPHETIC_SUNNAHS.filter((i) => i.category === cat.id)
                      .length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  data-testid={`sunnah-cat-${cat.id}`}
                  aria-selected={isSelected}
                  onClick={() => setSelectedSunnahCategory(cat.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#78350F] text-white shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {cat.labelAr} ({toArabicNumerals(count)})
                </button>
              );
            })}
          </div>

          {/* Practical Sunnah Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPropheticSunnahs.map((item, idx) => {
              const isAppliedToday = sunnahAnalytics.todayAppliedIds.includes(
                item.id
              );
              return (
                <article
                  key={item.id}
                  data-testid={`sunnah-card-${item.id}`}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-colors ${
                    isAppliedToday
                      ? 'bg-[#F3FAF5] border-[#14532D]/40'
                      : 'bg-[#FBF9F5] border-stone-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                        <span className="font-bold text-[#78350F]">
                          {toArabicNumerals(idx + 1)}. {item.categoryLabelAr}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.statusLabelAr}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.recommendedTimingAr}</span>
                      </div>
                    </div>

                    {/* Sunnah Title */}
                    <h4 className="font-display text-base font-bold text-stone-900">
                      {item.titleAr}
                    </h4>

                    {/* Authentic Hadith & Grading */}
                    <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 space-y-2">
                      <p className="font-quran text-base sm:text-lg text-stone-900 leading-relaxed">
                        {item.hadithArabicText}
                      </p>
                      <p className="text-xs font-bold text-[#78350F]">
                        {item.sourceAndGradingAr}
                      </p>
                    </div>

                    {/* Practical Application */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/80 border border-stone-200/80 rounded-lg p-3 space-y-1">
                        <span className="font-bold text-[#14532D] block">
                          كيفية تطبيقها عملياً في اليوم:
                        </span>
                        <p className="text-stone-700 leading-relaxed">
                          {item.practicalHowToAr}
                        </p>
                      </div>
                      <div className="bg-white/80 border border-stone-200/80 rounded-lg p-3 space-y-1">
                        <span className="font-bold text-[#78350F] block">
                          ثمرة إحيائها وأجرها:
                        </span>
                        <p className="text-stone-700 leading-relaxed">
                          {item.spiritualRewardAr}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80">
                    <button
                      type="button"
                      data-testid={`apply-sunnah-btn-${item.id}`}
                      onClick={() => handleToggleSunnahApplied(item.id)}
                      className={`flex-1 min-h-[40px] py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isAppliedToday
                          ? 'bg-[#14532D] text-white'
                          : 'bg-white border border-[#14532D] text-[#14532D] hover:bg-[#14532D] hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        {isAppliedToday ? 'طبّقتها اليوم ✓' : 'طبّقتها اليوم'}
                      </span>
                    </button>

                    {onOpenDawahCard && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDawahCard(sunnahItemToDawahCardPayload(item))
                        }
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#78350F]" />
                        <span>بطاقة (PNG)</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: QADA (MISSED PRAYERS & FASTING) CALCULATOR & SCHEDULER
         ===================================================================== */}
      {activeSubSection === 'qada' && (
        <div className="space-y-5" data-testid="section-qada-calculator">
          {qadaToast && (
            <div className="p-3 rounded-xl bg-[#14532D] text-white text-xs font-bold flex items-center justify-between">
              <span>{qadaToast}</span>
              <Check className="w-4 h-4" />
            </div>
          )}

          {/* Top Progress & Countdown Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#FBF9F5] border border-[#14532D]/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#14532D]">
                <span>إجمالي الصلوات المتبقية في الذمّة</span>
                <span>{toArabicNumerals(qadaProjection.prayersCompletionPercent)}٪ مكتمل</span>
              </div>
              <div
                data-testid="qada-total-remaining-prayers"
                className="font-tabular text-3xl font-bold text-stone-900"
              >
                {toArabicNumerals(qadaProjection.totalRemainingPrayers)}{' '}
                <span className="text-xs font-normal text-stone-600">صلاة</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#14532D] transition-all duration-300"
                  style={{ width: `${qadaProjection.prayersCompletionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-600">
                تم قضاء: {toArabicNumerals(qadaProjection.totalCompletedPrayers)} صلاة بحمد الله
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#78350F]">
                <span>العدّاد التنازلي وموعد إتمام القضاء</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-tabular text-2xl font-bold text-stone-900">
                {qadaProjection.estimatedDaysToFinishPrayers > 0
                  ? `${toArabicNumerals(qadaProjection.estimatedDaysToFinishPrayers)} يوم متبقٍّ`
                  : 'مكتمل بحمد الله'}
              </div>
              <p className="text-xs text-stone-700 font-semibold">
                الموعد المتوقع للختم: {qadaProjection.estimatedCompletionDateAr}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-stone-600">
                  عدد الفوائت مع كل فرض حاضر:
                </span>
                {[1, 2, 3].map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() =>
                      setQadaState((prev) => ({
                        ...prev,
                        dailyPacePerFard: pace,
                      }))
                    }
                    className={`px-2 py-0.5 rounded-md text-xs font-bold border cursor-pointer ${
                      qadaState.dailyPacePerFard === pace
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    {toArabicNumerals(pace)} فرض
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#FBF9F5] border border-stone-200 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>قضاء أيام الصيام الفائتة</span>
                <span>{toArabicNumerals(qadaProjection.fastingCompletionPercent)}٪</span>
              </div>
              <div className="font-tabular text-3xl font-bold text-[#78350F]">
                {toArabicNumerals(qadaState.remainingFastingDays)}{' '}
                <span className="text-xs font-normal text-stone-600">يوم صيام</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="qada-fasting-decrement-btn"
                  onClick={() => handleAdjustQadaFasting(-1)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold cursor-pointer"
                >
                  أتممتُ صيام يوم قضاء (-١)
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustQadaFasting(1)}
                  className="p-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 cursor-pointer"
                  aria-label="زيادة يوم صيام"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* One-Click Full Qada Day Action + Per-Prayer Counter Cards */}
          <div className="bg-[#FBF9F5] border border-stone-200 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  جدول خصم الصلوات المقضية (سجّل كل فرض تقضيه مع الفريضة الحاضرة)
                </h4>
                <p className="text-xs text-stone-600">
                  أيسر طريقة لقضاء الفوائت: صَلِّ مع كل صلاة حاضرة صلاةً مثلها مما فاتك حتى تبرأ ذمّتك بيقين
                </p>
              </div>
              <button
                type="button"
                data-testid="qada-complete-full-day-btn"
                onClick={handleCompleteFullQadaDay}
                className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>أتممتُ قضاء يوم كامل الآن (-١ من كل فرض)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {FARD_PRAYERS_META.map((prayer) => {
                const count = qadaState.remainingPrayers[prayer.key];
                return (
                  <div
                    key={prayer.key}
                    className="bg-white border border-stone-200 rounded-xl p-3 text-center space-y-2"
                  >
                    <div className="text-xs font-bold text-stone-800">
                      قضاء {prayer.nameAr}
                    </div>
                    <div
                      data-testid={`qada-remaining-${prayer.key}`}
                      className="font-tabular text-2xl font-bold text-[#14532D]"
                    >
                      {toArabicNumerals(count)}
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`qada-dec-${prayer.key}`}
                        onClick={() =>
                          handleAdjustSingleQadaPrayer(prayer.key, -1)
                        }
                        className="flex-1 py-1 px-2 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                        <span>قضيتُ فرضاً</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`qada-inc-${prayer.key}`}
                        onClick={() =>
                          handleAdjustSingleQadaPrayer(prayer.key, 1)
                        }
                        aria-label={`إضافة فرض ${prayer.nameAr}`}
                        className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculator Form to Compute Missed Duration */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-stone-900">
              حاسبة تقدير الفوائت (أدخل المدة التقريبية بالسنوات أو الأشهر أو الأيام لإنشاء الجدول التلقائي):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  عدد السنوات الفائتة:
                </label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={calcYears}
                  onChange={(e) =>
                    setCalcYears(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  عدد الأشهر الإضافية:
                </label>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={calcMonths}
                  onChange={(e) =>
                    setCalcMonths(
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  عدد الأيام الإضافية:
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={calcDays}
                  onChange={(e) =>
                    setCalcDays(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  أيام الصيام الفائتة:
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={calcFastingInput}
                  onChange={(e) =>
                    setCalcFastingInput(
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-stone-600">
                الإجمالي المحسوب:{' '}
                <strong className="text-stone-900">
                  {toArabicNumerals(
                    calcYears * 365 + calcMonths * 30 + calcDays
                  )}{' '}
                  يوم صلاة
                </strong>{' '}
                (أي{' '}
                {toArabicNumerals(
                  (calcYears * 365 + calcMonths * 30 + calcDays) * 5
                )}{' '}
                فرضاً) و
                <strong className="text-stone-900">
                  {toArabicNumerals(calcFastingInput)} يوم صيام
                </strong>
              </span>
              <button
                type="button"
                data-testid="qada-apply-calculated-plan-btn"
                onClick={handleApplyCalculatedQadaPlan}
                className="px-4 py-2 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold cursor-pointer"
              >
                حفظ واعتماد جدول القضاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: KHUSHU & SPIRITUAL RETREAT MODE (وضع الاعتكاف والخلوة الإيمانية)
         ===================================================================== */}
      {activeSubSection === 'khushu' && (
        <div
          data-testid="section-khushu-retreat"
          className={
            isKhushuFullScreen
              ? 'fixed inset-0 z-50 bg-[#0A1F13] text-white p-4 sm:p-8 overflow-y-auto flex flex-col justify-between'
              : 'rounded-2xl bg-[#0D2E1B] text-white p-5 sm:p-6 space-y-5 border-2 border-[#B59E7A]'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                وضع الاعتكاف والخلوة الإيمانية (Focus & Khushu Mode)
              </span>
              <h4 className="font-display text-lg sm:text-xl font-bold text-amber-100 mt-1">
                {activeKhushuSpec.titleAr}
              </h4>
              <p className="text-xs text-emerald-100/80">
                {activeKhushuSpec.subtitleAr}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/90 font-tabular">
                جلسات مكتملة: {toArabicNumerals(khushuStats.completedSessions)} ·{' '}
                {toArabicNumerals(khushuStats.totalMinutesSpent)} دقيقة
              </span>
              <button
                type="button"
                data-testid="khushu-fullscreen-toggle-btn"
                onClick={() => setIsKhushuFullScreen((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer"
              >
                {isKhushuFullScreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>إنهاء ملء الشاشة</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>شاشة خلوة كاملة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Goal & Duration Selectors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-amber-200">
                  ١. اختر مقصد الخلوة الإيمانية:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {KHUSHU_RETREAT_GOALS.map((goal) => {
                    const active = goal.id === selectedKhushuGoal;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setSelectedKhushuGoal(goal.id)}
                        className={`text-right px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950 border-amber-300'
                            : 'bg-white/5 text-emerald-50 border-white/15 hover:bg-white/10'
                        }`}
                      >
                        {goal.titleAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-amber-200">
                  ٢. اختر مدة مؤقّت الخشوع:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      data-testid={`khushu-duration-${mins}`}
                      onClick={() => handleSelectKhushuDuration(mins)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        khushuDurationMinutes === mins
                          ? 'bg-amber-400 text-stone-950 border-amber-300'
                          : 'bg-white/5 text-white border-white/15 hover:bg-white/10'
                      }`}
                    >
                      {toArabicNumerals(mins)} دقيقة
                    </button>
                  ))}
                </div>
              </div>

              {/* Verse & Tadabbur Box */}
              <div className="rounded-xl bg-black/25 border border-amber-300/25 p-4 space-y-2">
                <p className="font-quran text-lg sm:text-xl text-amber-200 leading-relaxed">
                  {activeKhushuSpec.verseAr}
                </p>
                <p className="text-[11px] text-amber-100/75">
                  {activeKhushuSpec.verseRefAr}
                </p>
                <p className="text-xs text-emerald-50 leading-relaxed pt-1 border-t border-white/10">
                  {activeKhushuSpec.tadabburPromptAr}
                </p>
              </div>
            </div>

            {/* Countdown Timer & Integrated Retreat Tasbih */}
            <div className="lg:col-span-5 bg-black/25 border border-amber-300/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-xs font-semibold text-amber-200">
                مؤقّت الخلوة والخشوع ({toArabicNumerals(khushuProgressPercent)}٪)
              </span>

              <div
                data-testid="khushu-timer-display"
                className="font-tabular text-5xl sm:text-6xl font-bold text-white tracking-wider"
              >
                {khushuMinutesDisplay}:{khushuSecondsDisplay}
              </div>

              <div className="flex items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  data-testid="khushu-start-pause-btn"
                  onClick={() => setIsKhushuRunning((prev) => !prev)}
                  className="flex-1 min-h-[42px] py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isKhushuRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>إيقاف مؤقت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>بدء الخلوة الإيمانية</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsKhushuRunning(false);
                    setKhushuRemainingSeconds(khushuDurationMinutes * 60);
                  }}
                  aria-label="إعادة ضبط المؤقت"
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Integrated Retreat Dhikr Counter */}
              <div className="w-full pt-3 border-t border-white/15 space-y-2">
                <p className="text-xs font-quran text-amber-100">
                  «{activeKhushuSpec.recommendedDhikrAr}»
                </p>
                <button
                  type="button"
                  data-testid="khushu-dhikr-tap-btn"
                  onClick={handleIncrementKhushuDhikr}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#15803D] border border-amber-300/40 text-white text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>اضغط للتسبيح والمناجاة في خلوتك</span>
                  <span className="font-tabular text-sm bg-black/30 px-2.5 py-0.5 rounded-lg text-amber-200">
                    {toArabicNumerals(khushuSessionDhikrCount)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
