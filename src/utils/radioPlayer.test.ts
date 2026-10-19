import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSurahFileNumber,
  getNextRadioSurahNumber,
  getPreviousRadioSurahNumber,
  buildRadioStreamCandidates,
  getReciterAyahAudioUrls,
} from './radioPlayer.ts';

test('formatSurahFileNumber pads 1..114 to 3 digits and clamps out-of-range numbers', () => {
  assert.equal(formatSurahFileNumber(1), '001');
  assert.equal(formatSurahFileNumber(2), '002');
  assert.equal(formatSurahFileNumber(18), '018');
  assert.equal(formatSurahFileNumber(114), '114');
  assert.equal(formatSurahFileNumber(0), '001');
  assert.equal(formatSurahFileNumber(200), '114');
});

test('getNextRadioSurahNumber and getPreviousRadioSurahNumber loop seamlessly across 1..114', () => {
  assert.equal(getNextRadioSurahNumber(1), 2);
  assert.equal(getNextRadioSurahNumber(113), 114);
  assert.equal(getNextRadioSurahNumber(114), 1);

  assert.equal(getPreviousRadioSurahNumber(2), 1);
  assert.equal(getPreviousRadioSurahNumber(1), 114);
  assert.equal(getPreviousRadioSurahNumber(114), 113);
});

test('buildRadioStreamCandidates prioritizes full-Surah continuous stream, then live radio, then fallback', () => {
  const station = {
    id: 'makkah-haram',
    nameAr: 'إذاعة الحرمين — الشيخ ماهر المعيقلي',
    surahStreamBaseUrl: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1',
    liveRadioUrl: 'https://backup.qurango.net/radio/maher',
    streamUrl: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/002.mp3',
    fallbackAudioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.mahermuaiqly/1.mp3',
  };

  const candidatesSurah18 = buildRadioStreamCandidates(station, 18);
  assert.equal(
    candidatesSurah18[0],
    'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/018.mp3'
  );
  assert.equal(
    candidatesSurah18[1],
    'https://backup.qurango.net/radio/maher'
  );
  assert.equal(
    candidatesSurah18[2],
    'https://cdn.islamic.network/quran/audio/128/ar.mahermuaiqly/1.mp3'
  );
  assert.equal(candidatesSurah18.length, 3);
});

test('getReciterAyahAudioUrls resolves 192kbps for AbdulBasit and provides EveryAyah fallback', () => {
  const abdulbasitUrls = getReciterAyahAudioUrls('ar.abdulbasitmurattal', 1, 2, 2);
  assert.equal(
    abdulbasitUrls[0],
    'https://cdn.islamic.network/quran/audio/192/ar.abdulbasitmurattal/2.mp3'
  );
  assert.equal(
    abdulbasitUrls[1],
    'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/001002.mp3'
  );

  const alafasyUrls = getReciterAyahAudioUrls('ar.alafasy', 2, 255, 262);
  assert.equal(
    alafasyUrls[0],
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3'
  );
  assert.equal(
    alafasyUrls[1],
    'https://everyayah.com/data/Alafasy_128kbps/002255.mp3'
  );
});
