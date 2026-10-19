import {
  VERIFIED_CITIES,
  calculateQiblaDirection,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
  type CityLocation,
  type CalculationMethodId,
} from './astronomy.ts';

/**
 * Extended catalog of Arab and global cities for accurate offline/online nearest-city matching
 * and instant selection.
 */
export const EXTENDED_ARAB_AND_WORLD_CITIES: CityLocation[] = [
  ...VERIFIED_CITIES,
  {
    id: 'jeddah',
    nameAr: 'جدة',
    countryAr: 'المملكة العربية السعودية',
    latitude: 21.5433,
    longitude: 39.1728,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'dammam',
    nameAr: 'الدمام والخبر',
    countryAr: 'المملكة العربية السعودية',
    latitude: 26.4207,
    longitude: 50.0888,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'abha',
    nameAr: 'أبها',
    countryAr: 'المملكة العربية السعودية',
    latitude: 18.2164,
    longitude: 42.5053,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'tabuk',
    nameAr: 'تبوك',
    countryAr: 'المملكة العربية السعودية',
    latitude: 28.3838,
    longitude: 36.555,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'buraidah',
    nameAr: 'بريدة (القصيم)',
    countryAr: 'المملكة العربية السعودية',
    latitude: 26.326,
    longitude: 43.975,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Riyadh',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'alexandria',
    nameAr: 'الإسكندرية',
    countryAr: 'جمهورية مصر العربية',
    latitude: 31.2001,
    longitude: 29.9187,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Cairo',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'mansoura',
    nameAr: 'المنصورة',
    countryAr: 'جمهورية مصر العربية',
    latitude: 31.0409,
    longitude: 31.3785,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Cairo',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'aswan',
    nameAr: 'أسوان',
    countryAr: 'جمهورية مصر العربية',
    latitude: 24.0889,
    longitude: 32.8998,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Cairo',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'abudhabi',
    nameAr: 'أبوظبي',
    countryAr: 'الإمارات العربية المتحدة',
    latitude: 24.4539,
    longitude: 54.3773,
    timezoneOffsetHours: 4,
    timezoneName: 'Asia/Dubai',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'manama',
    nameAr: 'المنامة',
    countryAr: 'مملكة البحرين',
    latitude: 26.2285,
    longitude: 50.586,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Bahrain',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'muscat',
    nameAr: 'مسقط',
    countryAr: 'سلطنة عُمان',
    latitude: 23.588,
    longitude: 58.3829,
    timezoneOffsetHours: 4,
    timezoneName: 'Asia/Muscat',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'sanaa',
    nameAr: 'صنعاء',
    countryAr: 'الجمهورية اليمنية',
    latitude: 15.3694,
    longitude: 44.191,
    timezoneOffsetHours: 3,
    timezoneName: 'Asia/Aden',
    defaultMethod: 'UMM_AL_QURA',
  },
  {
    id: 'beirut',
    nameAr: 'بيروت',
    countryAr: 'الجمهورية اللبنانية',
    latitude: 33.8938,
    longitude: 35.5018,
    timezoneOffsetHours: 2,
    timezoneName: 'Asia/Beirut',
    defaultMethod: 'MWL',
  },
  {
    id: 'khartoum',
    nameAr: 'الخرطوم',
    countryAr: 'جمهورية السودان',
    latitude: 15.5007,
    longitude: 32.5599,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Khartoum',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'tripoli',
    nameAr: 'طرابلس',
    countryAr: 'دولة ليبيا',
    latitude: 32.8872,
    longitude: 13.1913,
    timezoneOffsetHours: 2,
    timezoneName: 'Africa/Tripoli',
    defaultMethod: 'EGYPTIAN',
  },
  {
    id: 'tunis',
    nameAr: 'تونس العاصمة',
    countryAr: 'الجمهورية التونسية',
    latitude: 36.8065,
    longitude: 10.1815,
    timezoneOffsetHours: 1,
    timezoneName: 'Africa/Tunis',
    defaultMethod: 'MWL',
  },
];

/**
 * Computes Haversine distance in kilometers between two coordinates.
 */
export function calculateDistanceBetweenCoordsKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the closest city from EXTENDED_ARAB_AND_WORLD_CITIES to given coordinates.
 */
