import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Bookmark,
  Volume2,
  Square,
  Plus,
  Minus,
  Copy,
  Check,
  X,
  Repeat,
  Download,
  BookOpen,
} from 'lucide-react';
import {
  ALL_SURAHS,
  PRELOADED_SURAHS,
  PRELOADED_MUSHAF_PAGES,
  JUZ_NAMES_AR,
  VERIFIED_RECITERS,
  AyahItem,
  SurahMetadata,
  MushafPageSurahBlock,
} from '../data/quranData';
import {
  THEMATIC_QURAN_CATEGORIES,
  THEMATIC_QURAN_VERSES,
  QuranThemeCategoryId,
} from '../data/thematicAndNamesData';
import {
  toArabicNumerals,
  sanitizeQuranicText,
  stripLeadingBasmalah,
  shouldShowUnnumberedBasmalah,
  resolveMushafSwipePage,
} from '../utils/astronomy';
import { KhatmahTrackerPanel } from './KhatmahTrackerPanel';
import {
  getOfflinePageFromDB,
  saveOfflinePageToDB,
} from '../utils/offlineQuranStorage';
import { getReciterAyahAudioUrls } from '../utils/radioPlayer';
import {
  searchQuranVersesLocal,
  searchQuranVersesOnline,
  resolveExactAyahPage,
  extractAyahWordMeanings,
  computeNextMemorizationStep,
  generateAyahShareCardDataUrl,
  createSavedReadingStop,
  formatReadingStopLabelAr,
  READING_STOP_STORAGE_KEY,
  MUSHAF_FONT_SIZE_STORAGE_KEY,
  isCeremonialCenteredMushafBlock,
  getMushafTypographySpec,
  getTafsirPopoverVerseClass,
  type QuranSearchResult,
  type MemorizationLoopState,
  type SavedReadingStop,
} from '../utils/quranStudyTools';

interface QuranBookmark {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  snippet: string;
  savedAt: string;
}

import type {
  DawahShareCardPayload,
  WaqfDedicationConfig,
} from '../utils/dawahShareCards';

export type MushafThemeMode = 'classic' | 'sepia' | 'night';

interface QuranViewProps {
  onExitMushaf?: () => void;
  initialPage?: number | null;
  waqfConfig?: WaqfDedicationConfig;
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
  onOpenWaqfModal?: () => void;
}

const BOOKMARK_STORAGE_KEY = 'almihrab_quran_bookmarks_v2';
const LAST_PAGE_STORAGE_KEY = 'almihrab_mushaf_last_page_v1';
const MUSHAF_THEME_STORAGE_KEY = 'almihrab_mushaf_theme_v1';

