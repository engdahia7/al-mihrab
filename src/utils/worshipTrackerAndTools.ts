import { toArabicNumerals } from './astronomy';
import type { DawahShareCardPayload } from './dawahShareCards';

// ============================================================================
// 1. DAILY WORSHIP, SUNNAH RAWATIB (12 RAKAAT) & FASTING TRACKER
// ============================================================================

export type FardPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type FardPrayerStatus = 'none' | 'mosque_jamaah' | 'on_time' | 'qada';

export type SunnahRawatibKey =
  | 'fajr_pre_2'      // ٢ قبل الفجر
  | 'dhuhr_pre_2_a'   // ٢ قبل الظهر (الأولى)
  | 'dhuhr_pre_2_b'   // ٢ قبل الظهر (الثانية)
  | 'dhuhr_post_2'    // ٢ بعد الظهر
  | 'maghrib_post_2'  // ٢ بعد المغرب
  | 'isha_post_2';    // ٢ بعد العشاء

export type ExtraNafilKey = 'duha' | 'witr' | 'qiyam';

export type FastingStatus = 'none' | 'monday_thursday' | 'white_days' | 'qada_fast' | 'voluntary';

export interface DailyWorshipRecord {
  dateISO: string; // YYYY-MM-DD
  fard: Record<FardPrayerKey, FardPrayerStatus>;
  rawatib: Record<SunnahRawatibKey, boolean>;
  nafil: Record<ExtraNafilKey, boolean>;
  fasting: FastingStatus;
}

export const WORSHIP_TRACKER_STORAGE_KEY = 'almihrab_worship_tracker_v1';

export const FARD_PRAYERS_META: {
  key: FardPrayerKey;
  nameAr: string;
  rakaat: number;
}[] = [
  { key: 'fajr', nameAr: 'الفجر', rakaat: 2 },
  { key: 'dhuhr', nameAr: 'الظهر', rakaat: 4 },
  { key: 'asr', nameAr: 'العصر', rakaat: 4 },
  { key: 'maghrib', nameAr: 'المغرب', rakaat: 3 },
  { key: 'isha', nameAr: 'العشاء', rakaat: 4 },
];

export const SUNNAH_RAWATIB_META: {
  key: SunnahRawatibKey;
  nameAr: string;
  rakaat: number;
  timingAr: string;
  hadithNoteAr: string;
}[] = [
  {
    key: 'fajr_pre_2',
    nameAr: 'ركعتا الفجر (الراتبة القبلية)',
    rakaat: 2,
    timingAr: 'قبل صلاة الفجر',
    hadithNoteAr: '«رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا» (رواه مسلم)',
  },
  {
    key: 'dhuhr_pre_2_a',
    nameAr: 'ركعتان قبل الظهر (الأولى)',
    rakaat: 2,
    timingAr: 'قبل صلاة الظهر',
    hadithNoteAr: 'من الأربع القبلية المؤكدة قبل الظهر',
  },
  {
    key: 'dhuhr_pre_2_b',
    nameAr: 'ركعتان قبل الظهر (الثانية)',
    rakaat: 2,
    timingAr: 'قبل صلاة الظهر',
    hadithNoteAr: 'تُتمّ أربع ركعات قبل الظهر',
  },
  {
    key: 'dhuhr_post_2',
    nameAr: 'ركعتان بعد الظهر',
    rakaat: 2,
    timingAr: 'بعد صلاة الظهر',
    hadithNoteAr: 'من السنن الرواتب المؤكدة بعد الظهر',
  },
  {
    key: 'maghrib_post_2',
    nameAr: 'ركعتان بعد المغرب',
    rakaat: 2,
    timingAr: 'بعد صلاة المغرب',
    hadithNoteAr: 'راتبة المغرب البعدية المؤكدة',
  },
  {
    key: 'isha_post_2',
    nameAr: 'ركعتان بعد العشاء',
    rakaat: 2,
    timingAr: 'بعد صلاة العشاء',
    hadithNoteAr: 'تُتمّ اثنتي عشرة ركعة في اليوم والليلة',
  },
];

export const EXTRA_NAFIL_META: {
  key: ExtraNafilKey;
  nameAr: string;
  virtueAr: string;
}[] = [
  {
    key: 'duha',
    nameAr: 'صلاة الضحى (صلاة الأوابين)',
    virtueAr: 'تُجزئ عن ٣٦٠ صدقة عن كل مَفصل في الجسد (صحيح مسلم)',
  },
  {
    key: 'witr',
    nameAr: 'صلاة الوتر',
    virtueAr: '«اجْعَلُوا آخِرَ صَلَاتِكُمْ بِاللَّيْلِ وِتْرًا» (متفق عليه)',
  },
  {
    key: 'qiyam',
    nameAr: 'قيام الليل / التهجد',
    virtueAr: 'أفضل الصلاة بعد الفريضة صلاة الليل (صحيح مسلم)',
  },
];

export function formatDateKeyISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createEmptyDailyWorshipRecord(dateISO: string): DailyWorshipRecord {
  return {
    dateISO,
    fard: {
      fajr: 'none',
      dhuhr: 'none',
      asr: 'none',
      maghrib: 'none',
      isha: 'none',
    },
    rawatib: {
      fajr_pre_2: false,
      dhuhr_pre_2_a: false,
      dhuhr_pre_2_b: false,
      dhuhr_post_2: false,
      maghrib_post_2: false,
      isha_post_2: false,
    },
    nafil: {
      duha: false,
      witr: false,
      qiyam: false,
    },
    fasting: 'none',
  };
}