export function findNearestCatalogCity(
  latitude: number,
  longitude: number
): { city: CityLocation; distanceKm: number } {
  let bestCity = EXTENDED_ARAB_AND_WORLD_CITIES[0];
  let bestDist = Infinity;

  for (const city of EXTENDED_ARAB_AND_WORLD_CITIES) {
    const dist = calculateDistanceBetweenCoordsKm(
      latitude,
      longitude,
      city.latitude,
      city.longitude
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestCity = city;
    }
  }

  return { city: bestCity, distanceKm: bestDist };
}

/**
 * Recommends the appropriate astronomical calculation method based on country code or coordinates.
 */
export function inferCalculationMethodForLocation(
  latitude: number,
  longitude: number,
  countryNameOrCode: string = ''
): CalculationMethodId {
  const norm = countryNameOrCode.toLowerCase();

  if (
    norm.includes('saudi') ||
    norm.includes('سعودي') ||
    norm.includes('قطر') ||
    norm.includes('qatar') ||
    norm.includes('إمارات') ||
    norm.includes('united arab emirates') ||
    norm.includes('كويت') ||
    norm.includes('kuwait') ||
    norm.includes('بحرين') ||
    norm.includes('bahrain') ||
    norm.includes('عمان') ||
    norm.includes('oman') ||
    norm.includes('يمن') ||
    norm.includes('yemen') ||
    /\b(sa|ae|qa|kw|bh|om|ye)\b/.test(norm)
  ) {
    return 'UMM_AL_QURA';
  }

  if (
    norm.includes('egypt') ||
    norm.includes('مصر') ||
    norm.includes('سودان') ||
    norm.includes('sudan') ||
    norm.includes('ليبيا') ||
    norm.includes('libya') ||
    /\b(eg|sd|ly)\b/.test(norm)
  ) {
    return 'EGYPTIAN';
  }

  if (
    norm.includes('pakistan') ||
    norm.includes('باكستان') ||
    norm.includes('india') ||
    norm.includes('هند') ||
    norm.includes('bangladesh') ||
    /\b(pk|in|bd|af)\b/.test(norm)
  ) {
    return 'KARACHI';
  }

  if (
    norm.includes('united states') ||
    norm.includes('canada') ||
    norm.includes('أمريكا') ||
    norm.includes('كندا') ||
    /\b(us|ca)\b/.test(norm)
  ) {
    return 'ISNA';
  }

  // Fallback by bounding box if country string is empty
  if (latitude >= 12 && latitude <= 32 && longitude >= 34.5 && longitude <= 60) {
    // Arabian Peninsula
    return 'UMM_AL_QURA';
  }
  if (latitude >= 15 && latitude <= 32 && longitude >= 24 && longitude < 34.5) {
    // Egypt / Sudan
    return 'EGYPTIAN';
  }
  if (longitude <= -50) {
    return 'ISNA';
  }

  return 'MWL';
}

export interface QiblaAlignmentState {
  qiblaBearingDeg: number;
  deviceHeadingDeg: number;
  /** Clockwise rotation (0..360) of the Qibla pointer relative to the top of the user's phone */
  relativePointerDeg: number;
  /** Shortest signed turn angle (-180..+180): positive = turn right (clockwise), negative = turn left */
  turnDeltaDeg: number;
  isAligned: boolean;
  cardinalAr: string;
  distanceKm: number;
  guidanceTextAr: string;
}

/**
 * Computes complete Qibla compass alignment geometry and Arabic turn-by-turn guidance
 * given user coordinates and current device compass heading (0 = North, 90 = East).
 */
