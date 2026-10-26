import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKhatmahStats,
  getJuzForPage,
  getFirstPageOfJuz,
  getLastPageOfJuz,
  computeDaysUntilTargetDate,
  computeTargetDateISOFromDays,
  computePrayerAlertTimes,
  getDefaultPrayerAlertsConfig,
  checkActivePrayerAlert,
  getAdhanPhraseForProgress,
  formatAudioFileSizeAr,
  formatAudioDurationMMSS,
  getSanitizedAdhanTitleAr,
  ALERT_SOUND_OPTIONS,
  ADHKAR_REMINDER_SOUND_OPTIONS,
  REMINDER_SELECTABLE_ADHKAR,
  getDefaultAdhkarRemindersConfig,
  evaluateAdhkarReminderForMinute,
  TOTAL_MUSHAF_PAGES,
} from './khatmahAndAlerts.ts';
import {
  AUTHENTIC_HADITHS_LIST,
  HADITH_TOPICS,
  searchAuthenticHadiths,
} from '../data/hadithsData.ts';
import {
  evaluateScheduledNotificationsForMinute,
  getDefaultPushChannelsConfig,
  buildTestPushNotification,
  setAllPushChannelsState,
  countEnabledPushChannels,
  areAllPushChannelsEnabled,
  buildChannelSpecificNotification,
  getUpcomingScheduledNotificationInfo,
} from './notificationDispatcher.ts';

test('calculateKhatmahStats computes accurate progress, Juz, and daily target pages for 30-day and 15-day plans', () => {
  const stats30 = calculateKhatmahStats({
    targetDays: 30,
    currentPage: 120,
    startDateISO: '2026-10-01',
    completedKhatmahsCount: 1,
    logs: [
      {
        id: '1',
        dateISO: '2026-10-17',
        dateLabelAr: '١٧ أكتوبر',
        pagesReadCount: 20,
        fromPage: 101,
        toPage: 120,
      },
    ],
  });

  assert.equal(stats30.currentPage, 120);
  assert.equal(stats30.remainingPages, TOTAL_MUSHAF_PAGES - 120); // 484
  assert.equal(stats30.completionPercent, Math.round((120 / 604) * 100)); // 20%
  assert.equal(stats30.dailyTargetPages, 21); // ceil(604 / 30) = 21
  assert.equal(stats30.currentJuz, 6);
  assert.equal(stats30.isCompleted, false);
  assert.equal(stats30.totalLoggedPagesThisWeek, 20);

  const stats15 = calculateKhatmahStats({
    targetDays: 15,
    currentPage: 604,
    startDateISO: '2026-10-01',
    completedKhatmahsCount: 2,
    logs: [],
  });

  assert.equal(stats15.dailyTargetPages, 41); // ceil(604 / 15) = 41
  assert.equal(stats15.remainingPages, 0);
  assert.equal(stats15.completionPercent, 100);
  assert.equal(stats15.isCompleted, true);
  assert.equal(stats15.completedJuzCount, 30);
});

test('getJuzForPage maps Mushaf boundaries accurately', () => {
  assert.equal(getJuzForPage(1), 1);
  assert.equal(getJuzForPage(21), 1);
  assert.equal(getJuzForPage(22), 2);
  assert.equal(getJuzForPage(604), 30);
});

test('computePrayerAlertTimes calculates accurate pre-Adhan and post-Adhan Iqamah offsets', () => {
  const defaults = getDefaultPrayerAlertsConfig();
  const dhuhrSched = computePrayerAlertTimes('12:08', {
    ...defaults.dhuhr,
    beforeMinutes: 15,
    afterMinutes: 20,
  });

  assert.equal(dhuhrSched.preAlertTime, '11:53');
  assert.equal(dhuhrSched.adhanTime, '12:08');
  assert.equal(dhuhrSched.postAlertTime, '12:28');
});