export function loadWorshipRecords(): Record<string, DailyWorshipRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WORSHIP_TRACKER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveWorshipRecords(records: Record<string, DailyWorshipRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WORSHIP_TRACKER_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export interface WorshipAnalyticsSummary {
  todayFardCompleted: number;
  todayJamaahCount: number;
  todayRawatibRakaat: number; // out of 12
  is12RawatibComplete: boolean;
  todayOverallPercent: number;
  currentFardStreakDays: number;
  totalHousesInJannahCompleted: number; // days where all 12 rawatib were completed
  totalFastingDaysLogged: number;
   fastingRecommendationTodayAr: string | null;
}

export function calculateWorshipAnalytics(
  records: Record<string, DailyWorshipRecord>,
  todayDate: Date,
  hijriDay: number
): WorshipAnalyticsSummary {
  const todayISO = formatDateKeyISO(todayDate);
  const todayRec = records[todayISO] || createEmptyDailyWorshipRecord(todayISO);

  const fardStatuses = Object.values(todayRec.fard);
  const todayFardCompleted = fardStatuses.filter((s) => s !== 'none').length;
  const todayJamaahCount = fardStatuses.filter((s) => s === 'mosque_jamaah').length;

  let todayRawatibRakaat = 0;
  for (const item of SUNNAH_RAWATIB_META) {
    if (todayRec.rawatib[item.key]) {
      todayRawatibRakaat += item.rakaat;
    }
  }
  const is12RawatibComplete = todayRawatibRakaat >= 12;

  const nafilCount = Object.values(todayRec.nafil).filter(Boolean).length;
  // Score: 5 fard (60%) + 6 rawatib units (30%) + nafil (10%)
  const fardScore = (todayFardCompleted / 5) * 60;
  const rawatibScore = (todayRawatibRakaat / 12) * 30;
  const nafilScore = (nafilCount / 3) * 10;
  const todayOverallPercent = Math.min(
    100,
    Math.round(fardScore + rawatibScore + nafilScore)
  );

  // Calculate streak of consecutive days with all 5 fard prayers logged
  let currentFardStreakDays = 0;
  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - offset);
    const key = formatDateKeyISO(d);
    const rec = records[key];
    const allFiveDone =
      rec && Object.values(rec.fard).every((status) => status !== 'none');
    if (allFiveDone) {
      currentFardStreakDays += 1;
    } else if (offset === 0) {
      // If today isn't finished yet, check if yesterday had a streak
      continue;
    } else {
      break;
    }
  }

  let totalHousesInJannahCompleted = 0;
  let totalFastingDaysLogged = 0;
  for (const rec of Object.values(records)) {
    const rakaat = SUNNAH_RAWATIB_META.reduce(
      (acc, m) => acc + (rec.rawatib?.[m.key] ? m.rakaat : 0),
      0
    );
    if (rakaat >= 12) totalHousesInJannahCompleted += 1;
    if (rec.fasting && rec.fasting !== 'none') totalFastingDaysLogged += 1;
  }

  const dayOfWeek = todayDate.getDay(); // 1 = Monday, 4 = Thursday
  const isWhiteDay = hijriDay === 13 || hijriDay === 14 || hijriDay === 15;
  let fastingRecommendationTodayAr: string | null = null;
  if (isWhiteDay && (dayOfWeek === 1 || dayOfWeek === 4)) {
    fastingRecommendationTodayAr = `اليوم يجتمع فيه فضل صيام ${
      dayOfWeek === 1 ? 'يوم الاثنين' : 'يوم الخميس'
    } مع الأيام البيض (${toArabicNumerals(hijriDay)} من الشهر الهجري)`;
  } else if (isWhiteDay) {
    fastingRecommendationTodayAr = `اليوم من الأيام البيض المباركة (${toArabicNumerals(
      hijriDay
    )} من الشهر الهجري) — يُستحب صيامه`;
  } else if (dayOfWeek === 1) {
    fastingRecommendationTodayAr =
      'اليوم يوم الاثنين — تُعرض فيه الأعمال على الله فكان النبي ﷺ يتحرّى صيامه';
  } else if (dayOfWeek === 4) {
    fastingRecommendationTodayAr =
      'اليوم يوم الخميس — تُعرض فيه الأعمال على الله فكان النبي ﷺ يتحرّى صيامه';
  }

  return {
    todayFardCompleted,
    todayJamaahCount,
    todayRawatibRakaat,
    is12RawatibComplete,
    todayOverallPercent,
    currentFardStreakDays,
    totalHousesInJannahCompleted,
    totalFastingDaysLogged,
    fastingRecommendationTodayAr,
  };
}

// ============================================================================
// 2. QADA (MISSED PRAYERS & FASTING) CALCULATOR & GRADUAL SCHEDULER
// ============================================================================

export interface QadaTrackerState {
  initialPrayers: Record<FardPrayerKey, number>;
  remainingPrayers: Record<FardPrayerKey, number>;
  initialFastingDays: number;
  remainingFastingDays: number;
  dailyPacePerFard: number; // how many missed prayers performed with each daily fard prayer (1, 2, 3...)
  weeklyFastingPace: number; // how many missed fasts performed per week (e.g. 2 for Mon/Thu)
  lastUpdatedISO: string;
  historyLog: {
    id: string;
    timestampAr: string;
    actionAr: string;
  }[];
}

export const QADA_STORAGE_KEY = 'almihrab_qada_calculator_v1';

export function getDefaultQadaTrackerState(): QadaTrackerState {
  return {
    initialPrayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    remainingPrayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    initialFastingDays: 0,
    remainingFastingDays: 0,
    dailyPacePerFard: 1,
    weeklyFastingPace: 2,
    lastUpdatedISO: new Date().toISOString(),
    historyLog: [],
  };
}

