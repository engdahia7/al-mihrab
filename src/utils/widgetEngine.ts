import { PRAYER_METADATA, type AstronomicalPrayerTimes, type MainPrayerKey } from './astronomy.ts';

export type WidgetSizePreset = 'lockscreen' | 'small' | 'medium' | 'large';
export type WidgetThemeId = 'emerald' | 'parchment' | 'midnight' | 'kiswah';
export type WidgetCardId =
  | 'next_prayer_arc'
  | 'daily_schedule'
  | 'quran_wird'
  | 'tasbih_dhikr'
  | 'qibla_hijri'
  | 'lockscreen_compact';

export interface WidgetCatalogItem {
  id: WidgetCardId;
  titleAr: string;
  shortTitleAr: string;
  descriptionAr: string;
  badgeSizeAr: string;
}

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    id: 'next_prayer_arc',
    titleAr: 'ويدجت الصلاة القادمة والقوس الفلكي',
    shortTitleAr: 'الصلاة',
    descriptionAr: 'العد التنازلي للصلاة القادمة مع مسار الشمس والقمر بين الصلاتين',
    badgeSizeAr: '٢×٢',
  },
  {
    id: 'daily_schedule',
    titleAr: 'ويدجت جدول المواقيت والثلث الأخير',
    shortTitleAr: 'المواقيت',
    descriptionAr: 'مواقيت الصلوات الخمس والشروق لليوم مع موعد الثلث الأخير من الليل',
    badgeSizeAr: '٤×٢',
  },
  {
    id: 'quran_wird',
    titleAr: 'ويدجت آية اليوم والورد القرآني',
    shortTitleAr: 'الآية',
    descriptionAr: 'آية متجددة بالرسم العثماني مع متابعة صفحة الورد اليومي بالمصحف',
    badgeSizeAr: '٢×٢',
  },
  {
    id: 'tasbih_dhikr',
    titleAr: 'ويدجت المسبحة الإلكترونية التفاعلية',
    shortTitleAr: 'المسبحة',
    descriptionAr: 'عدّاد تسبيح واستغفار مدمج مع حلقة إنجاز سريعة لذكر الله',
    badgeSizeAr: '٢×٢',
  },
  {
    id: 'qibla_hijri',
    titleAr: 'ويدجت بوصلة القبلة والتقويم الهجري',
    shortTitleAr: 'القبلة',
    descriptionAr: 'مؤشر اتجاه الكعبة المشرفة بالدرجات مع التاريخ الهجري والمناسبة القادمة',
    badgeSizeAr: '٢×٢',
  },
  {
    id: 'lockscreen_compact',
    titleAr: 'ويدجت شاشة القفل الدائرية المصغّرة',
    shortTitleAr: 'الساعة',
    descriptionAr: 'تصميم دائري مدمج لشاشات القفل والساعات الذكية يعرض المتبقي للأذان',
    badgeSizeAr: '١×٢',
  },
];

export interface WidgetThemeSpec {
  id: WidgetThemeId;
  nameAr: string;
  subtitleAr: string;
  bgClass: string;
  borderClass: string;
  textPrimaryClass: string;
  textSecondaryClass: string;
  accentTextClass: string;
  accentBgClass: string;
  cardInnerBgClass: string;
  activeSlotBgClass: string;
  arcTrackHex: string;
  arcFillHex: string;
  canvasBgStart: string;
  canvasBgEnd: string;
  canvasAccent: string;
  canvasTextPrimary: string;
  canvasTextSecondary: string;
}

