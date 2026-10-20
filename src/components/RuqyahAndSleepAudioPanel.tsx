import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Volume2,
  Square,
  RotateCcw,
  CheckCircle2,
  Repeat,
  ShieldCheck,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Image as ImageIcon,
} from 'lucide-react';
import { toArabicNumerals } from '../utils/astronomy';
import {
  VERIFIED_RUQYAH_AND_SLEEP_ITEMS,
  RuqyahItem,
  buildCompleteRuqyahOncePlaylist,
  getRuqyahFallbackAudioUrls,
} from '../utils/worshipTrackerAndTools';
import { triggerMasbahaTactileFeedback } from '../utils/islamicFeatures';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';

const RUQYAH_COUNTS_STORAGE_KEY = 'almihrab_ruqyah_counts_v1';

interface RuqyahAndSleepAudioPanelProps {
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
  autoStartFullOnceSignal?: number;
}

export const RuqyahAndSleepAudioPanel: React.FC<
  RuqyahAndSleepAudioPanelProps
> = ({ onOpenDawahCard, autoStartFullOnceSignal }) => {
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'ruqyah_quran' | 'ruqyah_sunnah' | 'sleep_tahseen'
  >('all');
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(RUQYAH_COUNTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  });

  const masterPlaylist = useMemo(() => buildCompleteRuqyahOncePlaylist(), []);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentVerseIdx, setCurrentVerseIdx] = useState<number>(0);
  const [totalVersesInActive, setTotalVersesInActive] = useState<number>(0);
  const [autoRepeatTarget, setAutoRepeatTarget] = useState<number>(1);
  const [activeRepeatTarget, setActiveRepeatTarget] = useState<number>(1);
  const [currentRepeatIteration, setCurrentRepeatIteration] =
    useState<number>(0);
  const [isPlayingFullSequence, setIsPlayingFullSequence] =
    useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [masterStepIdx, setMasterStepIdx] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(RUQYAH_COUNTS_STORAGE_KEY, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }, [counts]);

  const stopAudio = () => {
    playbackSessionRef.current += 1;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingId(null);
    setCurrentVerseIdx(0);
    setTotalVersesInActive(0);
    setCurrentRepeatIteration(0);
    setIsPlayingFullSequence(false);
    setIsPaused(false);
    setMasterStepIdx(0);
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  /**
   * Plays a flat master step index from `masterPlaylist` (all 36 verses of the 8 Quranic Ruqyah stations in Mushaf order)
   * ONCE from beginning to end using a single persistent HTMLAudioElement with automatic multi-CDN fallback.
   */
  const playMasterStepAtIndex = (stepIndex: number, sessionId: number) => {
    if (playbackSessionRef.current !== sessionId) return;

    if (stepIndex < 0 || stepIndex >= masterPlaylist.length) {
      triggerMasbahaTactileFeedback({
        soundEnabled: true,
        hapticEnabled: true,
        isMilestone: true,
      });
      setPlayingId(null);
      setCurrentVerseIdx(0);
      setTotalVersesInActive(0);
      setCurrentRepeatIteration(0);
      setIsPlayingFullSequence(false);
      setIsPaused(false);
      setMasterStepIdx(0);
      return;
    }

    const step = masterPlaylist[stepIndex];
    setMasterStepIdx(stepIndex);
    setPlayingId(step.itemId);
    setCurrentVerseIdx(step.verseIndexInItem);
    setTotalVersesInActive(step.totalVersesInItem);
    setCurrentRepeatIteration(1);
    setActiveRepeatTarget(1);
    setIsPaused(false);

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.preload = 'auto';

    const tryCandidateUrl = (candidateIdx: number) => {
      if (playbackSessionRef.current !== sessionId) return;
      if (candidateIdx >= step.candidateAudioUrls.length) {
        // If all CDN mirrors fail for this verse, advance to next verse in master playlist
        playMasterStepAtIndex(stepIndex + 1, sessionId);
        return;
      }

      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = step.candidateAudioUrls[candidateIdx];
      audio.currentTime = 0;

      audio.onended = () => {
        if (playbackSessionRef.current !== sessionId) return;

        if (step.isLastVerseOfItem) {
          const matchedItem = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.find(
            (i) => i.id === step.itemId
          );
          if (matchedItem) {
            setCounts((prev) => ({
              ...prev,
              [matchedItem.id]: Math.min(
                matchedItem.recommendedCount,
                (prev[matchedItem.id] || 0) + 1
              ),
            }));
          }
        }

        playMasterStepAtIndex(stepIndex + 1, sessionId);
      };

      audio.onerror = () => {
        if (playbackSessionRef.current !== sessionId) return;
        tryCandidateUrl(candidateIdx + 1);
      };

      audio.play().catch(() => {
        if (playbackSessionRef.current !== sessionId) return;
        tryCandidateUrl(candidateIdx + 1);
      });
    };

    tryCandidateUrl(0);
  };

  const handlePlayFullQuranicRuqyahInOrder = () => {
    if (isPlayingFullSequence) {
      stopAudio();
      return;
    }

    stopAudio();
    const sessionId = playbackSessionRef.current;
    setIsPlayingFullSequence(true);
    setFilterCategory('all');
    playMasterStepAtIndex(0, sessionId);
  };

  useEffect(() => {
    if (autoStartFullOnceSignal && autoStartFullOnceSignal > 0) {
      stopAudio();
      const sessionId = playbackSessionRef.current;
      setIsPlayingFullSequence(true);
      setFilterCategory('all');
      playMasterStepAtIndex(0, sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartFullOnceSignal]);

  const handleTogglePauseResume = () => {
    const audio = audioRef.current;
    if (!audio || !playingId) return;
    if (isPaused) {
      setIsPaused(false);
      audio.play().catch(() => {
        // ignore
      });
    } else {
      audio.pause();
      setIsPaused(true);
    }
  };

  const handleSkipMasterVerse = (delta: number) => {
    if (!isPlayingFullSequence) return;
    const nextIdx = Math.max(
      0,
      Math.min(masterPlaylist.length - 1, masterStepIdx + delta)
    );
    playMasterStepAtIndex(nextIdx, playbackSessionRef.current);
  };

  const handleSkipMasterStation = () => {
    if (!isPlayingFullSequence) return;
    const currentStep = masterPlaylist[masterStepIdx];
    if (!currentStep) return;
    const nextStationFirstStep = masterPlaylist.find(
      (s) => s.stationIndex === currentStep.stationIndex + 1
    );
    if (nextStationFirstStep) {
      playMasterStepAtIndex(
        nextStationFirstStep.stepIndex,
        playbackSessionRef.current
      );
    } else {
      stopAudio();
    }
  };

  /**
   * Plays all verses (`verses` / `audioUrls`) of a single RuqyahItem sequentially from first verse to last verse
   * using a SINGLE persistent HTMLAudioElement (so mobile iOS/Android autoplay rules never block verses 2..N),
   * and repeats the entire Surah/passage `repeatTarget` times.
   */
  const playSingleItemAllVerses = (
    item: RuqyahItem,
    repeatTarget: number,
    sessionId: number,
    startAtVerseIdx: number = 0,
    onItemFinishedAllRepeats?: () => void
  ) => {
    const urls =
      item.verses && item.verses.length > 0
        ? item.verses.map((v) => v.audioUrl)
        : item.audioUrls && item.audioUrls.length > 0
          ? item.audioUrls
          : item.audioUrl
            ? [item.audioUrl]
            : [];

    setPlayingId(item.id);
    setCurrentRepeatIteration(1);
    setActiveRepeatTarget(repeatTarget);
    setIsPaused(false);

    if (urls.length > 0) {
      setTotalVersesInActive(urls.length);
      let iteration = 1;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.preload = 'auto';

      const playVerseAtIndex = (vIdx: number) => {
        if (playbackSessionRef.current !== sessionId) return;
        setCurrentVerseIdx(vIdx);

        const candidateUrls = getRuqyahFallbackAudioUrls(urls[vIdx]);

        const tryCandidate = (cIdx: number) => {
          if (playbackSessionRef.current !== sessionId) return;
          if (cIdx >= candidateUrls.length) {
            if (vIdx + 1 < urls.length) {
              playVerseAtIndex(vIdx + 1);
              return;
            }
            setPlayingId(null);
            setCurrentVerseIdx(0);
            setTotalVersesInActive(0);
            setCurrentRepeatIteration(0);
            return;
          }

          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.src = candidateUrls[cIdx];
          audio.currentTime = 0;

          audio.onended = () => {
            if (playbackSessionRef.current !== sessionId) return;

            // Advance to the next verse in the Surah/passage before counting a completion
            if (vIdx + 1 < urls.length) {
              playVerseAtIndex(vIdx + 1);
              return;
            }

            // Completed all verses of the Surah/passage once!
            setCounts((prev) => ({
              ...prev,
              [item.id]: Math.min(
                item.recommendedCount,
                (prev[item.id] || 0) + 1
              ),
            }));

            if (iteration < repeatTarget) {
              iteration += 1;
              setCurrentRepeatIteration(iteration);
              playVerseAtIndex(0);
            } else {
              if (onItemFinishedAllRepeats) {
                onItemFinishedAllRepeats();
              } else {
                setPlayingId(null);
                setCurrentVerseIdx(0);
                setTotalVersesInActive(0);
                setCurrentRepeatIteration(0);
              }
            }
          };

          audio.onerror = () => {
            if (playbackSessionRef.current !== sessionId) return;
            tryCandidate(cIdx + 1);
          };

          audio.play().catch(() => {
            if (playbackSessionRef.current !== sessionId) return;
            tryCandidate(cIdx + 1);
          });
        };

        tryCandidate(0);
      };

      playVerseAtIndex(startAtVerseIdx);
      return;
    }

    // Fallback to Arabic Web Speech synthesis for Sunnah Duas with full repeat support
    setTotalVersesInActive(1);
    setCurrentVerseIdx(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let iteration = 1;
      const speakIteration = () => {
        if (playbackSessionRef.current !== sessionId) return;
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(item.arabicText);
          utter.lang = 'ar-SA';
          utter.rate = 0.9;
          utter.onend = () => {
            if (playbackSessionRef.current !== sessionId) return;
            setCounts((prev) => ({
              ...prev,
              [item.id]: Math.min(
                item.recommendedCount,
                (prev[item.id] || 0) + 1
              ),
            }));
            if (iteration < repeatTarget) {
              iteration += 1;
              setCurrentRepeatIteration(iteration);
              speakIteration();
            } else if (onItemFinishedAllRepeats) {
              onItemFinishedAllRepeats();
            } else {
              setPlayingId(null);
              setCurrentRepeatIteration(0);
            }
          };
          utter.onerror = () => {
            if (playbackSessionRef.current !== sessionId) return;
            if (onItemFinishedAllRepeats) {
              onItemFinishedAllRepeats();
            } else {
              setPlayingId(null);
              setCurrentRepeatIteration(0);
            }
          };
          window.speechSynthesis.speak(utter);
          return;
        } catch {
          // fallback below
        }
      };
      speakIteration();
      return;
    }

    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: true,
    });
    setTimeout(() => {
      if (playbackSessionRef.current !== sessionId) return;
      if (onItemFinishedAllRepeats) {
        onItemFinishedAllRepeats();
      } else {
        setPlayingId(null);
        setCurrentRepeatIteration(0);
      }
    }, 1500);
  };

  const handlePlayRuqyahAudio = (
    item: RuqyahItem,
    startVerseIdx: number = 0,
    overrideRepeatTarget?: number
  ) => {
    const target = overrideRepeatTarget ?? autoRepeatTarget;
    if (
      playingId === item.id &&
      startVerseIdx === 0 &&
      !isPlayingFullSequence &&
      activeRepeatTarget === target
    ) {
      stopAudio();
      return;
    }

    stopAudio();
    const sessionId = playbackSessionRef.current;
    playSingleItemAllVerses(item, target, sessionId, startVerseIdx);
  };

  const handleIncrementCount = (item: RuqyahItem) => {
    setCounts((prev) => {
      const current = prev[item.id] || 0;
      const next = current < item.recommendedCount ? current + 1 : current;
      const reached = next === item.recommendedCount;
      triggerMasbahaTactileFeedback({
        soundEnabled: true,
        hapticEnabled: true,
        isMilestone: reached,
      });
      return {
        ...prev,
        [item.id]: next,
      };
    });
  };

  const handleResetAllCounts = () => {
    setCounts({});
  };

  const filteredItems = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.filter((it) =>
    filterCategory === 'all' ? true : it.category === filterCategory
  );

  const completedTotal = VERIFIED_RUQYAH_AND_SLEEP_ITEMS.filter(
    (it) => (counts[it.id] || 0) >= it.recommendedCount
  ).length;

  const activeMasterStep = isPlayingFullSequence
    ? masterPlaylist[masterStepIdx] || masterPlaylist[0]
    : null;
  const masterProgressPercent = activeMasterStep
    ? Math.round(
        ((activeMasterStep.stepIndex + 1) / activeMasterStep.totalSteps) * 100
      )
    : 0;

  return (
    <section
      aria-label="الرقية الشرعية الكاملة وأذكار النوم بالصوت والعداد"
      data-testid="ruqyah-and-sleep-audio-panel"
      className="bg-[#FBF9F5] border-2 border-[#14532D]/25 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Prominent Hero Bar: Play Complete Ruqyah Once */}
      <div
        data-testid="ruqyah-master-once-banner"
        className={`rounded-2xl p-4 sm:p-5 border-2 transition-colors space-y-3.5 ${
          isPlayingFullSequence
            ? 'bg-[#14532D] text-white border-[#14532D]'
            : 'bg-white border-[#14532D]/30'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  isPlayingFullSequence
                    ? 'bg-amber-300 text-stone-950'
                    : 'bg-[#14532D] text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>الرقية الشرعية الكاملة متّصلة (مرّة واحدة)</span>
              </span>
              <span
                className={`text-xs font-bold ${
                  isPlayingFullSequence ? 'text-amber-200' : 'text-[#78350F]'
                }`}
              >
                {toArabicNumerals(8)} محطّات قرآنية ·{' '}
                {toArabicNumerals(masterPlaylist.length)} آية بالترتيب المصحفي
              </span>
            </div>
            <p
              className={`text-xs leading-relaxed ${
                isPlayingFullSequence ? 'text-stone-100' : 'text-stone-600'
              }`}
            >
              تلاوة كاملة متّصلة من أول آية في سورة الفاتحة حتى آخر آية في سورة الناس مرّةً واحدةً دون تكرار (الفاتحة كاملة ← فواتح البقرة ← آية الكرسي ← خواتيم البقرة ← آيات الشفاء الست ← الإخلاص ← الفلق ← الناس).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="play-full-ruqyah-sequence-btn"
              onClick={handlePlayFullQuranicRuqyahInOrder}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                isPlayingFullSequence
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#14532D] hover:bg-[#14532D]/90 text-white'
              }`}
            >
              {isPlayingFullSequence ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>إيقاف الرقية الكاملة</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>تشغيل الرقية كاملة مرة واحدة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Master Player Progress & Transport Controls when Full Sequence is Active */}
        {isPlayingFullSequence && activeMasterStep && (
          <div
            data-testid="ruqyah-master-active-controls"
            className="bg-white/10 border border-white/20 rounded-xl p-3.5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-300 text-stone-950 font-bold">
                  المحطة {toArabicNumerals(activeMasterStep.stationIndex + 1)} من{' '}
                  {toArabicNumerals(activeMasterStep.totalStations)}
                </span>
                <span className="font-bold text-white">
                  {activeMasterStep.itemTitleAr}
                </span>
                <span className="text-amber-200 font-semibold">
                  · {activeMasterStep.verseLabelAr} (الآية{' '}
                  {toArabicNumerals(activeMasterStep.verseIndexInItem + 1)} من{' '}
                  {toArabicNumerals(activeMasterStep.totalVersesInItem)})
                </span>
              </div>

              <span className="font-tabular font-bold text-amber-200">
                إجمالي الرقية: الآية{' '}
                {toArabicNumerals(activeMasterStep.stepIndex + 1)} من{' '}
                {toArabicNumerals(activeMasterStep.totalSteps)} (
                {toArabicNumerals(masterProgressPercent)}٪)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-300 transition-all duration-300"
                style={{ width: `${masterProgressPercent}%` }}
              />
            </div>

            {/* Active Verse Uthmani Text */}
            <p className="font-quran text-lg sm:text-xl text-white leading-loose bg-black/20 rounded-xl p-3 text-center">
              {activeMasterStep.verseTextAr}
            </p>

            {/* Transport Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTogglePauseResume}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-white text-[#14532D] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>متابعة التلاوة</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>إيقاف مؤقت</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkipMasterVerse(-1)}
                  disabled={activeMasterStep.stepIndex === 0}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>الآية السابقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSkipMasterVerse(1)}
                  disabled={
                    activeMasterStep.stepIndex >=
                    activeMasterStep.totalSteps - 1
                  }
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>الآية التالية</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSkipMasterStation}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال للسورة التالية</span>
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Toolbar: Individual Surah Repeat & Counter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#78350F]">
            المكتمل في سجل الرقية: {toArabicNumerals(completedTotal)} من{' '}
            {toArabicNumerals(VERIFIED_RUQYAH_AND_SLEEP_ITEMS.length)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-xs">
            <Repeat className="w-3.5 h-3.5 text-[#14532D]" />
            <span className="font-semibold text-stone-700">
              تكرار السورة عند التشغيل الفردي:
            </span>
            {[
              { rep: 1, label: 'مرة واحدة (١×)' },
              { rep: 3, label: '٣×' },
              { rep: 7, label: '٧×' },
            ].map(({ rep, label }) => (
              <button
                key={rep}
                type="button"
                data-testid={`ruqyah-repeat-${rep}`}
                onClick={() => setAutoRepeatTarget(rep)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer ${
                  autoRepeatTarget === rep
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetAllCounts}
            className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصفير العدّادات</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'all', label: 'الرقية والتحصين كاملة بالترتيب' },
          { id: 'ruqyah_quran', label: 'آيات وسور الرقية والشفاء (بترتيب المصحف)' },
          { id: 'ruqyah_sunnah', label: 'رقية النبي ﷺ والأدعية المأثورة' },
          { id: 'sleep_tahseen', label: 'تحصينات وأذكار ما قبل النوم' },
        ].map((tab) => {
          const active = filterCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setFilterCategory(tab.id as typeof filterCategory)
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ruqyah Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredItems.map((item) => {
          const currentCount = counts[item.id] || 0;
          const isDone = currentCount >= item.recommendedCount;
          const isPlaying = playingId === item.id;
          const itemTotalVerses =
            item.audioUrls?.length || (item.audioUrl ? 1 : 0);

          return (
            <article
              key={item.id}
              data-testid={`ruqyah-card-${item.id}`}
              className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                isPlaying
                  ? 'bg-[#FAF5E8] border-2 border-[#78350F]'
                  : isDone
                    ? 'bg-[#14532D]/6 border-[#14532D]/40'
                    : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {item.mushafOrderBadgeAr && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[#78350F] text-[11px] font-bold">
                      {item.mushafOrderBadgeAr}
                    </span>
                  )}
                  <h4 className="font-display text-sm sm:text-base font-bold text-stone-900">
                    {item.titleAr}
                  </h4>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#14532D] text-white text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>أُتمّ العدد</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`ruqyah-audio-btn-${item.id}`}
                    onClick={() => handlePlayRuqyahAudio(item, 0)}
                    className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-red-700 text-white'
                        : 'bg-[#78350F] hover:bg-[#78350F]/90 text-white'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>
                          إيقاف (الآية {toArabicNumerals(currentVerseIdx + 1)}/
                          {toArabicNumerals(Math.max(1, totalVersesInActive))} · تكرار{' '}
                          {toArabicNumerals(currentRepeatIteration)}/
                          {toArabicNumerals(
                            isPlayingFullSequence ? 1 : activeRepeatTarget
                          )}
                          )
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {itemTotalVerses > 1
                            ? autoRepeatTarget === 1
                              ? `تشغيل السورة كاملة مرة واحدة (${toArabicNumerals(itemTotalVerses)} آيات)`
                              : `تلاوة الكل (${toArabicNumerals(itemTotalVerses)} آيات · ${toArabicNumerals(autoRepeatTarget)}×)`
                            : itemTotalVerses === 1
                              ? autoRepeatTarget === 1
                                ? 'تشغيل الآية مرة واحدة'
                                : `تشغيل التلاوة (${toArabicNumerals(autoRepeatTarget)}×)`
                              : 'استماع صوتي'}
                        </span>
                      </>
                    )}
                  </button>

                  {!isPlaying && autoRepeatTarget > 1 && itemTotalVerses > 0 && (
                    <button
                      type="button"
                      data-testid={`ruqyah-once-btn-${item.id}`}
                      onClick={() => handlePlayRuqyahAudio(item, 0, 1)}
                      className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#14532D]/10 hover:bg-[#14532D]/20 text-[#14532D] border border-[#14532D]/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>مرة واحدة (١×)</span>
                    </button>
                  )}

                  {onOpenDawahCard && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDawahCard({
                          category:
                            item.category === 'ruqyah_quran' ? 'ayah' : 'dua',
                          headerBadgeAr:
                            'الرقية الشرعية وآيات الشفاء · تطبيق المحراب',
                          titleAr: item.titleAr,
                          mainArabicText: item.arabicText,
                          explanationOrVirtueAr: item.virtueAndMethodAr,
                          sourceAndGradingAr: item.sourceAr,
                        })
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#FAF5E8] hover:bg-[#EFE4CE] text-[#78350F] border border-[#C8B696] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>بطاقة PNG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ordered Verses Display with Live Active Verse Highlight */}
              {item.verses && item.verses.length > 1 ? (
                <div className="bg-[#FBF9F5] border border-stone-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="font-quran text-lg sm:text-xl text-stone-900 leading-loose">
                    {item.verses.map((v, vIdx) => {
                      const isVerseActive =
                        isPlaying && currentVerseIdx === vIdx;
                      return (
                        <span
                          key={v.labelAr}
                          onClick={() => handlePlayRuqyahAudio(item, vIdx)}
                          title={`اضغط للاستماع من ${v.labelAr}`}
                          className={`inline rounded-lg px-1.5 py-0.5 transition-colors cursor-pointer ${
                            isVerseActive
                              ? 'bg-[#14532D] text-white font-bold'
                              : 'hover:bg-stone-200/60 text-stone-900'
                          }`}
                        >
                          {v.textAr}{' '}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-200/60">
                    <span className="text-[11px] font-bold text-stone-500">
                      ترتيب الآيات ({toArabicNumerals(item.verses.length)}):
                    </span>
                    {item.verses.map((v, vIdx) => {
                      const isVerseActive =
                        isPlaying && currentVerseIdx === vIdx;
                      return (
                        <button
                          key={v.labelAr}
                          type="button"
                          onClick={() => handlePlayRuqyahAudio(item, vIdx)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                            isVerseActive
                              ? 'bg-[#14532D] text-white'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {v.labelAr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="font-quran text-lg sm:text-xl text-stone-900 leading-loose bg-[#FBF9F5] border border-stone-100 rounded-xl p-3.5">
                  {item.arabicText}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="space-y-0.5 text-xs text-stone-600">
                  <p className="font-medium text-stone-700">
                    {item.virtueAndMethodAr}
                  </p>
                  <p className="text-[11px] text-[#78350F] font-semibold">
                    {item.sourceAr}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`ruqyah-count-btn-${item.id}`}
                    onClick={() => handleIncrementCount(item)}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isDone
                        ? 'bg-[#14532D] text-white'
                        : 'bg-[#14532D]/10 hover:bg-[#14532D]/20 text-[#14532D] border border-[#14532D]/30'
                    }`}
                  >
                    <span>
                      {isDone ? 'تمّت القراءة بحمد الله' : 'اضغط للعدّ والتكرار'}
                    </span>
                    <span className="font-tabular px-2 py-0.5 rounded-md bg-white/90 text-stone-900 font-bold">
                      {toArabicNumerals(currentCount)} /{' '}
                      {toArabicNumerals(item.recommendedCount)}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

