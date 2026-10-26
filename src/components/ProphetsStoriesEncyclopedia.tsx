import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Volume2,
  Square,
  CheckCircle2,
  Copy,
  Check,
  Image as ImageIcon,
  BookOpen,
  Award,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  PROPHET_ERA_CATEGORIES,
  ProphetHistoricalEraId,
  VERIFIED_QURANIC_PROPHETS,
  QuranicProphetItem,
  getProphetDuaAudioUrls,
  loadReflectedProphetIds,
  saveReflectedProphetIds,
  toggleProphetReflected,
  prophetToDawahCardPayload,
} from '../data/prophetsAndSpecialPrayersData';
import { toArabicNumerals } from '../data/quranData';
import { triggerMasbahaTactileFeedback } from '../utils/islamicFeatures';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';

interface ProphetsStoriesEncyclopediaProps {
  onOpenMushafPage?: (pageNum: number) => void;
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
}

export const ProphetsStoriesEncyclopedia: React.FC<
  ProphetsStoriesEncyclopediaProps
> = ({ onOpenMushafPage, onOpenDawahCard }) => {
  const [selectedEra, setSelectedEra] = useState<ProphetHistoricalEraId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProphetId, setSelectedProphetId] = useState<string>(
    VERIFIED_QURANIC_PROPHETS[0].id
  );
  const [reflectedIds, setReflectedIds] = useState<string[]>(() =>
    loadReflectedProphetIds()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingProphetId, setPlayingProphetId] = useState<string | null>(null);
  const [audioStatusMsg, setAudioStatusMsg] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    saveReflectedProphetIds(reflectedIds);
  }, [reflectedIds]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const filteredProphets = useMemo(() => {
    return VERIFIED_QURANIC_PROPHETS.filter((p) => {
      if (selectedEra === 'ulul_azm' && !p.isUlulAzm) return false;
      if (
        selectedEra !== 'all' &&
        selectedEra !== 'ulul_azm' &&
        p.eraId !== selectedEra
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        p.nameAr.includes(q) ||
        p.honorificTitleAr.includes(q) ||
        p.lineageAndPeopleAr.includes(q) ||
        p.quranicDuaOrVerseAr.includes(q) ||
        p.duaContextAndResponseAr.includes(q) ||
        p.mainSurahsAr.some((s) => s.includes(q)) ||
        p.miraclesAndSignsAr.some((m) => m.includes(q))
      );
    });
  }, [selectedEra, searchQuery]);

  const activeProphet = useMemo(() => {
    return (
      VERIFIED_QURANIC_PROPHETS.find((p) => p.id === selectedProphetId) ||
      filteredProphets[0] ||
      VERIFIED_QURANIC_PROPHETS[0]
    );
  }, [selectedProphetId, filteredProphets]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingProphetId(null);
  };

  const handlePlayProphetDuaAudio = (prophet: QuranicProphetItem) => {
    if (playingProphetId === prophet.id) {
      stopAudio();
      setAudioStatusMsg('');
      return;
    }

    stopAudio();
    const urls = getProphetDuaAudioUrls(prophet.surahNumber, prophet.ayahNumber);
    let urlIdx = 0;

    const tryNextUrl = () => {
      if (urlIdx >= urls.length) {
        setPlayingProphetId(null);
        setAudioStatusMsg('تعذّر تشغيل التلاوة الصوتية حالياً؛ تأكد من الاتصال بالإنترنت.');
        return;
      }
      const audio = new Audio(urls[urlIdx]);
      audioRef.current = audio;
      setPlayingProphetId(prophet.id);
      setAudioStatusMsg(`جاري تلاوة دعاء ${prophet.nameAr} (${prophet.duaReferenceAr})...`);

      audio.onended = () => {
        setPlayingProphetId(null);
        setAudioStatusMsg('');
      };

      audio.onerror = () => {
        urlIdx += 1;
        tryNextUrl();
      };

      audio.play().catch(() => {
        urlIdx += 1;
        tryNextUrl();
      });
    };

    tryNextUrl();
  };

  const handleToggleReflected = (prophetId: string) => {
    const isAlready = reflectedIds.includes(prophetId);
    setReflectedIds((prev) => toggleProphetReflected(prev, prophetId));
    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: !isAlready,
    });
  };

  const handleCopyProphetCard = (prophet: QuranicProphetItem) => {
    const text = `🌿 ${prophet.nameAr} — ${prophet.honorificTitleAr}\n` +
      `• النسب والقوم: ${prophet.lineageAndPeopleAr}\n` +
      `• الدعاء القرآني: ${prophet.quranicDuaOrVerseAr} [${prophet.duaReferenceAr}]\n` +
      `• الاستجابة والتدبر: ${prophet.duaContextAndResponseAr}\n` +
      `• أهم الدروس العملية:\n${prophet.practicalLessonsAr.map((l) => `- ${l}`).join('\n')}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(prophet.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const completionPercentage = Math.round(
    (reflectedIds.length / VERIFIED_QURANIC_PROPHETS.length) * 100
  );

  return (
    <section
      aria-label="موسوعة قصص الأنبياء في القرآن وأدعيتهم"
      data-testid="prophets-stories-encyclopedia"
      className="space-y-5"
    >
      {/* 1. Top Banner & Interactive Chronological Tree of the 25 Prophets */}
      <div className="rounded-2xl bg-gradient-to-br from-[#14532D] to-[#0F3F22] text-[#FBF9F5] p-4 sm:p-6 border border-[#14532D] space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/15 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FDE68A] text-stone-950 text-[11px] font-bold">
                موسوعة الأنبياء والمرسلين (٢٥ نبياً ورسولاً)
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-[#FDE68A] text-[11px] font-semibold">
                ﴿أُولَٰئِكَ الَّذِينَ هَدَى اللَّهُ فَبِهُدَاهُمُ اقْتَدِهْ﴾
              </span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              شجرة قصص الأنبياء في القرآن الكريم وأدعيتهم المستجابة
            </h2>
            <p className="text-xs text-[#D6CEBE]">
              اضغط على أي نبي في الشجرة الزمنية لاستعراض نسبه وقومه، معجزاته، دعائه القرآني بالصوت، والدروس العملية
            </p>
          </div>

          {/* Reflection Progress Badge */}
          <div className="bg-black/25 border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-[#D6CEBE] block">
                ختمة تدبّر قصص الأنبياء
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  data-testid="prophets-reflected-count"
                  className="font-tabular text-lg font-bold text-[#FDE68A]"
                >
                  {toArabicNumerals(reflectedIds.length)} / ٢٥
                </span>
                <span className="text-[11px] text-stone-200">
                  ({toArabicNumerals(completionPercentage)}٪)
                </span>
              </div>
            </div>
            <Award className="w-6 h-6 text-[#FDE68A] shrink-0" />
          </div>
        </div>

        {/* Interactive 25-Prophet Chronological Tree Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#D6CEBE]">
            <span>التسلسل الزمني للأنبياء والمرسلين (من آدم عليه السلام إلى خاتم المرسلين محمد ﷺ):</span>
            <span className="text-[#FDE68A] font-semibold">
              (أولو العزم) = من أولي العزم من الرسل (٥)
            </span>
          </div>

          <div
            role="list"
            aria-label="الشجرة الزمنية للأنبياء الخمسة والعشرين"
            className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-1.5"
          >
            {VERIFIED_QURANIC_PROPHETS.map((prophet) => {
              const isSelected = activeProphet.id === prophet.id;
              const isReflected = reflectedIds.includes(prophet.id);
              return (
                <button
                  key={prophet.id}
                  type="button"
                  data-testid={`tree-node-${prophet.id}`}
                  onClick={() => setSelectedProphetId(prophet.id)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-right transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#FDE68A] text-stone-950 border-[#FDE68A] font-bold shadow-sm'
                      : isReflected
                      ? 'bg-emerald-950/70 text-emerald-100 border-emerald-400/40 hover:bg-emerald-900/70'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[10px] font-tabular px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected
                          ? 'bg-stone-950 text-[#FDE68A] font-bold'
                          : 'bg-black/30 text-[#FDE68A]'
                      }`}
                    >
                      {toArabicNumerals(prophet.orderNumber)}
                    </span>
                    <span className="text-xs truncate">
                      {prophet.nameAr.replace(' عليه السلام', '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {prophet.isUlulAzm && (
                      <span
                        title="من أولي العزم من الرسل"
                        className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                          isSelected
                            ? 'bg-amber-900/15 text-amber-950'
                            : 'bg-[#FDE68A]/20 text-[#FDE68A]'
                        }`}
                      >
                        أولو العزم
                      </span>
                    )}
                    {isReflected && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-[#14532D]' : 'text-emerald-300'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Spotlight Featured Card for the Currently Selected Prophet from the Tree */}
      <div
        data-testid="active-prophet-spotlight-card"
        className="rounded-2xl bg-[#FCF9F2] border-2 border-[#14532D]/25 p-4 sm:p-6 space-y-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DAC3] pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#14532D] text-[#FDE68A] text-xs font-bold">
                النبي رقم {toArabicNumerals(activeProphet.orderNumber)} في التسلسل الزمني
              </span>
              {activeProphet.isUlulAzm && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold">
                  من أولي العزم من الرسل
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-stone-200/80 text-stone-800 text-xs font-semibold">
                ذُكر في القرآن {toArabicNumerals(activeProphet.mentionsCountInQuran)} مرّة
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-stone-950">
              {activeProphet.nameAr} —{' '}
              <span className="text-[#14532D]">{activeProphet.honorificTitleAr}</span>
            </h3>
          </div>

          {/* Prev / Next Prophet Navigation */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const idx = VERIFIED_QURANIC_PROPHETS.findIndex(
                  (p) => p.id === activeProphet.id
                );
                const prevIdx =
                  (idx - 1 + VERIFIED_QURANIC_PROPHETS.length) %
                  VERIFIED_QURANIC_PROPHETS.length;
                setSelectedProphetId(VERIFIED_QURANIC_PROPHETS[prevIdx].id);
              }}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const idx = VERIFIED_QURANIC_PROPHETS.findIndex(
                  (p) => p.id === activeProphet.id
                );
                const nextIdx = (idx + 1) % VERIFIED_QURANIC_PROPHETS.length;
                setSelectedProphetId(VERIFIED_QURANIC_PROPHETS[nextIdx].id);
              }}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lineage, People, Location & Surahs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
              <Users className="w-4 h-4 shrink-0" />
              <span>النسب الشريف والقوم المرسل إليهم:</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
              {activeProphet.lineageAndPeopleAr}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-1 border-t border-stone-100">
              <MapPin className="w-3.5 h-3.5 text-[#78350F] shrink-0" />
              <span>موطن الرسالة والأحداث: {activeProphet.locationAr}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#78350F] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>أبرز السور التي وردت فيها قصته:</span>
              </span>
              {onOpenMushafPage && (
                <button
                  type="button"
                  onClick={() => onOpenMushafPage(activeProphet.mushafPage)}
                  className="text-[11px] font-bold text-[#14532D] hover:underline cursor-pointer"
                >
                  فتح في المصحف (ص {toArabicNumerals(activeProphet.mushafPage)}) ←
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {activeProphet.mainSurahsAr.map((surah) => (
                <span
                  key={surah}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-stone-200 text-xs font-semibold text-stone-800"
                >
                  سورة {surah}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Miracles & Signs */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
            <Award className="w-4 h-4 shrink-0" />
            <span>المعجزات والآيات البيّنات التي أيّده الله بها:</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-800 list-disc list-inside">
            {activeProphet.miraclesAndSignsAr.map((miracle, i) => (
              <li key={i} className="leading-relaxed">
                {miracle}
              </li>
            ))}
          </ul>
        </div>

        {/* Quranic Dua & Audio Player Box */}
        <div className="p-4 rounded-2xl bg-[#14532D]/8 border border-[#14532D]/25 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#14532D]">
              🤲 الدعاء القرآني والمناجاة المستجابة ({activeProphet.duaReferenceAr}):
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid={`play-prophet-dua-${activeProphet.id}`}
                onClick={() => handlePlayProphetDuaAudio(activeProphet)}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  playingProphetId === activeProphet.id
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-[#14532D] hover:bg-[#14532D]/90 text-white'
                }`}
              >
                {playingProphetId === activeProphet.id ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>إيقاف التلاوة</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#FDE68A]" />
                    <span>استماع للآية</span>
                  </>
                )}
              </button>

              {onOpenDawahCard && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDawahCard(prophetToDawahCardPayload(activeProphet))
                  }
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-bold text-stone-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#14532D]" />
                  <span>بطاقة دعوية (PNG)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopyProphetCard(activeProphet)}
                className="min-h-[34px] px-3 py-1 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-bold text-stone-800 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === activeProphet.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#14532D]" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="font-quran text-lg sm:text-xl leading-loose text-stone-950 bg-white p-3.5 rounded-xl border border-[#E5DAC3] text-center">
            {activeProphet.quranicDuaOrVerseAr}
          </p>

          {audioStatusMsg && playingProphetId === activeProphet.id && (
            <p className="text-xs font-semibold text-[#14532D]" role="status">
              {audioStatusMsg}
            </p>
          )}

          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            <strong className="text-stone-900">سياق الدعاء والاستجابة: </strong>
            {activeProphet.duaContextAndResponseAr}
          </p>
        </div>

        {/* Practical Lessons & Reflection Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-1 flex-1">
            <span className="text-xs font-bold text-[#78350F] block">
              💡 الدروس العملية في الصبر واليقين:
            </span>
            <ul className="space-y-1 text-xs text-stone-800 list-disc list-inside">
              {activeProphet.practicalLessonsAr.map((lesson, idx) => (
                <li key={idx} className="leading-relaxed">
                  {lesson}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-testid={`toggle-reflected-${activeProphet.id}`}
            onClick={() => handleToggleReflected(activeProphet.id)}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer ${
              reflectedIds.includes(activeProphet.id)
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'bg-white hover:bg-[#14532D]/10 text-[#14532D] border-2 border-[#14532D]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {reflectedIds.includes(activeProphet.id)
                ? 'أتممتُ تدبّر القصة ✓'
                : 'سجّل: أتممتُ تدبّر القصة'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Filter & Search Bar for All 25 Prophets Cards */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PROPHET_ERA_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-testid={`prophet-era-${cat.id}`}
                onClick={() => setSelectedEra(cat.id)}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedEra === cat.id
                    ? 'bg-[#14532D] text-white'
                    : 'bg-[#F7F4EE] text-stone-700 hover:bg-stone-200/70 border border-stone-200'
                }`}
              >
                {cat.labelAr}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="ابحث في قصص الأنبياء وأدعيتهم ومعجزاتهم"
              placeholder="ابحث باسم النبي أو الدعاء أو المعجزة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[36px] pr-8 pl-3 py-1 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>
        </div>

        {/* Grid of Filtered Prophets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filteredProphets.map((prophet) => {
            const isReflected = reflectedIds.includes(prophet.id);
            const isPlaying = playingProphetId === prophet.id;
            return (
              <article
                key={prophet.id}
                data-testid={`prophet-card-${prophet.id}`}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                  activeProphet.id === prophet.id
                    ? 'bg-[#FCF9F2] border-[#14532D] ring-1 ring-[#14532D]'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 font-semibold mb-0.5">
                        <span className="font-bold text-[#14532D] font-tabular">
                          #{toArabicNumerals(prophet.orderNumber)}
                        </span>
                        {prophet.isUlulAzm && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#78350F] font-bold">
                              من أولي العزم
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-tabular">
                          ذُكر {toArabicNumerals(prophet.mentionsCountInQuran)} مرة
                        </span>
                      </div>
                      <h4 className="font-display text-base font-bold text-stone-950">
                        {prophet.nameAr}
                      </h4>
                      <p className="text-xs font-semibold text-[#78350F]">
                        {prophet.honorificTitleAr}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProphetId(prophet.id)}
                      className="min-h-[30px] px-2.5 py-1 rounded-lg bg-[#F7F4EE] hover:bg-stone-200/70 border border-stone-200 text-[11px] font-bold text-stone-800 shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      عرض التفصيل
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                    {prophet.lineageAndPeopleAr}
                  </p>

                  <div className="pt-2 border-t border-stone-200/80 space-y-1">
                    <p className="font-quran text-sm sm:text-base text-stone-950 leading-relaxed">
                      {prophet.quranicDuaOrVerseAr}
                    </p>
                    <span className="text-[10px] font-bold text-[#14532D] block">
                      {prophet.duaReferenceAr}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlayProphetDuaAudio(prophet)}
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        isPlaying
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-[#14532D]/10 hover:bg-[#14532D]/20 text-[#14532D]'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>إيقاف</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>استماع</span>
                        </>
                      )}
                    </button>

                    {onOpenDawahCard && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDawahCard(prophetToDawahCardPayload(prophet))
                        }
                        className="min-h-[30px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3 text-[#14532D]" />
                        <span>بطاقة</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleReflected(prophet.id)}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                      isReflected
                        ? 'bg-[#14532D] text-white'
                        : 'bg-[#F7F4EE] hover:bg-stone-200/80 text-stone-700 border border-stone-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isReflected ? 'تم التدبر ✓' : 'أتممت تدبرها'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
