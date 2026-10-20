import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERIFIED_QURANIC_PROPHETS,
  PROPHET_ERA_CATEGORIES,
  getProphetDuaAudioUrls,
  toggleProphetReflected,
  prophetToDawahCardPayload,
  VERIFIED_SPECIAL_PRAYERS_GUIDES,
  composeIstikharaDuaWithMatter,
  ISTIKHARA_MISCONCEPTIONS_AND_FACTS,
  addIstikharaJournalEntry,
  updateIstikharaJournalStatus,
  deleteIstikharaJournalEntry,
  SALAT_TASBIH_POSTURES_PER_RAKAH,
} from './prophetsAndSpecialPrayersData';

test('Encyclopedia of Quranic Prophets contains all 25 Prophets in chronological order with 5 Ulul-Azm', () => {
  assert.equal(VERIFIED_QURANIC_PROPHETS.length, 25);
  assert.ok(PROPHET_ERA_CATEGORIES.length >= 6);

  // Verify chronological numbering 1..25
  VERIFIED_QURANIC_PROPHETS.forEach((prophet, idx) => {
    assert.equal(prophet.orderNumber, idx + 1);
    assert.ok(prophet.nameAr.length > 0);
    assert.ok(prophet.quranicDuaOrVerseAr.length > 0);
    assert.ok(prophet.mainSurahsAr.length > 0);
    assert.ok(prophet.miraclesAndSignsAr.length >= 2);
    assert.ok(prophet.practicalLessonsAr.length >= 2);
    assert.ok(prophet.surahNumber >= 1 && prophet.surahNumber <= 114);
    assert.ok(prophet.ayahNumber >= 1);
    assert.ok(prophet.mushafPage >= 1 && prophet.mushafPage <= 604);
  });

  // Verify first is Adam (AS) and 25th is Muhammad (PBUH)
  assert.ok(VERIFIED_QURANIC_PROPHETS[0].nameAr.includes('آدم'));
  assert.ok(VERIFIED_QURANIC_PROPHETS[24].nameAr.includes('محمد'));

  // Verify exactly 5 Ulul-Azm messengers (Nuh, Ibrahim, Musa, Isa, Muhammad)
  const ululAzm = VERIFIED_QURANIC_PROPHETS.filter((p) => p.isUlulAzm);
  assert.equal(ululAzm.length, 5);
});

test('Prophet audio URLs, reflection tracker, and Dawah card converter work properly', () => {
  const adam = VERIFIED_QURANIC_PROPHETS[0]; // Al-A'raf 7:23
  const urls = getProphetDuaAudioUrls(adam.surahNumber, adam.ayahNumber);
  assert.equal(urls.length, 3);
  assert.ok(urls[0].endsWith('/007023.mp3'));

  let reflected: string[] = [];
  reflected = toggleProphetReflected(reflected, adam.id);
  assert.deepEqual(reflected, [adam.id]);
  reflected = toggleProphetReflected(reflected, adam.id);
  assert.deepEqual(reflected, []);

  const payload = prophetToDawahCardPayload(adam);
  assert.equal(payload.category, 'dua');
  assert.ok(payload.headerBadgeAr.includes('آدم'));
  assert.ok(payload.mainArabicText.includes('رَبَّنَا ظَلَمْنَا'));
});

test('Interactive Istikhara Dua Composer inserts user matter into both positions of Sahih Bukhari Hadith', () => {
  const defaultComposed = composeIstikharaDuaWithMatter('');
  assert.equal(defaultComposed.matterAr, 'تُسمِّي حاجتكَ هُنا');
  assert.ok(
    defaultComposed.fullFormattedDuaAr.includes(
      'اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ (تُسمِّي حاجتكَ هُنا) خَيْرٌ لِي'
    )
  );

  const customMatter = 'سفري للدراسة في هذا العام';
  const composed = composeIstikharaDuaWithMatter(`  ${customMatter}  `);
  assert.equal(composed.matterAr, customMatter);
  assert.ok(
    composed.fullFormattedDuaAr.includes(
      `اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ (${customMatter}) خَيْرٌ لِي فِي دِينِي وَمَعَاشِي`
    )
  );
  assert.ok(
    composed.fullFormattedDuaAr.includes(
      `وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ (${customMatter}) شَرٌّ لِي فِي دِينِي وَمَعَاشِي`
    )
  );
});

test('Special Prayers Guide, Salat Al-Tasbih 75/300 postures, misconceptions, and personal journal work properly', () => {
  assert.equal(VERIFIED_SPECIAL_PRAYERS_GUIDES.length, 5);
  assert.equal(ISTIKHARA_MISCONCEPTIONS_AND_FACTS.length, 6);

  const sumPerRakah = SALAT_TASBIH_POSTURES_PER_RAKAH.reduce(
    (sum, p) => sum + p.targetCount,
    0
  );
  assert.equal(sumPerRakah, 75);
  assert.equal(sumPerRakah * 4, 300);

  let journal = addIstikharaJournalEntry(
    [],
    'القبول في الوظيفة الجديدة',
    'استشرت أهل الخبرة وأشاروا بالقبول',
    '2026-10-20'
  );
  assert.equal(journal.length, 1);
  assert.equal(journal[0].status, 'pending_tawakkul');

  const id = journal[0].id;
  journal = updateIstikharaJournalStatus(journal, id, 'facilitated_good');
  assert.equal(journal[0].status, 'facilitated_good');

  journal = deleteIstikharaJournalEntry(journal, id);
  assert.equal(journal.length, 0);
});
