import React, { useState, useEffect, useMemo } from 'react';
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import {
  VERIFIED_SPECIAL_PRAYERS_GUIDES,
  SpecialPrayerGuideId,
  ISTIKHARA_QUICK_PRESETS,
  composeIstikharaDuaWithMatter,
  ISTIKHARA_MISCONCEPTIONS_AND_FACTS,
  IstikharaJournalEntry,
  IstikharaDecisionStatus,
  ISTIKHARA_STATUS_LABELS,
  loadIstikharaJournalEntries,
  saveIstikharaJournalEntries,
  addIstikharaJournalEntry,
  updateIstikharaJournalStatus,
  deleteIstikharaJournalEntry,
  SALAT_TASBIH_POSTURES_PER_RAKAH,
} from '../data/prophetsAndSpecialPrayersData';
import { toArabicNumerals } from '../data/quranData';
import { formatDateKeyISO } from '../utils/worshipTrackerAndTools';
import { triggerMasbahaTactileFeedback } from '../utils/islamicFeatures';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';

interface SpecialPrayersAndIstikharaGuideProps {
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
}

export const SpecialPrayersAndIstikharaGuide: React.FC<
  SpecialPrayersAndIstikharaGuideProps
> = ({ onOpenDawahCard }) => {
  const [selectedPrayerId, setSelectedPrayerId] =
    useState<SpecialPrayerGuideId>('istikhara');

  // Interactive Istikhara Dua Composer State
  const [matterInput, setMatterInput] = useState<string>('');
  const [consultationInput, setConsultationInput] = useState<string>('');
  const [isLargePrayerReadingMode, setIsLargePrayerReadingMode] =
    useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Personal Istikhara Decision Journal State
  const [journalEntries, setJournalEntries] = useState<IstikharaJournalEntry[]>(
    () => loadIstikharaJournalEntries()
  );

  // Salat Al-Tasbih Interactive Helper State
  const [tasbihRakah, setTasbihRakah] = useState<number>(1);
  const [tasbihPostureIdx, setTasbihPostureIdx] = useState<number>(0);

  useEffect(() => {
    saveIstikharaJournalEntries(journalEntries);
  }, [journalEntries]);

  const activePrayerGuide = useMemo(() => {
    return (
      VERIFIED_SPECIAL_PRAYERS_GUIDES.find((p) => p.id === selectedPrayerId) ||
      VERIFIED_SPECIAL_PRAYERS_GUIDES[0]
    );
  }, [selectedPrayerId]);

  const composedIstikhara = useMemo(
    () => composeIstikharaDuaWithMatter(matterInput),
    [matterInput]
  );

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleSaveToIstikharaJournal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const matterToSave =
      matterInput.trim() || 'أمرٌ استخرتُ اللهَ فيه وفوّضتُه إليه';
    const todayISO = formatDateKeyISO(new Date());
    setJournalEntries((prev) =>
      addIstikharaJournalEntry(prev, matterToSave, consultationInput, todayISO)
    );
    setConsultationInput('');
    setSavedNotice(true);
    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: true,
    });
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAdvanceTasbihPosture = () => {
    triggerMasbahaTactileFeedback({
      soundEnabled: true,
      hapticEnabled: true,
      isMilestone: tasbihPostureIdx === SALAT_TASBIH_POSTURES_PER_RAKAH.length - 1,
    });
    if (tasbihPostureIdx < SALAT_TASBIH_POSTURES_PER_RAKAH.length - 1) {
      setTasbihPostureIdx((prev) => prev + 1);
    } else if (tasbihRakah < 4) {
      setTasbihRakah((prev) => prev + 1);
      setTasbihPostureIdx(0);
    } else {
      setTasbihRakah(1);
      setTasbihPostureIdx(0);
    }
  };

  const completedTasbihInCurrentRakah = SALAT_TASBIH_POSTURES_PER_RAKAH.slice(
    0,
    tasbihPostureIdx + 1
  ).reduce((acc, item) => acc + item.targetCount, 0);

  const totalCompletedTasbihAcrossPrayer =
    (tasbihRakah - 1) * 75 + completedTasbihInCurrentRakah;

  return (
    <section
      aria-label="مرشد صلاة الاستخارة وصلاة التوبة وصلاة الحاجة والصلوات غير الراتبة"
      data-testid="special-prayers-istikhara-guide"
      className="space-y-5"
    >
      {/* 1. Top Header & 5-Prayer Selector Bar */}
      <div className="rounded-2xl bg-[#FCF9F2] border border-[#E5DAC3] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#14532D] text-[#FDE68A] text-[11px] font-bold mb-1">
              دليل الصلوات المسنونة غير الراتبة · خطوة بخطوة بالدليل الصحيح
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold text-stone-950">
              مُرشِد صلاة الاستخارة والتوبة والضحى والحاجة والتسبيح
            </h2>
          </div>
          <span className="text-xs text-stone-600">
            ﴿وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ﴾
          </span>
        </div>

        {/* 5 Prayers Tabs */}
        <div
          role="tablist"
          aria-label="اختر الصلاة لعرض صفتها ودليلها ودعائها"
          className="grid grid-cols-2 sm:grid-cols-5 gap-1.5"
        >
          {VERIFIED_SPECIAL_PRAYERS_GUIDES.map((guide) => {
            const isActive = selectedPrayerId === guide.id;
            return (
              <button
                key={guide.id}
                type="button"
                role="tab"
                data-testid={`special-prayer-tab-${guide.id}`}
                aria-selected={isActive}
                onClick={() => setSelectedPrayerId(guide.id)}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center border ${
                  isActive
                    ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                    : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {guide.nameAr}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. INTERACTIVE ISTIKHARA DUA COMPOSER (Shown prominently at the top when Istikhara is active, or accessible anytime) */}
      {selectedPrayerId === 'istikhara' && (
        <div
          data-testid="istikhara-dua-composer-card"
          className="rounded-2xl bg-gradient-to-br from-[#14532D] to-[#0F3F22] text-[#FBF9F5] p-4 sm:p-6 border border-[#14532D] space-y-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#FDE68A] text-stone-950 text-[11px] font-bold">
                  مُركِّب دعاء الاستخارة التفاعلي
                </span>
                <span className="text-xs text-[#D6CEBE]">
                  صحيح البخاري (١١٦٢) عن جابر بن عبد الله رضي الله عنهما
                </span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                اكتب الأمر الذي تستخير الله فيه ليُدرج تلقائياً في موضعه الصحيح من الدعاء
              </h3>
            </div>

            <button
              type="button"
              data-testid="toggle-large-istikhara-mode-btn"
              onClick={() => setIsLargePrayerReadingMode((prev) => !prev)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-[#FDE68A] border border-[#FDE68A]/30 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isLargePrayerReadingMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>تصغير الخط</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>وضع القراءة المكبّرة بعد السلام</span>
                </>
              )}
            </button>
          </div>

          {/* Matter Input & Quick Presets */}
          <div className="space-y-2.5">
            <label
              htmlFor="istikhara-matter-input"
              className="block text-xs font-bold text-[#FDE68A]"
            >
              سمِّ حاجتك أو الأمر الذي تستخير فيه (أو اختر قالباً سريعاً):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="istikhara-matter-input"
                data-testid="istikhara-matter-input"
                type="text"
                value={matterInput}
                onChange={(e) => setMatterInput(e.target.value)}
                placeholder="مثال: قبولي لوظيفة شركة كذا / سفري للدراسة / زواجي من..."
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-white text-stone-950 text-xs sm:text-sm font-semibold placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FDE68A]"
              />
              {matterInput && (
                <button
                  type="button"
                  onClick={() => setMatterInput('')}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  مسح النص
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-[#D6CEBE] ml-1">قوالب سريعة:</span>
              {ISTIKHARA_QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`istikhara-preset-${preset.id}`}
                  onClick={() => setMatterInput(preset.matterTextAr)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                    matterInput === preset.matterTextAr
                      ? 'bg-[#FDE68A] text-stone-950 border-[#FDE68A] font-bold'
                      : 'bg-black/25 hover:bg-black/40 text-stone-100 border-white/15'
                  }`}
                >
                  {preset.labelAr}
                </button>
              ))}
            </div>
          </div>

          {/* Live Composed Vocalized Hadith Box */}
          <div
            data-testid="composed-istikhara-dua-box"
            className="rounded-2xl bg-[#FCF9F2] text-stone-950 p-4 sm:p-6 border-2 border-[#FDE68A] space-y-3 shadow-inner"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#E5DAC3] pb-2">
              <span className="text-xs font-bold text-[#14532D]">
                📖 نص دعاء الاستخارة جاهزاً للقراءة بعد ركعتي الاستخارة:
              </span>
              <span className="text-[11px] font-semibold text-[#78350F]">
                الموضعان الملوّنان هما موضع تسمية الحاجة
              </span>
            </div>

            <p
              className={`font-quran leading-[2.2] text-stone-950 text-justify ${
                isLargePrayerReadingMode
                  ? 'text-xl sm:text-2xl md:text-3xl leading-[2.4]'
                  : 'text-base sm:text-lg md:text-xl'
              }`}
            >
              «{composedIstikhara.introTextAr}{' '}
              {composedIstikhara.firstClauseBeforeMatterAr}{' '}
              <mark
                data-testid="istikhara-matter-slot-1"
                className="px-2 py-0.5 mx-0.5 rounded-lg bg-[#14532D] text-[#FDE68A] font-bold"
              >
                ({composedIstikhara.matterAr})
              </mark>{' '}
              {composedIstikhara.firstClauseAfterMatterAr}{' '}
              {composedIstikhara.secondClauseBeforeMatterAr}{' '}
              <mark
                data-testid="istikhara-matter-slot-2"
                className="px-2 py-0.5 mx-0.5 rounded-lg bg-[#78350F] text-[#FDE68A] font-bold"
              >
                ({composedIstikhara.matterAr})
              </mark>{' '}
              {composedIstikhara.secondClauseAfterMatterAr}»
            </p>
          </div>

          {/* Action Buttons on Composed Istikhara */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="copy-composed-istikhara-btn"
                onClick={() =>
                  handleCopyText(
                    'istikhara-composed',
                    composedIstikhara.fullFormattedDuaAr
                  )
                }
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'istikhara-composed' ? (
                  <>
                    <Check className="w-4 h-4 text-[#14532D]" />
                    <span>تم نسخ الدعاء مع حاجتك</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#14532D]" />
                    <span>نسخ الدعاء كاملاً</span>
                  </>
                )}
              </button>

              {onOpenDawahCard && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDawahCard({
                      category: 'dua',
                      headerBadgeAr: 'دعاء صلاة الاستخارة — صحيح البخاري',
                      titleAr: 'دعاء الاستخارة النبوي',
                      mainArabicText: composedIstikhara.fullFormattedDuaAr,
                      sourceAndGradingAr:
                        'رواه البخاري (١١٦٢) عن جابر بن عبد الله رضي الله عنهما',
                      explanationOrVirtueAr:
                        'ما خاب من استخار الخالق، ولا ندم من استشار المخلوقين وتثبّت في أمره.',
                    })
                  }
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#FDE68A]" />
                  <span>مشاركة كبطاقة (PNG)</span>
                </button>
              )}
            </div>

            <button
              type="button"
              data-testid="quick-save-istikhara-journal-btn"
              onClick={() => handleSaveToIstikharaJournal()}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#FDE68A] hover:bg-[#FDE68A]/90 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savedNotice
                  ? 'تم الحفظ في سجل قراراتك ✓'
                  : 'حفظ في سجل الاستخارات والقرارات'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Step-by-Step Practical Guide for the Selected Prayer */}
      <div
        data-testid={`prayer-guide-details-${activePrayerGuide.id}`}
        className="rounded-2xl bg-white border border-stone-200 p-4 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#14532D]/10 text-[#14532D] text-xs font-bold">
                {activePrayerGuide.rakaatCountAr}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 text-xs font-semibold">
                {activePrayerGuide.rulingAr}
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-stone-950">
              صفة {activePrayerGuide.nameAr} خطوة بخطوة
            </h3>
            <p className="text-xs text-stone-600">
              <strong>الوقت المستحب:</strong> {activePrayerGuide.bestTimeAr}
            </p>
          </div>
        </div>

        {/* Authentic Hadith Evidence Box */}
        <div className="p-3.5 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#14532D]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>الدليل النبوي والقرآني الموثق:</span>
            </span>
            <span className="text-[#78350F]">
              {activePrayerGuide.evidenceSourceAndGradeAr}
            </span>
          </div>
          <p className="font-quran text-sm sm:text-base text-stone-900 leading-relaxed">
            {activePrayerGuide.authenticEvidenceAr}
          </p>
        </div>

        {/* Step-by-step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activePrayerGuide.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="p-3.5 rounded-xl bg-[#FBF9F5] border border-stone-200 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#14532D] text-[#FDE68A] text-xs font-bold flex items-center justify-center shrink-0">
                  {toArabicNumerals(step.stepNumber)}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-stone-950">
                  {step.titleAr}
                </h4>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed pr-8">
                {step.detailsAr}
              </p>
            </div>
          ))}
        </div>

        {/* Interactive Salat Al-Tasbih 300-Counter Assistant (When Salat Al-Tasbih is selected) */}
        {activePrayerGuide.id === 'tasbih' && (
          <div
            data-testid="salat-tasbih-interactive-counter"
            className="rounded-2xl bg-[#FCF9F2] border-2 border-[#14532D]/25 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[#14532D] block">
                  📿 مُساعِد ضبط مواضع التسبيحات الـ ٣٠٠ في صلاة التسبيح
                </span>
                <span className="text-[11px] text-stone-600">
                  الركعة الحالية: {toArabicNumerals(tasbihRakah)} من ٤ · مجموع الركعة:{' '}
                  {toArabicNumerals(completedTasbihInCurrentRakah)} / ٧٥ تسبيحة · الإجمالي:{' '}
                  {toArabicNumerals(totalCompletedTasbihAcrossPrayer)} / ٣٠٠
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTasbihRakah(1);
                  setTasbihPostureIdx(0);
                }}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة من الركعة الأولى</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5">
              {SALAT_TASBIH_POSTURES_PER_RAKAH.map((posture, idx) => {
                const isCurrent = idx === tasbihPostureIdx;
                const isDone = idx < tasbihPostureIdx;
                return (
                  <button
                    key={posture.id}
                    type="button"
                    onClick={() => setTasbihPostureIdx(idx)}
                    className={`p-2 rounded-xl text-right border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#14532D] text-white border-[#14532D] font-bold shadow-xs'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold">
                      {posture.postureTitleAr}
                    </div>
                    <div
                      className={`text-xs font-tabular mt-0.5 ${
                        isCurrent ? 'text-[#FDE68A]' : 'text-[#78350F] font-bold'
                      }`}
                    >
                      {toArabicNumerals(posture.targetCount)} تسبيحة
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-stone-200">
              <div className="text-xs text-stone-800">
                <strong>
                  {SALAT_TASBIH_POSTURES_PER_RAKAH[tasbihPostureIdx].postureTitleAr}:
                </strong>{' '}
                {SALAT_TASBIH_POSTURES_PER_RAKAH[tasbihPostureIdx].instructionAr} (
                {toArabicNumerals(
                  SALAT_TASBIH_POSTURES_PER_RAKAH[tasbihPostureIdx].targetCount
                )}{' '}
                مرة)
              </div>
              <button
                type="button"
                data-testid="advance-tasbih-posture-btn"
                onClick={handleAdvanceTasbihPosture}
                className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                الموضع التالي ←
              </button>
            </div>
          </div>
        )}

        {/* Prophetic Dua & Fiqh Notes */}
        <div className="p-3.5 rounded-xl bg-[#14532D]/8 border border-[#14532D]/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#14532D]">
              🤲 الدعاء والذكر المأثور في {activePrayerGuide.nameAr}:
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  `guide-${activePrayerGuide.id}`,
                  activePrayerGuide.propheticDuaAr
                )
              }
              className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === `guide-${activePrayerGuide.id}` ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الدعاء</span>
                </>
              )}
            </button>
          </div>
          <p className="font-quran text-sm sm:text-base text-stone-950 leading-loose bg-white p-3 rounded-xl border border-stone-200">
            {activePrayerGuide.propheticDuaAr}
          </p>
          <ul className="space-y-1 text-xs text-stone-700 list-disc list-inside pt-1">
            {activePrayerGuide.fiqhNotesAr.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Correcting Common Misconceptions About Istikhara + Personal Decision Journal (Shown on Istikhara Tab) */}
      {selectedPrayerId === 'istikhara' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column A: 6 Scholarly Corrections of Common Istikhara Misconceptions */}
          <div
            data-testid="istikhara-misconceptions-section"
            className="rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 space-y-3"
          >
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2.5">
            <HelpCircle className="w-4 h-4 text-[#78350F] shrink-0" />
            <div>
              <h3 className="font-display text-base font-bold text-stone-950">
                تصحيح المفاهيم الشائعة حول الاستخارة (٦ مسائل فقهية)
              </h3>
              <p className="text-[11px] text-stone-500">
                تحرير أقوال أئمة الفقه والحديث في آداب وأحكام الاستخارة
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {ISTIKHARA_MISCONCEPTIONS_AND_FACTS.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#FBF9F5] border border-stone-200 space-y-1.5"
              >
                <div className="text-xs font-bold text-amber-900">
                  ✗ مفهوم شائع: {item.misconceptionAr}
                </div>
                <div className="text-xs text-stone-800 leading-relaxed">
                  <strong className="text-[#14532D]">✓ الصواب الشرعي: </strong>
                  {item.correctionAr}
                </div>
                <div className="text-[10px] font-semibold text-stone-500">
                  المصدر: {item.scholarReferenceAr}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column B: Personal Istikhara & Decisions Journal */}
        <div
          data-testid="istikhara-personal-journal-section"
          className="rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#14532D] shrink-0" />
                <div>
                  <h3 className="font-display text-base font-bold text-stone-950">
                    سجل الاستخارات والقرارات الشخصي
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    يُحفظ محلياً في جهازك لمتابعة ما استخرت الله فيه واستشرت أهل الخبرة بشأنه
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#14532D]/10 text-[#14532D] text-xs font-bold">
                {toArabicNumerals(journalEntries.length)} قرارات
              </span>
            </div>

            {/* Add Decision Form */}
            <form
              onSubmit={handleSaveToIstikharaJournal}
              className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] space-y-2"
            >
              <input
                type="text"
                aria-label="الأمر المستخار فيه"
                value={matterInput}
                onChange={(e) => setMatterInput(e.target.value)}
                placeholder="الأمر أو القرار الذي استخرت الله فيه..."
                className="w-full min-h-[36px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs text-stone-900"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label="ملاحظات المشورة أو الأسباب"
                  value={consultationInput}
                  onChange={(e) => setConsultationInput(e.target.value)}
                  placeholder="خلاصة مشورة أهل الخبرة أو ملاحظاتك (اختياري)..."
                  className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs text-stone-900"
                />
                <button
                  type="submit"
                  data-testid="add-istikhara-journal-submit-btn"
                  className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة للسجل</span>
                </button>
              </div>
            </form>

            {/* Journal Entries List */}
            {journalEntries.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#FBF9F5] border border-dashed border-stone-300 space-y-1">
                <p className="text-xs font-bold text-stone-700">
                  لا توجد استخارات مسجّلة بعد في سجلك الشخصي
                </p>
                <p className="text-[11px] text-stone-500">
                  اكتب الأمر في مركّب الاستخارة أعلاه واضغط «إضافة للسجل» لمتابعة تيسير الله لك
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
                {journalEntries.map((entry) => {
                  const statusMeta = ISTIKHARA_STATUS_LABELS[entry.status];
                  return (
                    <div
                      key={entry.id}
                      data-testid={`istikhara-journal-item-${entry.id}`}
                      className="p-3 rounded-xl bg-[#FBF9F5] border border-stone-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-tabular text-stone-500 block">
                            تاريخ الاستخارة: {entry.dateISO}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-950">
                            {entry.matterAr}
                          </h4>
                          {entry.consultationNotesAr && (
                            <p className="text-[11px] text-stone-600 mt-0.5">
                              • المشورة والملاحظات: {entry.consultationNotesAr}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          aria-label="حذف القرار من السجل"
                          onClick={() =>
                            setJournalEntries((prev) =>
                              deleteIstikharaJournalEntry(prev, entry.id)
                            )
                          }
                          className="p-1 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Selector Pills */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-stone-200/70">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.labelAr}
                        </span>

                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              'pending_tawakkul',
                              'facilitated_good',
                              'diverted_for_good',
                            ] as IstikharaDecisionStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setJournalEntries((prev) =>
                                  updateIstikharaJournalStatus(
                                    prev,
                                    entry.id,
                                    st
                                  )
                                )
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer border ${
                                entry.status === st
                                  ? 'bg-[#14532D] text-white border-[#14532D]'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {ISTIKHARA_STATUS_LABELS[st].labelAr}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] text-[11px] text-stone-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
            <span>
              «مَا خَابَ مَنِ اسْتَخَارَ، وَلَا نَدِمَ مَنِ اسْتَشَارَ» — فوِّض أمرك لله وارضَ بما يقدّره لك.
            </span>
          </div>
        </div>
      </div>
      )}
    </section>
  );
};