export function loadQadaTrackerState(): QadaTrackerState {
  if (typeof window === 'undefined') return getDefaultQadaTrackerState();
  try {
    const raw = localStorage.getItem(QADA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.remainingPrayers) {
        return {
          ...getDefaultQadaTrackerState(),
          ...parsed,
        };
      }
    }
  } catch {
    // ignore
  }
  return getDefaultQadaTrackerState();
}

export function saveQadaTrackerState(state: QadaTrackerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QADA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export interface QadaScheduleProjection {
  totalInitialPrayers: number;
  totalRemainingPrayers: number;
  totalCompletedPrayers: number;
  prayersCompletionPercent: number;
  estimatedDaysToFinishPrayers: number;
  estimatedCompletionDateAr: string;
  fastingCompletedDays: number;
  fastingCompletionPercent: number;
  estimatedWeeksToFinishFasting: number;
}

export function calculateQadaProjection(
  state: QadaTrackerState,
  referenceDate: Date = new Date()
): QadaScheduleProjection {
  const totalInitialPrayers = Object.values(state.initialPrayers).reduce(
    (a, b) => a + Math.max(0, b),
    0
  );
  const totalRemainingPrayers = Object.values(state.remainingPrayers).reduce(
    (a, b) => a + Math.max(0, b),
    0
  );
  const effectiveInitial = Math.max(totalInitialPrayers, totalRemainingPrayers);
  const totalCompletedPrayers = Math.max(0, effectiveInitial - totalRemainingPrayers);
  const prayersCompletionPercent =
    effectiveInitial > 0
      ? Math.min(100, Math.round((totalCompletedPrayers / effectiveInitial) * 100))
      : 100;

  // Max remaining among the 5 prayers dictates how many days at `dailyPacePerFard` per prayer
  const maxSinglePrayerRemaining = Math.max(
    0,
    ...Object.values(state.remainingPrayers)
  );
  const pace = Math.max(1, state.dailyPacePerFard);
  const estimatedDaysToFinishPrayers =
    maxSinglePrayerRemaining > 0 ? Math.ceil(maxSinglePrayerRemaining / pace) : 0;

  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + estimatedDaysToFinishPrayers);
  let estimatedCompletionDateAr = 'تم إتمام القضاء بحمد الله';
  if (estimatedDaysToFinishPrayers > 0) {
    try {
      estimatedCompletionDateAr = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(targetDate);
    } catch {
      estimatedCompletionDateAr = `بعد ${toArabicNumerals(estimatedDaysToFinishPrayers)} يوماً`;
    }
  }

  const effectiveInitialFasting = Math.max(
    state.initialFastingDays,
    state.remainingFastingDays
  );
  const fastingCompletedDays = Math.max(
    0,
    effectiveInitialFasting - state.remainingFastingDays
  );
  const fastingCompletionPercent =
    effectiveInitialFasting > 0
      ? Math.min(
          100,
          Math.round((fastingCompletedDays / effectiveInitialFasting) * 100)
        )
      : 100;
  const weeklyPace = Math.max(1, state.weeklyFastingPace);
  const estimatedWeeksToFinishFasting =
    state.remainingFastingDays > 0
      ? Math.ceil(state.remainingFastingDays / weeklyPace)
      : 0;

  return {
    totalInitialPrayers: effectiveInitial,
    totalRemainingPrayers,
    totalCompletedPrayers,
    prayersCompletionPercent,
    estimatedDaysToFinishPrayers,
    estimatedCompletionDateAr,
    fastingCompletedDays,
    fastingCompletionPercent,
    estimatedWeeksToFinishFasting,
  };
}

// ============================================================================
// 3. COMPLETE RUQYAH SHAR'IYYAH & SLEEP/WAKING AUDIO + COUNTER DATA
// ============================================================================

export interface RuqyahVerseAudio {
  labelAr: string;
  textAr: string;
  audioUrl: string;
}

export interface RuqyahItem {
  id: string;
  category: 'ruqyah_quran' | 'ruqyah_sunnah' | 'sleep_tahseen';
  mushafOrderBadgeAr?: string;
  titleAr: string;
  arabicText: string;
  recommendedCount: number;
  virtueAndMethodAr: string;
  sourceAr: string;
  /** First verse audio URL (kept for backward compatibility) */
  audioUrl?: string;
  /** Complete ordered list of all verse audio URLs for full sequential recitation */
  audioUrls?: string[];
  /** Individual ordered verses with text and audio for live verse highlighting */
  verses?: RuqyahVerseAudio[];
}

