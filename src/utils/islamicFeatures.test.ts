import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInheritance,
  calculateTravelStatus,
  calculateTawafOrSaiLapInfo,
  calculateGroupKhatmahSummary,
  distributeJuzAmongMembers,
  calculateSmartFajrAlarmTime,
  buildMosqueNavigationUrls,
  sortAndEnrichMosquePlaces,
  MASBAHA_PHRASES,
  calculateMasbahaState,
  getPostPrayerTasbihStage,
} from './islamicFeatures.ts';
import { VERIFIED_CITIES } from './astronomy.ts';
import {
  formatWaqfDedicationLineAr,
  buildWaqfShareUrl,
  parseWaqfFromSearchParams,
  buildWaqfCertificateCardPayload,
} from './dawahShareCards.ts';

test('Islamic Inheritance: Husband + 1 Son + 1 Daughter distributes 1/4 to Husband and 3/4 in 2:1 ratio', () => {
  const res = calculateInheritance({
    estateAmount: 120000,
    deceasedGender: 'female',
    hasHusband: true,
    wivesCount: 0,
    hasFather: false,
    hasMother: false,
    sonsCount: 1,
    daughtersCount: 1,
    fullBrothersCount: 0,
    fullSistersCount: 0,
  });

  const husband = res.shares.find((s) => s.id === 'husband');
  const son = res.shares.find((s) => s.id === 'sons');
  const daughter = res.shares.find((s) => s.id === 'daughters_asabah');

  assert.ok(husband);
  assert.ok(son);
  assert.ok(daughter);
  assert.equal(Math.round(husband.totalAmount), 30000); // 1/4
  assert.equal(Math.round(son.totalAmount), 60000); // 2/3 of 90000
  assert.equal(Math.round(daughter.totalAmount), 30000); // 1/3 of 90000
});

test('Islamic Inheritance: Awl case (Husband 1/2 + 2 Full Sisters 2/3 = 7/6 Awl)', () => {
  const res = calculateInheritance({
    estateAmount: 70000,
    deceasedGender: 'female',
    hasHusband: true,
    wivesCount: 0,
    hasFather: false,
    hasMother: false,
    sonsCount: 0,
    daughtersCount: 0,
    fullBrothersCount: 0,
    fullSistersCount: 2,
  });

  assert.equal(res.caseTypeAr, 'عَوْل (زيادة الفروض على التركة)');
  const husband = res.shares.find((s) => s.id === 'husband');
  const sisters = res.shares.find((s) => s.id === 'sisters_kalalah');

  assert.ok(husband);
  assert.ok(sisters);
  assert.equal(Math.round(husband.totalAmount), 30000); // 3/7 of 70,000
  assert.equal(Math.round(sisters.totalAmount), 40000); // 4/7 of 70,000
});

test('Islamic Inheritance: Father blocks Full Brothers and Sisters (Hajb Hirman)', () => {
  const res = calculateInheritance({
    estateAmount: 60000,
    deceasedGender: 'male',
    hasHusband: false,
    wivesCount: 0,
    hasFather: true,
    hasMother: true,
    sonsCount: 0,
    daughtersCount: 0,
    fullBrothersCount: 2,
    fullSistersCount: 1,
  });

  assert.equal(res.blockedHeirs.length, 1);
  assert.equal(res.blockedHeirs[0].id, 'siblings_blocked');
  // Since there are >= 2 siblings, Mother's share is reduced from 1/3 to 1/6 (Hajb Nuqsan), and Father takes remainder 5/6
  const mother = res.shares.find((s) => s.id === 'mother');
  const father = res.shares.find((s) => s.id === 'father_asabah');
  assert.ok(mother);
  assert.ok(father);
  assert.equal(Math.round(mother.totalAmount), 10000);
  assert.equal(Math.round(father.totalAmount), 50000);
});

test('Traveler Mode: Makkah to Madinah exceeds 80km threshold and permits Qasr (2 rakats for Dhuhr/Asr/Isha)', () => {
  const makkah = VERIFIED_CITIES.find((c) => c.id === 'makkah')!;
  const madinah = VERIFIED_CITIES.find((c) => c.id === 'madinah')!;
  const status = calculateTravelStatus(makkah, madinah);

  assert.equal(status.isQasrPermitted, true);
  assert.ok(status.distanceKm > 300);
  const dhuhr = status.prayerRakats.find((p) => p.prayerNameAr === 'الظهر')!;
  const maghrib = status.prayerRakats.find((p) => p.prayerNameAr === 'المغرب')!;
  assert.equal(dhuhr.travelerRakats, 2);
  assert.equal(maghrib.travelerRakats, 3);
});

test('Hajj & Umrah 7-Lap Calculator: Sa\'i odd laps go Safa->Marwah and even laps go Marwah->Safa', () => {
  const lap1 = calculateTawafOrSaiLapInfo('sai', 1);
  const lap2 = calculateTawafOrSaiLapInfo('sai', 2);
  const lap7 = calculateTawafOrSaiLapInfo('sai', 7);

  assert.ok(lap1.routeAr.includes('من جبل الصَّفَا إلى جبل المَرْوَة'));
  assert.ok(lap2.routeAr.includes('من جبل المَرْوَة إلى جبل الصَّفَا'));
  assert.ok(lap7.routeAr.includes('من جبل الصَّفَا إلى جبل المَرْوَة'));
});

