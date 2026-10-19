import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePrayerIntervalProgress,
  getWidgetDailyAyah,
  buildWidgetEmbedSnippet,
  buildStandalonePhoneWidgetUrl,
  buildLockScreenNotificationPayload,
  generateIOSScriptableWidgetScript,
  getUpcomingHijriNoteAr,
  WIDGET_THEMES,
  WIDGET_CATALOG,
} from './widgetEngine.ts';
import type { AstronomicalPrayerTimes } from './astronomy.ts';

const SAMPLE_TIMES: AstronomicalPrayerTimes = {
  fajr: '05:00',
  sunrise: '06:20',
  dhuhr: '12:15',
  asr: '15:35',
  maghrib: '18:10',
  isha: '19:40',
};

test('calculatePrayerIntervalProgress computes midpoint between Dhuhr and Asr accurately', () => {
  const progress = calculatePrayerIntervalProgress(SAMPLE_TIMES, 13, 55, 0);
  assert.equal(progress.previousPrayerKey, 'dhuhr');
  assert.equal(progress.nextPrayerKey, 'asr');
  assert.equal(progress.progressPercent, 50);
  assert.equal(progress.isDaytime, true);
});

test('calculatePrayerIntervalProgress handles overnight interval after Isha before Fajr', () => {
  const progress = calculatePrayerIntervalProgress(SAMPLE_TIMES, 0, 20, 0);
  assert.equal(progress.previousPrayerKey, 'isha');
  assert.equal(progress.nextPrayerKey, 'fajr');
  assert.equal(progress.progressPercent, 50);
  assert.equal(progress.isDaytime, false);
});

test('getWidgetDailyAyah cycles through curated ayahs deterministically', () => {
  const ayah1 = getWidgetDailyAyah(1, 0);
  const ayah2 = getWidgetDailyAyah(1, 1);
  assert.ok(ayah1.ayahText.length > 10);
  assert.notEqual(ayah1.id, ayah2.id);
});

test('WIDGET_CATALOG defines 6 distinct specialized widgets and getUpcomingHijriNoteAr works', () => {
  assert.equal(WIDGET_CATALOG.length, 6);
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'next_prayer_arc'));
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'daily_schedule'));
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'quran_wird'));
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'tasbih_dhikr'));
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'qibla_hijri'));
  assert.ok(WIDGET_CATALOG.some((w) => w.id === 'lockscreen_compact'));

  const whiteDayNote = getUpcomingHijriNoteAr(14, 'ربيع الأول');
  assert.ok(whiteDayNote.includes('الأيام البيض'));
});

test('buildWidgetEmbedSnippet generates valid iframe with query parameters and theme specs exist', () => {
  assert.equal(Object.keys(WIDGET_THEMES).length, 4);
  const snippet = buildWidgetEmbedSnippet('https://almihrab.example.com', 'makkah', 'emerald', 'medium', 'qibla_hijri');
  assert.ok(snippet.includes('widget=1'));
  assert.ok(snippet.includes('city=makkah'));
  assert.ok(snippet.includes('theme=emerald'));
  assert.ok(snippet.includes('type=qibla_hijri'));
});

test('external mobile phone widget helpers generate valid standalone URL, lockscreen payload, and iOS Scriptable code', () => {
  const standaloneUrl = buildStandalonePhoneWidgetUrl(
    'https://almihrab.example.com/',
    'makkah',
    'kiswah',
    'daily_schedule'
  );
  assert.equal(
    standaloneUrl,
    'https://almihrab.example.com/?widget=1&city=makkah&theme=kiswah&card=daily_schedule'
  );

  const notif = buildLockScreenNotificationPayload({
    cityNameAr: 'مكة المكرمة',
    nextPrayerNameAr: 'العصر',
    nextPrayerTime: '15:35',
    remainingFormatted: '00:45:10',
    times: SAMPLE_TIMES,
    hijriFormattedAr: '١٤ رمضان ١٤٤٨ هـ',
  });
  assert.ok(notif.title.includes('صلاة العصر'));
  assert.ok(notif.body.includes('مكة المكرمة'));
  assert.ok(notif.body.includes('الفجر 05:00'));

  const script = generateIOSScriptableWidgetScript({
    cityNameAr: 'مكة المكرمة',
    cityId: 'makkah',
    times: SAMPLE_TIMES,
    hijriFormattedAr: '١٤ رمضان ١٤٤٨ هـ',
    qiblaAngle: 0,
    dailyAyahText: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    dailyAyahSurahAr: 'سورة الرعد',
    themeId: 'emerald',
    appUrl: 'https://almihrab.example.com/',
  });
  assert.ok(script.includes('new ListWidget()'));
  assert.ok(script.includes('مكة المكرمة'));
  assert.ok(script.includes('05:00'));
});

