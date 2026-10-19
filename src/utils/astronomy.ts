export type CalculationMethodId =
  | 'UMM_AL_QURA'
  | 'EGYPTIAN'
  | 'MWL'
  | 'KARACHI'
  | 'ISNA';

export type AsrJuristicMethod = 'STANDARD' | 'HANAFI';

export interface CalculationMethodSpec {
  id: CalculationMethodId;
  nameAr: string;
  authorityAr: string;
  regionAr: string;
  fajrAngle: number;
  ishaAngle?: number;
  ishaMinutesAfterMaghrib?: number;
  ishaIntervalMinutes?: number;
  aladhanMethodCode: number;
}

export const CALCULATION_METHODS: Record<CalculationMethodId, CalculationMethodSpec> = {
  UMM_AL_QURA: {
    id: 'UMM_AL_QURA',
    nameAr: 'تقويم أم القرى',
    authorityAr: 'جامعة أم القرى — مكة المكرمة',
    regionAr: 'المملكة العربية السعودية والخليج العربي',
    fajrAngle: 18.5,
    ishaMinutesAfterMaghrib: 90,
    ishaIntervalMinutes: 90,
    aladhanMethodCode: 4,
  },
  EGYPTIAN: {
    id: 'EGYPTIAN',
    nameAr: 'الهيئة المصرية العامة للمساحة',
    authorityAr: 'الهيئة المصرية العامة للمساحة — القاهرة',
    regionAr: 'مصر، الشام، أفريقيا، وأجزاء من الشرق الأوسط',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    aladhanMethodCode: 5,
  },
  MWL: {
    id: 'MWL',
    nameAr: 'رابطة العالم الإسلامي',
    authorityAr: 'المجمع الفقهي الإسلامي بمكة المكرمة',
    regionAr: 'أوروبا، الشرق الأقصى، وأجزاء من الولايات المتحدة',
    fajrAngle: 18,
    ishaAngle: 17,
    aladhanMethodCode: 3,
  },
  KARACHI: {
    id: 'KARACHI',
    nameAr: 'جامعة العلوم الإسلامية بكراتشي',
    authorityAr: 'جامعة العلوم الإسلامية — كراتشي',
    regionAr: 'باكستان، الهند، بنغلاديش، وجنوب آسيا',
    fajrAngle: 18,
    ishaAngle: 18,
    aladhanMethodCode: 1,
  },
  ISNA: {
    id: 'ISNA',
    nameAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
    authorityAr: 'مجمع فقهاء الشريعة بأمريكا الشمالية',
    regionAr: 'الولايات المتحدة الأمريكية وكندا',
    fajrAngle: 15,
    ishaAngle: 15,
    aladhanMethodCode: 2,
  },
};

export interface CityLocation {
  id: string;
  nameAr: string;
  countryAr: string;
  latitude: number;
  longitude: number;
  timezoneOffsetHours: number;
  timezoneName: string;
  defaultMethod: CalculationMethodId;
}

