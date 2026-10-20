import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKhatmahStats,
  getJuzForPage,
  computePrayerAlertTimes,
  getDefaultPrayerAlertsConfig,
  checkActivePrayerAlert,
  getAdhanPhraseForProgress,
  formatAudioFileSizeAr,
  formatAudioDurationMMSS,
  getSanitizedAdhanTitleAr,
  ALERT_SOUND_OPTIONS,
  TOTAL_MUSHAF_PAGES,
} from './khatmahAndAlerts.ts';
import {
  evaluateScheduledNotificationsForMinute,
  getDefaultPushChannelsConfig,
  buildTestPushNotification,
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



