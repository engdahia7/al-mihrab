import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateKeyISO,
  createEmptyDailyWorshipRecord,
  calculateWorshipAnalytics,
  getDefaultQadaTrackerState,
  calculateQadaProjection,
  VERIFIED_RUQYAH_AND_SLEEP_ITEMS,
  buildCompleteRuqyahOncePlaylist,
  getRuqyahFallbackAudioUrls,
  DAILY_INSPIRATION_PRESETS,
  getDailyInspirationPresetForDate,
  presetToDawahCardPayload,
  KHUSHU_RETREAT_GOALS,
} from './worshipTrackerAndTools';

test('Worship Tracker, 12 Rawatib & Fasting Analytics: computes 100% completion and a house in Jannah when all 5 fard, 12 rawatib, and 3 nawafil are completed', () => {
  const today = new Date(2026, 9, 19); // Monday
  const iso = formatDateKeyISO(today);
  const rec = createEmptyDailyWorshipRecord(iso);

  rec.fard = {
    fajr: 'mosque_jamaah',
    dhuhr: 'mosque_jamaah',
    asr: 'mosque_jamaah',
    maghrib: 'mosque_jamaah',
    isha: 'mosque_jamaah',
  };
  rec.rawatib = {
    fajr_pre_2: true,
    dhuhr_pre_2_a: true,
    dhuhr_pre_2_b: true,
    dhuhr_post_2: true,
    maghrib_post_2: true,
    isha_post_2: true,
  };
  rec.nafil = {
    duha: true,
    witr: true,
    qiyam: true,
  };
  rec.fasting = 'monday_thursday';

  const summary = calculateWorshipAnalytics({ [iso]: rec }, today, 14);
  assert.equal(summary.todayFardCompleted, 5);
  assert.equal(summary.todayJamaahCount, 5);
  assert.equal(summary.todayRawatibRakaat, 12);
  assert.equal(summary.is12RawatibComplete, true);
  assert.equal(summary.todayOverallPercent, 100);
  assert.equal(summary.currentFardStreakDays, 1);
  assert.equal(summary.totalHousesInJannahCompleted, 1);
  assert.equal(summary.totalFastingDaysLogged, 1);
  assert.ok(summary.fastingRecommendationTodayAr?.includes('الأيام البيض'));
});

test('Qada Calculator & Gradual Scheduler: calculates remaining prayers, completion percentage, and estimated days to finish', () => {
  const state = getDefaultQadaTrackerState();
  state.initialPrayers = {
    fajr: 30,
    dhuhr: 30,
    asr: 30,
    maghrib: 30,
    isha: 30,
  };
  state.remainingPrayers = {
    fajr: 15,
    dhuhr: 15,
    asr: 15,
    maghrib: 15,
    isha: 15,
  };
  state.dailyPacePerFard = 1;
  state.initialFastingDays = 10;
  state.remainingFastingDays = 4;
  state.weeklyFastingPace = 2;

  const proj = calculateQadaProjection(state, new Date(2026, 9, 20));
  assert.equal(proj.totalInitialPrayers, 150);
  assert.equal(proj.totalRemainingPrayers, 75);
  assert.equal(proj.totalCompletedPrayers, 75);
  assert.equal(proj.prayersCompletionPercent, 50);
  assert.equal(proj.estimatedDaysToFinishPrayers, 15);
  assert.equal(proj.fastingCompletedDays, 6);
  assert.equal(proj.fastingCompletionPercent, 60);
  assert.equal(proj.estimatedWeeksToFinishFasting, 2);
});