test('checkActivePrayerAlert detects pre-Adhan, Adhan, and post-Adhan triggers', () => {
  const sampleTimes = {
    fajr: '05:00',
    sunrise: '06:15',
    dhuhr: '12:08',
    asr: '15:26',
    maghrib: '17:56',
    isha: '19:26',
    midnight: '23:28',
    lastThird: '01:18',
  };
  const configs = getDefaultPrayerAlertsConfig();

  // Fajr is 05:00, default beforeMinutes is 15 -> 04:45 should trigger BEFORE alert
  const preTrigger = checkActivePrayerAlert(sampleTimes, configs, '04:45');
  assert.notEqual(preTrigger, null);
  assert.equal(preTrigger?.prayerKey, 'fajr');
  assert.equal(preTrigger?.type, 'BEFORE');

  // Dhuhr is 12:08 -> 12:08 should trigger ADHAN alert
  const adhanTrigger = checkActivePrayerAlert(sampleTimes, configs, '12:08');
  assert.equal(adhanTrigger?.prayerKey, 'dhuhr');
  assert.equal(adhanTrigger?.type, 'ADHAN');

  // Maghrib is 17:56, default afterMinutes is 10 -> 18:06 should trigger AFTER alert
  const postTrigger = checkActivePrayerAlert(sampleTimes, configs, '18:06');
  assert.equal(postTrigger?.prayerKey, 'maghrib');
  assert.equal(postTrigger?.type, 'AFTER');
});

test('unified Adhan option and sanitized titles never expose filenames', () => {
  assert.equal(ALERT_SOUND_OPTIONS.length, 2);
  assert.equal(ALERT_SOUND_OPTIONS[0].id, 'custom_file');
  assert.equal(ALERT_SOUND_OPTIONS[1].id, 'silent');
  assert.ok(!ALERT_SOUND_OPTIONS[0].nameAr.includes('.wav'));
  assert.ok(!ALERT_SOUND_OPTIONS[0].nameAr.includes('.mp3'));

  assert.equal(getSanitizedAdhanTitleAr('الفجر'), 'أذان صلاة الفجر');
  assert.equal(getSanitizedAdhanTitleAr(), 'الأذان الشرعي');

  const startPhrase = getAdhanPhraseForProgress(0.05, false);
  assert.equal(startPhrase.id, 'takbeer_start');

  const hayyaPhrase = getAdhanPhraseForProgress(0.62, false);
  assert.equal(hayyaPhrase.id, 'hayya_salah');

  const fajrTathweeb = getAdhanPhraseForProgress(0.8, true);
  assert.equal(fajrTathweeb.id, 'tathweeb_fajr');

  assert.equal(formatAudioFileSizeAr(512000), '500 كيلوبايت');
  assert.equal(formatAudioFileSizeAr(2.5 * 1024 * 1024), '2.50 ميجابايت');
  assert.equal(formatAudioDurationMMSS(195), '03:15');
});

