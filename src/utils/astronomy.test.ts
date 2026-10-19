import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAstronomicalPrayerTimes,
  calculateQiblaDirection,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
  getNextPrayerInfo,
  gregorianToHijri,
  parseTimeHHMMToMinutes,
  sanitizeQuranicText,
  stripLeadingBasmalah,
  shouldShowUnnumberedBasmalah,
  resolveMushafSwipePage,
} from './astronomy.ts';

test('Astronomical prayer times for Makkah follow chronological order (Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha)', () => {
  const date = new Date(2026, 9, 17); // Oct 17, 2026
  const times = calculateAstronomicalPrayerTimes(date, 21.4225, 39.8262, 3, 'UMM_AL_QURA', 'STANDARD');

  const fajrMin = parseTimeHHMMToMinutes(times.fajr);
  const sunriseMin = parseTimeHHMMToMinutes(times.sunrise);
  const dhuhrMin = parseTimeHHMMToMinutes(times.dhuhr);
  const asrMin = parseTimeHHMMToMinutes(times.asr);
  const maghribMin = parseTimeHHMMToMinutes(times.maghrib);
  const ishaMin = parseTimeHHMMToMinutes(times.isha);

  assert.equal(fajrMin < sunriseMin, true, 'Fajr should be before Sunrise');
  assert.equal(sunriseMin < dhuhrMin, true, 'Sunrise should be before Dhuhr');
  assert.equal(dhuhrMin < asrMin, true, 'Dhuhr should be before Asr');
  assert.equal(asrMin < maghribMin, true, 'Asr should be before Maghrib');
  assert.equal(maghribMin < ishaMin, true, 'Maghrib should be before Isha');
  // In Umm al-Qura method, Isha is 90 minutes after Maghrib
  assert.equal(ishaMin - maghribMin, 90, 'Umm al-Qura Isha is 90 minutes after Maghrib');
});

test('Hanafi Asr calculation is later than Standard (Shafi/Maliki/Hanbali) Asr calculation', () => {
  const date = new Date(2026, 9, 17);
  const standardTimes = calculateAstronomicalPrayerTimes(date, 30.0444, 31.2357, 2, 'EGYPTIAN', 'STANDARD');
  const hanafiTimes = calculateAstronomicalPrayerTimes(date, 30.0444, 31.2357, 2, 'EGYPTIAN', 'HANAFI');

  assert.equal(
    parseTimeHHMMToMinutes(hanafiTimes.asr) > parseTimeHHMMToMinutes(standardTimes.asr),
    true,
    'Hanafi Asr should occur after Standard Asr'
  );
});

test('Qibla direction and distance to Kaaba are accurate for Cairo and Madinah', () => {
  // Cairo (30.0444 N, 31.2357 E) -> Qibla is Southeast (~136.2 degrees)
  const cairoQibla = calculateQiblaDirection(30.0444, 31.2357);
  assert.equal(cairoQibla > 134 && cairoQibla < 138, true, `Expected ~136.2°, got ${cairoQibla}`);
  assert.equal(getCardinalDirectionAr(cairoQibla), 'الجنوب الشرقي');

  const cairoDist = calculateDistanceToKaaba(30.0444, 31.2357);
  assert.equal(cairoDist > 1250 && cairoDist < 1320, true, `Expected ~1287 km, got ${cairoDist}`);

  // Madinah (24.4672 N, 39.6112 E) -> Qibla is almost due South (~176-177 degrees)
  const madinahQibla = calculateQiblaDirection(24.4672, 39.6112);
  assert.equal(madinahQibla > 174 && madinahQibla < 180, true);
  assert.equal(getCardinalDirectionAr(madinahQibla), 'الجنوب');
});

