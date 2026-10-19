import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findNearestCatalogCity,
  inferCalculationMethodForLocation,
  computeQiblaCompassAlignment,
  EXTENDED_ARAB_AND_WORLD_CITIES,
} from './geolocationService.ts';

test('findNearestCatalogCity matches coordinates in Cairo and Jeddah accurately', () => {
  const cairoMatch = findNearestCatalogCity(30.05, 31.24);
  assert.equal(cairoMatch.city.id, 'cairo');
  assert.ok(cairoMatch.distanceKm < 5);

  const jeddahMatch = findNearestCatalogCity(21.54, 39.17);
  assert.equal(jeddahMatch.city.id, 'jeddah');
  assert.ok(jeddahMatch.distanceKm < 5);
});

test('inferCalculationMethodForLocation selects accurate regional calculation authority', () => {
  assert.equal(inferCalculationMethodForLocation(24.7, 46.7, 'المملكة العربية السعودية'), 'UMM_AL_QURA');
  assert.equal(inferCalculationMethodForLocation(30.0, 31.2, 'مصر Egypt'), 'EGYPTIAN');
  assert.equal(inferCalculationMethodForLocation(33.6, 73.0, 'Pakistan'), 'KARACHI');
  assert.equal(inferCalculationMethodForLocation(40.7, -74.0, 'United States'), 'ISNA');
  assert.equal(inferCalculationMethodForLocation(51.5, -0.1, 'United Kingdom'), 'MWL');
});

test('computeQiblaCompassAlignment calculates relative pointer angle, turn delta, and alignment state', () => {
  // In Cairo, Qibla bearing is ~136.1 deg (South-East)
  // 1) When phone faces North (0 deg): pointer is at ~136.1 deg, user must turn right (+136 deg)
  const facingNorth = computeQiblaCompassAlignment(30.0444, 31.2357, 0);
  assert.ok(facingNorth.qiblaBearingDeg > 135 && facingNorth.qiblaBearingDeg < 137);
  assert.equal(facingNorth.isAligned, false);
  assert.equal(facingNorth.turnDeltaDeg, 136);
  assert.ok(facingNorth.guidanceTextAr.includes('اليمين'));

  // 2) When phone faces Qibla (136.1 deg): relative pointer is ~0 deg and isAligned is true
  const facingQibla = computeQiblaCompassAlignment(30.0444, 31.2357, 136.1);
  assert.equal(facingQibla.isAligned, true);
  assert.equal(facingQibla.turnDeltaDeg, 0);
  assert.ok(facingQibla.guidanceTextAr.includes('الصحيح'));

  // 3) When phone faces South (180 deg) in Cairo: Qibla (136 deg) is 44 deg to the left (-44 deg)
  const facingSouth = computeQiblaCompassAlignment(30.0444, 31.2357, 180);
  assert.equal(facingSouth.isAligned, false);
  assert.equal(facingSouth.turnDeltaDeg, -44);
  assert.ok(facingSouth.guidanceTextAr.includes('اليسار'));

  // 4) Extended catalog has at least 25 cities
  assert.ok(EXTENDED_ARAB_AND_WORLD_CITIES.length >= 25);
});
