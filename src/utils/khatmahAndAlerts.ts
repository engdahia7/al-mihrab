import { type DailyPrayerTimes, type MainPrayerKey, parseTimeHHMMToMinutes } from './astronomy.ts';

export const TOTAL_MUSHAF_PAGES = 604;
export const TOTAL_QURAN_JUZ = 30;

export interface KhatmahLogEntry {
  id: string;
  dateISO: string;
  dateLabelAr: string;
  pagesReadCount: number;
  fromPage: number;
  toPage: number;
  noteAr?: string;
}

export interface KhatmahPlanState {
  targetDays: number;
  currentPage: number; // 0 to 604
  startDateISO: string;
  targetDateISO?: string; // Optional explicit target completion date (YYYY-MM-DD)
  completedKhatmahsCount: number;
  logs: KhatmahLogEntry[];
}

export interface KhatmahStatistics {
  currentPage: number;
  pagesRead: number;
  remainingPages: number;
  pagesRemaining: number;
  completionPercent: number;
  currentJuz: number;
  completedJuzCount: number;
  dailyTargetPages: number;
  dailyTargetJuz: string;
  pagesPerPrayer: number;
  daysRemainingAtPace: number;
  estimatedDaysLeft: number;
  targetDateISO: string;
  daysUntilTargetDate: number;
  isCompleted: boolean;
  totalLoggedPagesThisWeek: number;
  statusMessageAr: string;
}

/**
 * Maps a Madinah Mushaf page number (1..604) to its Juz number (1..30)
 */
export function getJuzForPage(page: number): number {
  if (page <= 0) return 1;
  if (page >= TOTAL_MUSHAF_PAGES) return 30;
  if (page === 1) return 1;
  return Math.min(30, Math.max(1, Math.floor((page - 2) / 20) + 1));
}

/**
 * Returns the first page (1..604) of a given Juz (1..30) in the 604-page Madinah Mushaf
 */
export function getFirstPageOfJuz(juzNumber: number): number {
  const safeJuz = Math.max(1, Math.min(30, Math.round(juzNumber)));
  if (safeJuz === 1) return 1;
  return (safeJuz - 1) * 20 + 2;
}

/**
 * Returns the last page (1..604) of a given Juz (1..30) in the 604-page Madinah Mushaf
 */
export function getLastPageOfJuz(juzNumber: number): number {
  const safeJuz = Math.max(1, Math.min(30, Math.round(juzNumber)));
  if (safeJuz === 1) return 21;
  if (safeJuz === 30) return TOTAL_MUSHAF_PAGES;
  return safeJuz * 20 + 1;
}

/**
 * Computes YYYY-MM-DD target date N days from a reference YYYY-MM-DD date
 */
export function computeTargetDateISOFromDays(
  days: number,
  fromDateISO?: string
): string {
  const safeDays = Math.max(1, Math.min(365, Math.round(days || 30)));
  const baseDate = fromDateISO
    ? new Date(`${fromDateISO.slice(0, 10)}T00:00:00Z`)
    : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    const fallback = new Date(Date.now() + safeDays * 86400000);
    return fallback.toISOString().slice(0, 10);
  }
  const target = new Date(baseDate.getTime() + safeDays * 86400000);
  return target.toISOString().slice(0, 10);
}

/**
 * Computes remaining days until targetDateISO from a reference date (minimum 1 day)
 */