export function computeQiblaCompassAlignment(
  latitude: number,
  longitude: number,
  deviceHeadingDeg: number = 0
): QiblaAlignmentState {
  const qiblaBearingDeg = calculateQiblaDirection(latitude, longitude);
  const distanceKm = calculateDistanceToKaaba(latitude, longitude);
  const cardinalAr = getCardinalDirectionAr(qiblaBearingDeg);

  const normalizedHeading = ((deviceHeadingDeg % 360) + 360) % 360;
  const relativePointerDeg =
    Math.round((((qiblaBearingDeg - normalizedHeading) % 360) + 360) % 360 * 10) / 10;

  // Signed delta in [-180, 180]
  let turnDeltaDeg = relativePointerDeg;
  if (turnDeltaDeg > 180) {
    turnDeltaDeg -= 360;
  }
  turnDeltaDeg = Math.round(turnDeltaDeg);

  // If user is right at the Kaaba (< 1 km)
  if (distanceKm === 0 && Math.abs(latitude - 21.4225) < 0.02 && Math.abs(longitude - 39.8262) < 0.02) {
    return {
      qiblaBearingDeg,
      deviceHeadingDeg: normalizedHeading,
      relativePointerDeg: 0,
      turnDeltaDeg: 0,
      isAligned: true,
      cardinalAr: 'جوار الكعبة المشرفة',
      distanceKm: 0,
      guidanceTextAr: 'أنت في رحاب مكة المكرمة بجوار الكعبة المشرفة — اختر مدينتك أو اضغط «تحديد موقعي» لحساب القبلة من موقعك',
    };
  }

  const isAligned = Math.abs(turnDeltaDeg) <= 5;

  let guidanceTextAr: string;
  if (isAligned) {
    guidanceTextAr = `أنت تواجه اتجاه القبلة الصحيح الآن نحو الكعبة المشرفة (${qiblaBearingDeg}° ${cardinalAr})`;
  } else if (turnDeltaDeg > 0) {
    guidanceTextAr = `اتجه نحو اليمين بمقدار ${Math.abs(turnDeltaDeg)}° للوصول إلى اتجاه القبلة (${qiblaBearingDeg}° ${cardinalAr})`;
  } else {
    guidanceTextAr = `اتجه نحو اليسار بمقدار ${Math.abs(turnDeltaDeg)}° للوصول إلى اتجاه القبلة (${qiblaBearingDeg}° ${cardinalAr})`;
  }

  return {
    qiblaBearingDeg,
    deviceHeadingDeg: normalizedHeading,
    relativePointerDeg,
    turnDeltaDeg,
    isAligned,
    cardinalAr,
    distanceKm,
    guidanceTextAr,
  };
}

export interface DetectedLocationResult {
  city: CityLocation;
  source: 'gps' | 'ip' | 'timezone';
  statusMessageAr: string;
}

/**
 * Reverse-geocodes (latitude, longitude) to an Arabic city & country name using OpenStreetMap Nominatim,
 * falling back cleanly to the nearest known city or coordinate label if offline.
 */