export const WIDGET_THEMES: Record<WidgetThemeId, WidgetThemeSpec> = {
  emerald: {
    id: 'emerald',
    nameAr: 'الأخضر النبوي',
    subtitleAr: 'زمردي داكن مع نقوش ذهبية دافئة',
    bgClass: 'bg-gradient-to-br from-[#14532D] via-[#114224] to-[#0B2E19]',
    borderClass: 'border-[#D6CEBE]/30',
    textPrimaryClass: 'text-[#FBF9F5]',
    textSecondaryClass: 'text-[#D6CEBE]',
    accentTextClass: 'text-[#FDE68A]',
    accentBgClass: 'bg-[#FDE68A]/15',
    cardInnerBgClass: 'bg-black/20 border-white/10',
    activeSlotBgClass: 'bg-[#FDE68A]/20 border-[#FDE68A]/50 text-[#FBF9F5]',
    arcTrackHex: 'rgba(214, 206, 190, 0.2)',
    arcFillHex: '#FDE68A',
    canvasBgStart: '#14532D',
    canvasBgEnd: '#0B2E19',
    canvasAccent: '#FDE68A',
    canvasTextPrimary: '#FBF9F5',
    canvasTextSecondary: '#D6CEBE',
  },
  parchment: {
    id: 'parchment',
    nameAr: 'الرقّ الكريمي',
    subtitleAr: 'ورق مصحف المدينة الدافئ بالحبر العربي',
    bgClass: 'bg-gradient-to-br from-[#FBF9F5] via-[#F5EFE4] to-[#EDE4D3]',
    borderClass: 'border-[#C8B99E]',
    textPrimaryClass: 'text-[#1C1917]',
    textSecondaryClass: 'text-[#57534E]',
    accentTextClass: 'text-[#14532D]',
    accentBgClass: 'bg-[#14532D]/10',
    cardInnerBgClass: 'bg-white/75 border-[#D6CEBE]',
    activeSlotBgClass: 'bg-[#14532D] border-[#14532D] text-white',
    arcTrackHex: 'rgba(28, 25, 23, 0.12)',
    arcFillHex: '#14532D',
    canvasBgStart: '#FBF9F5',
    canvasBgEnd: '#EDE4D3',
    canvasAccent: '#14532D',
    canvasTextPrimary: '#1C1917',
    canvasTextSecondary: '#57534E',
  },
  midnight: {
    id: 'midnight',
    nameAr: 'الليل المذهّب',
    subtitleAr: 'سكينة قيام الليل مع إضاءة كهرمانية',
    bgClass: 'bg-gradient-to-br from-[#0F171E] via-[#0B1116] to-[#070B0E]',
    borderClass: 'border-amber-400/25',
    textPrimaryClass: 'text-[#F8FAFC]',
    textSecondaryClass: 'text-slate-300',
    accentTextClass: 'text-amber-300',
    accentBgClass: 'bg-amber-400/15',
    cardInnerBgClass: 'bg-white/[0.05] border-white/10',
    activeSlotBgClass: 'bg-amber-400/20 border-amber-400/50 text-amber-200',
    arcTrackHex: 'rgba(251, 191, 36, 0.16)',
    arcFillHex: '#FBBF24',
    canvasBgStart: '#0F171E',
    canvasBgEnd: '#070B0E',
    canvasAccent: '#FBBF24',
    canvasTextPrimary: '#F8FAFC',
    canvasTextSecondary: '#CBD5E1',
  },
  kiswah: {
    id: 'kiswah',
    nameAr: 'كسوة الكعبة',
    subtitleAr: 'أسود فاخر مطرّز بحزام الذهب الخالص',
    bgClass: 'bg-gradient-to-br from-[#141311] via-[#0D0C0A] to-[#080706]',
    borderClass: 'border-[#D4AF37]/45',
    textPrimaryClass: 'text-[#FAF7F0]',
    textSecondaryClass: 'text-[#D6CEBE]',
    accentTextClass: 'text-[#E5C158]',
    accentBgClass: 'bg-[#D4AF37]/15',
    cardInnerBgClass: 'bg-[#1F1D19]/80 border-[#D4AF37]/25',
    activeSlotBgClass: 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FAF7F0]',
    arcTrackHex: 'rgba(212, 175, 55, 0.2)',
    arcFillHex: '#E5C158',
    canvasBgStart: '#141311',
    canvasBgEnd: '#080706',
    canvasAccent: '#E5C158',
    canvasTextPrimary: '#FAF7F0',
    canvasTextSecondary: '#D6CEBE',
  },
};

