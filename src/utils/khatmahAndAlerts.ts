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
 * Computes comprehensive Khatmah progress and daily Wird statistics
 */
export function calculateKhatmahStats(plan: KhatmahPlanState): KhatmahStatistics {
  const safeTargetDays = Math.max(1, Math.min(365, Math.round(plan.targetDays || 30)));
  const currentPage = Math.max(0, Math.min(TOTAL_MUSHAF_PAGES, Math.round(plan.currentPage || 0)));
  const remainingPages = Math.max(0, TOTAL_MUSHAF_PAGES - currentPage);
  const completionPercent = Math.min(
    100,
    Math.max(0, Math.round((currentPage / TOTAL_MUSHAF_PAGES) * 100))
  );

  const currentJuz = getJuzForPage(Math.max(1, currentPage));
  const completedJuzCount =
    currentPage >= TOTAL_MUSHAF_PAGES ? 30 : Math.max(0, Math.floor(currentPage / 20));

  const dailyTargetPages = Math.ceil(TOTAL_MUSHAF_PAGES / safeTargetDays);
  const pagesPerPrayer = Math.max(1, Math.ceil(dailyTargetPages / 5));

  const daysRemainingAtPace =
    remainingPages === 0 ? 0 : Math.ceil(remainingPages / Math.max(1, dailyTargetPages));

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

export const ALERT_SOUND_OPTIONS: AlertSoundSpec[] = [
  {
    id: 'custom_file',
    nameAr: 'الأذان الشرعي المعتمد',
    descriptionAr: 'تشغيل صوت الأذان المعتمد مباشرة عند دخول وقت الصلاة بدون إظهار اسم الملف',
    category: 'custom_audio',
    audioUrl: '/adhan.wav',
    frequenciesHz: [293.66, 440.0, 392.0, 369.99, 293.66],
    durationMs: 14000,
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
    sunnahReplyAr: 'ترديد: «اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ»',
    startRatio: 0,
    endRatio: 0.2,
  },
  {
    id: 'shahada_tawheed',
    arabicCall: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ (مَرَّتَيْنِ)',
    sunnahReplyAr: 'ترديد: «أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ»',
    startRatio: 0.2,
    endRatio: 0.38,
  },
  {
    id: 'shahada_rasul',
    arabicCall: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ (مَرَّتَيْنِ)',
    sunnahReplyAr: 'ترديد: «أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ»',
    startRatio: 0.38,
    endRatio: 0.56,
  },
  {
    id: 'hayya_salah',
    arabicCall: 'حَيَّ عَلَى الصَّلَاةِ (مَرَّتَيْنِ)',
    sunnahReplyAr: 'السنّة عند الحيعلة: «لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
    startRatio: 0.56,
    endRatio: 0.72,
  },
  {
    id: 'hayya_falah',
    arabicCall: 'حَيَّ عَلَى الْفَلَاحِ (مَرَّتَيْنِ)',
    sunnahReplyAr: 'السنّة عند الحيعلة: «لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ»',
    startRatio: 0.72,
    endRatio: 0.86,
  },
  {
    id: 'khatm_adhan',
    arabicCall: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ · لَا إِلَٰهَ إِلَّا اللَّهُ',
    sunnahReplyAr: 'ثم الصلاة على النبي ﷺ وسؤال الوسيلة له (رواه البخاري ٦١٤)',
    startRatio: 0.86,
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