export const QuranView: React.FC<QuranViewProps> = ({
  onExitMushaf,
  initialPage,
  waqfConfig,
  onOpenDawahCard,
  onOpenWaqfModal,
}) => {
  // Active modal overlay when opened from the tap-to-toggle HUD or Ayah click
  const [activeOverlay, setActiveOverlay] = useState<
    'none' | 'index' | 'search' | 'themes' | 'khatmah' | 'tafsir' | 'memorize'
  >('none');

  // Floating HUD visibility — FALSE by default so ONLY the pure Fullscreen Mushaf appears on open!
  const [showHud, setShowHud] = useState<boolean>(false);

  // Mushaf Reading Theme: classic cream | aged sepia parchment | full night mode
  const [mushafTheme, setMushafTheme] = useState<MushafThemeMode>(() => {
    try {
      const saved = localStorage.getItem(MUSHAF_THEME_STORAGE_KEY);
      if (saved === 'classic' || saved === 'sepia' || saved === 'night') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'classic';
  });

  // Thematic Quran filter state
  const [selectedThemeCategory, setSelectedThemeCategory] =
    useState<QuranThemeCategoryId>('all');

  // Primary Saved Reading Stop (خيار الحفظ عند آية معينة والاستكمال لاحقاً)
  const [savedReadingStop, setSavedReadingStop] = useState<SavedReadingStop | null>(() => {
    try {
      const raw = localStorage.getItem(READING_STOP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.surahNumber && parsed.ayahNumber && parsed.pageNumber) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      surahNumber: 1,
      surahNameAr: 'الفاتحة',
      ayahNumber: 4,
      pageNumber: 1,
      snippet: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      savedAt: 'موضع محفوظ',
    };
  });

  const [selectedSurahNum, setSelectedSurahNum] = useState<number>(() => {
    return savedReadingStop?.surahNumber || 1;
  });
  const [selectedPageNum, setSelectedPageNum] = useState<number>(() => {
    if (initialPage && initialPage >= 1 && initialPage <= 604) {
      return initialPage;
    }
    if (savedReadingStop?.pageNumber && savedReadingStop.pageNumber >= 1 && savedReadingStop.pageNumber <= 604) {
      return savedReadingStop.pageNumber;
    }
    try {
      const saved = localStorage.getItem(LAST_PAGE_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (parsed >= 1 && parsed <= 604) return parsed;
      }
    } catch {
      // ignore
    }
    return 1;
  });

  useEffect(() => {
    if (initialPage && initialPage >= 1 && initialPage <= 604) {
      setSelectedPageNum(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    try {
      localStorage.setItem(MUSHAF_THEME_STORAGE_KEY, mushafTheme);
    } catch {
      // ignore
    }
  }, [mushafTheme]);

  useEffect(() => {
    try {
      if (savedReadingStop) {
        localStorage.setItem(READING_STOP_STORAGE_KEY, JSON.stringify(savedReadingStop));
      }
    } catch {
      // ignore
    }
  }, [savedReadingStop]);

  const [surahSearch, setSurahSearch] = useState<string>('');
  const [revelationFilter, setRevelationFilter] = useState<
    'ALL' | 'مكية' | 'مدنية'
  >('ALL');
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(MUSHAF_FONT_SIZE_STORAGE_KEY));
      if (saved >= 1 && saved <= 5) return saved;
    } catch {
      // ignore
    }
    return 2; // 1..5 (2 = متوسط القياسي)
  });
  const [reciterId, setReciterId] = useState<string>(VERIFIED_RECITERS[0].id);

  useEffect(() => {
    try {
      localStorage.setItem(MUSHAF_FONT_SIZE_STORAGE_KEY, String(fontSizeLevel));
    } catch {
      // ignore
    }
  }, [fontSizeLevel]);

  // Selected Ayah (for Tafsir, Audio & Saved Stop)
  const [selectedAyahRef, setSelectedAyahRef] = useState<{
    surahNumber: number;
    ayahNumber: number;
  }>(() => ({
    surahNumber: savedReadingStop?.surahNumber || 1,
    ayahNumber: savedReadingStop?.ayahNumber || 1,
  }));

  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null);
  const [copiedAyahKey, setCopiedAyahKey] = useState<string | null>(null);

  // Instant Verse Search state (diacritic-insensitive)
  const [ayahSearchQuery, setAyahSearchQuery] = useState<string>('');
  const [ayahSearchResults, setAyahSearchResults] = useState<QuranSearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);

  // Tafsir source edition ('muyassar' | 'jalalayn') & Share Card preview state
  const [tafsirEdition, setTafsirEdition] = useState<'muyassar' | 'jalalayn'>('muyassar');
  const [secondaryTafsirCache, setSecondaryTafsirCache] = useState<Record<string, string>>({});
  const [isLoadingSecondaryTafsir, setIsLoadingSecondaryTafsir] = useState<boolean>(false);
  const [shareCardDataUrl, setShareCardDataUrl] = useState<string | null>(null);

  // Ayah Range Memorization & Repetition state
  const [repeatFromAyah, setRepeatFromAyah] = useState<number>(1);
  const [repeatToAyah, setRepeatToAyah] = useState<number>(7);
  const [ayahRepeatTarget, setAyahRepeatTarget] = useState<number>(2);
  const [rangeRepeatTarget, setRangeRepeatTarget] = useState<number>(3);
  const [memorizeLoopState, setMemorizeLoopState] = useState<MemorizationLoopState | null>(null);

  // Caches for Surahs and Mushaf Pages (1..604)
  const [surahCache] = useState<Record<number, AyahItem[]>>(() => ({
    ...PRELOADED_SURAHS,
  }));
  const [pageCache, setPageCache] = useState<
    Record<number, MushafPageSurahBlock[]>
  >(() => ({
    ...PRELOADED_MUSHAF_PAGES,
  }));
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Swipe / Drag state for physical page turning (Right & Left)
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    active: boolean;
  }>({
    x: 0,
    y: 0,
    time: 0,
    active: false,
  });
  const didSwipeRef = useRef<boolean>(false);
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [pageTurnToast, setPageTurnToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return [
      {
        surahNumber: 1,
        surahNameAr: 'الفاتحة',
        ayahNumber: 4,
        pageNumber: 1,
        snippet: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        savedAt: 'علامة افتراضية',
      },
    ];
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_PAGE_STORAGE_KEY, String(selectedPageNum));
    } catch {
      // ignore
    }
  }, [selectedPageNum]);

  const triggerPageToast = (pageNum: number) => {
    const matchingSurah =
      [...ALL_SURAHS].reverse().find((s) => s.startPage <= pageNum) ||
      ALL_SURAHS[0];
    setPageTurnToast(
      `صفحة ${toArabicNumerals(pageNum)} · سُورَةُ ${matchingSurah.nameAr}`
    );
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setPageTurnToast(null);
    }, 900);
  };

  const handleSelectPage = (pageNum: number, showFeedback: boolean = true) => {
    const clamped = Math.max(1, Math.min(604, pageNum));
    setSelectedPageNum(clamped);
    const preloadedBlocks = pageCache[clamped];
    if (preloadedBlocks && preloadedBlocks.length > 0) {
      const firstBlock = preloadedBlocks[0];
      setSelectedSurahNum(firstBlock.surahNumber);
      setSelectedAyahRef({
        surahNumber: firstBlock.surahNumber,
        ayahNumber: firstBlock.ayahs[0]?.numberInSurah || 1,
      });
    } else {
      const matchingSurah =
        [...ALL_SURAHS].reverse().find((s) => s.startPage <= clamped) ||
        ALL_SURAHS[0];
      setSelectedSurahNum(matchingSurah.number);
      setSelectedAyahRef({ surahNumber: matchingSurah.number, ayahNumber: 1 });
    }
    if (showFeedback) {
      triggerPageToast(clamped);
    }
  };

  const handleSelectSurah = (surahNum: number) => {
    const meta =
      ALL_SURAHS.find((s) => s.number === surahNum) || ALL_SURAHS[0];
    setSelectedSurahNum(surahNum);
    setSelectedPageNum(meta.startPage);
    setSelectedAyahRef({ surahNumber: surahNum, ayahNumber: 1 });
    setActiveOverlay('none');
    setShowHud(false);
    triggerPageToast(meta.startPage);
  };

  // Keyboard Left / Right Arrow navigation for Fullscreen Mushaf
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (activeOverlay !== 'none') {
        if (e.key === 'Escape') {
          setActiveOverlay('none');
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSelectPage(
          selectedPageNum === 1 ? 2 : Math.max(1, selectedPageNum - 1),
          true
        );
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSelectPage(Math.min(604, selectedPageNum + 1), true);
      } else if (e.key === 'Escape' && showHud) {
        setShowHud(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPageNum, activeOverlay, showHud]);

  // Fetch Mushaf Page (1..604) from local IndexedDB first, or fallback to network & cache in IndexedDB
  useEffect(() => {
    if (pageCache[selectedPageNum]) {
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingContent(true);
    setFetchError(null);

    getOfflinePageFromDB(selectedPageNum)
      .then((offlineBlocks) => {
        if (cancelled) return;
        if (offlineBlocks && offlineBlocks.length > 0) {
          setPageCache((prev) => ({ ...prev, [selectedPageNum]: offlineBlocks }));
          setSelectedSurahNum((prevSurah) =>
            offlineBlocks.some((b) => b.surahNumber === prevSurah)
              ? prevSurah
              : offlineBlocks[0].surahNumber
          );
          setSelectedAyahRef((prevRef) => {
            const existsOnPage = offlineBlocks.some(
              (b) =>
                b.surahNumber === prevRef.surahNumber &&
                b.ayahs.some((a) => a.numberInSurah === prevRef.ayahNumber)
            );
            if (existsOnPage) return prevRef;
            return {
              surahNumber: offlineBlocks[0].surahNumber,
              ayahNumber: offlineBlocks[0].ayahs[0]?.numberInSurah || 1,
            };
          });
          setIsLoadingContent(false);
          return;
        }

        return Promise.all([
          fetch(
            `https://api.alquran.cloud/v1/page/${selectedPageNum}/quran-uthmani`
          ).then((r) => r.json()),
          fetch(`https://api.alquran.cloud/v1/page/${selectedPageNum}/ar.muyassar`)
            .then((r) => r.json())
            .catch(() => null),
        ]).then(([uthmaniData, tafsirData]) => {
          if (cancelled) return;
          const rawAyahs = uthmaniData?.data?.ayahs;
          const tafsirAyahs = tafsirData?.data?.ayahs || [];

          if (Array.isArray(rawAyahs) && rawAyahs.length > 0) {
            const blocks: MushafPageSurahBlock[] = [];
            rawAyahs.forEach(
              (
                a: {
                  number: number;
                  numberInSurah: number;
                  text: string;
                  juz: number;
                  page: number;
                  surah?: { number: number };
                },
                idx: number
              ) => {
                const sNum = a.surah?.number || selectedSurahNum;
                const cleanText = stripLeadingBasmalah(
                  a.text || '',
                  sNum,
                  a.numberInSurah
                );
                const item: AyahItem = {
                  numberInSurah: a.numberInSurah,
                  globalNumber: a.number,
                  textUthmani: cleanText,
                  tafsirMuyassar:
                    tafsirAyahs[idx]?.text ||
                    'التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف',
                  juz: a.juz,
                  page: a.page || selectedPageNum,
                };

                const lastBlock = blocks[blocks.length - 1];
                if (!lastBlock || lastBlock.surahNumber !== sNum) {
                  blocks.push({ surahNumber: sNum, ayahs: [item] });
                } else {
                  lastBlock.ayahs.push(item);
                }
              }
            );

            setPageCache((prev) => ({ ...prev, [selectedPageNum]: blocks }));
            saveOfflinePageToDB(selectedPageNum, blocks);
            if (blocks.length > 0) {
              setSelectedSurahNum((prevSurah) =>
                blocks.some((b) => b.surahNumber === prevSurah)
                  ? prevSurah
                  : blocks[0].surahNumber
              );
              setSelectedAyahRef((prevRef) => {
                const existsOnPage = blocks.some(
                  (b) =>
                    b.surahNumber === prevRef.surahNumber &&
                    b.ayahs.some((a) => a.numberInSurah === prevRef.ayahNumber)
                );
                if (existsOnPage) return prevRef;
                return {
                  surahNumber: blocks[0].surahNumber,
                  ayahNumber: blocks[0].ayahs[0]?.numberInSurah || 1,
                };
              });
            }
          } else {
            throw new Error('Invalid page payload');
          }
          setIsLoadingContent(false);
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(
          'تعذّر الاتصال بخادم مجمع الملك فهد لتحميل هذه الصفحة حالياً؛ يمكنك حفظ المصحف الكامل محلياً للعمل بدون إنترنت.'
        );
        setIsLoadingContent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPageNum, pageCache, selectedSurahNum]);

  // Stop audio when changing Page
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAyahKey(null);
    }
  }, [selectedPageNum]);

  const currentSurahMeta: SurahMetadata = useMemo(() => {
    return (
      ALL_SURAHS.find((s) => s.number === selectedSurahNum) || ALL_SURAHS[0]
    );
  }, [selectedSurahNum]);

  const filteredSurahs = useMemo(() => {
    return ALL_SURAHS.filter((s) => {
      if (revelationFilter !== 'ALL' && s.revelationType !== revelationFilter) {
        return false;
      }
      if (!surahSearch.trim()) return true;
      const q = surahSearch.trim().toLowerCase();
      return (
        s.nameAr.includes(q) ||
        s.nameTranslit.toLowerCase().includes(q) ||
        String(s.number) === q
      );
    });
  }, [surahSearch, revelationFilter]);

  const filteredThematicVerses = useMemo(() => {
    if (selectedThemeCategory === 'all') return THEMATIC_QURAN_VERSES;
    return THEMATIC_QURAN_VERSES.filter(
      (v) => v.themeId === selectedThemeCategory
    );
  }, [selectedThemeCategory]);

  // Active Mushaf blocks for the current page
  const activeMushafBlocks: MushafPageSurahBlock[] = useMemo(() => {
    if (pageCache[selectedPageNum]) {
      return pageCache[selectedPageNum];
    }
    const fallbackSurah = surahCache[selectedSurahNum];
    if (fallbackSurah && fallbackSurah.length > 0) {
      return [
        {
          surahNumber: selectedSurahNum,
          ayahs: fallbackSurah.map((a) => ({
            ...a,
            textUthmani: stripLeadingBasmalah(
              a.textUthmani,
              selectedSurahNum,
              a.numberInSurah
            ),
          })),
        },
      ];
    }
    return [];
  }, [pageCache, selectedPageNum, surahCache, selectedSurahNum]);

  // Top margin info of the Mushaf page
  const pageHeaderInfo = useMemo(() => {
    const firstBlock = activeMushafBlocks[0];
    const firstAyah = firstBlock?.ayahs[0];
    const juzNum = firstAyah?.juz || currentSurahMeta.juz || 1;
    const surahNamesOnPage = activeMushafBlocks
      .map((b) => {
        const m = ALL_SURAHS.find((s) => s.number === b.surahNumber);
        return m ? `سُورَةُ ${m.nameAr}` : '';
      })
      .filter(Boolean)
      .join(' · ');

    return {
      juzNum,
      juzNameAr: JUZ_NAMES_AR[juzNum] || `الجزء ${toArabicNumerals(juzNum)}`,
      pageNum: selectedPageNum,
      surahNamesOnPage: surahNamesOnPage || `سُورَةُ ${currentSurahMeta.nameAr}`,
    };
  }, [activeMushafBlocks, currentSurahMeta, selectedPageNum]);

  // Active Ayah for Tafsir & Audio overlay
  const activeTafsirContext = useMemo(() => {
    for (const block of activeMushafBlocks) {
      if (block.surahNumber === selectedAyahRef.surahNumber) {
        const found = block.ayahs.find(
          (a) => a.numberInSurah === selectedAyahRef.ayahNumber
        );
        if (found) {
          const meta =
            ALL_SURAHS.find((s) => s.number === block.surahNumber) ||
            currentSurahMeta;
          return { surahMeta: meta, ayah: found };
        }
      }
    }
    const fallbackBlock = activeMushafBlocks[0];
    if (fallbackBlock && fallbackBlock.ayahs.length > 0) {
      const meta =
        ALL_SURAHS.find((s) => s.number === fallbackBlock.surahNumber) ||
        currentSurahMeta;
      return { surahMeta: meta, ayah: fallbackBlock.ayahs[0] };
    }
    return null;
  }, [activeMushafBlocks, selectedAyahRef, currentSurahMeta]);

  const isBookmarked = (surahNumber: number, ayahNumber: number): boolean => {
    return bookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );
  };

  const isSavedReadingStop = (surahNumber: number, ayahNumber: number): boolean => {
    return (
      Boolean(savedReadingStop) &&
      savedReadingStop?.surahNumber === surahNumber &&
      savedReadingStop?.ayahNumber === ayahNumber
    );
  };

  const handleSaveReadingStopHere = (surahMeta: SurahMetadata, ayah: AyahItem) => {
    const pageNum = ayah.page || selectedPageNum;
    const stop = createSavedReadingStop({
      surahNumber: surahMeta.number,
      surahNameAr: surahMeta.nameAr,
      ayahNumber: ayah.numberInSurah,
      pageNumber: pageNum,
      textUthmani: ayah.textUthmani,
    });
    setSavedReadingStop(stop);

    // Also ensure it is in the bookmarks list for quick reference
    setBookmarks((prev) => {
      const filtered = prev.filter(
        (b) =>
          !(
            b.surahNumber === surahMeta.number &&
            b.ayahNumber === ayah.numberInSurah
          )
      );
      return [stop, ...filtered];
    });

    setPageTurnToast(
      `تم حفظ موضع التوقف: سورة ${surahMeta.nameAr} · الآية ${toArabicNumerals(
        ayah.numberInSurah
      )} (ص ${toArabicNumerals(pageNum)})`
    );
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setPageTurnToast(null);
    }, 1800);
  };

  const handleResumeFromSavedStop = (stop: SavedReadingStop | null = savedReadingStop) => {
    if (!stop) return;
    setSelectedSurahNum(stop.surahNumber);
    setSelectedPageNum(stop.pageNumber);
    setSelectedAyahRef({
      surahNumber: stop.surahNumber,
      ayahNumber: stop.ayahNumber,
    });
    setActiveOverlay('none');
    setShowHud(false);
    setPageTurnToast(
      `استكمال القراءة: سورة ${stop.surahNameAr} · الآية ${toArabicNumerals(
        stop.ayahNumber
      )} (ص ${toArabicNumerals(stop.pageNumber)})`
    );
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setPageTurnToast(null);
    }, 1800);
  };

  const handleToggleBookmark = (surahMeta: SurahMetadata, ayah: AyahItem) => {
    const exists = isBookmarked(surahMeta.number, ayah.numberInSurah);
    if (exists) {
      setBookmarks((prev) =>
        prev.filter(
          (b) =>
            !(
              b.surahNumber === surahMeta.number &&
              b.ayahNumber === ayah.numberInSurah
            )
        )
      );
    } else {
      const cleanText = stripLeadingBasmalah(
        ayah.textUthmani,
        surahMeta.number,
        ayah.numberInSurah
      );
      const newBm: QuranBookmark = {
        surahNumber: surahMeta.number,
        surahNameAr: surahMeta.nameAr,
        ayahNumber: ayah.numberInSurah,
        pageNumber: ayah.page || selectedPageNum,
        snippet: sanitizeQuranicText(cleanText).slice(0, 55),
        savedAt: new Date().toLocaleDateString('ar-SA'),
      };
      setBookmarks((prev) => [newBm, ...prev]);
    }
  };

  const handleCopyAyah = (surahMeta: SurahMetadata, ayah: AyahItem) => {
    const cleanText = sanitizeQuranicText(
      stripLeadingBasmalah(
        ayah.textUthmani,
        surahMeta.number,
        ayah.numberInSurah
      )
    );
    const textToCopy = `﴿${cleanText}﴾ [سورة ${surahMeta.nameAr}: ${toArabicNumerals(
      ayah.numberInSurah
    )}]\nالتفسير الميسر: ${ayah.tafsirMuyassar}`;
    navigator.clipboard?.writeText(textToCopy);
    const key = `${surahMeta.number}:${ayah.numberInSurah}`;
    setCopiedAyahKey(key);
    setTimeout(() => setCopiedAyahKey(null), 2000);
  };

  const handlePlayAyahAudio = (
    surahNumber: number,
    ayah: AyahItem,
    onEndedCallback?: () => void
  ) => {
    const key = `${surahNumber}:${ayah.numberInSurah}`;
    if (!onEndedCallback && playingAyahKey === key && audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      setPlayingAyahKey(null);
      setMemorizeLoopState(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
    }

    const candidateUrls = getReciterAyahAudioUrls(
      reciterId,
      surahNumber,
      ayah.numberInSurah,
      ayah.globalNumber
    );

    const playCandidate = (idx: number) => {
      if (idx >= candidateUrls.length) {
        setPlayingAyahKey(null);
        return;
      }
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.preload = 'auto';
      audio.src = candidateUrls[idx];
      audio.currentTime = 0;
      setPlayingAyahKey(key);

      audio.onended = () => {
        if (onEndedCallback) {
          onEndedCallback();
        } else {
          setPlayingAyahKey(null);
        }
      };
      audio.onerror = () => {
        playCandidate(idx + 1);
      };
      audio.play().catch(() => {
        playCandidate(idx + 1);
      });
    };

    playCandidate(0);
  };

  // Synchronize default range bounds when Surah or Page changes
  useEffect(() => {
    if (memorizeLoopState) return;
    const firstBlock = activeMushafBlocks[0];
    if (firstBlock && firstBlock.ayahs.length > 0) {
      const firstAyah = firstBlock.ayahs[0].numberInSurah;
      const lastAyah =
        firstBlock.ayahs[firstBlock.ayahs.length - 1].numberInSurah;
      setRepeatFromAyah(firstAyah);
      setRepeatToAyah(Math.max(firstAyah, lastAyah));
    }
  }, [selectedPageNum, activeMushafBlocks, memorizeLoopState]);

  // Run Instant Local + Online Diacritic-Insensitive Quran Verse Search
  useEffect(() => {
    const q = ayahSearchQuery.trim();
    if (q.length < 2) {
      setAyahSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const localMatches = searchQuranVersesLocal(q, pageCache);
    setAyahSearchResults(localMatches);

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = window.setTimeout(() => {
      searchQuranVersesOnline(q, localMatches).then((merged) => {
        if (cancelled) return;
        setAyahSearchResults(merged);
        setIsSearchingOnline(false);
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ayahSearchQuery, pageCache]);

  // Fetch Secondary Concise Tafsir (Al-Jalalayn / Al-Waseet) when requested
  useEffect(() => {
    if (activeOverlay !== 'tafsir' || tafsirEdition !== 'jalalayn' || !activeTafsirContext) {
      return;
    }
    const key = `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}`;
    if (secondaryTafsirCache[key]) return;

    let cancelled = false;
    setIsLoadingSecondaryTafsir(true);
    fetch(`https://api.alquran.cloud/v1/ayah/${key}/ar.jalalayn`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const text = json?.data?.text;
        if (text) {
          setSecondaryTafsirCache((prev) => ({ ...prev, [key]: text }));
        }
        setIsLoadingSecondaryTafsir(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoadingSecondaryTafsir(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOverlay, tafsirEdition, activeTafsirContext, secondaryTafsirCache]);

  // Trigger audio playback whenever memorizeLoopState updates
  useEffect(() => {
    if (!memorizeLoopState) return;
    const { surahNumber, currentAyah } = memorizeLoopState;
    setSelectedAyahRef({ surahNumber, ayahNumber: currentAyah });

    // Find Ayah object on current page or synthesize minimal AyahItem for audio
    let ayahObj: AyahItem = {
      numberInSurah: currentAyah,
      textUthmani: '',
      tafsirMuyassar: '',
    };
    for (const b of activeMushafBlocks) {
      if (b.surahNumber === surahNumber) {
        const found = b.ayahs.find((a) => a.numberInSurah === currentAyah);
        if (found) {
          ayahObj = found;
          break;
        }
      }
    }

    handlePlayAyahAudio(surahNumber, ayahObj, () => {
      setMemorizeLoopState((prev) => {
        if (!prev) return null;
        const step = computeNextMemorizationStep(prev);
        if (step.finished) {
          setPlayingAyahKey(null);
          return null;
        }
        return step.nextState;
      });
    });
  }, [memorizeLoopState]);

  const handleStartMemorizationLoop = () => {
    const sNum = activeMushafBlocks[0]?.surahNumber || selectedSurahNum;
    const from = Math.max(1, Math.min(repeatFromAyah, repeatToAyah));
    const to = Math.max(from, Math.max(repeatFromAyah, repeatToAyah));
    setRepeatFromAyah(from);
    setRepeatToAyah(to);
    setMemorizeLoopState({
      surahNumber: sNum,
      fromAyah: from,
      toAyah: to,
      currentAyah: from,
      ayahRepeatTarget,
      currentAyahIteration: 1,
      rangeRepeatTarget,
      currentRangeIteration: 1,
    });
    setActiveOverlay('none');
    setShowHud(false);
  };

  const handleStopMemorizationLoop = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
    }
    setPlayingAyahKey(null);
    setMemorizeLoopState(null);
  };

  const handleStepMemorizationNext = () => {
    setMemorizeLoopState((prev) => {
      if (!prev) return null;
      const step = computeNextMemorizationStep(prev);
      if (step.finished) {
        handleStopMemorizationLoop();
        return null;
      }
      return step.nextState;
    });
  };

  const handleJumpToSearchResult = async (result: QuranSearchResult) => {
    const exactPage = await resolveExactAyahPage(
      result.surahNumber,
      result.ayahNumber,
      result.pageNumber
    );
    setSelectedSurahNum(result.surahNumber);
    setSelectedPageNum(exactPage);
    setSelectedAyahRef({
      surahNumber: result.surahNumber,
      ayahNumber: result.ayahNumber,
    });
    setActiveOverlay('none');
    setShowHud(false);
    triggerPageToast(exactPage);
  };

  const handleGenerateShareCard = () => {
    if (!activeTafsirContext) return;
    const key = `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}`;
    const displayedTafsir =
      tafsirEdition === 'jalalayn' && secondaryTafsirCache[key]
        ? secondaryTafsirCache[key]
        : activeTafsirContext.ayah.tafsirMuyassar;
    const sourceLabel =
      tafsirEdition === 'jalalayn'
        ? 'المختصر من تفسير الجلالين والسعدي'
        : 'التفسير الميسر — مجمع الملك فهد';

    const dataUrl = generateAyahShareCardDataUrl({
      surahNameAr: activeTafsirContext.surahMeta.nameAr,
      ayahNumber: activeTafsirContext.ayah.numberInSurah,
      pageNumber: activeTafsirContext.ayah.page || selectedPageNum,
      textUthmani: stripLeadingBasmalah(
        activeTafsirContext.ayah.textUthmani,
        activeTafsirContext.surahMeta.number,
        activeTafsirContext.ayah.numberInSurah
      ),
      tafsirText: displayedTafsir,
      tafsirSourceLabel: sourceLabel,
    });
    if (dataUrl) {
      setShareCardDataUrl(dataUrl);
    }
  };

  // =========================================================================
  // TOUCH, MOUSE & KEYBOARD SWIPE GESTURE HANDLERS (Right & Left Page Turning)
  // =========================================================================
  const handleGestureStart = (clientX: number, clientY: number) => {
    if (activeOverlay !== 'none') return;
    didSwipeRef.current = false;
    gestureStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
      active: true,
    };
    setDragOffsetX(0);
  };

  const handleGestureMove = (clientX: number, clientY: number) => {
    if (!gestureStartRef.current.active || activeOverlay !== 'none') return;
    const dx = clientX - gestureStartRef.current.x;
    const dy = clientY - gestureStartRef.current.y;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      didSwipeRef.current = true;
    }
    if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy) * 0.75) {
      const damped = Math.max(-110, Math.min(110, dx * 0.55));
      setDragOffsetX(damped);
    }
  };

  const handleGestureEnd = (clientX: number, clientY: number) => {
    if (!gestureStartRef.current.active || activeOverlay !== 'none') return;
    const dx = clientX - gestureStartRef.current.x;
    const dy = clientY - gestureStartRef.current.y;
    const elapsed = Date.now() - gestureStartRef.current.time;
    gestureStartRef.current.active = false;
    setDragOffsetX(0);

    const nextPage = resolveMushafSwipePage(selectedPageNum, dx, dy, 22);
    if (nextPage !== selectedPageNum) {
      didSwipeRef.current = true;
      handleSelectPage(nextPage, true);
      return;
    }

    // If it was a clean short tap on empty margin (not a swipe or scroll), toggle the floating HUD
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && elapsed < 600) {
      setShowHud((prev) => !prev);
    }
  };

  const baseTypographySpec = useMemo(
    () => getMushafTypographySpec(fontSizeLevel, false),
    [fontSizeLevel]
  );

  // Theme palette classes for Classic Cream, Sepia Parchment, and Night Mode
  const themeStyles = useMemo(() => {
    if (mushafTheme === 'night') {
      return {
        outerBg: 'bg-[#090D0B]',
        sheetBg: 'bg-[#111714] border-[#3D3526]',
        headerBorder: 'border-[#2D281E] text-[#D4B886]',
        headerTitle: 'text-[#F3EDE0]',
        innerFrameBg: 'bg-[#0D1310] border-[#383022]',
        pageCanvasBg: 'bg-[#121915] border-[#2D281E]',
        cartoucheBg: 'bg-[#1A241E] border-[#4A3F2B]',
        cartoucheBadge: 'bg-[#111714] border-[#3D3526] text-[#D4B886]',
        cartoucheSub: 'text-[#C8B282]',
        verseText: 'text-[#ECE4D4]',
        verseSelected: 'bg-[#14532D]/45 text-white',
        verseHover: 'hover:bg-white/5',
        rosetteDefault: 'text-[#D4AF37]',
        footerMedallion: 'bg-[#1A241E] border-[#4A3F2B] text-[#D4B886]',
        footerSub: 'text-[#9E8C6C]',
      };
    }
    if (mushafTheme === 'sepia') {
      return {
        outerBg: 'bg-[#DFCFAF]',
        sheetBg: 'bg-[#EEDEC0] border-[#9C7E54]',
        headerBorder: 'border-[#C5AE87] text-[#5A3E1B]',
        headerTitle: 'text-[#26180A]',
        innerFrameBg: 'bg-[#E7D4B1] border-[#AC8E62]',
        pageCanvasBg: 'bg-[#F3E7CE] border-[#C5AE87]',
        cartoucheBg: 'bg-[#E2CEAA] border-[#9C7E54]',
        cartoucheBadge: 'bg-[#F3E7CE] border-[#AC8E62] text-[#5A3E1B]',
        cartoucheSub: 'text-[#5A3E1B]',
        verseText: 'text-[#231709]',
        verseSelected: 'bg-[#D6BE94] text-[#140C04]',
        verseHover: 'hover:bg-[#E5D2B0]/70',
        rosetteDefault: 'text-[#784B16]',
        footerMedallion: 'bg-[#E2CEAA] border-[#9C7E54] text-[#5A3E1B]',
        footerSub: 'text-[#6E5028]',
      };
    }
    // Classic Cream (Default)
    return {
      outerBg: 'bg-[#EFE8D8]',
      sheetBg: 'bg-[#FAF5E8] border-[#B59E7A]',
      headerBorder: 'border-[#D8CBB3] text-[#6B4E24]',
      headerTitle: 'text-stone-900',
      innerFrameBg: 'bg-[#F6EFE0] border-[#C8B696]',
      pageCanvasBg: 'bg-[#FCF9F2] border-[#D8CBB3]',
      cartoucheBg: 'bg-[#EFE4CE] border-[#B8A382]',
      cartoucheBadge: 'bg-[#FAF5E8] border-[#C8B696] text-[#6D4C2D]',
      cartoucheSub: 'text-[#6D4C2D]',
      verseText: 'text-stone-900',
      verseSelected: 'bg-[#E6D7BC]/75 text-stone-950',
      verseHover: 'hover:bg-[#EFE6D5]/60',
      rosetteDefault: 'text-[#8C6239]',
      footerMedallion: 'bg-[#EFE4CE] border-[#B8A382] text-[#6D4C2D]',
      footerSub: 'text-[#8C6D46]',
    };
  }, [mushafTheme]);

  return (
    <div
      className={`fixed inset-0 z-50 ${themeStyles.outerBg} overflow-y-auto overflow-x-hidden touch-pan-y select-none flex flex-col justify-between p-1.5 sm:p-4 transition-colors duration-200`}
      dir="rtl"
      data-testid="mushaf-fullscreen-root"
      data-theme={mushafTheme}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) handleGestureStart(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) handleGestureMove(t.clientX, t.clientY);
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        if (t) handleGestureEnd(t.clientX, t.clientY);
      }}
      onMouseDown={(e) => {
        handleGestureStart(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => {
        if (e.buttons === 1) {
          handleGestureMove(e.clientX, e.clientY);
        }
      }}
      onMouseUp={(e) => {
        handleGestureEnd(e.clientX, e.clientY);
      }}
    >
      {/* Transient Page-Turn Indicator Pill when swiping right/left */}
      {pageTurnToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-[#1C1917]/90 text-[#FAF5E8] text-xs font-semibold shadow-md pointer-events-none"
          data-testid="mushaf-swipe-toast"
        >
          {pageTurnToast}
        </div>
      )}

      {/* =====================================================================
          FLOATING HUD OVERLAY (HIDDEN BY DEFAULT! Appears only when user taps screen)
         ===================================================================== */}
      {showHud && activeOverlay === 'none' && (
        <div
          className="fixed top-2.5 inset-x-2.5 sm:top-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 bg-[#1C1917]/95 backdrop-blur-md text-[#FAF5E8] rounded-2xl px-3 py-2.5 shadow-xl border border-[#B59E7A]/40 space-y-2"
          data-testid="mushaf-floating-hud"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Row 1: Essential Mushaf Actions */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            {onExitMushaf && (
              <button
                type="button"
                data-testid="exit-mushaf-btn"
                onClick={onExitMushaf}
                className="min-h-[34px] px-3 py-1 text-xs font-semibold bg-[#78350F] hover:bg-[#92400E] text-white rounded-lg cursor-pointer shrink-0 whitespace-nowrap"
              >
                الرئيسية
              </button>
            )}

            <button
              type="button"
              data-testid="hud-open-index-btn"
              onClick={() => setActiveOverlay('index')}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg cursor-pointer shrink-0 whitespace-nowrap"
            >
              الفهرس
            </button>

            <button
              type="button"
              data-testid="hud-open-search-btn"
              onClick={() => setActiveOverlay('search')}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-[#FDE68A]/20 hover:bg-[#FDE68A]/30 text-[#FDE68A] border border-[#FDE68A]/35 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث بالآيات</span>
            </button>

            <button
              type="button"
              data-testid="hud-open-memorize-btn"
              onClick={() => setActiveOverlay('memorize')}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>تكرار الحفظ</span>
            </button>

            <button
              type="button"
              data-testid="hud-open-tafsir-btn"
              onClick={() => {
                setShareCardDataUrl(null);
                setActiveOverlay('tafsir');
              }}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg cursor-pointer shrink-0 whitespace-nowrap"
            >
              التفسير
            </button>

            <button
              type="button"
              data-testid="hud-open-themes-btn"
              onClick={() => setActiveOverlay('themes')}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg cursor-pointer shrink-0 whitespace-nowrap"
            >
              الموضوعات
            </button>

            <button
              type="button"
              data-testid="hud-open-khatmah-btn"
              onClick={() => setActiveOverlay('khatmah')}
              className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-[#14532D] hover:bg-[#166534] text-white rounded-lg cursor-pointer shrink-0 whitespace-nowrap"
            >
              الختمة
            </button>
          </div>

          {/* Row 2: Reading Comfort Themes + Font Size + Quick Page Slider */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/15">
            <div
              role="group"
              aria-label="نمط إضاءة وورق المصحف"
              className="flex items-center gap-1 bg-white/10 p-1 rounded-xl"
            >
              <button
                type="button"
                data-testid="theme-classic-btn"
                onClick={() => setMushafTheme('classic')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  mushafTheme === 'classic'
                    ? 'bg-[#FAF5E8] text-stone-900'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                كريمي
              </button>

              <button
                type="button"
                data-testid="theme-sepia-btn"
                onClick={() => setMushafTheme('sepia')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  mushafTheme === 'sepia'
                    ? 'bg-[#EEDEC0] text-[#26180A]'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                ورق معتّق
              </button>

              <button
                type="button"
                data-testid="theme-night-btn"
                onClick={() => setMushafTheme('night')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  mushafTheme === 'night'
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                وضع ليلي
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[150px] justify-end">
              <input
                type="range"
                min={1}
                max={604}
                value={selectedPageNum}
                aria-label="شريط الانتقال بين صفحات المصحف"
                onChange={(e) => handleSelectPage(Number(e.target.value), false)}
                className="w-24 sm:w-36 accent-[#14532D] cursor-pointer"
              />

              <div className="flex items-center gap-1 bg-white/15 rounded-lg px-1.5 py-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="تصغير خط المصحف"
                  disabled={fontSizeLevel <= 1}
                  onClick={() => setFontSizeLevel((l) => Math.max(1, l - 1))}
                  className="p-1 text-white/90 hover:text-white disabled:opacity-35 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] px-1 font-semibold whitespace-nowrap">
                  الخط: {baseTypographySpec.labelAr}
                </span>
                <button
                  type="button"
                  aria-label="تكبير خط المصحف"
                  disabled={fontSizeLevel >= 5}
                  onClick={() => setFontSizeLevel((l) => Math.min(5, l + 1))}
                  className="p-1 text-white/90 hover:text-white disabled:opacity-35 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FULL-SCREEN MUSHAF PAGE SHEET (100% OF VIEWPORT)
         ===================================================================== */}
      <div
        data-testid="mushaf-page-sheet"
        style={{
          transform: dragOffsetX ? `translateX(${dragOffsetX}px)` : undefined,
          transition: dragOffsetX
            ? 'none'
            : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between ${themeStyles.sheetBg} border-2 rounded-2xl p-2 sm:p-4 shadow-md transition-colors duration-200`}
      >
        {/* Top Mushaf Margin: Juz Name (Right) · Surah Name (Center) · Direct Font Control, Resume Stop & Page Number (Left) */}
        <div
          className={`flex flex-wrap items-center justify-between gap-1.5 px-2 sm:px-3.5 pb-1.5 border-b ${themeStyles.headerBorder} text-[11px] sm:text-xs font-semibold`}
        >
          <span data-testid="mushaf-header-juz" className="whitespace-nowrap">
            {pageHeaderInfo.juzNameAr}
          </span>
          <span
            data-testid="mushaf-header-surah"
            className={`font-quran text-sm sm:text-base ${themeStyles.headerTitle} font-bold truncate max-w-[145px] sm:max-w-none`}
          >
            {pageHeaderInfo.surahNamesOnPage}
          </span>
          <div
            className="flex items-center gap-1.5 sm:gap-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Direct Quick Font Size Control on Mushaf Header */}
            <div
              role="group"
              aria-label="حجم خط المصحف"
              className={`inline-flex items-center gap-0.5 rounded-lg border px-1 py-0.5 ${themeStyles.cartoucheBadge}`}
            >
              <button
                type="button"
                data-testid="mushaf-top-font-decrease-btn"
                aria-label="تصغير خط المصحف"
                disabled={fontSizeLevel <= 1}
                onClick={() => setFontSizeLevel((l) => Math.max(1, l - 1))}
                className="px-1 py-0.5 text-[10px] sm:text-[11px] font-bold disabled:opacity-35 cursor-pointer"
                title="تصغير حجم خط الآيات"
              >
                أ-
              </button>
              <span
                data-testid="mushaf-font-size-label"
                className="text-[10px] font-semibold px-0.5 hidden sm:inline whitespace-nowrap"
              >
                {baseTypographySpec.labelAr}
              </span>
              <button
                type="button"
                data-testid="mushaf-top-font-increase-btn"
                aria-label="تكبير خط المصحف"
                disabled={fontSizeLevel >= 5}
                onClick={() => setFontSizeLevel((l) => Math.min(5, l + 1))}
                className="px-1 py-0.5 text-[10px] sm:text-[11px] font-bold disabled:opacity-35 cursor-pointer"
                title="تكبير حجم خط الآيات"
              >
                أ+
              </button>
            </div>

            {savedReadingStop && (
              <button
                type="button"
                data-testid="mushaf-top-resume-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResumeFromSavedStop(savedReadingStop);
                }}
                title={`اضغط لاستكمال القراءة من آخر آية محفوظة: ${formatReadingStopLabelAr(savedReadingStop)}`}
                className="px-2 py-0.5 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-[#FDE68A] text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Bookmark className="w-2.5 h-2.5 fill-current shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-none">
                  استكمال: {savedReadingStop.surahNameAr} آية{' '}
                  {toArabicNumerals(savedReadingStop.ayahNumber)}
                </span>
              </button>
            )}
            <button
              type="button"
              data-testid="mushaf-top-khatmah-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveOverlay('khatmah');
              }}
              title="فتح متابعة ختم القرآن (تسجيل بالصفحة أو الجزء وتحديد التاريخ المستهدف)"
              className="px-2 py-0.5 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-white text-[10px] sm:text-[11px] font-bold cursor-pointer whitespace-nowrap"
            >
              تتبع الختمة
            </button>
            <span data-testid="mushaf-header-page" className="whitespace-nowrap">
              ص {toArabicNumerals(pageHeaderInfo.pageNum)}
            </span>
          </div>
        </div>

        {/* Inner Ornamental Double-Bordered Mushaf Frame */}
        <div
          className={`my-1.5 flex-1 flex flex-col border-2 ${themeStyles.innerFrameBg} rounded-xl p-1 sm:p-1.5`}
        >
          <div
            className={`flex-1 border ${themeStyles.pageCanvasBg} rounded-lg px-3 py-3 sm:px-7 sm:py-5 flex flex-col justify-between space-y-3.5`}
          >
            {isLoadingContent ? (
              <div className="py-20 text-center space-y-3 my-auto" role="status">
                <div className="w-8 h-8 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className={`text-sm ${themeStyles.verseText}`}>
                  جاري تحميل صفحة المصحف الشريف ({toArabicNumerals(selectedPageNum)})...
                </p>
              </div>
            ) : fetchError ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 text-center space-y-3 my-auto">
                <p className="text-sm text-stone-800">{fetchError}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPage(1);
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium bg-[#14532D] text-white rounded-lg cursor-pointer"
                  >
                    صفحة ١ (الفاتحة)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPage(2);
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium bg-white border border-stone-300 text-stone-800 rounded-lg cursor-pointer"
                  >
                    صفحة ٢ (البقرة)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPage(604);
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium bg-white border border-stone-300 text-stone-800 rounded-lg cursor-pointer"
                  >
                    صفحة ٦٠٤ (الإخلاص والمعوذتان)
                  </button>
                </div>
              </div>
            ) : activeMushafBlocks.length === 0 ? (
              <div className="py-16 text-center text-sm text-stone-600 my-auto">
                لا توجد آيات في هذه الصفحة.
              </div>
            ) : (
              /* AUTHENTIC PRINTED MUSHAF PAGE FLOW */
              <div className="space-y-4 sm:space-y-5 my-auto">
                {activeMushafBlocks.map((block) => {
                  const sMeta =
                    ALL_SURAHS.find((s) => s.number === block.surahNumber) ||
                    currentSurahMeta;
                  const firstAyahNum = block.ayahs[0]?.numberInSurah || 1;
                  const startsAtBeginningOfSurah = firstAyahNum === 1;
                  const showUnnumberedBasmalah = shouldShowUnnumberedBasmalah(
                    sMeta.number,
                    firstAyahNum
                  );
                  const bodyAyahs = block.ayahs;

                  const totalBlockChars = bodyAyahs.reduce(
                    (acc, a) => acc + (a.textUthmani?.length || 0),
                    0
                  );
                  const isCenteredShortPage = isCeremonialCenteredMushafBlock(
                    selectedPageNum,
                    sMeta.number,
                    totalBlockChars
                  );
                  const blockTypo = getMushafTypographySpec(
                    fontSizeLevel,
                    isCenteredShortPage
                  );

                  return (
                    <section
                      key={`${block.surahNumber}-${firstAyahNum}`}
                      className="space-y-2.5 sm:space-y-3"
                      data-testid={`mushaf-surah-block-${sMeta.number}`}
                    >
                      {/* Ornamental Surah Header Cartouche */}
                      {startsAtBeginningOfSurah && (
                        <div
                          className={`${themeStyles.cartoucheBg} border rounded-xl px-3.5 py-1.5 sm:px-5 sm:py-2 text-center space-y-0.5`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`hidden sm:inline-block text-[11px] font-medium ${themeStyles.cartoucheSub} whitespace-nowrap`}
                            >
                              ترتيبها {toArabicNumerals(sMeta.number)}
                            </span>
                            <h2
                              className={`font-quran ${blockTypo.surahTitleClass} font-bold ${themeStyles.headerTitle} whitespace-nowrap mx-auto leading-snug`}
                            >
                              سُورَةُ {sMeta.nameAr}
                            </h2>
                            <span
                              className={`hidden sm:inline-block text-[11px] font-medium ${themeStyles.cartoucheSub} whitespace-nowrap`}
                            >
                              {sMeta.revelationType} · آياتها{' '}
                              {toArabicNumerals(sMeta.ayahCount)}
                            </span>
                          </div>
                          <div
                            className={`sm:hidden text-[10px] font-medium ${themeStyles.cartoucheSub}`}
                          >
                            ترتيبها {toArabicNumerals(sMeta.number)} ·{' '}
                            {sMeta.revelationType} · آياتها{' '}
                            {toArabicNumerals(sMeta.ayahCount)}
                          </div>
                        </div>
                      )}

                      {/* Unnumbered Opening Basmalah for all Surahs (except Surah 9 At-Tawbah) */}
                      {showUnnumberedBasmalah && (
                        <div
                          className={`text-center font-quran ${blockTypo.basmalahClass} ${themeStyles.verseText} py-0.5 select-all`}
                          data-testid="unnumbered-basmalah"
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                      )}

                      {/* Continuous Mushaf Lines with Authentic Inline Quranic Rosettes ﴿١﴾ */}
                      <div
                        className={`font-quran ${blockTypo.verseClass} ${themeStyles.verseText} ${
                          isCenteredShortPage
                            ? 'text-center'
                            : 'text-justify [text-align-last:center]'
                        } tracking-normal`}
                        dir="rtl"
                      >
                        {bodyAyahs.map((ayah) => {
                          const isSelected =
                            selectedAyahRef.surahNumber === sMeta.number &&
                            selectedAyahRef.ayahNumber === ayah.numberInSurah;
                          const isStopHere = isSavedReadingStop(
                            sMeta.number,
                            ayah.numberInSurah
                          );
                          const bookmarked = isBookmarked(
                            sMeta.number,
                            ayah.numberInSurah
                          );
                          const cleanVerseText = sanitizeQuranicText(
                            stripLeadingBasmalah(
                              ayah.textUthmani,
                              sMeta.number,
                              ayah.numberInSurah
                            )
                          );

                          return (
                            <span
                              key={`${sMeta.number}-${ayah.numberInSurah}`}
                              data-testid={`mushaf-ayah-${sMeta.number}-${ayah.numberInSurah}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (didSwipeRef.current) {
                                  didSwipeRef.current = false;
                                  return;
                                }
                                setSelectedAyahRef({
                                  surahNumber: sMeta.number,
                                  ayahNumber: ayah.numberInSurah,
                                });
                                setShareCardDataUrl(null);
                                setActiveOverlay('tafsir');
                              }}
                              title="اضغط لعرض التفسير أو حفظ التوقف عند هذه الآية للاستكمال لاحقاً"
                              className={`inline cursor-pointer rounded px-0.5 py-0.5 transition-colors ${
                                isStopHere
                                  ? 'bg-[#FDE68A]/55 text-stone-950 ring-1 ring-[#B45309]/50'
                                  : isSelected
                                  ? themeStyles.verseSelected
                                  : themeStyles.verseHover
                              }`}
                            >
                              <span>{cleanVerseText}</span>
                              <span
                                aria-label={`آية ${ayah.numberInSurah} من سورة ${sMeta.nameAr}`}
                                className={`${blockTypo.rosetteClass} ${
                                  isStopHere || bookmarked
                                    ? 'text-[#B45309] font-bold'
                                    : isSelected
                                    ? 'text-[#22C55E] font-bold'
                                    : themeStyles.rosetteDefault
                                }`}
                              >
                                ﴿{toArabicNumerals(ayah.numberInSurah)}﴾
                              </span>
                              {isStopHere && (
                                <span
                                  data-testid="saved-stop-inline-badge"
                                  className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 rounded bg-[#14532D] text-[#FDE68A] font-sans text-[10px] font-bold align-middle select-none"
                                >
                                  <Bookmark className="w-2.5 h-2.5 fill-current" />
                                  <span>موضع التوقف</span>
                                </span>
                              )}{' '}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* Mushaf Bottom Page Number & Instant Page Turn Controls */}
            <div
              className="pt-2.5 border-t border-[#E2D6C1]/40 flex items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-testid="mushaf-prev-page-btn"
                disabled={selectedPageNum <= 1}
                onClick={() =>
                  handleSelectPage(Math.max(1, selectedPageNum - 1), true)
                }
                className={`min-h-[36px] px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${themeStyles.footerMedallion}`}
              >
                <span aria-hidden="true">→</span>
                <span>السابقة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHud((prev) => !prev)}
                className={`text-xs sm:text-sm font-bold ${themeStyles.footerSub} hover:underline cursor-pointer whitespace-nowrap px-2 py-1`}
                data-testid="mushaf-footer-page-num"
                title="اضغط لإظهار شريط أدوات المصحف والفهرس"
              >
                — صفحة {toArabicNumerals(pageHeaderInfo.pageNum)} من ٦٠٤ —
              </button>

              <button
                type="button"
                data-testid="mushaf-next-page-btn"
                disabled={selectedPageNum >= 604}
                onClick={() =>
                  handleSelectPage(Math.min(604, selectedPageNum + 1), true)
                }
                className={`min-h-[36px] px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${themeStyles.footerMedallion}`}
              >
                <span>التالية</span>
                <span aria-hidden="true">←</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL OVERLAY 1: SURAH & PAGE INDEX ('index')
         ===================================================================== */}
      {activeOverlay === 'index' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <aside
            aria-label="فهرس سور القرآن الكريم"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88dvh] flex flex-col bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-3.5 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#D8CBB3] pb-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  فهرس سور المصحف الشريف (١١٤ سورة · ٦٠٤ صفحات)
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  اختر أي سورة أو صفحة للانتقال المباشر في وضع الشاشة الكاملة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                aria-label="إغلاق الفهرس"
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-[#C8B696] bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Saved Reading Stop Card inside Index Modal */}
            {savedReadingStop && (
              <div
                data-testid="index-saved-stop-card"
                className="bg-[#14532D] text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FDE68A]">
                    <Bookmark className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>
                      آخر موضع توقف محفوظ: {formatReadingStopLabelAr(savedReadingStop)}
                    </span>
                  </div>
                  <p className="font-quran text-sm text-stone-100 truncate">
                    ﴿{savedReadingStop.snippet}﴾
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="index-resume-stop-btn"
                  onClick={() => handleResumeFromSavedStop(savedReadingStop)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FDE68A] hover:bg-amber-200 text-stone-950 text-xs font-bold cursor-pointer shrink-0"
                >
                  استكمال القراءة من هنا
                </button>
              </div>
            )}

            {/* Quick Jump Pages */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#6B4E24]">
                انتقال سريع:
              </span>
              {[
                { label: 'الفاتحة (ص ١)', page: 1 },
                { label: 'البقرة (ص ٢)', page: 2 },
                { label: 'الكهف (ص ٢٩٣)', page: 293 },
                { label: 'يس (ص ٤٤٠)', page: 440 },
                { label: 'الملك (ص ٥٦٢)', page: 562 },
                { label: 'الإخلاص والمعوذتان (ص ٦٠٤)', page: 604 },
              ].map((item) => (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => {
                    handleSelectPage(item.page);
                    setActiveOverlay('none');
                    setShowHud(false);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border bg-white text-stone-800 border-[#C8B696] hover:bg-[#EFE4CE] cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="ابحث باسم السورة أو رقمها"
                  placeholder="ابحث باسم السورة أو رقمها..."
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  className="w-full min-h-[36px] pr-9 pl-3 py-1.5 text-xs bg-white border border-[#C8B696] rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFE4CE] rounded-lg">
                {(['ALL', 'مكية', 'مدنية'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRevelationFilter(type)}
                    className={`py-1 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      revelationFilter === type
                        ? 'bg-white text-stone-900 shadow-xs font-semibold'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    {type === 'ALL' ? 'الكل' : type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {filteredSurahs.map((surah) => {
                const isSelected = surah.number === selectedSurahNum;
                return (
                  <button
                    key={surah.number}
                    type="button"
                    onClick={() => handleSelectSurah(surah.number)}
                    className={`w-full text-right px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-white hover:bg-[#EFE4CE]/60 text-stone-800 border-[#D8CBB3]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FAF5E8] text-[#6D4C2D]'
                        }`}
                      >
                        {toArabicNumerals(surah.number)}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-xs block truncate">
                          سورة {surah.nameAr}
                        </span>
                        <span
                          className={`text-[10px] block ${
                            isSelected ? 'text-emerald-100' : 'text-stone-500'
                          }`}
                        >
                          {surah.revelationType} ·{' '}
                          {toArabicNumerals(surah.ayahCount)} آية
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-[#FAF5E8] text-[#78350F]'
                      }`}
                    >
                      ص {toArabicNumerals(surah.startPage)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          MODAL OVERLAY 2: THEMATIC QURAN INDEX ('themes')
         ===================================================================== */}
      {activeOverlay === 'themes' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <aside
            aria-label="المفهرس الموضوعي للقرآن الكريم"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[88dvh] flex flex-col bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#D8CBB3] pb-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  المفهرس الموضوعي للقرآن الكريم
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  تصفح الآيات حسب الموضوع (الصبر، الرزق، الجنة، بر الوالدين، الدعاء، القصص القرآني) وانتقل لصفحتها مباشرة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                aria-label="إغلاق المفهرس الموضوعي"
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-[#C8B696] bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {THEMATIC_QURAN_CATEGORIES.map((cat) => {
                const active = cat.id === selectedThemeCategory;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedThemeCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#14532D] text-white'
                        : 'bg-white border border-[#C8B696] text-stone-800 hover:bg-[#EFE4CE]'
                    }`}
                  >
                    {cat.nameAr}
                  </button>
                );
              })}
            </div>

            {/* Verses List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredThematicVerses.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-[#D8CBB3] rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {v.topicTitleAr}
                      </h3>
                      <span className="text-xs text-[#78350F]">
                        سورة {v.surahNameAr} · الآية{' '}
                        {toArabicNumerals(v.ayahNumber)} · صفحة{' '}
                        {toArabicNumerals(v.mushafPage)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectPage(v.mushafPage, true);
                        setActiveOverlay('none');
                        setShowHud(false);
                      }}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 cursor-pointer"
                    >
                      افتح في المصحف (ص {toArabicNumerals(v.mushafPage)})
                    </button>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-stone-900 bg-[#FCF9F2] border border-[#E5DAC3] rounded-lg p-3 leading-loose text-center">
                    ﴿{v.uthmaniText}﴾
                  </p>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    <strong className="text-[#14532D]">التوجيه والمعنى: </strong>
                    {v.reflectionAr}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          ACTIVE MEMORIZATION LOOP BAR (Floating bottom bar during range repeat)
         ===================================================================== */}
      {memorizeLoopState && (
        <div
          data-testid="active-memorize-bar"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-2xl bg-[#14532D] text-white border border-[#FDE68A]/40 rounded-2xl px-3.5 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Repeat className="w-4 h-4 text-[#FDE68A] shrink-0 animate-spin" />
            <div className="truncate">
              <span className="text-xs font-bold block truncate">
                تحفيظ سورة {currentSurahMeta.nameAr}: الآية{' '}
                {toArabicNumerals(memorizeLoopState.currentAyah)} (النطاق{' '}
                {toArabicNumerals(memorizeLoopState.fromAyah)}–
                {toArabicNumerals(memorizeLoopState.toAyah)})
              </span>
              <span className="text-[11px] text-[#FDE68A] block">
                تكرار الآية:{' '}
                {toArabicNumerals(memorizeLoopState.currentAyahIteration)} /{' '}
                {toArabicNumerals(memorizeLoopState.ayahRepeatTarget)} · تكرار المقطع:{' '}
                {toArabicNumerals(memorizeLoopState.currentRangeIteration)} /{' '}
                {memorizeLoopState.rangeRepeatTarget === 0
                  ? 'مستمر'
                  : toArabicNumerals(memorizeLoopState.rangeRepeatTarget)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="memorize-next-step-btn"
              onClick={handleStepMemorizationNext}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
            >
              التالية
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay('memorize')}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
            >
              ضبط النطاق
            </button>
            <button
              type="button"
              data-testid="stop-memorize-loop-btn"
              onClick={handleStopMemorizationLoop}
              className="px-2.5 py-1 rounded-lg bg-red-800/90 hover:bg-red-700 text-xs font-semibold cursor-pointer"
            >
              إيقاف
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OVERLAY: INSTANT DIACRITIC-FREE QURAN VERSE SEARCH ('search')
         ===================================================================== */}
      {activeOverlay === 'search' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <aside
            aria-label="البحث الفوري في آيات القرآن الكريم"
            data-testid="quran-verse-search-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88dvh] flex flex-col bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-3.5 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#D8CBB3] pb-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  البحث الفوري في آيات القرآن الكريم (بدون اشتراط التشكيل)
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  اكتب أي كلمة أو جزء من آية للانتقال المباشر إلى الصفحة والآية في المصحف الشريف
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                aria-label="إغلاق البحث"
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-[#C8B696] bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                data-testid="quran-verse-search-input"
                autoFocus
                placeholder="ابحث بكلمة أو آية بدون تشكيل (مثال: الحي القيوم، يرزقه من حيث لا يحتسب، إياك نعبد)..."
                value={ayahSearchQuery}
                onChange={(e) => setAyahSearchQuery(e.target.value)}
                className="w-full min-h-[42px] pr-10 pl-3 py-2 text-xs sm:text-sm bg-white border border-[#B59E7A] rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            {/* Quick Landmark Search Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#6B4E24]">
                آيات مشهورة:
              </span>
              {[
                'الحي القيوم',
                'لا يكلف الله نفسا إلا وسعها',
                'فإني قريب أجيب دعوة الداع',
                'لا تقنطوا من رحمة الله',
                'ومن يتق الله يجعل له مخرجا',
                'إن مع العسر يسرا',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setAyahSearchQuery(sample)}
                  className="px-2.5 py-1 text-[11px] rounded-lg border bg-white text-stone-800 border-[#C8B696] hover:bg-[#EFE4CE] cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {ayahSearchQuery.trim().length < 2 ? (
                <div className="py-10 text-center text-xs text-stone-600">
                  أدخل كلمتين أو أكثر للبحث الفوري في آيات القرآن الكريم (٦٢٣٦ آية).
                </div>
              ) : ayahSearchResults.length === 0 && !isSearchingOnline ? (
                <div className="py-10 text-center text-xs text-stone-600">
                  لم يتم العثور على آيات مطابقة لعبارة «{ayahSearchQuery}». جرّب كتابة كلمة مفردة بدون لواصق.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                    <span>
                      عدد النتائج المطابقة: {toArabicNumerals(ayahSearchResults.length)} آية
                    </span>
                    {isSearchingOnline && (
                      <span className="text-[#14532D] font-semibold">
                        جاري استكمال البحث في جميع سور المصحف...
                      </span>
                    )}
                  </div>
                  {ayahSearchResults.map((res) => (
                    <div
                      key={res.id}
                      data-testid={`quran-search-result-${res.id}`}
                      className="bg-white border border-[#D8CBB3] rounded-xl p-3.5 space-y-2 hover:border-[#14532D] transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#14532D]">
                          سورة {res.surahNameAr} · الآية {toArabicNumerals(res.ayahNumber)} · صفحة{' '}
                          {toArabicNumerals(res.pageNumber)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJumpToSearchResult(res)}
                          className="min-h-[30px] px-3 py-1 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-semibold cursor-pointer"
                        >
                          انتقل للآية في المصحف
                        </button>
                      </div>

                      <p className="font-quran text-lg sm:text-xl text-stone-900 bg-[#FCF9F2] border border-[#E5DAC3] rounded-lg px-3 py-2 leading-relaxed">
                        ﴿{res.textUthmani}﴾
                      </p>

                      {res.tafsirSnippet && (
                        <p className="text-[11px] text-stone-600 line-clamp-2">
                          <strong className="text-[#78350F]">التفسير: </strong>
                          {res.tafsirSnippet}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          MODAL OVERLAY: AYAH RANGE MEMORIZATION & REPETITION ('memorize')
         ===================================================================== */}
      {activeOverlay === 'memorize' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div
            data-testid="memorize-range-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#D8CBB3] pb-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  تكرار الآيات للحفظ والمراجعة — سورة {currentSurahMeta.nameAr}
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  حدّد نطاق الآيات وعدد مرات تكرار كل آية وتكرار المقطع لتثبيت الحفظ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-[#C8B696] bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="repeat-from-ayah"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  من الآية رقم:
                </label>
                <input
                  id="repeat-from-ayah"
                  data-testid="repeat-from-ayah-input"
                  type="number"
                  min={1}
                  max={currentSurahMeta.ayahCount}
                  value={repeatFromAyah}
                  onChange={(e) =>
                    setRepeatFromAyah(
                      Math.max(
                        1,
                        Math.min(currentSurahMeta.ayahCount, Number(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-sm font-bold bg-white border border-[#C8B696] rounded-xl text-stone-900"
                />
              </div>

              <div>
                <label
                  htmlFor="repeat-to-ayah"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  إلى الآية رقم (الحد الأقصى {toArabicNumerals(currentSurahMeta.ayahCount)}):
                </label>
                <input
                  id="repeat-to-ayah"
                  data-testid="repeat-to-ayah-input"
                  type="number"
                  min={1}
                  max={currentSurahMeta.ayahCount}
                  value={repeatToAyah}
                  onChange={(e) =>
                    setRepeatToAyah(
                      Math.max(
                        1,
                        Math.min(currentSurahMeta.ayahCount, Number(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 text-sm font-bold bg-white border border-[#C8B696] rounded-xl text-stone-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-stone-800">
                تكرار كل آية على حدة (للحفظ الجديد):
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { count: 1, label: 'مرة واحدة' },
                  { count: 2, label: 'مرتان (٢)' },
                  { count: 3, label: '٣ مرات' },
                  { count: 5, label: '٥ مرات' },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setAyahRepeatTarget(opt.count)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      ayahRepeatTarget === opt.count
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-white text-stone-800 border-[#C8B696] hover:bg-[#EFE4CE]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-stone-800">
                تكرار المقطع الكامل (للربط والمراجعة):
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { count: 1, label: 'مرة واحدة' },
                  { count: 3, label: '٣ مرات' },
                  { count: 5, label: '٥ مرات' },
                  { count: 0, label: 'تكرار مستمر' },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setRangeRepeatTarget(opt.count)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      rangeRepeatTarget === opt.count
                        ? 'bg-[#78350F] text-white border-[#78350F]'
                        : 'bg-white text-stone-800 border-[#C8B696] hover:bg-[#EFE4CE]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="memorize-reciter-select"
                className="block text-xs font-bold text-stone-800 mb-1"
              >
                القارئ المعتمد للتسميع والتكرار:
              </label>
              <select
                id="memorize-reciter-select"
                value={reciterId}
                onChange={(e) => setReciterId(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-white border border-[#C8B696] rounded-xl text-stone-800"
              >
                {VERIFIED_RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr} ({r.styleAr})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8CBB3]">
              {memorizeLoopState && (
                <button
                  type="button"
                  onClick={handleStopMemorizationLoop}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-red-800 text-white text-xs font-semibold cursor-pointer"
                >
                  إيقاف التكرار الحالي
                </button>
              )}
              <button
                type="button"
                data-testid="start-memorize-loop-btn"
                onClick={handleStartMemorizationLoop}
                className="min-h-[38px] px-5 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>
                  بدء تكرار الآيات ({toArabicNumerals(repeatFromAyah)} إلى{' '}
                  {toArabicNumerals(repeatToAyah)})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OVERLAY 3: CALM AYAH POPOVER — TAFSIR, WORD MEANINGS & SHARE CARD ('tafsir')
         ===================================================================== */}
      {activeOverlay === 'tafsir' && activeTafsirContext && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div
            data-testid="ayah-tafsir-popover"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#D8CBB3] pb-2.5">
              <div>
                <span className="text-sm sm:text-base font-bold text-[#14532D] block">
                  سورة {activeTafsirContext.surahMeta.nameAr} · الآية{' '}
                  {toArabicNumerals(activeTafsirContext.ayah.numberInSurah)} (صفحة{' '}
                  {toArabicNumerals(activeTafsirContext.ayah.page || selectedPageNum)})
                </span>
                <span className="text-[11px] text-stone-600">
                  التفسير الموثق ومعاني الكلمات الغريبة والاستماع ومشاركة البطاقة
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-[#C8B696] bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const cleanPopoverVerse = sanitizeQuranicText(
                stripLeadingBasmalah(
                  activeTafsirContext.ayah.textUthmani,
                  activeTafsirContext.surahMeta.number,
                  activeTafsirContext.ayah.numberInSurah
                )
              );
              const popoverVerseClass = getTafsirPopoverVerseClass(
                cleanPopoverVerse.length
              );
              return (
                <p
                  className={`font-quran ${popoverVerseClass} text-stone-900 bg-[#FCF9F2] border border-[#E5DAC3] rounded-xl px-4 py-3`}
                >
                  ﴿{cleanPopoverVerse}﴾
                </p>
              );
            })()}

            {/* Primary Save Reading Position Bar (حفظ موضع القراءة عند هذه الآية والاستكمال لاحقاً) */}
            <div
              data-testid="save-reading-stop-banner"
              className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-2 transition-colors ${
                isSavedReadingStop(
                  activeTafsirContext.surahMeta.number,
                  activeTafsirContext.ayah.numberInSurah
                )
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-[#EFE4CE]/75 text-stone-900 border-[#C8B696]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bookmark
                  className={`w-4 h-4 shrink-0 ${
                    isSavedReadingStop(
                      activeTafsirContext.surahMeta.number,
                      activeTafsirContext.ayah.numberInSurah
                    )
                      ? 'text-[#FDE68A] fill-current'
                      : 'text-[#78350F]'
                  }`}
                />
                <div className="text-xs">
                  <span className="font-bold block">
                    {isSavedReadingStop(
                      activeTafsirContext.surahMeta.number,
                      activeTafsirContext.ayah.numberInSurah
                    )
                      ? 'تم حفظ موضع توقفك عند هذه الآية للاستكمال لاحقاً'
                      : 'هل توقفت في القراءة عند هذه الآية؟'}
                  </span>
                  <span
                    className={`text-[11px] block ${
                      isSavedReadingStop(
                        activeTafsirContext.surahMeta.number,
                        activeTafsirContext.ayah.numberInSurah
                      )
                        ? 'text-[#FDE68A]'
                        : 'text-stone-600'
                    }`}
                  >
                    سورة {activeTafsirContext.surahMeta.nameAr} · الآية{' '}
                    {toArabicNumerals(activeTafsirContext.ayah.numberInSurah)} · صفحة{' '}
                    {toArabicNumerals(activeTafsirContext.ayah.page || selectedPageNum)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="save-reading-stop-btn"
                onClick={() =>
                  handleSaveReadingStopHere(
                    activeTafsirContext.surahMeta,
                    activeTafsirContext.ayah
                  )
                }
                className={`min-h-[34px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSavedReadingStop(
                    activeTafsirContext.surahMeta.number,
                    activeTafsirContext.ayah.numberInSurah
                  )
                    ? 'bg-[#FDE68A] text-stone-950'
                    : 'bg-[#14532D] hover:bg-[#14532D]/90 text-white'
                }`}
              >
                {isSavedReadingStop(
                  activeTafsirContext.surahMeta.number,
                  activeTafsirContext.ayah.numberInSurah
                ) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>موضع التوقف المحفوظ</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>حفظ التوقف هنا للاستكمال لاحقاً</span>
                  </>
                )}
              </button>
            </div>

            {/* Tafsir Source Switcher + Content */}
            <div className="bg-white border border-[#D8CBB3] rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <span className="text-xs font-bold text-[#78350F] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>التفسير المختصر المعتمد:</span>
                </span>
                <div className="flex items-center gap-1 bg-[#FAF5E8] p-1 rounded-lg border border-[#D8CBB3]">
                  <button
                    type="button"
                    data-testid="tafsir-tab-muyassar"
                    onClick={() => setTafsirEdition('muyassar')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      tafsirEdition === 'muyassar'
                        ? 'bg-[#14532D] text-white'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    التفسير الميسر
                  </button>
                  <button
                    type="button"
                    data-testid="tafsir-tab-jalalayn"
                    onClick={() => setTafsirEdition('jalalayn')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      tafsirEdition === 'jalalayn'
                        ? 'bg-[#14532D] text-white'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    المختصر / الجلالين
                  </button>
                </div>
              </div>

              {tafsirEdition === 'jalalayn' && isLoadingSecondaryTafsir ? (
                <p className="text-xs text-stone-500 py-2">جاري تحميل التفسير الموثق...</p>
              ) : (
                <p
                  data-testid="ayah-tafsir-text"
                  className="text-sm sm:text-[15px] text-stone-800 leading-[1.9]"
                >
                  {tafsirEdition === 'jalalayn'
                    ? secondaryTafsirCache[
                        `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}`
                      ] || activeTafsirContext.ayah.tafsirMuyassar
                    : activeTafsirContext.ayah.tafsirMuyassar}
                </p>
              )}
            </div>

            {/* Word-by-Word / Key Vocabulary Meanings (معاني الكلمات والمفردات) */}
            {(() => {
              const wordMeanings = extractAyahWordMeanings(
                stripLeadingBasmalah(
                  activeTafsirContext.ayah.textUthmani,
                  activeTafsirContext.surahMeta.number,
                  activeTafsirContext.ayah.numberInSurah
                ),
                activeTafsirContext.ayah.tafsirMuyassar
              );
              if (wordMeanings.length === 0) return null;
              return (
                <div
                  data-testid="ayah-word-meanings"
                  className="bg-[#FCF9F2] border border-[#D8CBB3] rounded-xl p-3.5 space-y-2"
                >
                  <span className="text-xs font-bold text-[#14532D] block">
                    بيان معاني الكلمات والمفردات القرآنية:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wordMeanings.map((wm, idx) => (
                      <div
                        key={`${wm.word}-${idx}`}
                        className="bg-white border border-[#E5DAC3] rounded-lg px-3 py-2 flex flex-col gap-0.5"
                      >
                        <span className="font-quran text-base font-bold text-[#78350F]">
                          ﴿{wm.word}﴾
                        </span>
                        <span className="text-xs text-stone-700 leading-snug">
                          {wm.meaningAr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Generated Image Share Card Preview */}
            {shareCardDataUrl && (
              <div
                data-testid="ayah-share-card-preview"
                className="bg-white border border-[#B59E7A] rounded-xl p-3 space-y-2.5 text-center"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#14532D]">
                    معاينة البطاقة المصورة للآية الكريمة:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {onOpenDawahCard && (
                      <button
                        type="button"
                        data-testid="open-dawah-studio-from-ayah-btn"
                        onClick={() => {
                          const key = `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}`;
                          const displayedTafsir =
                            tafsirEdition === 'jalalayn' && secondaryTafsirCache[key]
                              ? secondaryTafsirCache[key]
                              : activeTafsirContext.ayah.tafsirMuyassar;
                          const sourceLabel =
                            tafsirEdition === 'jalalayn'
                              ? 'المختصر من تفسير الجلالين والسعدي'
                              : 'التفسير الميسر · مجمع الملك فهد';
                          onOpenDawahCard({
                            category: 'ayah',
                            headerBadgeAr: `سُورَةُ ${activeTafsirContext.surahMeta.nameAr} · الآية ${toArabicNumerals(
                              activeTafsirContext.ayah.numberInSurah
                            )} · صفحة ${toArabicNumerals(
                              activeTafsirContext.ayah.page || selectedPageNum
                            )}`,
                            titleAr: `سورة ${activeTafsirContext.surahMeta.nameAr}`,
                            mainArabicText: stripLeadingBasmalah(
                              activeTafsirContext.ayah.textUthmani,
                              activeTafsirContext.surahMeta.number,
                              activeTafsirContext.ayah.numberInSurah
                            ),
                            explanationOrVirtueAr: displayedTafsir,
                            sourceAndGradingAr: sourceLabel,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#78350F] text-white text-xs font-semibold cursor-pointer"
                      >
                        تخصيص الأنماط وحالة واتساب
                      </button>
                    )}
                    <a
                      href={shareCardDataUrl}
                      download={`ayah-${activeTafsirContext.surahMeta.number}-${activeTafsirContext.ayah.numberInSurah}.png`}
                      className="px-3 py-1 rounded-lg bg-[#14532D] text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل الصورة (PNG)</span>
                    </a>
                  </div>
                </div>
                <img
                  src={shareCardDataUrl}
                  alt="بطاقة الآية المصورة"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto rounded-lg border border-stone-200 shadow-xs"
                />
              </div>
            )}

            {/* Action Toolbar: Reciter + Listen + Repeat Range + Bookmark + Copy + Share Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#D8CBB3]">
              <select
                aria-label="اختيار القارئ"
                value={reciterId}
                onChange={(e) => setReciterId(e.target.value)}
                className="min-h-[34px] px-2.5 py-1 text-xs bg-white border border-[#C8B696] rounded-lg text-stone-800"
              >
                {VERIFIED_RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handlePlayAyahAudio(
                      activeTafsirContext.surahMeta.number,
                      activeTafsirContext.ayah
                    )
                  }
                  className="min-h-[34px] px-3 py-1 text-xs font-semibold bg-[#14532D] text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {playingAyahKey ===
                  `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}` ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>إيقاف</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>استماع</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="open-memorize-from-ayah-btn"
                  onClick={() => {
                    setRepeatFromAyah(activeTafsirContext.ayah.numberInSurah);
                    setRepeatToAyah(
                      Math.min(
                        activeTafsirContext.surahMeta.ayahCount,
                        activeTafsirContext.ayah.numberInSurah + 4
                      )
                    );
                    setActiveOverlay('memorize');
                  }}
                  className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-[#78350F] text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>تكرار للحفظ</span>
                </button>

                <button
                  type="button"
                  data-testid="share-ayah-card-btn"
                  onClick={handleGenerateShareCard}
                  className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white border border-[#C8B696] text-stone-800 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-[#EFE4CE]"
                >
                  <Download className="w-3.5 h-3.5 text-[#14532D]" />
                  <span>بطاقة مصورة</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleToggleBookmark(
                      activeTafsirContext.surahMeta,
                      activeTafsirContext.ayah
                    )
                  }
                  className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white border border-[#C8B696] text-stone-800 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>
                    {isBookmarked(
                      activeTafsirContext.surahMeta.number,
                      activeTafsirContext.ayah.numberInSurah
                    )
                      ? 'محفوظة'
                      : 'علامة'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyAyah(
                      activeTafsirContext.surahMeta,
                      activeTafsirContext.ayah
                    )
                  }
                  className="min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-white border border-[#C8B696] text-stone-800 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {copiedAyahKey ===
                  `${activeTafsirContext.surahMeta.number}:${activeTafsirContext.ayah.numberInSurah}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OVERLAY 4: KHATMAH TRACKER (INDIVIDUAL + FAMILY GROUP 30-JUZ)
         ===================================================================== */}
      {activeOverlay === 'khatmah' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveOverlay('none')}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90dvh] overflow-y-auto bg-[#FBF9F5] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                متابعة الختمة الفردية والختمة العائلية المشتركة
              </h2>
              <button
                type="button"
                onClick={() => setActiveOverlay('none')}
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg border border-stone-300 bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <KhatmahTrackerPanel
              waqfConfig={waqfConfig}
              onOpenWaqfModal={onOpenWaqfModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};