export interface WidgetDailyAyah {
  id: string;
  ayahText: string;
  surahNameAr: string;
  ayahNumber: number;
  mushafPage: number;
  reflectionAr: string;
}

export const WIDGET_CURATED_AYAHS: WidgetDailyAyah[] = [
  {
    id: 'baqarah-186',
    ayahText: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
    surahNameAr: 'سورة البقرة',
    ayahNumber: 186,
    mushafPage: 28,
    reflectionAr: 'طمأنينة القرب الإلهي وإجابة الدعاء بلا واسطة.',
  },
  {
    id: 'rad-28',
    ayahText: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    surahNameAr: 'سورة الرعد',
    ayahNumber: 28,
    mushafPage: 252,
    reflectionAr: 'الذكر حياة للقلب وسكينة للنفس عند كل قلق.',
  },
  {
    id: 'talaq-2-3',
    ayahText: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ٭ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
    surahNameAr: 'سورة الطلاق',
    ayahNumber: 2,
    mushafPage: 558,
    reflectionAr: 'التقوى والتوكل مفتاح الفرج والرزق غير المتوقع.',
  },
  {
    id: 'sharh-5-6',
    ayahText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ٭ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    surahNameAr: 'سورة الشرح',
    ayahNumber: 5,
    mushafPage: 596,
    reflectionAr: 'لن يغلب عسرٌ يسرين؛ الفرج مقترن بالشدة دائماً.',
  },
  {
    id: 'nur-35',
    ayahText: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ',
    surahNameAr: 'سورة النور',
    ayahNumber: 35,
    mushafPage: 354,
    reflectionAr: 'نور الهداية في القرآن والصلاة يضيء البصيرة.',
  },
  {
    id: 'isra-78',
    ayahText: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا',
    surahNameAr: 'سورة الإسراء',
    ayahNumber: 78,
    mushafPage: 290,
    reflectionAr: 'أوقات الصلوات الخمس محطات نور تشهدها الملائكة.',
  },
];

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export interface PrayerIntervalProgress {
  previousPrayerKey: MainPrayerKey;
  previousPrayerNameAr: string;
  previousPrayerTime: string;
  nextPrayerKey: MainPrayerKey;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  progressPercent: number; // 0..100
  isDaytime: boolean;
}

/**
 * Calculates the exact progress percentage (0..100) between the most recent prayer
 * and the upcoming prayer so the widget can render a live solar/lunar arc.
 */