export const VERIFIED_CITIES: CityLocation[] = [
  {
    id: 'makkah',
    nameAr: 'مكة المكرمة',
    countryAr: 'المملكة العربية السعودية',
    latitude: 21.4225,
    longitude: 39.8262,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'madinah',
    nameAr: 'المدينة المنورة',
    countryAr: 'المملكة العربية السعودية',
    latitude: 24.4672,
    longitude: 39.6112,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'cairo',
    nameAr: 'القاهرة',
    countryAr: 'جمهورية مصر العربية',
    latitude: 30.0444,
    longitude: 31.2357,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Cairo',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'jerusalem',
    nameAr: 'القدس الشريف',
    countryAr: 'فلسطين',
    latitude: 31.778,
    longitude: 35.2354,
    timezoneOffsetHours: 2,
    timezoneName: 'Asia/Jerusalem',
    defaultMethod: 'MWL',
  },
  {
    id: 'riyadh',
    nameAr: 'الرياض',
    countryAr: 'المملكة العربية السعودية',
    latitude: 24.7136,
    longitude: 46.6753,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'dubai',
    nameAr: 'دبي',
    countryAr: 'الإمارات العربية المتحدة',
    latitude: 25.2048,
    longitude: 55.2708,
    timezoneOffsetHours: 4,
    timezoneName: 'Asia/Dubai',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'doha',
    nameAr: 'الدوحة',
    countryAr: 'دولة قطر',
    latitude: 25.2854,
    longitude: 51.531,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Qatar',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'kuwait',
    nameAr: 'الكويت',
    countryAr: 'دولة الكويت',
    latitude: 29.3759,
    longitude: 47.9774,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Kuwait',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'amman',
    nameAr: 'عمّان',
    countryAr: 'المملكة الأردنية الهاشمية',
    latitude: 31.9539,
    longitude: 35.9106,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Amman',
    defaultMethod: 'MWL',
  },
  {
    id: 'damascus',
    nameAr: 'دمشق',
    countryAr: 'الجمهورية العربية السورية',
    latitude: 33.5138,
    longitude: 36.2765,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Damascus',
    defaultMethod: 'MWL',
  },
  {
    id: 'baghdad',
    nameAr: 'بغداد',
    countryAr: 'جمهورية العراق',
    latitude: 33.3152,
    longitude: 44.3661,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Baghdad',
    defaultMethod: 'MWL',
  },
  {
    id: 'casablanca',
    nameAr: 'الدار البيضاء',
    countryAr: 'المملكة المغربية',
    latitude: 33.5731,
    longitude: -7.5898,
    timezoneOffsetHours: 1,
    timezoneName: 'Africa/Casablanca',
    defaultMethod: 'MWL',
  },
  {
    id: 'algiers',
    nameAr: 'الجزائر العاصمة',
    countryAr: 'الجمهورية الجزائرية',
    latitude: 36.7538,
    longitude: 3.0588,
    timezoneOffsetHours: 1,
    timezoneName: 'Africa/Algiers',
    defaultMethod: 'MWL',
  },
  {
    id: 'istanbul',
    nameAr: 'إسطنبول',
    countryAr: 'تركيا',
    latitude: 41.0082,
    longitude: 28.9784,
    timezoneOffsetHours: 3,
    timezoneName: 'Europe/Istanbul',
    defaultMethod: 'MWL',
  },
  {
    id: 'london',
    nameAr: 'لندن',
    countryAr: 'المملكة المتحدة',
    latitude: 51.5074,
    longitude: -0.1278,
    timezoneOffsetHours: 0,
    timezoneName: 'Europe/London',
    defaultMethod: 'MWL',
  },
];

export const KAABA_COORDS = {
  latitude: 21.422487,
  longitude: 39.826206,
};

export interface DailyPrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
  lastThird: string;
}

export type AstronomicalPrayerTimes = Pick<
  DailyPrayerTimes,
  'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
> &
  Partial<Pick<DailyPrayerTimes, 'midnight' | 'lastThird'>>;

export type MainPrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerMetadata {
  key: MainPrayerKey;
  nameAr: string;
  rakaatFard: string;
  sunnahBefore: string;
  sunnahAfter: string;
  descriptionAr: string;
}

