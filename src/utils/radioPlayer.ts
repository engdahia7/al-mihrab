export interface RadioStationEndpointSpec {
  id: string;
  nameAr: string;
  reciterNameAr?: string;
  surahStreamBaseUrl?: string;
  liveRadioUrl?: string;
  streamUrl: string;
  fallbackAudioUrl: string;
  defaultSurahNumber?: number;
}

/**
 * Formats a Surah number (1..114) into a 3-digit zero-padded string ("001".."114")
 * used by continuous full-Surah Quran audio CDNs (cdn.mp3quran.net).
 */
export function formatSurahFileNumber(surahNumber: number): string {
  const clamped = Math.max(1, Math.min(114, Math.floor(surahNumber || 1)));
  return String(clamped).padStart(3, '0');
}

/**
 * Advances to the next Surah (1..114) in a continuous 24/7 loop.
 */
export function getNextRadioSurahNumber(currentSurahNumber: number): number {
  const clamped = Math.max(1, Math.min(114, Math.floor(currentSurahNumber || 1)));
  return clamped >= 114 ? 1 : clamped + 1;
}

/**
 * Moves to the previous Surah (1..114) in a continuous 24/7 loop.
 */
export function getPreviousRadioSurahNumber(currentSurahNumber: number): number {
  const clamped = Math.max(1, Math.min(114, Math.floor(currentSurahNumber || 1)));
  return clamped <= 1 ? 114 : clamped - 1;
}

/**
 * Builds an ordered, deduplicated list of verified continuous stream URLs for a radio station
 * and target Surah so playback never cuts out between short verses and automatically recovers
 * if any single CDN endpoint experiences a network failure.
 */
export function buildRadioStreamCandidates(
  station: RadioStationEndpointSpec,
  surahNumber: number = 2
): string[] {
  const paddedSurah = formatSurahFileNumber(surahNumber);
  const candidates: string[] = [];

  if (station.surahStreamBaseUrl) {
    const cleanBase = station.surahStreamBaseUrl.replace(/\/+$/, '');
    candidates.push(`${cleanBase}/${paddedSurah}.mp3`);
  }

  if (station.liveRadioUrl) {
    candidates.push(station.liveRadioUrl);
  }

  if (station.streamUrl) {
    if (/\/\d{3}\.mp3$/.test(station.streamUrl)) {
      candidates.push(
        station.streamUrl.replace(/\/\d{3}\.mp3$/, `/${paddedSurah}.mp3`)
      );
    } else {
      candidates.push(station.streamUrl);
    }
  }

  if (station.fallbackAudioUrl) {
    candidates.push(station.fallbackAudioUrl);
  }

  // Deduplicate while preserving failover order
  return Array.from(new Set(candidates.filter((u) => Boolean(u && u.trim()))));
}

/**
 * Resolves verified primary and fallback audio URLs for individual Ayah recitation
 * in the Mushaf view, accounting for reciter-specific bitrates (e.g., 192kbps for AbdulBasit).
 */
export function getReciterAyahAudioUrls(
  reciterId: string,
  surahNumber: number,
  ayahNumberInSurah: number,
  globalAyahNumber?: number
): string[] {
  const paddedSurah = String(Math.max(1, Math.min(114, surahNumber))).padStart(3, '0');
  const paddedAyah = String(Math.max(1, ayahNumberInSurah)).padStart(3, '0');

  const bitrateMap: Record<string, number> = {
    'ar.alafasy': 128,
    'ar.husary': 128,
    'ar.minshawi': 128,
    'ar.abdulbasitmurattal': 192,
    'ar.mahermuaiqly': 128,
  };

  const everyAyahFolderMap: Record<string, string> = {
    'ar.alafasy': 'Alafasy_128kbps',
    'ar.husary': 'Husary_128kbps',
    'ar.minshawi': 'Minshawy_Murattal_128kbps',
    'ar.abdulbasitmurattal': 'Abdul_Basit_Murattal_192kbps',
    'ar.mahermuaiqly': 'Maher_AlMuaiqly_64kbps',
  };

  const bitrate = bitrateMap[reciterId] || 128;
  const everyAyahFolder = everyAyahFolderMap[reciterId] || 'Alafasy_128kbps';

  const urls: string[] = [];
  if (globalAyahNumber && globalAyahNumber >= 1 && globalAyahNumber <= 6236) {
    urls.push(
      `https://cdn.islamic.network/quran/audio/${bitrate}/${reciterId}/${globalAyahNumber}.mp3`
    );
  }
  urls.push(
    `https://everyayah.com/data/${everyAyahFolder}/${paddedSurah}${paddedAyah}.mp3`
  );

  return Array.from(new Set(urls));
}