export function computeDaysUntilTargetDate(
  targetDateISO: string,
  fromDateISO?: string
): number {
  const todayStr = (fromDateISO || new Date().toISOString()).slice(0, 10);
  const startMs = Date.parse(`${todayStr}T00:00:00Z`);
  const endMs = Date.parse(`${targetDateISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 30;
  const diffDays = Math.ceil((endMs - startMs) / 86400000);
  return Math.max(1, Math.min(365, diffDays));
}

/**
 * Computes comprehensive Khatmah progress and daily Wird statistics
 */
export function calculateKhatmahStats(
  plan: KhatmahPlanState,
  referenceDateISO?: string
): KhatmahStatistics {
  const safeTargetDays = Math.max(1, Math.min(365, Math.round(plan.targetDays || 30)));
  const currentPage = Math.max(0, Math.min(TOTAL_MUSHAF_PAGES, Math.round(plan.currentPage || 0)));
  const remainingPages = Math.max(0, TOTAL_MUSHAF_PAGES - currentPage);
  const completionPercent = Math.min(
    100,
    Math.max(0, Math.round((currentPage / TOTAL_MUSHAF_PAGES) * 100))
  );

  const currentJuz = getJuzForPage(Math.max(1, currentPage));
  const completedJuzCount =
    currentPage >= TOTAL_MUSHAF_PAGES
      ? 30
      : currentPage >= 21
      ? Math.min(29, Math.floor((currentPage - 1) / 20))
      : 0;

  const resolvedTargetDateISO =
    plan.targetDateISO && /^\d{4}-\d{2}-\d{2}$/.test(plan.targetDateISO)
      ? plan.targetDateISO
      : computeTargetDateISOFromDays(safeTargetDays, referenceDateISO || plan.startDateISO);

  const daysUntilTargetDate = plan.targetDateISO
    ? computeDaysUntilTargetDate(plan.targetDateISO, referenceDateISO)
    : safeTargetDays;

  const dailyTargetPages = plan.targetDateISO
    ? remainingPages > 0
      ? Math.ceil(remainingPages / Math.max(1, daysUntilTargetDate))
      : Math.ceil(TOTAL_MUSHAF_PAGES / Math.max(1, daysUntilTargetDate))
    : Math.ceil(TOTAL_MUSHAF_PAGES / safeTargetDays);

  const pagesPerPrayer = Math.max(1, Math.ceil(dailyTargetPages / 5));

  const daysRemainingAtPace =
    remainingPages === 0
      ? 0
      : plan.targetDateISO
      ? daysUntilTargetDate
      : Math.ceil(remainingPages / Math.max(1, dailyTargetPages));

  const isCompleted = currentPage >= TOTAL_MUSHAF_PAGES;

  // Sum pages logged in the last 7 entries
  const totalLoggedPagesThisWeek = (plan.logs || [])
    .slice(0, 7)
    .reduce((acc, entry) => acc + Math.max(0, entry.pagesReadCount), 0);

  let statusMessageAr = '';
  if (isCompleted) {
    statusMessageAr = 'مبارك! أتممت ختم المصحف الشريف كاملاً (٦٠٤ صفحات) — تقبّل الله منك صالح الأعمال.';
  } else if (currentPage === 0) {
    statusMessageAr = `ابدأ وردك اليومي بقراءة ${dailyTargetPages} صفحة (${pagesPerPrayer} صفحات عقب كل صلاة مفروضة).`;
  } else {
    statusMessageAr = `أنجزت ${currentPage} صفحة (الجزء ${currentJuz}) · يتبقّى ${remainingPages} صفحة لإتمام الختمة خلال ${daysRemainingAtPace} يوم.`;
  }

  const dailyTargetJuz = (dailyTargetPages / 20).toFixed(1).replace(/\.0$/, '');

  return {
    currentPage,
    pagesRead: currentPage,
    remainingPages,
    pagesRemaining: remainingPages,
    completionPercent,
    currentJuz,
    completedJuzCount,
    dailyTargetPages,
    dailyTargetJuz,
    pagesPerPrayer,
    daysRemainingAtPace,
    estimatedDaysLeft: daysRemainingAtPace,
    targetDateISO: resolvedTargetDateISO,
    daysUntilTargetDate,
    isCompleted,
    totalLoggedPagesThisWeek,
    statusMessageAr,
  };
}

export type AlertSoundId =
  | 'custom_file'
  | 'adhan_makkah'
  | 'adhan_madinah'
  | 'adhan_fajr'
  | 'takbeer'
  | 'mosque_chime'
  | 'fajr_serenity'
  | 'tasbih_bell'
  | 'iqamah_pulse'
  | 'silent';

export interface AlertSoundSpec {
  id: AlertSoundId;
  nameAr: string;
  descriptionAr: string;
  category: 'custom_audio' | 'recorded_adhan' | 'acoustic_tone' | 'silent';
  audioUrl?: string;
  frequenciesHz: number[];
  durationMs: number;
}

export const PRIMARY_PINNED_ADHAN_URL =
  '/assets/aistudio/6f509ec934a4_77c9e53d.mp3';
export const PRIMARY_PINNED_ADHAN_DURATION_SEC = 132;
export const PRIMARY_PINNED_ADHAN_SIZE_BYTES = 2117341;

export const ALERT_SOUND_OPTIONS: AlertSoundSpec[] = [
  {
    id: 'custom_file',
    nameAr: 'الأذان الشرعي المعتمد',
    descriptionAr:
      'تشغيل صوت الأذان الشرعي الأساسي المثبّت في التطبيق عند دخول وقت الصلاة',
    category: 'custom_audio',
    audioUrl: PRIMARY_PINNED_ADHAN_URL,
    frequenciesHz: [293.66, 440.0, 392.0, 369.99, 293.66],
    durationMs: PRIMARY_PINNED_ADHAN_DURATION_SEC * 1000,
  },
  {
    id: 'silent',
    nameAr: 'تنبيه بصري صامت',
    descriptionAr: 'إشعار مرئي على الشاشة فقط دون إصدار صوت',
    category: 'silent',
    frequenciesHz: [],
    durationMs: 0,
  },
];

export function getSanitizedAdhanTitleAr(prayerNameAr?: string): string {
  if (prayerNameAr && prayerNameAr.trim()) {
    return `أذان صلاة ${prayerNameAr.trim()}`;
  }
  return 'الأذان الشرعي';
}

export interface AdhanPhraseStep {
  id: string;
  arabicCall: string;
  arabicText?: string;
  sunnahReplyAr: string;
  startRatio: number;
  endRatio: number;
}

export const ADHAN_PHRASES_TIMELINE: AdhanPhraseStep[] = [
  {
    id: 'takbeer_start',
    arabicCall: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ · اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ',
    arabicText: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ',
    sunnahReplyAr: 'ترديد: «اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ»',
    startRatio: 0,
    endRatio: 0.2,
  },
  {
    id: 'shahada_tawheed',
    arabicCall: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ (مَرَّتَيْنِ)',
    arabicText: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ',
    sunnahReplyAr: 'ترديد: «أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ»',
    startRatio: 0.2,
    endRatio: 0.36,
  },
  {
    id: 'shahada_rasul',
    arabicCall: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ (مَرَّتَيْنِ)',
    arabicText: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ',
    sunnahReplyAr: 'ترديد: «أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ»',
    startRatio: 0.36,
    endRatio: 0.51,
  },
  {
    id: 'hayya_salah',
    arabicCall: 'حَيَّ عَلَى الصَّلَاةِ (مَرَّتَيْنِ)',
    arabicText: 'حَيَّ عَلَى الصَّلَاةِ',
    sunnahReplyAr: 'السنّة عند الحيعلة: «لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
    startRatio: 0.51,
    endRatio: 0.68,
  },
  {
    id: 'hayya_falah',
    arabicCall: 'حَيَّ عَلَى الْفَلَاحِ (مَرَّتَيْنِ)',
    arabicText: 'حَيَّ عَلَى الْفَلَاحِ',
    sunnahReplyAr: 'السنّة عند الحيعلة: «لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
    startRatio: 0.68,
    endRatio: 0.84,
  },
  {
    id: 'khatm_adhan',
    arabicCall: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ · لَا إِلَٰهَ إِلَّا اللَّهُ',
    arabicText: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ · لَا إِلَٰهَ إِلَّا اللَّهُ',
    sunnahReplyAr: 'ثم الصلاة على النبي ﷺ وسؤال الوسيلة له (رواه البخاري ٦١٤)',
    startRatio: 0.84,
    endRatio: 1.01,
  },
];

export const DUA_AFTER_ADHAN_AR =
  '«اللَّهُمَّ رَبَّ هَٰذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»';

export const DUA_AFTER_ADHAN_SOURCE_AR =
  'صحيح البخاري (٦١٤) — قال ﷺ: «مَن قال حين يسمع النداء: اللهم رب هذه الدعوة التامة... حلّت له شفاعتي يوم القيامة»';

export function getAdhanPhraseForProgress(
  progressRatio: number,
  isFajr = false
): AdhanPhraseStep {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progressRatio) ? progressRatio : 0));
  if (isFajr && clamped >= 0.76 && clamped < 0.88) {
    return {
      id: 'tathweeb_fajr',
      arabicCall: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ (مَرَّتَيْنِ)',
      sunnahReplyAr: 'ترديد: «الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ»',
      startRatio: 0.76,
      endRatio: 0.88,
    };
  }
  const found = ADHAN_PHRASES_TIMELINE.find(
    (step) => clamped >= step.startRatio && clamped < step.endRatio
  );
  return found || ADHAN_PHRASES_TIMELINE[0];
}

export function formatAudioFileSizeAr(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 كيلوبايت';
  if (bytes < 1024 * 1024) {
    const kb = Math.max(1, Math.round(bytes / 1024));
    return `${kb} كيلوبايت`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  return `${mb} ميجابايت`;
}

export function formatAudioDurationMMSS(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.round(seconds);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export interface PrayerAlertItemConfig {
  prayerKey: MainPrayerKey;
  enabled: boolean;
  beforeMinutes: number; // 0, 5, 10, 15, 20, 30
  atAdhan: boolean;
  afterMinutes: number; // 0, 5, 10, 15, 20, 30 (Iqamah / Sunnah reminder)
  soundId: AlertSoundId;
}

export interface ComputedPrayerAlertSchedule {
  prayerKey: MainPrayerKey;
  adhanTime: string;
  preAlertTime: string | null;
  postAlertTime: string | null;
  enabled: boolean;
  soundId: AlertSoundId;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Computes the exact pre-Adhan, Adhan, and post-Adhan (Iqamah) alert times for a prayer
 */
export function computePrayerAlertTimes(
  adhanHHMM: string,
  config: PrayerAlertItemConfig
): ComputedPrayerAlertSchedule {
  const baseMinutes = parseTimeHHMMToMinutes(adhanHHMM);
  const preAlertTime =
    config.enabled && config.beforeMinutes > 0
      ? formatMinutesToHHMM(baseMinutes - config.beforeMinutes)
      : null;
  const postAlertTime =
    config.enabled && config.afterMinutes > 0
      ? formatMinutesToHHMM(baseMinutes + config.afterMinutes)
      : null;

  return {
    prayerKey: config.prayerKey,
    adhanTime: adhanHHMM,
    preAlertTime,
    postAlertTime,
    enabled: config.enabled,
    soundId: config.soundId,
  };
}

export function getDefaultPrayerAlertsConfig(): Record<MainPrayerKey, PrayerAlertItemConfig> {
  return {
    fajr: {
      prayerKey: 'fajr',
      enabled: true,
      beforeMinutes: 15,
      atAdhan: true,
      afterMinutes: 20,
      soundId: 'custom_file',
    },
    sunrise: {
      prayerKey: 'sunrise',
      enabled: true,
      beforeMinutes: 0,
      atAdhan: false,
      afterMinutes: 15, // صلاة الضحى / الإشراق بعد الشروق بـ ١٥ دقيقة
      soundId: 'custom_file',
    },
    dhuhr: {
      prayerKey: 'dhuhr',
      enabled: true,
      beforeMinutes: 10,
      atAdhan: true,
      afterMinutes: 15,
      soundId: 'custom_file',
    },
    asr: {
      prayerKey: 'asr',
      enabled: true,
      beforeMinutes: 10,
      atAdhan: true,
      afterMinutes: 15,
      soundId: 'custom_file',
    },
    maghrib: {
      prayerKey: 'maghrib',
      enabled: true,
      beforeMinutes: 5,
      atAdhan: true,
      afterMinutes: 10,
      soundId: 'custom_file',
    },
    isha: {
      prayerKey: 'isha',
      enabled: true,
      beforeMinutes: 10,
      atAdhan: true,
      afterMinutes: 15,
      soundId: 'custom_file',
    },
  };
}

/**
 * Checks if any prayer alert matches the current HH:MM time
 */
export function checkActivePrayerAlert(
  times: DailyPrayerTimes,
  configs: Record<MainPrayerKey, PrayerAlertItemConfig>,
  currentHHMM: string
): { prayerKey: MainPrayerKey; type: 'BEFORE' | 'ADHAN' | 'AFTER'; soundId: AlertSoundId } | null {
  const keys: MainPrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const key of keys) {
    const cfg = configs[key];
    if (!cfg || !cfg.enabled) continue;
    const sched = computePrayerAlertTimes(times[key], cfg);
    if (cfg.atAdhan && sched.adhanTime === currentHHMM) {
      return { prayerKey: key, type: 'ADHAN', soundId: cfg.soundId };
    }
    if (sched.preAlertTime && sched.preAlertTime === currentHHMM) {
      return { prayerKey: key, type: 'BEFORE', soundId: cfg.soundId };
    }
    if (sched.postAlertTime && sched.postAlertTime === currentHHMM) {
      return { prayerKey: key, type: 'AFTER', soundId: cfg.soundId };
    }
  }
  return null;
}

// ============================================================================
// CUSTOMIZABLE ADHKAR REMINDER SYSTEM (نظام تذكير المستخدمين بالأذكار المخصص)
// ============================================================================

export type AdhkarReminderSoundId =
  | 'mosque_chime'
  | 'fajr_serenity'
  | 'tasbih_bell'
  | 'takbeer'
  | 'custom_file'
  | 'silent';

export const ADHKAR_REMINDER_SOUND_OPTIONS: AlertSoundSpec[] = [
  {
    id: 'mosque_chime',
    nameAr: 'رنين المحراب الهادئ',
    descriptionAr: 'نغمة روحانية دافئة ومريحة لتنبيهات الأذكار والورد اليومي',
    category: 'acoustic_tone',
    frequenciesHz: [523.25, 659.25, 783.99, 1046.5],
    durationMs: 1400,
  },
  {
    id: 'fajr_serenity',
    nameAr: 'نغمة السكينة والخشوع',
    descriptionAr: 'ترددات صوتية هادئة تبعث على الطمأنينة وتذكّر بالله',
    category: 'acoustic_tone',
    frequenciesHz: [392.0, 493.88, 587.33, 783.99],
    durationMs: 1600,
  },
  {
    id: 'tasbih_bell',
    nameAr: 'جرس التسبيح اللطيف',
    descriptionAr: 'تنبيه قصير وخفيف مناسب للتذكير الدوري المتكرر بالاستغفار والتسبيح',
    category: 'acoustic_tone',
    frequenciesHz: [659.25, 880.0, 1046.5],
    durationMs: 900,
  },
  {
    id: 'takbeer',
    nameAr: 'نغمة التكبير الإيمانية',
    descriptionAr: 'نغمة وقورة مستوحاة من مقامات التذكير الشرعي',
    category: 'acoustic_tone',
    frequenciesHz: [293.66, 369.99, 440.0, 587.33],
    durationMs: 1800,
  },
  {
    id: 'custom_file',
    nameAr: 'صوت الأذان الشرعي المعتمد',
    descriptionAr: 'تشغيل صوت الأذان الشرعي الأساسي المثبّت في التطبيق',
    category: 'custom_audio',
    audioUrl: PRIMARY_PINNED_ADHAN_URL,
    frequenciesHz: [293.66, 440.0, 392.0, 369.99, 293.66],
    durationMs: PRIMARY_PINNED_ADHAN_DURATION_SEC * 1000,
  },
  {
    id: 'silent',
    nameAr: 'تنبيه بصري صامت',
    descriptionAr: 'إشعار مرئي على الشاشة دون إصدار صوت',
    category: 'silent',
    frequenciesHz: [],
    durationMs: 0,
  },
];

export interface SelectableReminderDhikrOption {
  id: string;
  titleAr: string;
  dhikrTextAr: string;
  virtueBriefAr: string;
  categoryId: string;
}

export const REMINDER_SELECTABLE_ADHKAR: SelectableReminderDhikrOption[] = [
  {
    id: 'rem-subhanallah',
    titleAr: 'التسبيح والتحميد',
    dhikrTextAr: '«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ»',
    virtueBriefAr: 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن',
    categoryId: 'morning',
  },
  {
    id: 'rem-istighfar',
    titleAr: 'الاستغفار والتوبة',
    dhikrTextAr:
      '«أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ»',
    virtueBriefAr: 'من قالها غُفر له وإن كان فرّ من الزحف',
    categoryId: 'morning',
  },
  {
    id: 'rem-salawat',
    titleAr: 'الصلاة على النبي ﷺ',
    dhikrTextAr: '«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
    virtueBriefAr: 'من صلّى عليّ صلاةً واحدة صلّى الله عليه بها عشراً',
    categoryId: 'morning',
  },
  {
    id: 'rem-hawqalah',
    titleAr: 'الحوقلة (لا حول ولا قوة إلا بالله)',
    dhikrTextAr: '«لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ»',
    virtueBriefAr: 'كنزٌ من كنوز الجنة وبابٌ من أبواب الفرج والإعانة',
    categoryId: 'morning',
  },
  {
    id: 'rem-tahlil',
    titleAr: 'التهليل والتوحيد الجامع',
    dhikrTextAr:
      '«لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ»',
    virtueBriefAr: 'أفضل ما قاله النبي ﷺ والنبيون من قبله وحرزٌ من الشيطان',
    categoryId: 'morning',
  },
  {
    id: 'rem-morning-wird',
    titleAr: 'وِرد أذكار الصباح',
    dhikrTextAr:
      '«أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ»',
    virtueBriefAr: 'حفظٌ وبركةٌ وانشراح صدر في مستهل اليوم',
    categoryId: 'morning',
  },
  {
    id: 'rem-evening-wird',
    titleAr: 'وِرد أذكار المساء',
    dhikrTextAr:
      '«أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ»',
    virtueBriefAr: 'تحصينٌ وسكينةٌ في ختام النهار وإقبال الليل',
    categoryId: 'evening',
  },
  {
    id: 'rem-yunus',
    titleAr: 'دعاء ذي النون لتفريج الكرب',
    dhikrTextAr: '«لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ»',
    virtueBriefAr: 'لم يدعُ بها رجلٌ مسلم في شيء قط إلا استجاب الله له',
    categoryId: 'evening',
  },
  {
    id: 'rem-hasbi',
    titleAr: 'ذكر الكفاية والتوكل',
    dhikrTextAr:
      '«حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ»',
    virtueBriefAr: 'من قالها كفاه الله ما أهمّه من أمر الدنيا والآخرة',
    categoryId: 'morning',
  },
  {
    id: 'rem-sleep-wird',
    titleAr: 'وِرد أذكار النوم والسكينة',
    dhikrTextAr: '«بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ، إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا»',
    virtueBriefAr: 'حفظُ الملائكة للعبد حتى يصبح وختم اليوم بذكر الله',
    categoryId: 'sleep',
  },
];

export type AdhkarReminderScheduleMode = 'specific_times' | 'interval';

export interface AdhkarReminderScheduleConfig {
  enabled: boolean;
  selectedDhikrIds: string[];
  scheduleMode: AdhkarReminderScheduleMode;
  specificTimesHHMM: string[]; // e.g. ['06:30', '13:30', '17:30', '21:30']
  intervalMinutes: number; // e.g. 15, 30, 60, 120, 240
  soundId: AdhkarReminderSoundId;
}

export const ADHKAR_REMINDERS_STORAGE_KEY = 'almihrab_custom_adhkar_reminders_v1';

export function getDefaultAdhkarRemindersConfig(): AdhkarReminderScheduleConfig {
  return {
    enabled: true,
    selectedDhikrIds: [
      'rem-subhanallah',
      'rem-istighfar',
      'rem-salawat',
      'rem-hawqalah',
      'rem-morning-wird',
      'rem-evening-wird',
    ],
    scheduleMode: 'specific_times',
    specificTimesHHMM: ['07:00', '13:30', '17:30', '21:30'],
    intervalMinutes: 60,
    soundId: 'mosque_chime',
  };
}

export function loadAdhkarRemindersConfig(): AdhkarReminderScheduleConfig {
  const defaults = getDefaultAdhkarRemindersConfig();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(ADHKAR_REMINDERS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
      selectedDhikrIds:
        Array.isArray(parsed.selectedDhikrIds) && parsed.selectedDhikrIds.length > 0
          ? parsed.selectedDhikrIds
          : defaults.selectedDhikrIds,
      scheduleMode:
        parsed.scheduleMode === 'interval' || parsed.scheduleMode === 'specific_times'
          ? parsed.scheduleMode
          : defaults.scheduleMode,
      specificTimesHHMM:
        Array.isArray(parsed.specificTimesHHMM) && parsed.specificTimesHHMM.length > 0
          ? parsed.specificTimesHHMM
          : defaults.specificTimesHHMM,
      intervalMinutes:
        typeof parsed.intervalMinutes === 'number' && parsed.intervalMinutes >= 5
          ? parsed.intervalMinutes
          : defaults.intervalMinutes,
      soundId: parsed.soundId || defaults.soundId,
    };
  } catch {
    return defaults;
  }
}

export function saveAdhkarRemindersConfig(
  config: AdhkarReminderScheduleConfig
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADHKAR_REMINDERS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Evaluates whether an Adhkar reminder should fire at the given HH:MM time,
 * returning the selected Dhikr item, schedule explanation, and customized soundId.
 */
export function evaluateAdhkarReminderForMinute(
  config: AdhkarReminderScheduleConfig,
  currentHHMM: string,
  rotationSeed = 0
): {
  dhikr: SelectableReminderDhikrOption;
  triggerReasonAr: string;
  soundId: AdhkarReminderSoundId;
} | null {
  if (!config.enabled) return null;

  const activeItems = REMINDER_SELECTABLE_ADHKAR.filter((item) =>
    config.selectedDhikrIds.includes(item.id)
  );
  const pool =
    activeItems.length > 0 ? activeItems : [REMINDER_SELECTABLE_ADHKAR[0]];

  const totalMin = parseTimeHHMMToMinutes(currentHHMM);

  if (config.scheduleMode === 'specific_times') {
    const matchedIdx = config.specificTimesHHMM.indexOf(currentHHMM);
    if (matchedIdx === -1) return null;
    const chosen = pool[(matchedIdx + rotationSeed) % pool.length];
    return {
      dhikr: chosen,
      triggerReasonAr: `تذكير الأذكار المجدول عند الساعة ${currentHHMM}`,
      soundId: config.soundId,
    };
  }

  // Interval mode (every N minutes)
  const safeInterval = Math.max(5, Math.min(720, Math.round(config.intervalMinutes || 60)));
  if (totalMin % safeInterval !== 0) return null;
  const slotIndex = Math.floor(totalMin / safeInterval) + rotationSeed;
  const chosen = pool[slotIndex % pool.length];
  return {
    dhikr: chosen,
    triggerReasonAr: `تذكير الأذكار الدوري (كل ${safeInterval} دقيقة)`,
    soundId: config.soundId,
  };
}