test('evaluateScheduledNotificationsForMinute dispatches Adhan, Pre-Adhan, Morning/Evening Adhkar, Last Third, and Friday Kahf notifications', () => {
  const sampleTimes = {
    fajr: '05:00',
    sunrise: '06:15',
    dhuhr: '12:08',
    asr: '15:26',
    maghrib: '17:56',
    isha: '19:26',
    midnight: '23:28',
    lastThird: '01:18',
  };
  const configs = getDefaultPrayerAlertsConfig();
  const channels = getDefaultPushChannelsConfig();

  // 1. Exact Adhan notification plays full Adhan
  const adhanNotif = evaluateScheduledNotificationsForMinute({
    currentHHMM: '12:08',
    todayTimes: sampleTimes,
    alertsConfig: configs,
    channelsConfig: channels,
    cityNameAr: 'مكة المكرمة',
  });
  assert.equal(adhanNotif?.category, 'ADHAN');
  assert.equal(adhanNotif?.shouldPlayFullAdhan, true);

  // 2. Morning Adhkar (sunrise 06:15 + 20m = 06:35)
  const morningAdhkar = evaluateScheduledNotificationsForMinute({
    currentHHMM: '06:35',
    todayTimes: sampleTimes,
    alertsConfig: configs,
    channelsConfig: channels,
    cityNameAr: 'مكة المكرمة',
  });
  assert.equal(morningAdhkar?.category, 'ADHKAR_MORNING');
  assert.equal(morningAdhkar?.actionTab, 'adhkar');

  // 3. Last Third of the Night (01:18)
  const lastThirdNotif = evaluateScheduledNotificationsForMinute({
    currentHHMM: '01:18',
    todayTimes: sampleTimes,
    alertsConfig: configs,
    channelsConfig: channels,
    cityNameAr: 'مكة المكرمة',
    lastThirdStartHHMM: '01:18',
  });
  assert.equal(lastThirdNotif?.category, 'LAST_THIRD');

  // 4. Friday Surah Al-Kahf at 10:00 on Friday
  const fridayNotif = evaluateScheduledNotificationsForMinute({
    currentHHMM: '10:00',
    todayTimes: sampleTimes,
    alertsConfig: configs,
    channelsConfig: channels,
    cityNameAr: 'مكة المكرمة',
    isFriday: true,
  });
  assert.equal(fridayNotif?.category, 'FRIDAY_KAHF');
  assert.equal(fridayNotif?.mushafPage, 293);

  // 5. Test push notification builder
  const testNotif = buildTestPushNotification('الرياض', 'العصر', '15:26');
  assert.equal(testNotif.category, 'TEST');
  assert.ok(testNotif.titleAr.includes('العصر'));
});

test('setAllPushChannelsState and buildChannelSpecificNotification handle bulk toggles and all 6 notification types', () => {
  const allOff = setAllPushChannelsState(false);
  assert.equal(countEnabledPushChannels(allOff), 0);
  assert.equal(areAllPushChannelsEnabled(allOff), false);

  const allOn = setAllPushChannelsState(true);
  assert.equal(countEnabledPushChannels(allOn), 6);
  assert.equal(areAllPushChannelsEnabled(allOn), true);

  const adhanNotif = buildChannelSpecificNotification('adhanPush', {
    cityNameAr: 'مكة المكرمة',
    nextPrayerNameAr: 'المغرب',
    nextPrayerTime: '17:58',
  });
  assert.equal(adhanNotif.category, 'ADHAN');
  assert.equal(adhanNotif.shouldPlayFullAdhan, true);

  const kahfNotif = buildChannelSpecificNotification('fridayKahfPush', {
    cityNameAr: 'مكة المكرمة',
    nextPrayerNameAr: 'الجمعة',
    nextPrayerTime: '12:15',
  });
  assert.equal(kahfNotif.category, 'FRIDAY_KAHF');
  assert.equal(kahfNotif.mushafPage, 293);

  const sampleTimes = {
    fajr: '05:00',
    sunrise: '06:15',
    dhuhr: '12:08',
    asr: '15:26',
    maghrib: '17:56',
    isha: '19:26',
    midnight: '23:28',
    lastThird: '01:18',
  };
  const upcoming = getUpcomingScheduledNotificationInfo({
    currentHours: 11,
    currentMinutes: 40,
    todayTimes: sampleTimes,
    alertsConfig: getDefaultPrayerAlertsConfig(),
    channelsConfig: allOn,
    lastThirdStartHHMM: '01:18',
  });
  assert.notEqual(upcoming, null);
  assert.equal(upcoming?.timeHHMM, '11:58');
  assert.equal(upcoming?.remainingMinutes, 18);
});