export const VERIFIED_RUQYAH_AND_SLEEP_ITEMS: RuqyahItem[] = [
  {
    id: 'ruq-fatihah',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '١ · سورة الفاتحة (١ : ١-٧)',
    titleAr: 'سورة الفاتحة كاملة (الكافية الشافية)',
    arabicText:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
    recommendedCount: 7,
    virtueAndMethodAr:
      'أعظم سورة في القرآن وهي الرقية التامة؛ قال النبي ﷺ للصحابي الذي رقى بها اللديغ فبرأ: «وَمَا يُدْرِيكَ أَنَّهَا رُقْيَةٌ؟»',
    sourceAr: 'سورة الفاتحة كاملة: الآيات ١-٧ — متفق عليه (البخاري ٢٢٧٦، مسلم ٢٢٠١)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001005.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001006.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/001007.mp3',
    ],
    verses: [
      {
        labelAr: 'الفاتحة: ١',
        textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
      },
      {
        labelAr: 'الفاتحة: ٢',
        textAr: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001002.mp3',
      },
      {
        labelAr: 'الفاتحة: ٣',
        textAr: 'الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001003.mp3',
      },
      {
        labelAr: 'الفاتحة: ٤',
        textAr: 'مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001004.mp3',
      },
      {
        labelAr: 'الفاتحة: ٥',
        textAr: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001005.mp3',
      },
      {
        labelAr: 'الفاتحة: ٦',
        textAr: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001006.mp3',
      },
      {
        labelAr: 'الفاتحة: ٧',
        textAr: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001007.mp3',
      },
    ],
  },
  {
    id: 'ruq-baqarah-start',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٢ · فواتح سورة البقرة (٢ : ١-٥)',
    titleAr: 'فواتح سورة البقرة (الآيات ١ - ٥)',
    arabicText:
      'الم ﴿١﴾ ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ ﴿٢﴾ الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ ﴿٣﴾ وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ ﴿٤﴾ أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ ﴿٥﴾',
    recommendedCount: 1,
    virtueAndMethodAr:
      'فواتح سورة البقرة التي قال فيها النبي ﷺ: «اقرؤوا سورة البقرة، فإن أخذها بركة، وتركها حسرة، ولا تستطيعها البطلة».',
    sourceAr: 'سورة البقرة: الآيات ١-٥ — رواه مسلم (٨٠٤)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/002001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002005.mp3',
    ],
    verses: [
      {
        labelAr: 'البقرة: ١',
        textAr: 'الم ﴿١﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002001.mp3',
      },
      {
        labelAr: 'البقرة: ٢',
        textAr: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ ﴿٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002002.mp3',
      },
      {
        labelAr: 'البقرة: ٣',
        textAr: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ ﴿٣﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002003.mp3',
      },
      {
        labelAr: 'البقرة: ٤',
        textAr: 'وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ ﴿٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002004.mp3',
      },
      {
        labelAr: 'البقرة: ٥',
        textAr: 'أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ ﴿٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002005.mp3',
      },
    ],
  },
  {
    id: 'ruq-kursi',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٣ · آية الكرسي — البقرة (٢ : ٢٥٥)',
    titleAr: 'آية الكرسي (أعظم آية في كتاب الله)',
    arabicText:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ ﴿٢٥٥﴾',
    recommendedCount: 3,
    virtueAndMethodAr:
      'حِرز عظيم من الشياطين والعين والأذى؛ من قرأها عند نومه لم يزل عليه من الله حافظ ولا يقربه شيطان حتى يصبح.',
    sourceAr: 'سورة البقرة: الآية ٢٥٥ — صحيح البخاري (٢٣١١)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
    audioUrls: ['https://everyayah.com/data/Alafasy_128kbps/002255.mp3'],
    verses: [
      {
        labelAr: 'البقرة: ٢٥٥',
        textAr:
          'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ ﴿٢٥٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
      },
    ],
  },
  {
    id: 'ruq-baqarah-end',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٤ · خواتيم سورة البقرة (٢ : ٢٨٥-٢٨٦)',
    titleAr: 'خواتيم سورة البقرة كاملة (الآيتان ٢٨٥ - ٢٨٦)',
    arabicText:
      'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ﴿٢٨٥﴾ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ ﴿٢٨٦﴾',
    recommendedCount: 1,
    virtueAndMethodAr:
      'قال النبي ﷺ: «مَن قرأ بالآيتين من آخر سورة البقرة في ليلةٍ كَفَتاهُ» أي كفتاه من كل سوء وآفة.',
    sourceAr: 'سورة البقرة: الآيتان ٢٨٥-٢٨٦ — متفق عليه (البخاري ٥٠٠٩، مسلم ٨٠٨)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002285.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/002285.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002286.mp3',
    ],
    verses: [
      {
        labelAr: 'البقرة: ٢٨٥',
        textAr:
          'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ﴿٢٨٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002285.mp3',
      },
      {
        labelAr: 'البقرة: ٢٨٦',
        textAr:
          'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ ﴿٢٨٦﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002286.mp3',
      },
    ],
  },
  {
    id: 'ruq-shifa-verses',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٥ · آيات الشفاء الست (مرتّبة حسب المصحف)',
    titleAr: 'آيات الشفاء الست في القرآن الكريم (بترتيب المصحف الشريف)',
    arabicText:
      '﴿وَيَشْفِ صُدُورَ قَوْمٍ مُّؤْمِنِينَ﴾ [التوبة: ١٤] · ﴿يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُم مَّوْعِظَةٌ مِّن رَّبِّكُمْ وَشِفَاءٌ لِّمَا فِي الصُّدُورِ وَهُدًى وَرَحْمَةٌ لِّلْمُؤْمِنِينَ﴾ [يونس: ٥٧] · ﴿يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ﴾ [النحل: ٦٩] · ﴿وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ﴾ [الإسراء: ٨٢] · ﴿وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ﴾ [الشعراء: ٨٠] · ﴿قُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ﴾ [فصلت: ٤٤]',
    recommendedCount: 3,
    virtueAndMethodAr:
      'آيات الشفاء الست في القرآن الكريم مرتّبة حسب ترتيب السور في المصحف الشريف: التوبة (٩) ثم يونس (١٠) ثم النحل (١٦) ثم الإسراء (١٧) ثم الشعراء (٢٦) ثم فصلت (٤١).',
    sourceAr:
      'التوبة: ١٤ · يونس: ٥٧ · النحل: ٦٩ · الإسراء: ٨٢ · الشعراء: ٨٠ · فصلت: ٤٤',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/009014.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/009014.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/010057.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/016069.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/017082.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/026080.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/041044.mp3',
    ],
    verses: [
      {
        labelAr: 'التوبة: ١٤',
        textAr:
          'قَاتِلُوهُمْ يُعَذِّبْهُمُ اللَّهُ بِأَيْدِيكُمْ وَيُخْزِهِمْ وَيَنصُرْكُمْ عَلَيْهِمْ وَيَشْفِ صُدُورَ قَوْمٍ مُّؤْمِنِينَ ﴿١٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/009014.mp3',
      },
      {
        labelAr: 'يونس: ٥٧',
        textAr:
          'يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُم مَّوْعِظَةٌ مِّن رَّبِّكُمْ وَشِفَاءٌ لِّمَا فِي الصُّدُورِ وَهُدًى وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴿٥٧﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/010057.mp3',
      },
      {
        labelAr: 'النحل: ٦٩',
        textAr:
          'ثُمَّ كُلِي مِن كُلِّ الثَّمَرَاتِ فَاسْلُكِي سُبُلَ رَبِّكِ ذُلُلًا ۚ يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ ۗ إِنَّ فِي ذَٰلِكَ لَآيَةً لِّقَوْمٍ يَتَفَكَّرُونَ ﴿٦٩﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/016069.mp3',
      },
      {
        labelAr: 'الإسراء: ٨٢',
        textAr:
          'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ۙ وَلَا يَزِيدُ الظَّالِمِينَ إِلَّا خَسَارًا ﴿٨٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/017082.mp3',
      },
      {
        labelAr: 'الشعراء: ٨٠',
        textAr: 'وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ ﴿٨٠﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/026080.mp3',
      },
      {
        labelAr: 'فصلت: ٤٤',
        textAr: 'قُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ ﴿٤٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/041044.mp3',
      },
    ],
  },
  {
    id: 'ruq-ikhlas',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٦ · سورة الإخلاص (١١٢ : ١-٤)',
    titleAr: 'سورة الإخلاص كاملة (تعدل ثلث القرآن)',
    arabicText:
      'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    recommendedCount: 3,
    virtueAndMethodAr:
      'تُقرأ ثلاث مرّات مع الفلق والناس للرقية والتحصين؛ كان النبي ﷺ إذا اشتكى يقرأ على نفسه بالمعوّذات وينفث.',
    sourceAr: 'سورة الإخلاص: الآيات ١-٤ — صحيح البخاري (٥٠١٦)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112004.mp3',
    ],
    verses: [
      {
        labelAr: 'الإخلاص: ١',
        textAr: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
      },
      {
        labelAr: 'الإخلاص: ٢',
        textAr: 'اللَّهُ الصَّمَدُ ﴿٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112002.mp3',
      },
      {
        labelAr: 'الإخلاص: ٣',
        textAr: 'لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112003.mp3',
      },
      {
        labelAr: 'الإخلاص: ٤',
        textAr: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112004.mp3',
      },
    ],
  },
  {
    id: 'ruq-falaq',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٧ · سورة الفلق (١١٣ : ١-٥)',
    titleAr: 'سورة الفلق كاملة (الاستعاذة من شرور الخلق والحسد)',
    arabicText:
      'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    recommendedCount: 3,
    virtueAndMethodAr:
      'قال النبي ﷺ: «ألم ترَ آياتٍ أُنزلت الليلة لم يُرَ مثلهنّ قطّ: قل أعوذ برب الفلق، وقل أعوذ برب الناس» — تُقرأ ثلاثاً للتحصين من السحر والعين والحسد.',
    sourceAr: 'سورة الفلق: الآيات ١-٥ — صحيح مسلم (٨١٤)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113005.mp3',
    ],
    verses: [
      {
        labelAr: 'الفلق: ١',
        textAr: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
      },
      {
        labelAr: 'الفلق: ٢',
        textAr: 'مِن شَرِّ مَا خَلَقَ ﴿٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113002.mp3',
      },
      {
        labelAr: 'الفلق: ٣',
        textAr: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113003.mp3',
      },
      {
        labelAr: 'الفلق: ٤',
        textAr: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113004.mp3',
      },
      {
        labelAr: 'الفلق: ٥',
        textAr: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113005.mp3',
      },
    ],
  },
  {
    id: 'ruq-nas',
    category: 'ruqyah_quran',
    mushafOrderBadgeAr: '٨ · سورة الناس (١١٤ : ١-٦)',
    titleAr: 'سورة الناس كاملة (الاستعاذة من وساوس الإنس والجن)',
    arabicText:
      'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
    recommendedCount: 3,
    virtueAndMethodAr:
      'خاتمة المصحف الشريف والمعوّذات؛ قال ﷺ: «ما تعوّذ متعوّذ بمثلها»، تُقرأ ثلاثاً دبر الصلوات وفي الصباح والمساء وعند الرقية.',
    sourceAr: 'سورة الناس: الآيات ١-٦ — صحيح البخاري (٥٠١٦)',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114005.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114006.mp3',
    ],
    verses: [
      {
        labelAr: 'الناس: ١',
        textAr: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
      },
      {
        labelAr: 'الناس: ٢',
        textAr: 'مَلِكِ النَّاسِ ﴿٢﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114002.mp3',
      },
      {
        labelAr: 'الناس: ٣',
        textAr: 'إِلَٰهِ النَّاسِ ﴿٣﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114003.mp3',
      },
      {
        labelAr: 'الناس: ٤',
        textAr: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114004.mp3',
      },
      {
        labelAr: 'الناس: ٥',
        textAr: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114005.mp3',
      },
      {
        labelAr: 'الناس: ٦',
        textAr: 'مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114006.mp3',
      },
    ],
  },
  {
    id: 'ruq-sunnah-1',
    category: 'ruqyah_sunnah',
    mushafOrderBadgeAr: '٩ · السنة النبوية (١)',
    titleAr: 'رقية النبي ﷺ للمريض (أذهب البأس ربّ الناس)',
    arabicText:
      '«اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا».',
    recommendedCount: 3,
    virtueAndMethodAr:
      'كان رسول الله ﷺ إذا عاد مريضاً أو رقى أهله مسح بيده اليمنى وقال هذا الدعاء العظيم.',
    sourceAr: 'متفق عليه — البخاري (٥٧٤٣) ومسلم (٢١٩١) عن عائشة رضي الله عنها',
  },
  {
    id: 'ruq-sunnah-2',
    category: 'ruqyah_sunnah',
    mushafOrderBadgeAr: '١٠ · السنة النبوية (٢)',
    titleAr: 'وضع اليد على موضع الألم والرقية بسبع مرّات',
    arabicText:
      'ضع يدك على الذي تألّم من جسدك وقُل: «بِسْمِ اللَّهِ» (ثلاثاً)، وقُل سبع مرّات: «أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ».',
    recommendedCount: 7,
    virtueAndMethodAr:
      'وصفة نبوية مباشرة لعلاج الأوجاع والآلام الجسدية والنفسية بإذن الله.',
    sourceAr: 'رواه مسلم في صحيحه (٢٢٠٢) عن عثمان بن أبي العاص رضي الله عنه',
  },
  {
    id: 'ruq-sunnah-3',
    category: 'ruqyah_sunnah',
    mushafOrderBadgeAr: '١١ · السنة النبوية (٣)',
    titleAr: 'رقية جبريل عليه السلام للنبي ﷺ',
    arabicText:
      '«بِسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِسْمِ اللَّهِ أَرْقِيكَ».',
    recommendedCount: 3,
    virtueAndMethodAr:
      'رقية جامعة نافعة من العين والحسد وسائر الأسقام والأوجاع.',
    sourceAr: 'رواه مسلم في صحيحه (٢١٨٦) عن أبي سعيد الخدري رضي الله عنه',
  },
  {
    id: 'ruq-sunnah-4',
    category: 'ruqyah_sunnah',
    mushafOrderBadgeAr: '١٢ · السنة النبوية (٤)',
    titleAr: 'تعويذ الحسن والحسين (من كل شيطان وهامّة وعين لامّة)',
    arabicText:
      '«أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ، مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ» (ولنفسه يقول: أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ).',
    recommendedCount: 3,
    virtueAndMethodAr:
      'كان إبراهيم عليه السلام يعوّذ بها إسماعيل وإسحاق، وكان النبي ﷺ يعوّذ بها الحسن والحسين.',
    sourceAr: 'رواه البخاري في صحيحه (٣٣٧١) عن ابن عباس رضي الله عنهما',
  },
  {
    id: 'sleep-tahseen-1',
    category: 'sleep_tahseen',
    mushafOrderBadgeAr: '١٣ · تحصين النوم (الإخلاص والفلق والناس)',
    titleAr: 'جمع الكفّين والنفث بالمعوّذات الثلاث كاملة قبل النوم',
    arabicText:
      'كان النبي ﷺ إذا أوى إلى فراشه كل ليلة جمع كفّيه ثم نفث فيهما فقرأ فيهما: ﴿قُلْ هُوَ اللَّهُ أَحَدٌ...﴾ و﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ...﴾ و﴿قُلْ أَعُوذُ بِرَبِّ النَّاسِ...﴾ ثم يمسح بهما ما استطاع من جسده يبدأ بهما على رأسه ووجهه وما أقبل من جسده.',
    recommendedCount: 3,
    virtueAndMethodAr:
      'يفعل ذلك ثلاث مرّات عند الاضطجاع للنوم تحصيناً للجسد كله (تُتلى السور الثلاث كاملة بالترتيب).',
    sourceAr: 'صحيح البخاري (٥٠١٧) عن عائشة رضي الله عنها',
    audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
    audioUrls: [
      'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/112004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/113005.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114003.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114004.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114005.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/114006.mp3',
    ],
  },
  {
    id: 'sleep-tahseen-2',
    category: 'sleep_tahseen',
    mushafOrderBadgeAr: '١٤ · خاتمة أذكار النوم',
    titleAr: 'خاتمة أذكار النوم (اللهم أسلمت نفسي إليك)',
    arabicText:
      '«اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ».',
    recommendedCount: 1,
    virtueAndMethodAr:
      'قال ﷺ: «فإن متَّ من ليلتك فأنت على الفطرة، واجعلهنَّ آخر ما تتكلم به».',
    sourceAr: 'متفق عليه — البخاري (٢٤٧) ومسلم (٢٧١٠) عن البراء بن عازب رضي الله عنهما',
  },
];