export function calculatePrayerIntervalProgress(
  times: AstronomicalPrayerTimes,
  currentHour: number,
  currentMinute: number,
  currentSecond: number = 0
): PrayerIntervalProgress {
  const orderedKeys: MainPrayerKey[] = [
    'fajr',
    'sunrise',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];

  const nowTotalSeconds =
    currentHour * 3600 + currentMinute * 60 + currentSecond;

  const schedule = orderedKeys.map((key) => {
    const meta = PRAYER_METADATA.find((p) => p.key === key)!;
    const mins = parseTimeToMinutes(times[key]);
    return {
      key,
      nameAr: meta.nameAr,
      timeStr: times[key],
      seconds: mins * 60,
    };
  });

  // Find first prayer strictly after nowTotalSeconds
  const nextIdx = schedule.findIndex((item) => item.seconds > nowTotalSeconds);

  let prevItem: (typeof schedule)[number];
  let nextItem: (typeof schedule)[number];
  let elapsedSeconds = 0;
  let totalIntervalSeconds = 1;

  if (nextIdx === -1) {
    // After Isha before midnight -> previous is Isha, next is tomorrow's Fajr
    prevItem = schedule[schedule.length - 1];
    nextItem = schedule[0];
    const secondsUntilMidnight = 24 * 3600 - prevItem.seconds;
    totalIntervalSeconds = secondsUntilMidnight + nextItem.seconds;
    elapsedSeconds = nowTotalSeconds - prevItem.seconds;
  } else if (nextIdx === 0) {
    // After midnight before Fajr -> previous is yesterday's Isha, next is Fajr
    prevItem = schedule[schedule.length - 1];
    nextItem = schedule[0];
    const secondsBeforeMidnight = 24 * 3600 - prevItem.seconds;
    totalIntervalSeconds = secondsBeforeMidnight + nextItem.seconds;
    elapsedSeconds = secondsBeforeMidnight + nowTotalSeconds;
  } else {
    prevItem = schedule[nextIdx - 1];
    nextItem = schedule[nextIdx];
    totalIntervalSeconds = Math.max(1, nextItem.seconds - prevItem.seconds);
    elapsedSeconds = Math.max(0, nowTotalSeconds - prevItem.seconds);
  }

  const rawPercent = Math.round((elapsedSeconds / Math.max(1, totalIntervalSeconds)) * 100);
  const progressPercent = Math.max(0, Math.min(100, rawPercent));

  const sunriseSec = schedule[1].seconds;
  const maghribSec = schedule[4].seconds;
  const isDaytime = nowTotalSeconds >= sunriseSec && nowTotalSeconds < maghribSec;

  return {
    previousPrayerKey: prevItem.key,
    previousPrayerNameAr: prevItem.nameAr,
    previousPrayerTime: prevItem.timeStr,
    nextPrayerKey: nextItem.key,
    nextPrayerNameAr: nextItem.nameAr,
    nextPrayerTime: nextItem.timeStr,
    progressPercent,
    isDaytime,
  };
}

/**
 * Selects a deterministic daily Ayah based on day of month or manual index offset.
 */
export function getWidgetDailyAyah(dayOfMonth: number, manualOffset: number = 0): WidgetDailyAyah {
  const safeIndex =
    Math.abs((dayOfMonth - 1 + manualOffset) % WIDGET_CURATED_AYAHS.length);
  return WIDGET_CURATED_AYAHS[safeIndex];
}

/**
 * Computes upcoming White Days (الأيام البيض: 13, 14, 15 of Hijri month) status for the Qibla & Hijri Widget.
 */
export function getUpcomingHijriNoteAr(hijriDay: number, hijriMonthNameAr: string): string {
  if (hijriDay >= 13 && hijriDay <= 15) {
    return `اليوم من الأيام البيض المباركة في شهر ${hijriMonthNameAr}`;
  }
  if (hijriDay < 13) {
    const remaining = 13 - hijriDay;
    return `متبقٍ ${remaining} ${remaining === 1 ? 'يوم' : 'أيام'} على صيام الأيام البيض (١٣-١٥ ${hijriMonthNameAr})`;
  }
  return `العشر الأواخر من شهر ${hijriMonthNameAr} · استعد لغرّة الشهر القادم`;
}

/**
 * Generates an iframe embed snippet for websites or personal dashboards.
 */
export function buildWidgetEmbedSnippet(
  originUrl: string,
  cityId: string,
  themeId: WidgetThemeId,
  size: WidgetSizePreset,
  widgetType?: WidgetCardId
): string {
  const dimensions =
    size === 'small'
      ? { width: 320, height: 300 }
      : size === 'lockscreen'
      ? { width: 340, height: 150 }
      : size === 'medium'
      ? { width: 580, height: 280 }
      : { width: 640, height: 480 };

  const cleanOrigin = originUrl.replace(/\/$/, '');
  const typeParam = widgetType ? `&type=${encodeURIComponent(widgetType)}` : '';
  const embedUrl = `${cleanOrigin}/?widget=1&city=${encodeURIComponent(
    cityId
  )}&theme=${encodeURIComponent(themeId)}&size=${encodeURIComponent(size)}${typeParam}`;

  return `<iframe src="${embedUrl}" width="${dimensions.width}" height="${dimensions.height}" style="border:0;border-radius:20px;overflow:hidden;" title="ويدجت المحراب لمواقيت الصلاة والقرآن" loading="lazy"></iframe>`;
}

