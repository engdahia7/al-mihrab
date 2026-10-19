import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Search,
  Copy,
  Check,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
} from 'lucide-react';
import {
  ADHKAR_CATEGORIES,
  AdhkarCategoryId,
  VERIFIED_ADHKAR,
  DhikrItem,
} from '../data/adhkarData';
import { toArabicNumerals } from '../data/quranData';
import {
  sanitizeQuranicText,
  CityLocation,
  VERIFIED_CITIES,
  calculateAstronomicalPrayerTimes,
} from '../utils/astronomy';
import {
  calculateSmartFajrAlarmTime,
  MASBAHA_PHRASES,
  calculateMasbahaState,
  triggerMasbahaTactileFeedback,
} from '../utils/islamicFeatures';
import {
  playAlertSoundTone,
  stopActiveAdhanAudio,
} from '../utils/soundPlayer';

const ADHKAR_PROGRESS_KEY = 'almihrab_adhkar_progress_v1';
const TASBIH_COUNT_KEY = 'almihrab_tasbih_total_v1';
const TASBIH_PREFS_KEY = 'almihrab_tasbih_prefs_v1';
const FAJR_ALARM_STORAGE_KEY = 'almihrab_smart_fajr_alarm_v1';

interface AdhkarViewProps {
  selectedCity?: CityLocation;
}