test('Complete Ruqyah, Daily PNG Studio Presets, and Khushu Mode: provides verified items in strict Mushaf order with complete multi-verse audio playlists', () => {
  assert.ok(VERIFIED_RUQYAH_AND_SLEEP_ITEMS.length >= 12);

  // Verify strict Mushaf order of Quranic Ruqyah items
  const quranRuqyahIds = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.filter(
    (i) => i.category === 'ruqyah_quran'
  ).map((i) => i.id);
  assert.deepEqual(quranRuqyahIds, [
    'ruq-fatihah',
    'ruq-baqarah-start',
    'ruq-kursi',
    'ruq-baqarah-end',
    'ruq-shifa-verses',
    'ruq-ikhlas',
    'ruq-falaq',
    'ruq-nas',
  ]);

  // Verify Surah Al-Fatihah has all 7 verses in sequence (not just verse 1)
  const fatihah = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-fatihah'
  );
  assert.equal(fatihah?.audioUrls?.length, 7);
  assert.ok(fatihah?.audioUrls?.[0].endsWith('001001.mp3'));
  assert.ok(fatihah?.audioUrls?.[6].endsWith('001007.mp3'));
  assert.equal(fatihah?.recommendedCount, 7);

  // Verify opening of Al-Baqarah has all 5 verses
  const baqarahStart = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-baqarah-start'
  );
  assert.equal(baqarahStart?.audioUrls?.length, 5);

  // Verify end of Al-Baqarah has both verses 285 and 286
  const baqarahEnd = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-baqarah-end'
  );
  assert.equal(baqarahEnd?.audioUrls?.length, 2);
  assert.ok(baqarahEnd?.audioUrls?.[0].endsWith('002285.mp3'));
  assert.ok(baqarahEnd?.audioUrls?.[1].endsWith('002286.mp3'));

  // Verify the 6 Verses of Shifa are in strict Mushaf Surah order: 9 -> 10 -> 16 -> 17 -> 26 -> 41
  const shifa = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-shifa-verses'
  );
  assert.equal(shifa?.audioUrls?.length, 6);
  assert.deepEqual(
    shifa?.audioUrls?.map((u) => u.split('/').pop()),
    [
      '009014.mp3',
      '010057.mp3',
      '016069.mp3',
      '017082.mp3',
      '026080.mp3',
      '041044.mp3',
    ]
  );

  // Verify Al-Ikhlas (4), Al-Falaq (5), An-Nas (6) and Sleep Tahseen (15)
  const ikhlas = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-ikhlas'
  );
  const falaq = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'ruq-falaq'
  );
  const nas = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find((i) => i.id === 'ruq-nas');
  const sleepTahseen = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
    (i) => i.id === 'sleep-tahseen-1'
  );
  assert.equal(ikhlas?.audioUrls?.length, 4);
  assert.equal(falaq?.audioUrls?.length, 5);
  assert.equal(nas?.audioUrls?.length, 6);
  assert.equal(sleepTahseen?.audioUrls?.length, 15);

  // Verify Complete Ruqyah Once Playlist (36 verses across 8 stations in Mushaf order)
  const fullOncePlaylist = buildCompleteRuqyahOncePlaylist();
  assert.equal(fullOncePlaylist.length, 36);
  assert.equal(fullOncePlaylist[0].itemId, 'ruq-fatihah');
  assert.ok(fullOncePlaylist[0].audioUrl.endsWith('001001.mp3'));
  assert.equal(fullOncePlaylist[6].itemId, 'ruq-fatihah');
  assert.ok(fullOncePlaylist[6].audioUrl.endsWith('001007.mp3'));
  assert.equal(fullOncePlaylist[6].isLastVerseOfItem, true);
  assert.equal(fullOncePlaylist[7].itemId, 'ruq-baqarah-start');
  assert.ok(fullOncePlaylist[7].audioUrl.endsWith('002001.mp3'));
  assert.equal(fullOncePlaylist[35].itemId, 'ruq-nas');
  assert.ok(fullOncePlaylist[35].audioUrl.endsWith('114006.mp3'));
  assert.equal(fullOncePlaylist[35].isLastVerseOfItem, true);

  // Verify multi-CDN fallback URLs
  const fallbacks = getRuqyahFallbackAudioUrls(
    'https://everyayah.com/data/Alafasy_128kbps/001002.mp3'
  );
  assert.equal(fallbacks.length, 3);
  assert.ok(fallbacks[1].includes('verses.quran.com/Alafasy/mp3/001002.mp3'));

  assert.ok(DAILY_INSPIRATION_PRESETS.length >= 6);
  const preset = getDailyInspirationPresetForDate(new Date(2026, 9, 20));
  const payload = presetToDawahCardPayload(preset, 'صدقة جارية');
  assert.ok(payload.mainArabicText.length > 10);
  assert.equal(payload.waqfDedicationLineAr, 'صدقة جارية');

  assert.equal(KHUSHU_RETREAT_GOALS.length, 4);
  assert.ok(KHUSHU_RETREAT_GOALS[0].verseAr.includes('لِّيَدَّبَّرُوا'));
});