/**
 * Builds a direct standalone URL for mobile Home Screen Web-Widget apps (Android Widgetify/Web Widget)
 * or standalone PWA Home Screen shortcuts.
 */
export function buildStandalonePhoneWidgetUrl(
  baseUrl: string,
  cityId: string,
  themeId: WidgetThemeId,
  cardId: WidgetCardId | 'all' = 'next_prayer_arc'
): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}/?widget=1&city=${encodeURIComponent(
    cityId
  )}&theme=${encodeURIComponent(themeId)}&card=${encodeURIComponent(cardId)}`;
}

export interface LockScreenNotificationPayload {
  title: string;
  body: string;
  tag: string;
}

/**
 * Formats a concise, high-clarity Arabic notification payload for the phone's Lock Screen
 * and Notification Shade showing the upcoming prayer and all 5 daily prayer times.
 */
export function buildLockScreenNotificationPayload(params: {
  cityNameAr: string;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  remainingFormatted: string;
  times: AstronomicalPrayerTimes;
  hijriFormattedAr: string;
}): LockScreenNotificationPayload {
  const {
    cityNameAr,
    nextPrayerNameAr,
    nextPrayerTime,
    remainingFormatted,
    times,
    hijriFormattedAr,
  } = params;

  const title = `صلاة ${nextPrayerNameAr} (${nextPrayerTime}) · متبقٍ -${remainingFormatted}`;
  const body =
    `📍 ${cityNameAr} (${hijriFormattedAr})\n` +
    `الفجر ${times.fajr} | الظهر ${times.dhuhr} | العصر ${times.asr} | المغرب ${times.maghrib} | العشاء ${times.isha}`;

  return {
    title,
    body,
    tag: 'almihrab-live-prayer-widget',
  };
}

/**
 * Generates a complete, self-contained iOS Scriptable widget script (.js)
 * that runs natively on iPhone/iPad Home Screen & Lock Screen (even 100% offline!).
 */
export function generateIOSScriptableWidgetScript(params: {
  cityNameAr: string;
  cityId: string;
  times: AstronomicalPrayerTimes;
  hijriFormattedAr: string;
  qiblaAngle: number;
  dailyAyahText: string;
  dailyAyahSurahAr: string;
  themeId: WidgetThemeId;
  appUrl: string;
}): string {
  const theme = WIDGET_THEMES[params.themeId] || WIDGET_THEMES.emerald;
  const cleanAppUrl = params.appUrl || 'https://al-mihrab.example.com/';

  return `// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: moon;
/**
 * ويدجت تطبيق «المحراب» للشاشة الرئيسية وشاشة القفل في آيفون (iOS Scriptable Widget)
 * المدينة: ${params.cityNameAr} | الثيم: ${theme.nameAr}
 * يعمل مباشرة على شاشة الهاتف الرئيسية وشاشة القفل بدون إنترنت.
 */

const CITY_NAME = ${JSON.stringify(params.cityNameAr)};
const HIJRI_DATE = ${JSON.stringify(params.hijriFormattedAr)};
const QIBLA_DEG = ${Math.round(params.qiblaAngle)};
const APP_URL = ${JSON.stringify(cleanAppUrl)};
const DAILY_AYAH = ${JSON.stringify(params.dailyAyahText)};
const DAILY_SURAH = ${JSON.stringify(params.dailyAyahSurahAr)};

const PRAYERS = [
  { name: "الفجر", time: ${JSON.stringify(params.times.fajr)} },
  { name: "الشروق", time: ${JSON.stringify(params.times.sunrise)} },
  { name: "الظهر", time: ${JSON.stringify(params.times.dhuhr)} },
  { name: "العصر", time: ${JSON.stringify(params.times.asr)} },
  { name: "المغرب", time: ${JSON.stringify(params.times.maghrib)} },
  { name: "العشاء", time: ${JSON.stringify(params.times.isha)} }
];