test('Family / Group Khatmah: distributes 30 Juz evenly and computes completion stats', () => {
  const initial = Array.from({ length: 30 }, (_, i) => ({
    juzNumber: i + 1,
    readerName: '',
    completed: i < 15,
  }));
  const distributed = distributeJuzAmongMembers(initial, ['أحمد', 'فاطمة', 'عمر']);
  assert.equal(distributed[0].readerName, 'أحمد');
  assert.equal(distributed[1].readerName, 'فاطمة');
  assert.equal(distributed[2].readerName, 'عمر');

  const summary = calculateGroupKhatmahSummary(distributed);
  assert.equal(summary.completedCount, 15);
  assert.equal(summary.completionPercent, 50);
  assert.equal(summary.participantsCount, 3);
});

test('Smart Fajr Alarm: calculates pre-Fajr Qiyam alarm time accurately', () => {
  const res = calculateSmartFajrAlarmTime('04:45', 30);
  assert.equal(res.alarmTimeHHMM, '04:15');
  const exact = calculateSmartFajrAlarmTime('04:45', 0);
  assert.equal(exact.alarmTimeHHMM, '04:45');
});

test('Nearby Mosques Map & Navigation: maps Places API results, sorts by distance, and builds navigation URLs', () => {
  const makkah = VERIFIED_CITIES.find((c) => c.id === 'makkah')!;
  const places = [
    {
      id: 'ChIJ_far',
      displayName: 'مسجد بعيد',
      formattedAddress: 'مكة',
      location: { lat: makkah.latitude + 0.02, lng: makkah.longitude + 0.02 },
      rating: 4.8,
      userRatingCount: 320,
    },
    {
      id: 'ChIJ_near',
      displayName: 'مسجد قريب',
      formattedAddress: 'مكة',
      location: { lat: () => makkah.latitude + 0.002, lng: () => makkah.longitude + 0.002 },
      rating: 4.9,
      userRatingCount: 510,
    },
  ];

  const sorted = sortAndEnrichMosquePlaces(places, makkah.latitude, makkah.longitude);
  assert.equal(sorted.length, 2);
  assert.equal(sorted[0].id, 'ChIJ_near');
  assert.ok(sorted[0].distanceMeters < sorted[1].distanceMeters);
  assert.ok(sorted[0].walkingMinutes >= 1);

  const navUrls = buildMosqueNavigationUrls(
    { lat: makkah.latitude, lng: makkah.longitude },
    {
      lat: sorted[0].latitude,
      lng: sorted[0].longitude,
      placeId: sorted[0].id,
    },
    'walking'
  );
  assert.ok(navUrls.googleMapsDirUrl.includes('https://www.google.com/maps/dir/?api=1'));
  assert.ok(navUrls.googleMapsDirUrl.includes('destination_place_id=ChIJ_near'));
  assert.ok(navUrls.googleMapsDirUrl.includes('travelmode=walking'));
  assert.ok(navUrls.appleMapsDirUrl.includes('dirflg=w'));
  assert.ok(navUrls.wazeNavUrl.includes('navigate=yes'));
});

test('Masbahah 33-Bead Engine: tracks lit beads, 33-cycle milestones, and guided post-prayer stages', () => {
  const postPrayerSpec = MASBAHA_PHRASES.find((p) => p.id === 'post_prayer_sunnah')!;
  assert.ok(postPrayerSpec);

  const st0 = calculateMasbahaState(0, 100, postPrayerSpec);
  assert.equal(st0.litBeadsCount, 0);
  assert.equal(st0.activeBeadIndex, -1);
  assert.equal(st0.postPrayerStage?.stageIndex, 1);
  assert.equal(st0.activeDisplayPhraseAr, 'سُبْحَانَ اللَّهِ');

  const st33 = calculateMasbahaState(33, 100, postPrayerSpec);
  assert.equal(st33.litBeadsCount, 33);
  assert.equal(st33.completedRoundsOf33, 1);
  assert.equal(st33.is33CycleMilestoneReached, true);
  assert.equal(st33.postPrayerStage?.stageIndex, 2);
  assert.equal(st33.activeDisplayPhraseAr, 'الْحَمْدُ لِلَّهِ');

  const st66 = getPostPrayerTasbihStage(66);
  assert.equal(st66.stageIndex, 3);
  assert.equal(st66.currentPhraseAr, 'اللَّهُ أَكْبَرُ');

  const st99 = getPostPrayerTasbihStage(99);
  assert.equal(st99.stageIndex, 4);
  assert.ok(st99.currentPhraseAr.includes('لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ'));

  const st100 = calculateMasbahaState(100, 100, postPrayerSpec);
  assert.equal(st100.isTargetMilestoneReached, true);
  assert.equal(st100.progressPercent, 100);
});

test('Waqf & Dawah Share Cards: formats dedication line, roundtrips share URL params, and builds certificate payload', () => {
  const customWaqf = {
    enabled: true,
    category: 'parents_mercy' as const,
    recipientName: 'والديّ الكريمين رحمهما الله',
    customDuaAr: 'رب ارحمهما كما ربياني صغيرا',
    includeOnShareCards: true,
  };

  const line = formatWaqfDedicationLineAr(customWaqf);
  assert.ok(line.includes('والديّ الكريمين رحمهما الله'));

  const shareUrl = buildWaqfShareUrl('https://almihrab.example.com/', customWaqf);
  const parsedUrl = new URL(shareUrl);
  const roundtripped = parseWaqfFromSearchParams(parsedUrl.searchParams);
  assert.ok(roundtripped);
  assert.equal(roundtripped.category, 'parents_mercy');
  assert.equal(roundtripped.recipientName, 'والديّ الكريمين رحمهما الله');

  const certPayload = buildWaqfCertificateCardPayload(customWaqf, 3);
  assert.equal(certPayload.category, 'waqf');
  assert.ok(certPayload.titleAr.includes('والديّ الكريمين رحمهما الله'));
  assert.ok(certPayload.mainArabicText.includes('رب ارحمهما كما ربياني صغيرا'));
});

