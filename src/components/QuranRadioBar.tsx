import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  SkipForward,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  QURAN_RADIO_STATIONS,
  QuranRadioStation,
} from '../data/thematicAndNamesData';
import { ALL_SURAHS } from '../data/quranData';
import {
  buildRadioStreamCandidates,
  getNextRadioSurahNumber,
} from '../utils/radioPlayer';

const RADIO_STATION_STORAGE_KEY = 'almihrab_radio_station_v1';
const RADIO_SURAH_STORAGE_KEY = 'almihrab_radio_surah_v1';

function disposeAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.onplaying = null;
  audio.onended = null;
  audio.onerror = null;
  audio.onstalled = null;
  audio.onwaiting = null;
  audio.oncanplay = null;
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // ignore cleanup errors
  }
}

export const QuranRadioBar: React.FC = () => {
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(RADIO_STATION_STORAGE_KEY);
      if (saved && QURAN_RADIO_STATIONS.some((s) => s.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return QURAN_RADIO_STATIONS[0].id;
  });

  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(RADIO_SURAH_STORAGE_KEY));
      if (saved >= 1 && saved <= 114) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 2; // Default to Surah Al-Baqarah (2h 15m continuous recitation)
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('جاهز للبث المتصل');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedNextAudioRef = useRef<{
    stationId: string;
    surahNumber: number;
    audio: HTMLAudioElement;
  } | null>(null);
  const sessionIdRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);

  const currentStation: QuranRadioStation =
    QURAN_RADIO_STATIONS.find((s) => s.id === selectedStationId) ||
    QURAN_RADIO_STATIONS[0];

  const currentSurahMeta =
    ALL_SURAHS.find((s) => s.number === selectedSurahNumber) || ALL_SURAHS[1];

  useEffect(() => {
    try {
      localStorage.setItem(RADIO_STATION_STORAGE_KEY, selectedStationId);
    } catch {
      // ignore
    }
  }, [selectedStationId]);

  useEffect(() => {
    try {
      localStorage.setItem(RADIO_SURAH_STORAGE_KEY, String(selectedSurahNumber));
    } catch {
      // ignore
    }
  }, [selectedSurahNumber]);

  // Keep-alive watchdog: if browser pauses a live/continuous stream during a momentary network hiccup,
  // resume from exact currentTime without recreating the Audio element or cutting the stream.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const activeAudio = audioRef.current;
      if (
        isPlayingRef.current &&
        activeAudio &&
        activeAudio.paused &&
        !activeAudio.ended &&
        activeAudio.readyState >= 2
      ) {
        activeAudio.play().catch(() => {
          // ignore transient autoplay/buffer lock
        });
      }
    }, 2500);

    return () => {
      window.clearInterval(interval);
      sessionIdRef.current += 1;
      isPlayingRef.current = false;
      disposeAudioElement(audioRef.current);
      audioRef.current = null;
      if (preloadedNextAudioRef.current) {
        disposeAudioElement(preloadedNextAudioRef.current.audio);
        preloadedNextAudioRef.current = null;
      }
    };
  }, []);

  const preloadNextSurah = (station: QuranRadioStation, nextSurahNum: number) => {
    if (
      preloadedNextAudioRef.current &&
      preloadedNextAudioRef.current.stationId === station.id &&
      preloadedNextAudioRef.current.surahNumber === nextSurahNum
    ) {
      return;
    }

    if (preloadedNextAudioRef.current) {
      disposeAudioElement(preloadedNextAudioRef.current.audio);
      preloadedNextAudioRef.current = null;
    }

    const candidates = buildRadioStreamCandidates(station, nextSurahNum);
    if (candidates.length === 0) return;

    try {
      const nextAudio = new Audio();
      nextAudio.preload = 'auto';
      nextAudio.muted = isMutedRef.current;
      nextAudio.src = candidates[0];
      nextAudio.load();
      preloadedNextAudioRef.current = {
        stationId: station.id,
        surahNumber: nextSurahNum,
        audio: nextAudio,
      };
    } catch {
      // ignore preloading error
    }
  };

  const startPlayback = (
    station: QuranRadioStation,
    surahNum: number,
    candidateIndex: number = 0,
    usePreloadedIfAvailable: boolean = true
  ) => {
    const sessionId = ++sessionIdRef.current;
    const clampedSurah = Math.max(1, Math.min(114, surahNum));
    const surahMeta =
      ALL_SURAHS.find((s) => s.number === clampedSurah) || ALL_SURAHS[1];
    const candidates = buildRadioStreamCandidates(station, clampedSurah);

    if (candidates.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setStatusMessage('تعذر الاتصال بالبث الصوتي');
      return;
    }

    const safeIdx = Math.min(candidateIndex, candidates.length - 1);
    const targetUrl = candidates[safeIdx];

    // Check if we already preloaded this exact station + Surah in the background
    let audio: HTMLAudioElement;
    if (
      usePreloadedIfAvailable &&
      safeIdx === 0 &&
      preloadedNextAudioRef.current &&
      preloadedNextAudioRef.current.stationId === station.id &&
      preloadedNextAudioRef.current.surahNumber === clampedSurah
    ) {
      disposeAudioElement(audioRef.current);
      audio = preloadedNextAudioRef.current.audio;
      preloadedNextAudioRef.current = null;
    } else {
      disposeAudioElement(audioRef.current);
      audio = new Audio(targetUrl);
      audio.preload = 'auto';
    }

    audio.muted = isMutedRef.current;
    audioRef.current = audio;

    if (!isPlayingRef.current) {
      setStatusMessage(`جاري تشغيل سورة ${surahMeta.nameAr}...`);
    }

    const attachHandlers = (el: HTMLAudioElement) => {
      el.onplaying = () => {
        if (sessionId !== sessionIdRef.current) return;
        isPlayingRef.current = true;
        setIsPlaying(true);
        setStatusMessage(
          `${station.reciterNameAr} · سورة ${surahMeta.nameAr}`
        );
        // Preload the next Surah in background for 0ms gapless transition
        preloadNextSurah(station, getNextRadioSurahNumber(clampedSurah));
      };

      el.onstalled = () => {
        if (sessionId !== sessionIdRef.current) return;
        // Do NOT recreate the audio element on transient network stall; resume from current position
        if (isPlayingRef.current && el.paused && !el.ended) {
          el.play().catch(() => {});
        }
      };

      el.onended = () => {
        if (sessionId !== sessionIdRef.current) return;
        const nextSurah = getNextRadioSurahNumber(clampedSurah);
        setSelectedSurahNumber(nextSurah);
        startPlayback(station, nextSurah, 0, true);
      };

      el.onerror = () => {
        if (sessionId !== sessionIdRef.current) return;
        if (safeIdx + 1 < candidates.length) {
          startPlayback(station, clampedSurah, safeIdx + 1, false);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setStatusMessage('اضغط لإعادة تشغيل البث المباشر');
        }
      };
    };

    attachHandlers(audio);

    audio.play().catch(() => {
      if (sessionId !== sessionIdRef.current) return;
      if (safeIdx + 1 < candidates.length) {
        startPlayback(station, clampedSurah, safeIdx + 1, false);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setStatusMessage('اضغط للتشغيل الصوتي المتصل');
      }
    });
  };

  const stopPlayback = () => {
    sessionIdRef.current += 1;
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }
    }
    setStatusMessage('تم إيقاف البث مؤقتاً');
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      // If paused mid-surah on the same station, resume seamlessly from current position
      if (
        audioRef.current &&
        audioRef.current.src &&
        audioRef.current.currentTime > 0 &&
        !audioRef.current.ended
      ) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setStatusMessage(
          `${currentStation.reciterNameAr} · سورة ${currentSurahMeta.nameAr}`
        );
        audioRef.current.play().catch(() => {
          startPlayback(currentStation, selectedSurahNumber, 0, false);
        });
      } else {
        startPlayback(currentStation, selectedSurahNumber, 0, true);
      }
    }
  };

  const handleSelectStation = (stationId: string, forcePlay: boolean = false) => {
    const st =
      QURAN_RADIO_STATIONS.find((s) => s.id === stationId) ||
      QURAN_RADIO_STATIONS[0];
    setSelectedStationId(st.id);

    if (isPlaying || forcePlay) {
      startPlayback(st, selectedSurahNumber, 0, false);
    } else {
      disposeAudioElement(audioRef.current);
      audioRef.current = null;
      setStatusMessage(`${st.reciterNameAr} · سورة ${currentSurahMeta.nameAr}`);
    }
  };

  const handleSelectSurah = (surahNum: number) => {
    const clamped = Math.max(1, Math.min(114, surahNum));
    setSelectedSurahNumber(clamped);
    const meta = ALL_SURAHS.find((s) => s.number === clamped) || ALL_SURAHS[1];

    if (isPlaying) {
      startPlayback(currentStation, clamped, 0, true);
    } else {
      disposeAudioElement(audioRef.current);
      audioRef.current = null;
      setStatusMessage(`${currentStation.reciterNameAr} · سورة ${meta.nameAr}`);
    }
  };

  const handleNextSurah = () => {
    const nextSurah = getNextRadioSurahNumber(selectedSurahNumber);
    handleSelectSurah(nextSurah);
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    isMutedRef.current = nextMute;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.muted = nextMute;
    }
    if (preloadedNextAudioRef.current) {
      preloadedNextAudioRef.current.audio.muted = nextMute;
    }
  };

  return (
    <div
      data-testid="quran-radio-bar"
      className="bg-[#F4EFE6] text-stone-800 border-b border-stone-200/90"
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-8 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            data-testid="radio-play-toggle"
            onClick={handleTogglePlay}
            aria-label={
              isPlaying
                ? 'إيقاف إذاعة القرآن الكريم'
                : 'تشغيل إذاعة القرآن الكريم المباشرة'
            }
            className={`min-h-[30px] px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors whitespace-nowrap ${
              isPlaying
                ? 'bg-[#14532D] text-white'
                : 'bg-white text-[#14532D] border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>إيقاف الإذاعة</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>إذاعة القرآن</span>
              </>
            )}
          </button>

          <span
            data-testid="radio-status-text"
            className="text-xs font-medium text-stone-700 truncate"
          >
            {isPlaying
              ? statusMessage
              : `${currentStation.reciterNameAr} · سورة ${currentSurahMeta.nameAr}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            aria-label="اختيار قناة إذاعة القرآن الكريم"
            data-testid="radio-station-select"
            value={selectedStationId}
            onChange={(e) => handleSelectStation(e.target.value, false)}
            className="hidden md:block min-h-[30px] px-2 py-0.5 text-xs rounded-lg bg-white text-stone-800 border border-stone-300 focus:outline-none cursor-pointer"
          >
            {QURAN_RADIO_STATIONS.map((station) => (
              <option key={station.id} value={station.id}>
                {station.nameAr}
              </option>
            ))}
          </select>

          <select
            aria-label="اختيار السورة في الإذاعة"
            data-testid="radio-surah-select"
            value={selectedSurahNumber}
            onChange={(e) => handleSelectSurah(Number(e.target.value))}
            className="hidden sm:block min-h-[30px] px-2 py-0.5 text-xs rounded-lg bg-white text-stone-800 border border-stone-300 focus:outline-none cursor-pointer"
          >
            {ALL_SURAHS.map((surah) => (
              <option key={surah.number} value={surah.number}>
                سورة {surah.nameAr}
              </option>
            ))}
          </select>

          <button
            type="button"
            data-testid="radio-next-surah"
            onClick={handleNextSurah}
            aria-label="السورة التالية في الإذاعة"
            title="السورة التالية"
            className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'إلغاء كتم صوت الإذاعة' : 'كتم صوت الإذاعة'}
            className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label="قائمة إذاعات القرآن الكريم"
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-xs text-stone-700 flex items-center gap-1 cursor-pointer md:hidden"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-stone-200 bg-[#FBF9F5] px-3.5 sm:px-8 py-2.5 md:hidden space-y-2">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {QURAN_RADIO_STATIONS.map((st) => {
              const active = st.id === selectedStationId;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    handleSelectStation(st.id, true);
                    setIsExpanded(false);
                  }}
                  className={`p-2 rounded-xl text-right border transition-colors cursor-pointer text-xs font-semibold ${
                    active
                      ? 'bg-[#14532D] border-[#14532D] text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                >
                  {st.nameAr}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label
              htmlFor="mobile-radio-surah-select"
              className="text-xs font-semibold text-stone-600 shrink-0"
            >
              السورة:
            </label>
            <select
              id="mobile-radio-surah-select"
              value={selectedSurahNumber}
              onChange={(e) => {
                handleSelectSurah(Number(e.target.value));
                setIsExpanded(false);
              }}
              className="flex-1 min-h-[34px] px-2.5 py-1 text-xs rounded-lg bg-white text-stone-800 border border-stone-300 focus:outline-none"
            >
              {ALL_SURAHS.map((surah) => (
                <option key={surah.number} value={surah.number}>
                  سورة {surah.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