function getNextPrayer(now) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const p of PRAYERS) {
    const [h, m] = p.time.split(":").map(Number);
    const pMins = h * 60 + m;
    if (pMins > nowMins) {
      const diff = pMins - nowMins;
      const rh = Math.floor(diff / 60);
      const rm = diff % 60;
      return { ...p, remaining: \`\${String(rh).padStart(2, "0")}:\${String(rm).padStart(2, "0")}\` };
    }
  }
  const [fh, fm] = PRAYERS[0].time.split(":").map(Number);
  const diff = (24 * 60 - nowMins) + (fh * 60 + fm);
  const rh = Math.floor(diff / 60);
  const rm = diff % 60;
  return { ...PRAYERS[0], remaining: \`\${String(rh).padStart(2, "0")}:\${String(rm).padStart(2, "0")}\` };
}

const now = new Date();
const nextP = getNextPrayer(now);

const widget = new ListWidget();
widget.url = APP_URL;
widget.setPadding(14, 16, 14, 16);

const gradient = new LinearGradient();
gradient.locations = [0, 1];
gradient.colors = [new Color(${JSON.stringify(theme.canvasBgStart)}), new Color(${JSON.stringify(theme.canvasBgEnd)})];
widget.backgroundGradient = gradient;

// Header Row
const headerStack = widget.addStack();
headerStack.layoutHorizontally();
const titleTxt = headerStack.addText("المحراب · " + CITY_NAME);
titleTxt.font = Font.boldSystemFont(12);
titleTxt.textColor = new Color(${JSON.stringify(theme.canvasAccent)});
headerStack.addSpacer();
const hijriTxt = headerStack.addText(HIJRI_DATE);
hijriTxt.font = Font.systemFont(10);
hijriTxt.textColor = new Color(${JSON.stringify(theme.canvasTextSecondary)});

widget.addSpacer(6);

// Next Prayer Highlight
const nextStack = widget.addStack();
nextStack.layoutHorizontally();
nextStack.centerAlignContent();
const nextLabel = nextStack.addText("صلاة " + nextP.name + " (" + nextP.time + ")");
nextLabel.font = Font.boldSystemFont(16);
nextLabel.textColor = new Color(${JSON.stringify(theme.canvasTextPrimary)});
nextStack.addSpacer();
const remLabel = nextStack.addText("متبقٍ -" + nextP.remaining);
remLabel.font = Font.boldMonospacedSystemFont(14);
remLabel.textColor = new Color(${JSON.stringify(theme.canvasAccent)});

widget.addSpacer(8);

// 5 Prayers Row (for Medium/Large widgets)
if (config.widgetFamily !== "small") {
  const row = widget.addStack();
  row.layoutHorizontally();
  for (const p of PRAYERS.filter(x => x.name !== "الشروق")) {
    const col = row.addStack();
    col.layoutVertically();
    col.centerAlignContent();
    const nTxt = col.addText(p.name);
    nTxt.font = Font.systemFont(10);
    nTxt.textColor = p.name === nextP.name ? new Color(${JSON.stringify(theme.canvasAccent)}) : new Color(${JSON.stringify(theme.canvasTextSecondary)});
    const tTxt = col.addText(p.time);
    tTxt.font = Font.boldMonospacedSystemFont(11);
    tTxt.textColor = new Color(${JSON.stringify(theme.canvasTextPrimary)});
    row.addSpacer();
  }
  widget.addSpacer(6);
  const ayahTxt = widget.addText("﴿ " + DAILY_AYAH + " ﴾");
  ayahTxt.font = Font.systemFont(11);
  ayahTxt.textColor = new Color(${JSON.stringify(theme.canvasAccent)});
  ayahTxt.lineLimit = 1;
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
`;
}