export interface RuqyahMasterTrackStep {
  stepIndex: number;
  totalSteps: number;
  stationIndex: number;
  totalStations: number;
  itemId: string;
  itemTitleAr: string;
  mushafOrderBadgeAr: string;
  verseIndexInItem: number;
  totalVersesInItem: number;
  verseLabelAr: string;
  verseTextAr: string;
  audioUrl: string;
  candidateAudioUrls: string[];
  isLastVerseOfItem: boolean;
}

/**
 * Returns resilient multi-CDN audio URLs for a given EveryAyah verse MP3 URL
 * so playback never skips or stalls on temporary network hiccups.
 */
export function getRuqyahFallbackAudioUrls(primaryUrl: string): string[] {
  const match = primaryUrl.match(/\/(\d{6}\.mp3)$/);
  if (!match) return [primaryUrl];
  const fileName = match[1];
  return [
    primaryUrl,
    `https://verses.quran.com/Alafasy/mp3/${fileName}`,
    `https://everyayah.com/data/Alafasy_64kbps/${fileName}`,
  ];
}

/**
 * Builds the flat, sequential playlist to play the entire Quranic Ruqyah ONCE
 * from first verse of Surah Al-Fatihah to last verse of Surah An-Nas (36 verses across 8 stations).
 */
export function buildCompleteRuqyahOncePlaylist(): RuqyahMasterTrackStep[] {
  const quranStations = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.filter(
    (item) => item.category === 'ruqyah_quran'
  );

  const rawSteps: Omit<RuqyahMasterTrackStep, 'stepIndex' | 'totalSteps'>[] = [];

  quranStations.forEach((station, sIdx) => {
    const stationVerses =
      station.verses && station.verses.length > 0
        ? station.verses
        : (station.audioUrls || (station.audioUrl ? [station.audioUrl] : [])).map(
            (u, idx) => ({
              labelAr: `${station.titleAr} (${idx + 1})`,
              textAr: station.arabicText,
              audioUrl: u,
            })
          );

    stationVerses.forEach((v, vIdx) => {
      rawSteps.push({
        stationIndex: sIdx,
        totalStations: quranStations.length,
        itemId: station.id,
        itemTitleAr: station.titleAr,
        mushafOrderBadgeAr: station.mushafOrderBadgeAr || `${sIdx + 1}`,
        verseIndexInItem: vIdx,
        totalVersesInItem: stationVerses.length,
        verseLabelAr: v.labelAr,
        verseTextAr: v.textAr,
        audioUrl: v.audioUrl,
        candidateAudioUrls: getRuqyahFallbackAudioUrls(v.audioUrl),
        isLastVerseOfItem: vIdx === stationVerses.length - 1,
      });
    });
  });

  const totalSteps = rawSteps.length;
  return rawSteps.map((step, index) => ({
    ...step,
    stepIndex: index,
    totalSteps,
  }));
}