export const PRAYER_METADATA: PrayerMetadata[] = [
  {
    key: 'fajr',
    nameAr: 'الفجر',
    rakaatFard: 'ركعتان (فرض)',
    sunnahBefore: 'ركعتان (سنة الفجر القبلية)',
    sunnahAfter: 'لا راتبة بعدها',
    descriptionAr: 'يبدأ بطلوع الفجر الصادق وينتهي بطلوع الشمس',
  },
  {
    key: 'sunrise',
    nameAr: 'الشروق',
    rakaatFard: 'وقت شروق الشمس',
    sunnahBefore: 'تُصلّى الضحى بعده بـ ١٥ دقيقة',
    sunnahAfter: 'صلاة الضحى (ركعتان إلى ٨ ركعات)',
    descriptionAr: 'نهاية وقت صلاة الفجر وبداية وقت الإشراق بعد ربع ساعة',
  },
  {
    key: 'dhuhr',
    nameAr: 'الظهر',
    rakaatFard: '٤ ركعات (فرض)',
    sunnahBefore: '٤ ركعات (مثنى مثنى)',
    sunnahAfter: 'ركعتان (راتبة بعدية)',
    descriptionAr: 'يبدأ بزوال الشمس عن كبد السماء إلى جهة الغرب',
  },
  {
    key: 'asr',
    nameAr: 'العصر',
    rakaatFard: '٤ ركعات (فرض)',
    sunnahBefore: '٤ ركعات (مستحبة غير راتبة)',
    sunnahAfter: 'لا راتبة بعدها',
    descriptionAr: 'يبدأ حين يصير ظل كل شيء مثله (أو مثليه عند الحنفية)',
  },
  {
    key: 'maghrib',
    nameAr: 'المغرب',
    rakaatFard: '٣ ركعات (فرض)',
    sunnahBefore: 'ركعتان (خفيفتان بعد الأذان)',
    sunnahAfter: 'ركعتان (راتبة مؤكدة)',
    descriptionAr: 'يبدأ بغروب قرص الشمس كاملاً وينتهي بمغيب الشفق الأحمر',
  },
  {
    key: 'isha',
    nameAr: 'العشاء',
    rakaatFard: '٤ ركعات (فرض)',
    sunnahBefore: 'ركعتان (بين الأذان والإقامة)',
    sunnahAfter: 'ركعتان راتبة + الوتر',
    descriptionAr: 'يبدأ بمغيب الشفق الأحمر ويمتد المختار إلى منتصف الليل',
  },
];

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function fixHour(a: number): number {
  const b = a - 24.0 * Math.floor(a / 24.0);
  return b < 0 ? b + 24.0 : b;
}

function fixAngle(a: number): number {
  const b = a - 360.0 * Math.floor(a / 360.0);
  return b < 0 ? b + 360.0 : b;
}

/**
 * Converts Julian date from standard calendar Year, Month (1-12), Day
 */
export function getJulianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
}

/**
 * Computes Sun Declination (degrees) and Equation of Time (hours) for Julian Date jd
 * Based on Jean Meeus Astronomical Algorithms / US Naval Observatory equations.
 */
export function getSunPosition(jd: number): { declination: number; equationOfTime: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(degToRad(g)) + 0.02 * Math.sin(degToRad(2 * g)));

  const e = 23.439 - 0.00000036 * D;
  const RA =
    radToDeg(
      Math.atan2(
        Math.cos(degToRad(e)) * Math.sin(degToRad(L)),
        Math.cos(degToRad(L))
      )
    ) / 15.0;
  const eqt = q / 15.0 - fixHour(RA);
  const decl = radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(L))));

  return { declination: decl, equationOfTime: eqt };
}