export async function resolveArabicLocationDetails(
  latitude: number,
  longitude: number,
  fallbackCityName?: string,
  fallbackCountryName?: string
): Promise<{ nameAr: string; countryAr: string; methodId: CalculationMethodId }> {
  const nearest = findNearestCatalogCity(latitude, longitude);

  // If very close (< 25 km) to a known catalog city, we already have a verified Arabic name & method
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&zoom=10&accept-language=ar`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'ar' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      const rawCity =
        addr.city ||
        addr.town ||
        addr.state ||
        addr.county ||
        addr.municipality ||
        addr.village ||
        data?.name ||
        fallbackCityName;
      const rawCountry = addr.country || fallbackCountryName || nearest.city.countryAr;
      const countryCode = addr.country_code || '';

      if (rawCity) {
        const methodId = inferCalculationMethodForLocation(
          latitude,
          longitude,
          `${rawCountry} ${countryCode}`
        );
        return {
          nameAr: String(rawCity),
          countryAr: String(rawCountry || 'الموقع الحالي'),
          methodId,
        };
      }
    }
  } catch {
    // Ignore network error and use nearest city / fallback
  }

  if (nearest.distanceKm <= 45) {
    return {
      nameAr: nearest.city.nameAr,
      countryAr: nearest.city.countryAr,
      methodId: nearest.city.defaultMethod,
    };
  }

  const nameAr =
    fallbackCityName ||
    `موقعي (${latitude.toFixed(2)}°، ${longitude.toFixed(2)}°)`;
  const countryAr = fallbackCountryName || nearest.city.countryAr;
  const methodId = inferCalculationMethodForLocation(latitude, longitude, countryAr);

  return { nameAr, countryAr, methodId };
}

/**
 * Multi-stage user location detector:
 * 1. Tries browser HTML5 Geolocation API (high accuracy, then low accuracy).
 * 2. If blocked by iframe policy, permission denied, or timed out, automatically falls back to
 *    IP-based geolocation (ipwho.is / geojs.io).
 * 3. If offline or IP geo is blocked, falls back to matching the browser's IANA timezone.
 */
export async function detectUserLocation(): Promise<DetectedLocationResult> {
  const tzOffset = -new Date().getTimezoneOffset() / 60;
  const tzName =
    (typeof Intl !== 'undefined' &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    'UTC';

  // Stage 1: Browser GPS Geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const getPos = (highAccuracy: boolean, timeoutMs: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 120000,
        });
      });

    try {
      let pos: GeolocationPosition;
      try {
        pos = await getPos(true, 4500);
      } catch {
        pos = await getPos(false, 3500);
      }

      const lat = Math.round(pos.coords.latitude * 10000) / 10000;
      const lng = Math.round(pos.coords.longitude * 10000) / 10000;
      const details = await resolveArabicLocationDetails(lat, lng);

      const city: CityLocation = {
        id: `gps-${lat}-${lng}`,
        nameAr: details.nameAr,
        countryAr: details.countryAr,
        latitude: lat,
        longitude: lng,
        timezoneOffsetHours: tzOffset,
        timezoneName: tzName,
        defaultMethod: details.methodId,
      };

      return {
        city,
        source: 'gps',
        statusMessageAr: `تم تحديد موقعك بدقة عبر GPS: ${city.nameAr} (${city.countryAr}) — القبلة ${calculateQiblaDirection(lat, lng)}°`,
      };
    } catch {
      // Proceed to Stage 2 (IP Geolocation fallback)
    }
  }

  // Stage 2: HTTPS IP Geolocation Fallback (works even when iframe blocks navigator.geolocation)
  const ipEndpoints = [
    'https://ipwho.is/?lang=ar',
    'https://get.geojs.io/v1/ip/geo.json',
  ];

  for (const endpoint of ipEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();

      const rawLat = Number(data.latitude);
      const rawLng = Number(data.longitude);
      if (
        !Number.isFinite(rawLat) ||
        !Number.isFinite(rawLng) ||
        (rawLat === 0 && rawLng === 0)
      ) {
        continue;
      }

      const lat = Math.round(rawLat * 10000) / 10000;
      const lng = Math.round(rawLng * 10000) / 10000;

      const details = await resolveArabicLocationDetails(
        lat,
        lng,
        data.city || undefined,
        data.country || undefined
      );

      const city: CityLocation = {
        id: `ip-${lat}-${lng}`,
        nameAr: details.nameAr,
        countryAr: details.countryAr,
        latitude: lat,
        longitude: lng,
        timezoneOffsetHours: tzOffset,
        timezoneName: data.timezone?.id || data.timezone || tzName,
        defaultMethod: details.methodId,
      };

      return {
        city,
        source: 'ip',
        statusMessageAr: `تم تحديد موقعك تلقائياً: ${city.nameAr} (${city.countryAr}) — القبلة ${calculateQiblaDirection(lat, lng)}°`,
      };
    } catch {
      // Try next endpoint
    }
  }

  // Stage 3: Browser Timezone Fallback
  const tzMatch = EXTENDED_ARAB_AND_WORLD_CITIES.find(
    (c) => c.timezoneName.toLowerCase() === tzName.toLowerCase()
  );
  if (tzMatch) {
    return {
      city: tzMatch,
      source: 'timezone',
      statusMessageAr: `تم تحديد موقعك حسب منطقتك الزمنية: ${tzMatch.nameAr} — القبلة ${calculateQiblaDirection(tzMatch.latitude, tzMatch.longitude)}°`,
    };
  }

  // Fallback by timezone offset
  const offsetMatch =
    EXTENDED_ARAB_AND_WORLD_CITIES.find(
      (c) => c.timezoneOffsetHours === tzOffset && c.id !== 'makkah'
    ) || EXTENDED_ARAB_AND_WORLD_CITIES[2]; // Cairo

  return {
    city: offsetMatch,
    source: 'timezone',
    statusMessageAr: `تم ضبط الموقع الأقرب لمنطقتك الزمنية: ${offsetMatch.nameAr} — القبلة ${calculateQiblaDirection(offsetMatch.latitude, offsetMatch.longitude)}°`,
  };
}