// ============================================================================
// 4. DAILY AYAH, HADITH, DHIKR & DUA STUDIO PRESETS FOR PNG SHARE CARDS
// ============================================================================

export interface DailyInspirationPreset {
  id: string;
  type: 'ayah' | 'dhikr' | 'dua';
  badgeAr: string;
  titleAr: string;
  mainArabicText: string;
  tafsirOrVirtueAr: string;
  sourceAr: string;
}

export const DAILY_INSPIRATION_PRESETS: DailyInspirationPreset[] = [
  {
    id: 'ayah-light',
    type: 'ayah',
    badgeAr: 'آية اليوم وتدبّرها · تطبيق المحراب',
    titleAr: 'سورة الشرح — وعدٌ ربّاني بتيسير العسير',
    mainArabicText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    tafsirOrVirtueAr:
      'التفسير الميسّر: بشارة عظيمة لكل مؤمن؛ فكل ضيقٍ وكربٍ يصحبه فرجٌ قريب، ولن يغلب عسرٌ واحدٌ يُسرين بإذن الله.',
    sourceAr: 'سورة الشرح: الآيتان ٥ - ٦',
  },
  {
    id: 'ayah-mercy',
    type: 'ayah',
    badgeAr: 'آية اليوم وتدبّرها · تطبيق المحراب',
    titleAr: 'سورة الزمر — أرجى آية في كتاب الله تعالى',
    mainArabicText:
      'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ',
    tafsirOrVirtueAr:
      'التفسير الميسّر: نداءٌ رحيم من الله لعباده التائبين ألا ييأسوا من مغفرته مهما عظمت ذنوبهم متى أقبلوا عليه تائبين.',
    sourceAr: 'سورة الزمر: آية ٥٣',
  },
  {
    id: 'ayah-sakina',
    type: 'ayah',
    badgeAr: 'آية اليوم وتدبّرها · تطبيق المحراب',
    titleAr: 'سورة الرعد — سرّ طمأنينة القلوب',
    mainArabicText:
      'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    tafsirOrVirtueAr:
      'التفسير الميسّر: لا سكون للروح ولا انشراح للصدر إلا بذكر الله وتلاوة كتابه والأنس بمناجاته.',
    sourceAr: 'سورة الرعد: آية ٢٨',
  },
  {
    id: 'ayah-tawakkul',
    type: 'ayah',
    badgeAr: 'آية اليوم وتدبّرها · تطبيق المحراب',
    titleAr: 'سورة الطلاق — الكفاية والرزق من حيث لا تحتسب',
    mainArabicText:
      'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    tafsirOrVirtueAr:
      'التفسير الميسّر: من راقب الله في أمره فرّج الله كربه، وساق إليه رزقه من وجوهٍ لم تخطر بباله، وكفاه ما أهمّه.',
    sourceAr: 'سورة الطلاق: الآيتان ٢ - ٣',
  },
  {
    id: 'dhikr-treasure',
    type: 'dhikr',
    badgeAr: 'ذكر اليوم المأثور · تطبيق المحراب',
    titleAr: 'كلمتان حبيبتان إلى الرحمن ثقيلتان في الميزان',
    mainArabicText: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    tafsirOrVirtueAr:
      'قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم».',
    sourceAr: 'متفق عليه — صحيح البخاري (٦٤٠٦) وصحيح مسلم (٢٦٩٤)',
  },
  {
    id: 'dhikr-rawatib',
    type: 'dhikr',
    badgeAr: 'حديث اليوم · تطبيق المحراب',
    titleAr: 'بشارة بيتٍ في الجنة بالسنن الرواتب',
    mainArabicText:
      'مَا مِنْ عَبْدٍ مُسْلِمٍ يُصَلِّي لِلَّهِ كُلَّ يَوْمٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً تَطَوُّعًا غَيْرَ فَرِيضَةٍ، إِلَّا بَنَى اللَّهُ لَهُ بَيْتًا فِي الْجَنَّةِ',
    tafsirOrVirtueAr:
      'وهنّ: ركعتان قبل الفجر، وأربع قبل الظهر، وركعتان بعد الظهر، وركعتان بعد المغرب، وركعتان بعد العشاء.',
    sourceAr: 'رواه مسلم في صحيحه (٧٢٨) عن أم حبيبة رضي الله عنها',
  },
  {
    id: 'dua-afiyah',
    type: 'dua',
    badgeAr: 'دعاء اليوم المأثور · تطبيق المحراب',
    titleAr: 'دعاء النبي ﷺ الجامع للعفو والعافية والستر',
    mainArabicText:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي',
    tafsirOrVirtueAr:
      'لم يكن رسول الله ﷺ يدع هؤلاء الدعوات حين يمسي وحين يصبح؛ لما جمعنه من خيري الدنيا والآخرة.',
    sourceAr: 'رواه أبو داود (٥٠٧٤) وابن ماجه (٣٨٧١) وصححه الألباني',
  },
];

