import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeArabicForQuranSearch,
  searchQuranVersesLocal,
  extractAyahWordMeanings,
  computeNextMemorizationStep,
  createSavedReadingStop,
  formatReadingStopLabelAr,
} from './quranStudyTools.ts';

test('normalizeArabicForQuranSearch strips tashkeel, dagger alef, and normalizes hamzas', () => {
  const uthmani = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const plain = 'بسم الله الرحمن الرحيم';
  assert.equal(
    normalizeArabicForQuranSearch(uthmani),
    normalizeArabicForQuranSearch(plain)
  );
});

test('searchQuranVersesLocal finds verses without requiring diacritics', () => {
  const fatihahResults = searchQuranVersesLocal('اياك نعبد واياك نستعين');
  assert.ok(fatihahResults.length >= 1);
  assert.equal(fatihahResults[0].surahNumber, 1);
  assert.ok(fatihahResults[0].textUthmani.includes('نَعْبُدُ'));

  const kursiResults = searchQuranVersesLocal('الحي القيوم');
  assert.ok(kursiResults.some((r) => r.surahNumber === 2 && r.ayahNumber === 255));
});

test('extractAyahWordMeanings returns classical vocabulary meanings for Al-Fatihah and Al-Ikhlas', () => {
  const meanings = extractAyahWordMeanings(
    'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    'الثناء الكامل لله رب كل شيء'
  );
  assert.ok(meanings.length >= 2);
  assert.ok(meanings.some((m) => m.meaningAr.includes('الثناء')));
});

test('computeNextMemorizationStep repeats each ayah and loops over the selected range', () => {
  // Range Ayah 1..2, repeat each ayah 2 times, repeat range 2 times
  let state = {
    surahNumber: 1,
    fromAyah: 1,
    toAyah: 2,
    currentAyah: 1,
    ayahRepeatTarget: 2,
    currentAyahIteration: 1,
    rangeRepeatTarget: 2,
    currentRangeIteration: 1,
  };

  // Step 1: Ayah 1, iteration 2
  let step = computeNextMemorizationStep(state);
  assert.equal(step.finished, false);
  assert.equal(step.nextState.currentAyah, 1);
  assert.equal(step.nextState.currentAyahIteration, 2);

  // Step 2: Advance to Ayah 2, iteration 1
  step = computeNextMemorizationStep(step.nextState);
  assert.equal(step.finished, false);
  assert.equal(step.nextState.currentAyah, 2);
  assert.equal(step.nextState.currentAyahIteration, 1);

  // Step 3: Ayah 2, iteration 2
  step = computeNextMemorizationStep(step.nextState);
  assert.equal(step.finished, false);
  assert.equal(step.nextState.currentAyah, 2);
  assert.equal(step.nextState.currentAyahIteration, 2);

  // Step 4: Loop back to Ayah 1 for range iteration 2
  step = computeNextMemorizationStep(step.nextState);
  assert.equal(step.finished, false);
  assert.equal(step.nextState.currentAyah, 1);
  assert.equal(step.nextState.currentRangeIteration, 2);
});

test('createSavedReadingStop and formatReadingStopLabelAr format stopping point accurately', () => {
  const stop = createSavedReadingStop({
    surahNumber: 2,
    surahNameAr: 'البقرة',
    ayahNumber: 255,
    pageNumber: 42,
    textUthmani: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    savedAt: '١٤٤٧/١٠/١٩',
  });
  assert.equal(stop.surahNumber, 2);
  assert.equal(stop.ayahNumber, 255);
  assert.equal(stop.pageNumber, 42);
  assert.equal(formatReadingStopLabelAr(stop), 'سورة البقرة · الآية ٢٥٥ (ص ٤٢)');
});