test('getNextPrayerInfo correctly identifies upcoming prayer and formats countdown', () => {
  const sampleTimes = {
    fajr: '05:00',
    sunrise: '06:15',
    dhuhr: '12:05',
    asr: '15:25',
    maghrib: '17:55',
    isha: '19:25',
    midnight: '23:27',
    lastThird: '01:18',
  };

  // At 14:00, current is Dhuhr, next is Asr (1h 25m remaining)
  const info = getNextPrayerInfo(sampleTimes, 14, 0, 0);
  assert.equal(info.currentPrayerKey, 'dhuhr');
  assert.equal(info.nextPrayerKey, 'asr');
  assert.equal(info.nextPrayerNameAr, 'العصر');
  assert.equal(info.remainingFormatted, '01:25:00');

  // At 21:00 (after Isha), current is Isha, next is Fajr (8h 00m remaining)
  const nightInfo = getNextPrayerInfo(sampleTimes, 21, 0, 0);
  assert.equal(nightInfo.currentPrayerKey, 'isha');
  assert.equal(nightInfo.nextPrayerKey, 'fajr');
  assert.equal(nightInfo.remainingFormatted, '08:00:00');
});

test('gregorianToHijri returns valid Hijri date and month name', () => {
  const d = new Date(2026, 9, 17);
  const hijri = gregorianToHijri(d);
  assert.equal(hijri.year >= 1447 && hijri.year <= 1449, true);
  assert.equal(hijri.day >= 1 && hijri.day <= 30, true);
  assert.equal(hijri.formattedAr.includes('هـ'), true);
});

test('sanitizeQuranicText strips extended pause symbols that cause missing glyph boxes', () => {
  const raw = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ ۗ وَٱلضُّحَىٰٓ';
  const cleaned = sanitizeQuranicText(raw);
  assert.equal(/[\u06D6-\u06ED\u0653-\u0655]/.test(cleaned), false);
  assert.equal(cleaned.includes('الْقَيُّومُ'), true);
});

test('stripLeadingBasmalah removes duplicate API Basmalah from Surahs while preserving mid-ayah Basmalah', () => {
  // Surah 1 (Al-Fatihah): unnumbered Basmalah header is shown once at top, not counted as an Ayah
  assert.equal(shouldShowUnnumberedBasmalah(1, 1), true);

  // Surah 2 (Al-Baqarah): API prepends Basmalah onto Ayah 1 ("الم") -> must strip Basmalah!
  const baqarah1 = stripLeadingBasmalah('\uFEFFبِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الم', 2, 1);
  assert.equal(baqarah1, 'الم');
  assert.equal(shouldShowUnnumberedBasmalah(2, 1), true);

  // Surah 112 (Al-Ikhlas): API prepends Basmalah onto Ayah 1 -> must strip Basmalah!
  const ikhlas1 = stripLeadingBasmalah(
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    112,
    1
  );
  assert.equal(ikhlas1, 'قُلْ هُوَ ٱللَّهُ أَحَدٌ');
  assert.equal(shouldShowUnnumberedBasmalah(112, 1), true);

  // Surah 9 (At-Tawbah): No unnumbered Basmalah header
  assert.equal(shouldShowUnnumberedBasmalah(9, 1), false);

  // Surah 27 (An-Naml, Ayah 30): Mid-ayah Basmalah must remain untouched
  const naml30 = stripLeadingBasmalah(
    'إِنَّهُۥ مِن سُلَيْمَٰنَ وَإِنَّهُۥ بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    27,
    30
  );
  assert.equal(naml30.includes('بِسْمِ ٱللَّهِ'), true);
});

test('resolveMushafSwipePage navigates pages by horizontal swipe right and left', () => {
  // Swiping right (deltaX > 0) turns to the next page
  assert.equal(resolveMushafSwipePage(1, 90, 10), 2);
  assert.equal(resolveMushafSwipePage(2, 85, 5), 3);

  // Swiping left (deltaX < 0) on page > 1 returns to previous page
  assert.equal(resolveMushafSwipePage(2, -90, 10), 1);
  assert.equal(resolveMushafSwipePage(604, -100, 12), 603);

  // Swiping left on Page 1 also advances to Page 2 so user can swipe either way on Page 1
  assert.equal(resolveMushafSwipePage(1, -90, 8), 2);

  // Vertical scrolls or tiny taps do not change page
  assert.equal(resolveMushafSwipePage(5, 15, 4), 5);
  assert.equal(resolveMushafSwipePage(5, 60, 120), 5);
});