export function getDailyInspirationPresetForDate(
  date: Date = new Date()
): DailyInspirationPreset {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const idx = Math.abs(dayOfYear) % DAILY_INSPIRATION_PRESETS.length;
  return DAILY_INSPIRATION_PRESETS[idx];
}

export function presetToDawahCardPayload(
  preset: DailyInspirationPreset,
  waqfDedicationLineAr?: string
): DawahShareCardPayload {
  return {
    category: preset.type,
    headerBadgeAr: preset.badgeAr,
    titleAr: preset.titleAr,
    mainArabicText: preset.mainArabicText,
    explanationOrVirtueAr: preset.tafsirOrVirtueAr,
    sourceAndGradingAr: preset.sourceAr,
    waqfDedicationLineAr,
  };
}

// ============================================================================
// 5. KHUSHU & SPIRITUAL RETREAT MODE (وضع الاعتكاف والخلوة الإيمانية)
// ============================================================================

export type KhushuRetreatGoalId =
  | 'quran_tadabbur'
  | 'dhikr_istighfar'
  | 'qiyam_munajat'
  | 'muhasabah_reflection';

export interface KhushuRetreatGoalSpec {
  id: KhushuRetreatGoalId;
  titleAr: string;
  subtitleAr: string;
  verseAr: string;
  verseRefAr: string;
  tadabburPromptAr: string;
  recommendedDhikrAr: string;
}