export const AdhkarView: React.FC<AdhkarViewProps> = ({
  selectedCity = VERIFIED_CITIES[0],
}) => {
  const [activeCategory, setActiveCategory] =
    useState<AdhkarCategoryId>('morning');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileFocusMode, setMobileFocusMode] = useState<'adhkar' | 'masbaha'>(
    'adhkar'
  );
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(ADHKAR_PROGRESS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Smart Fajr Alarm State
  const [fajrAlarmEnabled, setFajrAlarmEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(FAJR_ALARM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enabled === 'boolean') return parsed.enabled;
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [fajrOffsetMinutes, setFajrOffsetMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(FAJR_ALARM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.offsetMinutes === 'number')
          return parsed.offsetMinutes;
      }
    } catch {
      // ignore
    }
    return 15; // default 15 mins before Fajr
  });

  const [isFajrAlarmRinging, setIsFajrAlarmRinging] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        FAJR_ALARM_STORAGE_KEY,
        JSON.stringify({
          enabled: fajrAlarmEnabled,
          offsetMinutes: fajrOffsetMinutes,
        })
      );
    } catch {
      // ignore
    }
  }, [fajrAlarmEnabled, fajrOffsetMinutes]);

  const todayTimes = useMemo(() => {
    return calculateAstronomicalPrayerTimes(
      new Date(),
      selectedCity.latitude,
      selectedCity.longitude,
      selectedCity.timezoneOffsetHours,
      'UMM_AL_QURA',
      'STANDARD'
    );
  }, [selectedCity]);

  const smartFajrInfo = useMemo(() => {
    return calculateSmartFajrAlarmTime(todayTimes.fajr, fajrOffsetMinutes);
  }, [todayTimes.fajr, fajrOffsetMinutes]);

  const [selectedTasbihIdx, setSelectedTasbihIdx] = useState<number>(0);
  const [tasbihSessionCount, setTasbihSessionCount] = useState<number>(0);
  const [tasbihCustomTarget, setTasbihCustomTarget] = useState<number>(
    MASBAHA_PHRASES[0].defaultTarget
  );
  const [tasbihSoundEnabled, setTasbihSoundEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(TASBIH_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.soundEnabled === 'boolean') return parsed.soundEnabled;
      }
    } catch {
      // ignore
    }
    return true;
  });
  const [tasbihHapticEnabled, setTasbihHapticEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(TASBIH_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.hapticEnabled === 'boolean')
          return parsed.hapticEnabled;
      }
    } catch {
      // ignore
    }
    return true;
  });
  const [isBeadPulseActive, setIsBeadPulseActive] = useState<boolean>(false);

  const [tasbihTotalCount, setTasbihTotalCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TASBIH_COUNT_KEY);
      if (saved) return parseInt(saved, 10) || 0;
    } catch {
      // ignore
    }
    return 0;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(ADHKAR_PROGRESS_KEY, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }, [counts]);

  useEffect(() => {
    try {
      localStorage.setItem(TASBIH_COUNT_KEY, String(tasbihTotalCount));
    } catch {
      // ignore
    }
  }, [tasbihTotalCount]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TASBIH_PREFS_KEY,
        JSON.stringify({
          soundEnabled: tasbihSoundEnabled,
          hapticEnabled: tasbihHapticEnabled,
        })
      );
    } catch {
      // ignore
    }
  }, [tasbihSoundEnabled, tasbihHapticEnabled]);

  const currentCategorySpec = useMemo(() => {
    return (
      ADHKAR_CATEGORIES.find((c) => c.id === activeCategory) ||
      ADHKAR_CATEGORIES[0]
    );
  }, [activeCategory]);

  const categoryItems = useMemo(() => {
    return VERIFIED_ADHKAR.filter((item) => {
      if (item.categoryId !== activeCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        item.titleAr.includes(q) ||
        item.arabicText.includes(q) ||
        item.sourceAr.includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const categoryStats = useMemo(() => {
    const allInCat = VERIFIED_ADHKAR.filter(
      (i) => i.categoryId === activeCategory
    );
    const totalItems = allInCat.length;
    const completedItems = allInCat.filter(
      (i) => (counts[i.id] || 0) >= i.targetCount
    ).length;
    const percent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, percent };
  }, [activeCategory, counts]);

  const handleIncrementDhikr = (item: DhikrItem) => {
    setCounts((prev) => {
      const current = prev[item.id] || 0;
      if (current >= item.targetCount) return prev;
      return { ...prev, [item.id]: current + 1 };
    });
  };

  const handleResetDhikr = (id: string) => {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetCategory = () => {
    const allInCat = VERIFIED_ADHKAR.filter(
      (i) => i.categoryId === activeCategory
    );
    setCounts((prev) => {
      const next = { ...prev };
      for (const item of allInCat) {
        delete next[item.id];
      }
      return next;
    });
  };

  const handleCopyDhikr = (item: DhikrItem) => {
    const text = `${item.titleAr}\n${item.arabicText}\n— الفضل: ${item.virtueAr}\n— المصدر: ${item.sourceAr} (${item.gradingAr})`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerFajrAlarmWakeup = () => {
    playAlertSoundTone('custom_file', 'الفجر');
    setIsFajrAlarmRinging(true);
    setActiveCategory('waking');
    setMobileFocusMode('adhkar');
  };

  const handleDismissFajrAlarmAndReadWaking = () => {
    stopActiveAdhanAudio();
    setIsFajrAlarmRinging(false);
    setActiveCategory('waking');
    setMobileFocusMode('adhkar');
  };

  const currentTasbih =
    MASBAHA_PHRASES[selectedTasbihIdx] || MASBAHA_PHRASES[0];

  const masbahaState = useMemo(() => {
    return calculateMasbahaState(
      tasbihSessionCount,
      tasbihCustomTarget,
      currentTasbih
    );
  }, [tasbihSessionCount, tasbihCustomTarget, currentTasbih]);

  const handleTasbihTap = () => {
    const nextSessionCount = tasbihSessionCount + 1;
    const nextState = calculateMasbahaState(
      nextSessionCount,
      tasbihCustomTarget,
      currentTasbih
    );
    setTasbihSessionCount(nextSessionCount);
    setTasbihTotalCount((t) => t + 1);
    setIsBeadPulseActive(true);
    window.setTimeout(() => setIsBeadPulseActive(false), 160);

    triggerMasbahaTactileFeedback({
      soundEnabled: tasbihSoundEnabled,
      hapticEnabled: tasbihHapticEnabled,
      isMilestone:
        nextState.isTargetMilestoneReached || nextState.is33CycleMilestoneReached,
    });
  };

  // Precompute 33 bead coordinates around the SVG ring
  const beadCoordinates = useMemo(() => {
    const cx = 130;
    const cy = 135;
    const r = 98;
    return Array.from({ length: 33 }, (_, i) => {
      // Start slightly clockwise from the top crown (12 o'clock)
      const angleDeg = -90 + ((i + 1) / 34) * 360;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = cx + r * Math.cos(angleRad);
      const y = cy + r * Math.sin(angleRad);
      const isShahedDivider = i + 1 === 11 || i + 1 === 22 || i + 1 === 33;
      return {
        index: i,
        number: i + 1,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        isShahedDivider,
      };
    });
  }, []);

  const ringRadius = 114;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset =
    ringCircumference - (masbahaState.progressPercent / 100) * ringCircumference;

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
          الأذكار والمسبحة
        </h1>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="ابحث في الأذكار أو مصادرها"
            placeholder="ابحث في الأذكار أو الراوي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[38px] pr-9 pl-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
          />
        </div>
      </div>

      {/* Compact Fajr Alarm Bar */}
      <section
        aria-label="منبّه الفجر"
        data-testid="smart-fajr-alarm-card"
        className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#14532D]/10 text-[#14532D] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm sm:text-base font-bold text-stone-900">
                  منبّه الفجر ({smartFajrInfo.alarmTimeHHMM})
                </h2>
                <span className="text-xs text-[#14532D] font-semibold">
                  · فجر {selectedCity.nameAr}: {todayTimes.fajr}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { offset: 0, label: 'مع الأذان' },
              { offset: 15, label: 'قبل ١٥ د' },
              { offset: 30, label: 'قبل ٣٠ د' },
            ].map((opt) => (
              <button
                key={opt.offset}
                type="button"
                onClick={() => setFajrOffsetMinutes(opt.offset)}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  fajrOffsetMinutes === opt.offset
                    ? 'bg-[#14532D]/15 border-[#14532D] text-[#14532D] font-bold'
                    : 'bg-[#FBF9F5] border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setFajrAlarmEnabled((prev) => !prev)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                fajrAlarmEnabled
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-[#F7F4EE] text-stone-700 border-stone-300'
              }`}
            >
              {fajrAlarmEnabled ? 'مفعّل' : ' متوقف'}
            </button>

            <button
              type="button"
              data-testid="trigger-fajr-wakeup-btn"
              onClick={handleTriggerFajrAlarmWakeup}
              className="min-h-[34px] px-3 py-1 rounded-lg bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>
          </div>
        </div>

        {/* Active Ringing Wake-Up Modal Banner */}
        {isFajrAlarmRinging && (
          <div
            data-testid="fajr-wakeup-banner"
            className="p-4 rounded-xl bg-[#14532D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-300">
                الصلاة خيرٌ من النوم · منبّه الفجر ({smartFajrInfo.alarmTimeHHMM})
              </div>
              <p className="font-quran text-lg sm:text-xl leading-relaxed">
                «الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ»
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissFajrAlarmAndReadWaking}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-white text-[#14532D] font-bold text-xs cursor-pointer shrink-0"
            >
              إيقاف المنبّه ومتابعة أذكار الاستيقاظ
            </button>
          </div>
        )}
      </section>

      {/* Mobile Quick Mode Switcher: Adhkar Cards vs Electronic Masbaha (< lg) */}
      <div className="lg:hidden grid grid-cols-2 gap-1.5 p-1 bg-[#F7F4EE] border border-stone-200 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileFocusMode('adhkar')}
          className={`min-h-[38px] py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            mobileFocusMode === 'adhkar'
              ? 'bg-[#14532D] text-white font-semibold shadow-xs'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          أذكار اليوم والليلة
        </button>
        <button
          type="button"
          onClick={() => setMobileFocusMode('masbaha')}
          className={`min-h-[38px] py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileFocusMode === 'masbaha'
              ? 'bg-[#14532D] text-white font-semibold shadow-xs'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <span>المسبحة الإلكترونية ({tasbihTotalCount})</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="أقسام الأذكار"
        className={`${
          mobileFocusMode === 'masbaha'
            ? 'hidden lg:flex'
            : 'grid grid-cols-2 sm:flex'
        } sm:flex-wrap items-center gap-1.5 p-1.5 bg-[#F7F4EE] border border-stone-200 rounded-xl`}
      >
        {ADHKAR_CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveCategory(cat.id);
                setMobileFocusMode('adhkar');
              }}
              className={`min-h-[38px] px-2 sm:px-3.5 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer text-center leading-tight ${
                isActive
                  ? 'bg-[#14532D] text-white font-semibold shadow-xs'
                  : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
              }`}
            >
              {cat.nameAr}
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Split: Adhkar Cards (8 cols) + Electronic Masbaha Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Main 8 Cols: Active Category Adhkar List */}
        <div
          className={`${
            mobileFocusMode === 'masbaha' ? 'order-2 lg:order-1' : 'order-1'
          } lg:col-span-8 space-y-3.5`}
        >
          {/* Compact Single-Row Category Progress Bar */}
          <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                {currentCategorySpec.nameAr}
              </h2>
              <span
                className="text-xs font-semibold text-[#14532D] font-tabular"
                data-testid="adhkar-category-progress"
              >
                · أُنجز {categoryStats.completedItems} من {categoryStats.totalItems} ({categoryStats.percent}%)
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
              <div className="w-24 sm:w-32 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#14532D] transition-transform duration-200 origin-right"
                  style={{ transform: `scaleX(${categoryStats.percent / 100})` }}
                />
              </div>
              <button
                type="button"
                onClick={handleResetCategory}
                className="min-h-[32px] px-2.5 py-1 text-xs font-medium text-stone-700 bg-[#F7F4EE] hover:bg-stone-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Adhkar Cards */}
          <div className="space-y-3.5">
            {categoryItems.map((item, idx) => {
              const currentCount = counts[item.id] || 0;
              const isDone = currentCount >= item.targetCount;
              const remaining = Math.max(0, item.targetCount - currentCount);

              return (
                <article
                  key={item.id}
                  data-testid={`dhikr-card-${item.id}`}
                  className={`rounded-2xl p-4 sm:p-5 border transition-colors space-y-3.5 ${
                    isDone
                      ? 'bg-[#14532D]/5 border-[#14532D]/40'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-stone-900">
                        {toArabicNumerals(idx + 1)}. {item.titleAr}
                      </h3>
                      <span className="text-xs text-stone-500">
                        · {item.sourceAr} ({item.gradingAr})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleResetDhikr(item.id)}
                          aria-label={`إعادة ضبط عداد ${item.titleAr}`}
                          className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyDhikr(item)}
                        aria-label={`نسخ ذكر ${item.titleAr}`}
                        className="min-h-[30px] px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 bg-[#F7F4EE] rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>نُسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-stone-900 leading-[2.15] text-right">
                    {sanitizeQuranicText(item.arabicText)}
                  </p>

                  <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-stone-600">{item.virtueAr}</span>

                    <button
                      type="button"
                      onClick={() => handleIncrementDhikr(item)}
                      disabled={isDone}
                      data-testid={`dhikr-btn-${item.id}`}
                      className={`min-h-[42px] py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-between sm:justify-center gap-3 transition-colors cursor-pointer shrink-0 ${
                        isDone
                          ? 'bg-[#14532D] text-white'
                          : 'bg-[#F7F4EE] hover:bg-[#EBE6DF] active:scale-[0.99] text-stone-900 border border-stone-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>اكتمل</span>
                          </>
                        ) : (
                          <span>اضغط للعدّ (المتبقي {toArabicNumerals(remaining)})</span>
                        )}
                      </span>
                      <span className="font-tabular text-sm font-bold">
                        {currentCount} / {item.targetCount}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Upgraded Interactive Mihrab Electronic Masbaha */}
        <aside
          aria-label="المسبحة الإلكترونية"
          className={`${
            mobileFocusMode === 'masbaha' ? 'order-1 lg:order-2' : 'order-2'
          } lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 lg:sticky lg:top-20`}
        >
          {/* Top Header & Tactile Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                المسبحة المحرابية
              </h2>
              <p className="text-[11px] text-stone-500">
                ٣٣ خرزة تفاعلية مع نقرة صوتية واهتزاز لمسي
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTasbihSoundEnabled((v) => !v)}
                aria-label={
                  tasbihSoundEnabled ? 'كتم صوت خرز المسبحة' : 'تفعيل صوت خرز المسبحة'
                }
                title={tasbihSoundEnabled ? 'صوت الخرز: مفعّل' : 'صوت الخرز: صامت'}
                data-testid="masbaha-sound-toggle"
                className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  tasbihSoundEnabled
                    ? 'bg-[#14532D]/10 border-[#14532D]/30 text-[#14532D] font-semibold'
                    : 'bg-[#F7F4EE] border-stone-200 text-stone-500 hover:text-stone-800'
                }`}
              >
                {tasbihSoundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>صوت</span>
              </button>

              <button
                type="button"
                onClick={() => setTasbihHapticEnabled((v) => !v)}
                aria-label={
                  tasbihHapticEnabled ? 'إيقاف اهتزاز المسبحة' : 'تفعيل اهتزاز المسبحة'
                }
                title={tasbihHapticEnabled ? 'الاهتزاز اللمسي: مفعّل' : 'الاهتزاز اللمسي: متوقف'}
                data-testid="masbaha-haptic-toggle"
                className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  tasbihHapticEnabled
                    ? 'bg-[#78350F]/10 border-[#78350F]/30 text-[#78350F] font-semibold'
                    : 'bg-[#F7F4EE] border-stone-200 text-stone-500 hover:text-stone-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>اهتزاز</span>
              </button>

              <button
                type="button"
                onClick={() => setTasbihSessionCount(0)}
                aria-label="تصفير عداد الجلسة"
                className="min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-[#F7F4EE] hover:bg-stone-200/70 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Phrase Selector & Target Goal Bar */}
          <div className="space-y-2.5">
            <div>
              <label htmlFor="tasbih-phrase-select" className="sr-only">
                اختر صيغة الذكر المأثور
              </label>
              <select
                id="tasbih-phrase-select"
                aria-label="اختر صيغة الذكر المأثور"
                value={selectedTasbihIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const spec = MASBAHA_PHRASES[idx] || MASBAHA_PHRASES[0];
                  setSelectedTasbihIdx(idx);
                  setTasbihSessionCount(0);
                  setTasbihCustomTarget(spec.defaultTarget);
                }}
                className="w-full min-h-[38px] px-3 py-1.5 text-xs font-medium bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              >
                {MASBAHA_PHRASES.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    {p.titleAr} — ({toArabicNumerals(p.defaultTarget)})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Goal Selector */}
            <div className="flex items-center justify-between gap-2 bg-[#F7F4EE] p-1 rounded-xl border border-stone-200/80">
              <span className="text-[11px] font-medium text-stone-600 pr-2">
                هدف التسبيح:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { value: 33, label: '٣٣' },
                  { value: 100, label: '١٠٠' },
                  { value: 1000, label: '١٠٠٠' },
                  { value: 0, label: 'مفتوح' },
                ].map((goal) => {
                  const isSelected = tasbihCustomTarget === goal.value;
                  return (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => setTasbihCustomTarget(goal.value)}
                      data-testid={`masbaha-target-${goal.value}`}
                      className={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#14532D] text-white font-bold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-200/70'
                      }`}
                    >
                      {goal.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guided Post-Prayer 33x3+1 Stage Stepper (when active) */}
          {masbahaState.postPrayerStage && (
            <div
              data-testid="masbaha-post-prayer-stages"
              className="grid grid-cols-4 gap-1 p-1.5 bg-[#FBF9F5] border border-stone-200 rounded-xl text-center"
            >
              {[
                { idx: 1, title: 'سبحان الله', count: '٣٣' },
                { idx: 2, title: 'الحمد لله', count: '٣٣' },
                { idx: 3, title: 'الله أكبر', count: '٣٣' },
                { idx: 4, title: 'تمام المائة', count: '١' },
              ].map((st) => {
                const activeIdx = masbahaState.postPrayerStage?.stageIndex || 1;
                const isCurrent = st.idx === activeIdx;
                const isCompleted = st.idx < activeIdx;
                return (
                  <div
                    key={st.idx}
                    className={`py-1 px-1 rounded-lg text-[10px] transition-colors ${
                      isCurrent
                        ? 'bg-[#14532D] text-white font-bold'
                        : isCompleted
                        ? 'bg-[#14532D]/15 text-[#14532D] font-semibold'
                        : 'text-stone-500'
                    }`}
                  >
                    <div className="truncate">{st.title}</div>
                    <div className="font-tabular opacity-85">{st.count}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Dhikr Phrase & Hadith */}
          <div className="text-center space-y-1.5 px-2 pt-1">
            <p
              data-testid="masbaha-active-phrase"
              className="font-quran text-xl sm:text-2xl text-stone-900 leading-relaxed"
            >
              {masbahaState.activeDisplayPhraseAr}
            </p>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              {currentTasbih.hadithAr}
            </p>
          </div>

          {/* Interactive 33-Bead Mihrab Ring & Central Tactile Medallion */}
          <div className="relative flex flex-col items-center justify-center py-1 select-none">
            <div className="relative w-[260px] h-[268px] flex items-center justify-center">
              <svg
                viewBox="0 0 260 268"
                className="w-full h-full overflow-visible"
                data-testid="masbaha-bead-ring"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="beadEmeraldGrad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="45%" stopColor="#15803D" />
                    <stop offset="100%" stopColor="#14532D" />
                  </radialGradient>
                  <radialGradient id="beadGoldGrad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="50%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#78350F" />
                  </radialGradient>
                  <radialGradient id="beadUnlitGrad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#F5F2EB" />
                    <stop offset="65%" stopColor="#E5E0D5" />
                    <stop offset="100%" stopColor="#D6CFC2" />
                  </radialGradient>
                </defs>

                {/* Subtle Outer Progress Track */}
                <circle
                  cx="130"
                  cy="135"
                  r={ringRadius}
                  fill="none"
                  stroke="#EFECE6"
                  strokeWidth="3.5"
                />
                {/* Smooth Progress Arc toward Target */}
                <circle
                  cx="130"
                  cy="135"
                  r={ringRadius}
                  fill="none"
                  stroke={
                    masbahaState.isTargetMilestoneReached ? '#D97706' : '#14532D'
                  }
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringStrokeDashoffset}
                  transform="rotate(-90 130 135)"
                  className="transition-all duration-200"
                />

                {/* Silk Cord Track connecting the 33 Beads */}
                <circle
                  cx="130"
                  cy="135"
                  r="98"
                  fill="none"
                  stroke="#D6D0C4"
                  strokeWidth="1.75"
                  strokeDasharray="3 2"
                />

                {/* Top Mihrab Crown / Imam Minaret Bead (الشاهد الرئيسي / المنارة) */}
                <g transform="translate(130, 22)">
                  <path
                    d="M 0 -14 L 5 -4 L 4 10 L -4 10 L -5 -4 Z"
                    fill={
                      masbahaState.is33CycleMilestoneReached ||
                      masbahaState.isTargetMilestoneReached
                        ? 'url(#beadGoldGrad)'
                        : '#C7B299'
                    }
                    stroke="#78350F"
                    strokeWidth="1"
                  />
                  <circle
                    cx="0"
                    cy="-16"
                    r="2.5"
                    fill="#D97706"
                  />
                </g>

                {/* 33 Individual Tactile Masbahah Beads */}
                {beadCoordinates.map((bead) => {
                  const isLit = bead.number <= masbahaState.litBeadsCount;
                  const isCurrentActive =
                    bead.index === masbahaState.activeBeadIndex;
                  const baseRadius = bead.isShahedDivider ? 6.8 : 5.2;
                  const radius = isCurrentActive ? baseRadius + 1.6 : baseRadius;

                  const fillUrl = isLit
                    ? bead.isShahedDivider || isCurrentActive
                      ? 'url(#beadGoldGrad)'
                      : 'url(#beadEmeraldGrad)'
                    : 'url(#beadUnlitGrad)';

                  return (
                    <g key={bead.number}>
                      {isCurrentActive && (
                        <circle
                          cx={bead.x}
                          cy={bead.y}
                          r={radius + 4}
                          fill="none"
                          stroke="#D97706"
                          strokeWidth="1.5"
                          opacity="0.65"
                        />
                      )}
                      <circle
                        cx={bead.x}
                        cy={bead.y}
                        r={radius}
                        fill={fillUrl}
                        stroke={
                          isLit
                            ? bead.isShahedDivider
                              ? '#78350F'
                              : '#14532D'
                            : '#C8C1B4'
                        }
                        strokeWidth={bead.isShahedDivider ? '1.3' : '0.9'}
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Central Interactive Tactile Medallion Button */}
              <button
                type="button"
                onClick={handleTasbihTap}
                data-testid="tasbih-increment-btn"
                aria-label="سبِّح — اضغط للعدّ وتحريك خرزة المسبحة"
                className={`absolute top-[135px] left-[130px] -translate-x-1/2 -translate-y-1/2 w-[152px] h-[152px] rounded-full flex flex-col items-center justify-center text-center transition-transform duration-100 cursor-pointer select-none focus:outline-none focus:ring-4 focus:ring-[#14532D]/30 ${
                  isBeadPulseActive ? 'scale-95' : 'hover:scale-[1.02] active:scale-95'
                } ${
                  masbahaState.isTargetMilestoneReached
                    ? 'bg-gradient-to-b from-[#78350F] to-[#451A03] text-white border-4 border-amber-300/80 shadow-md'
                    : 'bg-gradient-to-b from-[#14532D] to-[#0D381E] text-white border-4 border-[#E6E0D4] shadow-sm'
                }`}
              >
                <span className="text-[10px] font-medium text-emerald-100/90 tracking-normal">
                  {masbahaState.isTargetMilestoneReached
                    ? 'تمّ الهدف بحمد الله!'
                    : masbahaState.is33CycleMilestoneReached
                    ? 'اكتملت دورة ٣٣!'
                    : 'انقر للتسبيح'}
                </span>

                <div
                  className="font-tabular text-4xl sm:text-5xl font-bold text-white leading-tight my-0.5"
                  data-testid="tasbih-session-count"
                >
                  {tasbihSessionCount}
                </div>

                <span className="text-[11px] font-semibold text-amber-200 font-tabular">
                  {toArabicNumerals(tasbihSessionCount)}{' '}
                  {tasbihCustomTarget > 0
                    ? `/ ${toArabicNumerals(tasbihCustomTarget)}`
                    : '· عدّ مفتوح'}
                </span>

                <span className="text-[10px] text-emerald-100/80 mt-0.5">
                  الخرزة {toArabicNumerals(masbahaState.litBeadsCount)} من ٣٣
                </span>
              </button>
            </div>
          </div>

          {/* Session & Total Metrics Bar + Full-Width Thumb Action */}
          <div className="space-y-3 pt-1 border-t border-stone-100">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 font-tabular">
              <span>
                دورات المسبحة (٣٣):{' '}
                <strong className="text-stone-900">
                  {toArabicNumerals(masbahaState.completedRoundsOf33)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                الإجمالي المحفوظ:{' '}
                <strong className="text-[#14532D]">{tasbihTotalCount}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleTasbihTap}
              data-testid="tasbih-auxiliary-btn"
              className="w-full min-h-[44px] py-2.5 px-5 bg-[#FBF9F5] hover:bg-[#F3EFE6] active:scale-[0.99] text-[#14532D] border border-[#14532D]/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between"
            >
              <span>سبِّح (نقر سريع بيد واحدة)</span>
              <span className="font-tabular text-stone-600">
                {masbahaState.progressPercent}% من الهدف
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
