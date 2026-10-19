import { stripLeadingBasmalah } from './astronomy.ts';

export interface OfflineAyahItem {
  numberInSurah: number;
  globalNumber?: number;
  textUthmani: string;
  tafsirMuyassar: string;
  juz?: number;
  page?: number;
}

export interface OfflineMushafSurahBlock {
  surahNumber: number;
  ayahs: OfflineAyahItem[];
}

export interface OfflineStorageSummary {
  cachedPagesCount: number;
  totalPages: number;
  completionPercent: number;
  estimatedSizeKB: number;
  estimatedSizeLabelAr: string;
  isFullyCached: boolean;
}

export const TOTAL_MUSHAF_PAGES = 604;
const DB_NAME = 'mihrab_offline_quran_db_v1';
const STORE_PAGES = 'mushaf_pages_v1';

/**
 * Pure helper to compute offline Mushaf storage statistics and size estimate.
 * Full 604 pages of Uthmani text + Tafsir Muyassar averages ~7.5 KB per page (~4.5 MB total).
 */
export function calculateOfflineStorageSummary(
  cachedPagesCount: number,
  totalPages: number = TOTAL_MUSHAF_PAGES
): OfflineStorageSummary {
  const safeTotal = Math.max(1, totalPages);
  const clampedCount = Math.max(0, Math.min(safeTotal, Math.round(cachedPagesCount)));
  const completionPercent = Math.round((clampedCount / safeTotal) * 100);
  const estimatedSizeKB = Math.round(clampedCount * 7.5);
  const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(1);
  const estimatedSizeLabelAr =
    estimatedSizeKB >= 1024
      ? `${estimatedSizeMB} ميجابايت`
      : `${estimatedSizeKB} كيلوبايت`;

  return {
    cachedPagesCount: clampedCount,
    totalPages: safeTotal,
    completionPercent,
    estimatedSizeKB,
    estimatedSizeLabelAr,
    isFullyCached: clampedCount >= safeTotal,
  };
}

/**
 * Pure transformer that converts full-Quran API responses (`quran-uthmani` and `ar.muyassar`)
 * or single-page API responses into the 604-page Mushaf block dictionary.
 */
export function buildPageBlocksFromSurahsPayload(
  uthmaniSurahs: Array<{
    number: number;
    ayahs: Array<{
      number: number;
      numberInSurah: number;
      text: string;
      juz: number;
      page: number;
    }>;
  }>,
  tafsirSurahs?: Array<{
    number: number;
    ayahs: Array<{
      number: number;
      numberInSurah: number;
      text: string;
    }>;
  }>
): Record<number, OfflineMushafSurahBlock[]> {
  const pagesMap: Record<number, OfflineMushafSurahBlock[]> = {};
  const tafsirByGlobalAyah = new Map<number, string>();

  if (Array.isArray(tafsirSurahs)) {
    for (const tSurah of tafsirSurahs) {
      if (!Array.isArray(tSurah.ayahs)) continue;
      for (const tAyah of tSurah.ayahs) {
        if (tAyah.number && tAyah.text) {
          tafsirByGlobalAyah.set(tAyah.number, tAyah.text);
        }
      }
    }
  }

  for (const surah of uthmaniSurahs) {
    const sNum = surah.number;
    if (!Array.isArray(surah.ayahs)) continue;

    for (const ayah of surah.ayahs) {
      const pageNum = ayah.page || 1;
      const cleanText = stripLeadingBasmalah(
        ayah.text || '',
        sNum,
        ayah.numberInSurah
      );
      const item: OfflineAyahItem = {
        numberInSurah: ayah.numberInSurah,
        globalNumber: ayah.number,
        textUthmani: cleanText,
        tafsirMuyassar:
          tafsirByGlobalAyah.get(ayah.number) ||
          'التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف',
        juz: ayah.juz || 1,
        page: pageNum,
      };

      if (!pagesMap[pageNum]) {
        pagesMap[pageNum] = [];
      }
      const pageBlocks = pagesMap[pageNum];
      const lastBlock = pageBlocks[pageBlocks.length - 1];
      if (!lastBlock || lastBlock.surahNumber !== sNum) {
        pageBlocks.push({ surahNumber: sNum, ayahs: [item] });
      } else {
        lastBlock.ayahs.push(item);
      }
    }
  }

  return pagesMap;
}

// ============================================================================
// IndexedDB Browser Persistence Layer
// ============================================================================

function openQuranIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        db.createObjectStore(STORE_PAGES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflinePageFromDB(
  pageNumber: number
): Promise<OfflineMushafSurahBlock[] | null> {
  try {
    const db = await openQuranIndexedDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readonly');
      const store = tx.objectStore(STORE_PAGES);
      const req = store.get(pageNumber);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveOfflinePageToDB(
  pageNumber: number,
  blocks: OfflineMushafSurahBlock[]
): Promise<void> {
  try {
    const db = await openQuranIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readwrite');
      const store = tx.objectStore(STORE_PAGES);
      store.put(blocks, pageNumber);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore IndexedDB quota errors
  }
}

export async function saveBulkOfflinePagesToDB(
  pagesMap: Record<number, OfflineMushafSurahBlock[]>
): Promise<number> {
  const entries = Object.entries(pagesMap);
  if (entries.length === 0) return 0;
  try {
    const db = await openQuranIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readwrite');
      const store = tx.objectStore(STORE_PAGES);
      for (const [pageStr, blocks] of entries) {
        store.put(blocks, Number(pageStr));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return entries.length;
  } catch {
    return 0;
  }
}

export async function getOfflineCachedPagesCount(): Promise<number> {
  try {
    const db = await openQuranIndexedDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readonly');
      const store = tx.objectStore(STORE_PAGES);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function clearOfflinePagesDB(): Promise<void> {
  try {
    const db = await openQuranIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readwrite');
      const store = tx.objectStore(STORE_PAGES);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

/**
 * Downloads the entire 604-page Holy Quran (Uthmani script) + full Tafsir Al-Muyassar
 * in two compressed JSON requests (~4.5 MB total) and stores all 604 pages into IndexedDB
 * for instant 0ms offline access.
 */
export async function downloadEntireMushafOffline(
  onProgress?: (stepAr: string, percent: number) => void
): Promise<Record<number, OfflineMushafSurahBlock[]>> {
  onProgress?.('جاري تحميل النص الكامل للمصحف الشريف بالرسم العثماني (٦٠٤ صفحات)...', 20);
  const uthmaniRes = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  if (!uthmaniRes.ok) {
    throw new Error('Failed to fetch full Uthmani Quran');
  }
  const uthmaniJson = await uthmaniRes.json();

  onProgress?.('جاري تحميل موسوعة التفسير الميسر كاملةً (٦٢٣٦ آية)...', 60);
  const tafsirRes = await fetch('https://api.alquran.cloud/v1/quran/ar.muyassar').catch(
    () => null
  );
  const tafsirJson = tafsirRes && tafsirRes.ok ? await tafsirRes.json() : null;

  onProgress?.('جاري فهرسة الصفحات وحفظها محلياً على جهازك للعمل بدون إنترنت...', 85);
  const pagesMap = buildPageBlocksFromSurahsPayload(
    uthmaniJson?.data?.surahs || [],
    tafsirJson?.data?.surahs || []
  );

  await saveBulkOfflinePagesToDB(pagesMap);
  onProgress?.('اكتمل حفظ المصحف الكامل والتفسير الميسر محلياً (٦٠٤ صفحات)!', 100);
  return pagesMap;
}