export const KHUSHU_RETREAT_GOALS: KhushuRetreatGoalSpec[] = [
  {
    id: 'quran_tadabbur',
    titleAr: 'خلوة تدبّر القرآن الكريم',
    subtitleAr: 'تأمّلٌ هادئ في آيات الله واستحضار رسائلها للقلب',
    verseAr: '﴿كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا آيَاتِهِ وَلِيَتَذَكَّرَ أُولُو الْأَلْبَابِ﴾',
    verseRefAr: 'سورة ص: آية ٢٩',
    tadabburPromptAr:
      'اقرأ الآيات بترتيلٍ وتأنٍّ، وتوقّف عند كل وعدٍ برحمة أو نداءٍ بـ ﴿يَا أَيُّهَا الَّذِينَ آمَنُوا﴾ وسَل الله من فضله.',
    recommendedDhikrAr: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  },
  {
    id: 'dhikr_istighfar',
    titleAr: 'خلوة الذكر والاستغفار بالأسحار',
    subtitleAr: 'تفريغ القلب من شواغل الدنيا والاجتماع على ذكر الله',
    verseAr: '﴿وَالذَّاكِرِينَ اللَّهَ كَثِيرًا وَالذَّاكِرَاتِ أَعَدَّ اللَّهُ لَهُم مَّغْفِرَةً وَأَجْرًا عَظِيمًا﴾',
    verseRefAr: 'سورة الأحزاب: آية ٣٥',
    tadabburPromptAr:
      'استحضر عظمة الله مع كل تسبيحة واستغفار، واجعل لسانك يواطئ قلبك في الثناء على الله.',
    recommendedDhikrAr: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
  },
  {
    id: 'qiyam_munajat',
    titleAr: 'خلوة قيام الليل والمناجاة',
    subtitleAr: 'الأُنس بالله في جوف الليل وساعات النزول الإلهي',
    verseAr: '﴿تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًا وَطَمَعًا﴾',
    verseRefAr: 'سورة السجدة: آية ١٦',
    tadabburPromptAr:
      'أطِل السجود وبُثَّ إلى الله حاجاتك وهمومك؛ فربّ ركعةٍ في جوف الليل فتحت أبواب السماء.',
    recommendedDhikrAr: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
  },
  {
    id: 'muhasabah_reflection',
    titleAr: 'خلوة محاسبة النفس وتجديد التوبة',
    subtitleAr: 'وقفة صادقة مع النفس لإصلاح السريرة وتجديد العهد مع الله',
    verseAr: '﴿يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ﴾',
    verseRefAr: 'سورة الحشر: آية ١٨',
    tadabburPromptAr:
      'انظر في فرائضك وسننك وقلبك اليوم: ما الذي يُرضي الله فتثبت عليه، وما الذي يحتاج إلى توبةٍ وجبر؟',
    recommendedDhikrAr: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
  },
];

export interface KhushuStatsRecord {
  completedSessions: number;
  totalMinutesSpent: number;
  totalDhikrDuringRetreat: number;
}

export const KHUSHU_STATS_STORAGE_KEY = 'almihrab_khushu_retreat_stats_v1';

export function loadKhushuStats(): KhushuStatsRecord {
  if (typeof window === 'undefined') {
    return { completedSessions: 0, totalMinutesSpent: 0, totalDhikrDuringRetreat: 0 };
  }
  try {
    const raw = localStorage.getItem(KHUSHU_STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.completedSessions === 'number') return parsed;
    }
  } catch {
    // ignore
  }
  return { completedSessions: 0, totalMinutesSpent: 0, totalDhikrDuringRetreat: 0 };
}

export function saveKhushuStats(stats: KhushuStatsRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KHUSHU_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}
