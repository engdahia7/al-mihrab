import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOfflineStorageSummary,
  buildPageBlocksFromSurahsPayload,
} from './offlineQuranStorage.ts';

test('calculateOfflineStorageSummary calculates percentage and Arabic size labels accurately', () => {
  const initial = calculateOfflineStorageSummary(11, 604);
  assert.equal(initial.cachedPagesCount, 11);
  assert.equal(initial.completionPercent, 2);
  assert.equal(initial.isFullyCached, false);
  assert.ok(initial.estimatedSizeLabelAr.includes('كيلوبايت'));

  const full = calculateOfflineStorageSummary(604, 604);
  assert.equal(full.cachedPagesCount, 604);
  assert.equal(full.completionPercent, 100);
  assert.equal(full.isFullyCached, true);
  assert.ok(full.estimatedSizeLabelAr.includes('ميجابايت'));
});

test('buildPageBlocksFromSurahsPayload groups ayahs by page and strips leading Basmalah on Surah 2 Ayah 1', () => {
  const sampleUthmani = [
    {
      number: 1,
      ayahs: [
        {
          number: 1,
          numberInSurah: 1,
          text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
          juz: 1,
          page: 1,
        },
      ],
    },
    {
      number: 2,
      ayahs: [
        {
          number: 8,
          numberInSurah: 1,
          text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الم',
          juz: 1,
          page: 2,
        },
      ],
    },
  ];

  const sampleTafsir = [
    {
      number: 1,
      ayahs: [{ number: 1, numberInSurah: 1, text: 'تفسير البسملة في الفاتحة' }],
    },
    {
      number: 2,
      ayahs: [{ number: 8, numberInSurah: 1, text: 'حروف مقطعة في أول البقرة' }],
    },
  ];

  const pagesMap = buildPageBlocksFromSurahsPayload(sampleUthmani, sampleTafsir);
  assert.equal(pagesMap[1].length, 1);
  assert.equal(
    pagesMap[1][0].ayahs[0].textUthmani,
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
  );
  assert.equal(pagesMap[2].length, 1);
  assert.equal(pagesMap[2][0].ayahs[0].textUthmani, 'الم');
  assert.equal(pagesMap[2][0].ayahs[0].tafsirMuyassar, 'حروف مقطعة في أول البقرة');
});