test('getFirstPageOfJuz, getLastPageOfJuz, and targetDateISO Khatmah calculations work accurately', () => {
  assert.equal(getFirstPageOfJuz(1), 1);
  assert.equal(getLastPageOfJuz(1), 21);
  assert.equal(getFirstPageOfJuz(2), 22);
  assert.equal(getLastPageOfJuz(2), 41);
  assert.equal(getFirstPageOfJuz(30), 582);
  assert.equal(getLastPageOfJuz(30), 604);

  const targetDate = computeTargetDateISOFromDays(10, '2026-10-01');
  assert.equal(targetDate, '2026-10-11');
  assert.equal(computeDaysUntilTargetDate('2026-10-11', '2026-10-01'), 10);

  // Logging Juz 15 completion -> page 301
  const juz15EndPage = getLastPageOfJuz(15);
  assert.equal(juz15EndPage, 301);

  const statsWithDate = calculateKhatmahStats(
    {
      targetDays: 10,
      currentPage: juz15EndPage,
      startDateISO: '2026-10-01',
      targetDateISO: '2026-10-11',
      completedKhatmahsCount: 0,
      logs: [],
    },
    '2026-10-01'
  );

  assert.equal(statsWithDate.completionPercent, Math.round((301 / 604) * 100)); // 50%
  assert.equal(statsWithDate.completedJuzCount, 15);
  assert.equal(statsWithDate.daysUntilTargetDate, 10);
  assert.equal(statsWithDate.targetDateISO, '2026-10-11');
  assert.equal(statsWithDate.dailyTargetPages, Math.ceil((604 - 301) / 10)); // 31 pages/day
});

test('evaluateAdhkarReminderForMinute supports specific times, intervals, selected Adhkar, and custom sound tones', () => {
  assert.ok(ADHKAR_REMINDER_SOUND_OPTIONS.length >= 5);
  assert.ok(REMINDER_SELECTABLE_ADHKAR.length >= 8);

  const defaultCfg = getDefaultAdhkarRemindersConfig();
  assert.equal(defaultCfg.enabled, true);
  assert.equal(defaultCfg.scheduleMode, 'specific_times');

  // Specific time match at 07:00
  const hit0700 = evaluateAdhkarReminderForMinute(
    {
      ...defaultCfg,
      selectedDhikrIds: ['rem-istighfar'],
      specificTimesHHMM: ['07:00', '17:30'],
      soundId: 'fajr_serenity',
    },
    '07:00'
  );
  assert.notEqual(hit0700, null);
  assert.equal(hit0700?.dhikr.id, 'rem-istighfar');
  assert.equal(hit0700?.soundId, 'fajr_serenity');

  // Non-matching time returns null
  const miss0705 = evaluateAdhkarReminderForMinute(defaultCfg, '07:05');
  assert.equal(miss0705, null);

  // Interval mode (every 30 minutes)
  const hitInterval = evaluateAdhkarReminderForMinute(
    {
      ...defaultCfg,
      scheduleMode: 'interval',
      intervalMinutes: 30,
      selectedDhikrIds: ['rem-salawat'],
      soundId: 'tasbih_bell',
    },
    '08:30'
  );
  assert.notEqual(hitInterval, null);
  assert.equal(hitInterval?.dhikr.id, 'rem-salawat');
  assert.equal(hitInterval?.soundId, 'tasbih_bell');
});

test('searchAuthenticHadiths filters by topic, narrator, takhrij, and diacritic-free Arabic text', () => {
  assert.ok(HADITH_TOPICS.length >= 8);
  assert.ok(AUTHENTIC_HADITHS_LIST.length >= 15);

  // Every hadith has narratorAr and takhrijAr
  for (const h of AUTHENTIC_HADITHS_LIST) {
    assert.ok(h.narratorAr.length > 3);
    assert.ok(h.takhrijAr.length > 5);
    assert.ok(h.hadithArabicText.length > 10);
  }

  // Topic filter: patience
  const patienceList = searchAuthenticHadiths('', 'patience');
  assert.ok(patienceList.length >= 3);
  assert.ok(patienceList.every((h) => h.topicId === 'patience'));

  // Search by narrator without diacritics
  const suhaibResults = searchAuthenticHadiths('صهيب بن سنان', 'all');
  assert.ok(suhaibResults.length >= 1);
  assert.equal(suhaibResults[0].id, 'hadith-patience-1');

  // Search by phrase in hadith
  const niyyahResults = searchAuthenticHadiths('انما الاعمال بالنيات', 'all');
  assert.ok(niyyahResults.length >= 1);
  assert.equal(niyyahResults[0].topicId, 'faith');
});