function formatHoursToHHMM(hours: number): string {
  if (Number.isNaN(hours)) return '00:00';
  const totalMinutes = Math.round(fixHour(hours) * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Astronomical calculation of daily prayer times for a given date, location, method, and Asr juristic rule.
 */
export function calculateAstronomicalPrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  timezoneOffsetHours: number,
  methodId: CalculationMethodId = 'UMM_AL_QURA',
  asrMethod: AsrJuristicMethod = 'STANDARD'
): DailyPrayerTimes {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = getJulianDate(year, month, day) - longitude / (15.0 * 24.0);
  const { declination, equationOfTime } = getSunPosition(jd + 0.5);

  const method = CALCULATION_METHODS[methodId] || CALCULATION_METHODS.UMM_AL_QURA;

  // Solar Noon (Dhuhr) in local standard time
  const transit = 12.0 + timezoneOffsetHours - longitude / 15.0 - equationOfTime;
  // Add 1.5 minutes precaution for Zawal (standard observatory practice)
  const dhuhrHours = transit + 1.5 / 60.0;

  const computeHourAngleForAltitude = (altitudeDeg: number): number => {
    const num =
      Math.sin(degToRad(altitudeDeg)) -
      Math.sin(degToRad(latitude)) * Math.sin(degToRad(declination));
    const den = Math.cos(degToRad(latitude)) * Math.cos(degToRad(declination));
    const cosH = Math.max(-1, Math.min(1, num / den));
    return radToDeg(Math.acos(cosH)) / 15.0;
  };

  // Sunrise and Sunset use -0.8333 degrees (atmospheric refraction + solar semi-diameter)
  const sunriseDiff = computeHourAngleForAltitude(-0.8333);
  const sunriseHours = transit - sunriseDiff;
  const maghribHours = transit + sunriseDiff + 1.5 / 60.0;

  // Fajr
  const fajrDiff = computeHourAngleForAltitude(-method.fajrAngle);
  const fajrHours = transit - fajrDiff;

  // Asr: shadow length factor = 1 (Standard) or 2 (Hanafi)
  const shadowFactor = asrMethod === 'HANAFI' ? 2 : 1;
  const asrAltitudeRad = Math.atan(
    1.0 / (shadowFactor + Math.tan(degToRad(Math.abs(latitude - declination))))
  );
  const asrDiff = computeHourAngleForAltitude(radToDeg(asrAltitudeRad));
  const asrHours = transit + asrDiff;

  // Isha
  let ishaHours: number;
  if (method.ishaMinutesAfterMaghrib) {
    ishaHours = maghribHours + method.ishaMinutesAfterMaghrib / 60.0;
  } else {
    const ishaDiff = computeHourAngleForAltitude(-(method.ishaAngle ?? 17));
    ishaHours = transit + ishaDiff;
  }

  // Night duration from Maghrib to next Fajr
  const nightDuration = fixHour(fajrHours - maghribHours);
  const midnightHours = fixHour(maghribHours + nightDuration / 2.0);
  const lastThirdHours = fixHour(maghribHours + (nightDuration * 2.0) / 3.0);

  return {
    fajr: formatHoursToHHMM(fajrHours),
    sunrise: formatHoursToHHMM(sunriseHours),
    dhuhr: formatHoursToHHMM(dhuhrHours),
    asr: formatHoursToHHMM(asrHours),
    maghrib: formatHoursToHHMM(maghribHours),
    isha: formatHoursToHHMM(ishaHours),
    midnight: formatHoursToHHMM(midnightHours),
    lastThird: formatHoursToHHMM(lastThirdHours),
  };
}

/**
 * Calculates the exact Great-Circle Qibla bearing in degrees from True North (0-360)
 */
export function calculateQiblaDirection(latitude: number, longitude: number): number {
  if (
    Math.abs(latitude - KAABA_COORDS.latitude) < 0.0005 &&
    Math.abs(longitude - KAABA_COORDS.longitude) < 0.0005
  ) {
    return 0;
  }

  const phi1 = degToRad(latitude);
  const phi2 = degToRad(KAABA_COORDS.latitude);
  const deltaLambda = degToRad(KAABA_COORDS.longitude - longitude);

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
  const theta = radToDeg(Math.atan2(y, x));
  return Math.round(((theta + 360) % 360) * 10) / 10;
}

/**
 * Calculates Haversine Great-Circle distance to the Holy Kaaba in kilometers
 */
export function calculateDistanceToKaaba(latitude: number, longitude: number): number {
  const R = 6371.0; // Earth mean radius in km
  const dLat = degToRad(KAABA_COORDS.latitude - latitude);
  const dLon = degToRad(KAABA_COORDS.longitude - longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(latitude)) *
      Math.cos(degToRad(KAABA_COORDS.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Returns Arabic cardinal direction name for a given bearing degree (0-360)
 */
export function getCardinalDirectionAr(angleDeg: number): string {
  const normalized = ((angleDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'الشمال';
  if (normalized >= 22.5 && normalized < 67.5) return 'الشمال الشرقي';
  if (normalized >= 67.5 && normalized < 112.5) return 'الشرق';
  if (normalized >= 112.5 && normalized < 157.5) return 'الجنوب الشرقي';
  if (normalized >= 157.5 && normalized < 202.5) return 'الجنوب';
  if (normalized >= 202.5 && normalized < 247.5) return 'الجنوب الغربي';
  if (normalized >= 247.5 && normalized < 292.5) return 'الغرب';
  return 'الشمال الغربي';
}

export function parseTimeHHMMToMinutes(hhmm: string): number {
  const clean = hhmm.trim().split(' ')[0];
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  return h * 60 + m;
}

export interface NextPrayerStatus {
  currentPrayerKey: MainPrayerKey;
  nextPrayerKey: MainPrayerKey;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  remainingSeconds: number;
  remainingFormatted: string;
  progressPercent: number;
}

/**
 * Determines the current & next prayer and remaining countdown time
 */
export function getNextPrayerInfo(
  times: DailyPrayerTimes,
  nowHours: number,
  nowMinutes: number,
  nowSeconds: number = 0
): NextPrayerStatus {
  const order: { key: MainPrayerKey; nameAr: string; time: string }[] = [
    { key: 'fajr', nameAr: 'الفجر', time: times.fajr },
    { key: 'sunrise', nameAr: 'الشروق', time: times.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', time: times.dhuhr },
    { key: 'asr', nameAr: 'العصر', time: times.asr },
    { key: 'maghrib', nameAr: 'المغرب', time: times.maghrib },
    { key: 'isha', nameAr: 'العشاء', time: times.isha },
  ];

  const nowTotalSeconds = nowHours * 3600 + nowMinutes * 60 + nowSeconds;

  let nextIdx = 0;
  let currentIdx = order.length - 1;

  for (let i = 0; i < order.length; i++) {
    const pSeconds = parseTimeHHMMToMinutes(order[i].time) * 60;
    if (pSeconds > nowTotalSeconds) {
      nextIdx = i;
      currentIdx = (i - 1 + order.length) % order.length;
      break;
    }
    if (i === order.length - 1) {
      // Past Isha: next prayer is tomorrow's Fajr
      nextIdx = 0;
      currentIdx = order.length - 1;
    }
  }

  const nextP = order[nextIdx];
  const currP = order[currentIdx];

  const nextSeconds = parseTimeHHMMToMinutes(nextP.time) * 60;
  const currSeconds = parseTimeHHMMToMinutes(currP.time) * 60;

  let remainingSeconds = nextSeconds - nowTotalSeconds;
  if (remainingSeconds <= 0) {
    remainingSeconds += 24 * 3600;
  }

  let windowSeconds = nextSeconds - currSeconds;
  if (windowSeconds <= 0) {
    windowSeconds += 24 * 3600;
  }

  const elapsedSeconds = Math.max(0, windowSeconds - remainingSeconds);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedSeconds / Math.max(1, windowSeconds)) * 100))
  );

  const remH = Math.floor(remainingSeconds / 3600);
  const remM = Math.floor((remainingSeconds % 3600) / 60);
  const remS = remainingSeconds % 60;

  const remainingFormatted = `${String(remH).padStart(2, '0')}:${String(remM).padStart(
    2,
    '0'
  )}:${String(remS).padStart(2, '0')}`;

  return {
    currentPrayerKey: currP.key,
    nextPrayerKey: nextP.key,
    nextPrayerNameAr: nextP.nameAr,
    nextPrayerTime: nextP.time,
    remainingSeconds,
    remainingFormatted,
    progressPercent,
  };
}

export const HIJRI_MONTHS_AR = [
  'محرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوّال',
  'ذو القعدة',
  'ذو الحجة',
];

export interface HijriDateDetails {
  day: number;
  monthIndex: number; // 1-12
  monthNameAr: string;
  year: number;
  formattedAr: string;
}

/**
 * Converts a Gregorian Date to Hijri Date (Umm al-Qura / Kuwaiti astronomical algorithm)
 */
export function gregorianToHijri(date: Date, adjustmentDays: number = 0): HijriDateDetails {
  const adjusted = new Date(date.getTime() + adjustmentDays * 86400000);
  const jd = getJulianDate(
    adjusted.getFullYear(),
    adjusted.getMonth() + 1,
    adjusted.getDate()
  );

  const l = Math.floor(jd - 1948439.5 + 10632);
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  const clampedMonth = Math.max(1, Math.min(12, month));
  const monthNameAr = HIJRI_MONTHS_AR[clampedMonth - 1];

  return {
    day,
    monthIndex: clampedMonth,
    monthNameAr,
    year,
    formattedAr: `${day} ${monthNameAr} ${year} هـ`,
  };
}

/**
 * Strips extended Quranic pause/annotation symbols (U+06D6..U+06ED) that render as missing-glyph tofu boxes
 * in standard web fonts while preserving all Arabic letters, standard tashkeel, and dagger alif (U+0670).
 */
export function sanitizeQuranicText(text: string): string {
  return text
    .replace(/\uFEFF/g, '')
    .replace(/[\u06D6-\u06ED\u0653-\u0655]/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes an Arabic word to its bare consonant skeleton for reliable Basmalah prefix detection
 */
function toArabicSkeleton(word: string): string {
  return word
    .replace(/\uFEFF/g, '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Strips the prepended opening Basmalah from Ayah 1 of Surahs (except mid-ayah Basmalah like 27:30).
 * In AlQuran Cloud's `quran-uthmani` edition, Ayah 1 of Surahs starts with
 * "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ " concatenated onto the first verse.
 * Removing it prevents the Basmalah from being duplicated under the Surah header or counted inside Ayah 1.
 */
export function stripLeadingBasmalah(
  rawText: string,
  surahNumber: number,
  ayahNumberInSurah: number
): string {
  const cleaned = rawText.replace(/\uFEFF/g, '').trim();
  if (!cleaned) return '';

  // In any ayah other than Ayah 1 (e.g. Surah 27 Ayah 30), never strip Basmalah.
  if (surahNumber === 9 || ayahNumberInSurah !== 1) {
    return cleaned;
  }

  const words = cleaned.split(/\s+/);
  if (words.length >= 4) {
    const w0 = toArabicSkeleton(words[0]);
    const w1 = toArabicSkeleton(words[1]);
    const w2 = toArabicSkeleton(words[2]);
    const w3 = toArabicSkeleton(words[3]);

    if (w0 === 'بسم' && w1 === 'الله' && w2 === 'الرحمن' && w3 === 'الرحيم') {
      let restIndex = 4;
      // Skip any standalone Quranic pause/ornament mark immediately following the Basmalah
      while (restIndex < words.length && toArabicSkeleton(words[restIndex]) === '') {
        restIndex++;
      }
      const remainder = words.slice(restIndex).join(' ').trim();
      if (remainder.length > 0) {
        return remainder;
      }
    }
  }

  return cleaned;
}

/**
 * Determines whether a Surah should display an unnumbered opening Basmalah line
 * directly beneath its Surah header banner (all Surahs 1..114 except Surah 9 At-Tawbah).
 */
export function shouldShowUnnumberedBasmalah(
  surahNumber: number,
  firstAyahNumberInSurah: number = 1
): boolean {
  return firstAyahNumberInSurah === 1 && surahNumber !== 9;
}

/**
 * Resolves the target Mushaf page (1..604) given a horizontal touch/mouse swipe gesture.
 * - deltaX = endX - startX (positive = swipe right, negative = swipe left)
 * - Ignores predominantly vertical scrolls or tiny taps (< minSwipeDistance).
 * - In RTL Arabic Mushaf: swiping right (deltaX > 0) turns to the next page (currentPage + 1),
 *   and swiping left (deltaX < 0) returns to the previous page (currentPage - 1).
 *   On Page 1, swiping left also advances to Page 2 so first-time users can swipe either way.
 */
export function resolveMushafSwipePage(
  currentPage: number,
  deltaX: number,
  deltaY: number,
  minSwipeDistance: number = 40
): number {
  const clampedCurrent = Math.max(1, Math.min(604, currentPage));
  if (
    Math.abs(deltaX) < minSwipeDistance ||
    Math.abs(deltaX) < Math.abs(deltaY) * 1.15
  ) {
    return clampedCurrent;
  }

  if (deltaX > 0) {
    // Swipe right -> Next page in RTL Mushaf
    return Math.min(604, clampedCurrent + 1);
  } else {
    // Swipe left -> Previous page (or Page 2 if starting at Page 1)
    if (clampedCurrent === 1) {
      return 2;
    }
    return Math.max(1, clampedCurrent - 1);
  }
}

export function toArabicNumerals(n: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n).replace(/\d/g, (d) => arabicDigits[Number(d)]);
}





