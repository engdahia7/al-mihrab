import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Copy,
  Check,
  Bookmark,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  HADITH_TOPICS,
  AUTHENTIC_HADITHS_LIST,
  searchAuthenticHadiths,
  type HadithTopicId,
  type AuthenticHadithItem,
} from '../data/hadithsData';
import { toArabicNumerals } from '../utils/astronomy';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';

const SAVED_HADITHS_STORAGE_KEY = 'almihrab_saved_hadiths_v1';

interface PropheticHadithsEncyclopediaProps {
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
}

export const PropheticHadithsEncyclopedia: React.FC<
  PropheticHadithsEncyclopediaProps
> = ({ onOpenDawahCard }) => {
  const [selectedTopic, setSelectedTopic] = useState<HadithTopicId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_HADITHS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_HADITHS_STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // ignore
    }
  }, [savedIds]);

  const filteredHadiths = useMemo(() => {
    const matches = searchAuthenticHadiths(searchQuery, selectedTopic);
    if (!showSavedOnly) return matches;
    return matches.filter((h) => savedIds.includes(h.id));
  }, [searchQuery, selectedTopic, showSavedOnly, savedIds]);

  const currentTopicMeta = useMemo(() => {
    return (
      HADITH_TOPICS.find((t) => t.id === selectedTopic) || HADITH_TOPICS[0]
    );
  }, [selectedTopic]);

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyHadith = (item: AuthenticHadithItem) => {
    const fullText = `${item.titleAr} (${item.topicLabelAr})\nعن ${item.narratorAr} أن رسول الله ﷺ قال:\n${item.hadithArabicText}\n— التخريج: ${item.takhrijAr} (${item.gradingAr})\n— الفقه والفائدة: ${item.fiqhBenefitAr}`;
    navigator.clipboard?.writeText(fullText);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <div
      className="space-y-5"
      data-testid="prophetic-hadiths-encyclopedia"
      dir="rtl"
    >
      {/* Header & Search Controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#14532D] block">
              السنة النبوية المطهرة · الصحيحان والسنن المعتمدة
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
              الأحاديث النبوية الصحيحة (مرتبة حسب الموضوع مع التخريج والرواة)
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              {currentTopicMeta.subtitleAr} · إجمالي الأحاديث المعروضة:{' '}
              {toArabicNumerals(filteredHadiths.length)} من{' '}
              {toArabicNumerals(AUTHENTIC_HADITHS_LIST.length)} حديثاً صحيحاً
            </p>
          </div>

          {/* Search Input + Saved Filter Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                data-testid="hadiths-search-input"
                aria-label="ابحث في نص الحديث أو الراوي أو الموضوع أو التخريج"
                placeholder="ابحث في الأحاديث أو الراوي أو التخريج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[40px] pr-9 pl-8 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              data-testid="hadiths-saved-filter-btn"
              onClick={() => setShowSavedOnly((prev) => !prev)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showSavedOnly
                  ? 'bg-[#78350F] text-white border-[#78350F]'
                  : 'bg-[#FBF9F5] text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>المفضلة ({toArabicNumerals(savedIds.length)})</span>
            </button>
          </div>
        </div>

        {/* Quick Search Keyword Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-500 font-medium">بحث سريع:</span>
          {['الصبر', 'الشكر', 'الدعاء', 'أبو هريرة', 'عمر بن الخطاب', 'متفق عليه'].map(
            (kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setShowSavedOnly(false);
                  setSearchQuery(kw);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                  searchQuery === kw
                    ? 'bg-[#14532D] text-white border-[#14532D] font-semibold'
                    : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {kw}
              </button>
            )
          )}
        </div>
      </div>

      {/* Topic Selector Tabs */}
      <div
        role="tablist"
        aria-label="موضوعات الأحاديث النبوية"
        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 p-1.5 bg-[#F7F4EE] border border-stone-200 rounded-xl"
      >
        {HADITH_TOPICS.map((topic) => {
          const isActive = selectedTopic === topic.id;
          const count =
            topic.id === 'all'
              ? AUTHENTIC_HADITHS_LIST.length
              : AUTHENTIC_HADITHS_LIST.filter((h) => h.topicId === topic.id)
                  .length;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`hadith-topic-tab-${topic.id}`}
              onClick={() => setSelectedTopic(topic.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-1.5 ${
                isActive
                  ? 'bg-[#14532D] text-white font-semibold shadow-xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>{topic.labelAr}</span>
              <span
                className={`text-[11px] font-tabular tabular-nums ${
                  isActive ? 'text-amber-200' : 'text-stone-500'
                }`}
              >
                ({toArabicNumerals(count)})
              </span>
            </button>
          );
        })}
      </div>

      {/* Hadiths List */}
      {filteredHadiths.length === 0 ? (
        <div
          data-testid="hadiths-empty-state"
          className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3"
        >
          <p className="text-sm font-semibold text-stone-800">
            لا توجد أحاديث مطابقة لبحثك الحالي.
          </p>
          <p className="text-xs text-stone-500">
            جرّب البحث بكلمة أخرى (مثل: الصبر، الشكر، الدعاء، النية، الاستغفار) أو اختر «جميع الموضوعات».
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedTopic('all');
              setShowSavedOnly(false);
            }}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold cursor-pointer"
          >
            عرض جميع الأحاديث الصحيحة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHadiths.map((hadith, idx) => {
            const isSaved = savedIds.includes(hadith.id);
            const isCopied = copiedId === hadith.id;

            return (
              <article
                key={hadith.id}
                data-testid={`hadith-card-${hadith.id}`}
                className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4 transition-colors"
              >
                {/* Header: Topic + Title + Grading inline metadata (Zero static pill clutter) */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#14532D]">
                      حديث رقم {toArabicNumerals(idx + 1)} · باب {hadith.topicLabelAr} ·{' '}
                      <span className="text-[#78350F]">{hadith.gradingAr}</span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                      {hadith.titleAr}
                    </h3>
                  </div>

                  <button
                    type="button"
                    data-testid={`save-hadith-btn-${hadith.id}`}
                    onClick={() => handleToggleSave(hadith.id)}
                    aria-label={isSaved ? 'إزالة الحديث من المفضلة' : 'حفظ الحديث في المفضلة'}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      isSaved
                        ? 'bg-[#78350F] text-white border-[#78350F]'
                        : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'محفوظ' : 'حفظ'}</span>
                  </button>
                </div>

                {/* Narrator Attribution Line */}
                <div className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  <span className="font-bold text-[#78350F]">راوي الحديث: </span>
                  <span className="font-semibold text-stone-900">
                    عن {hadith.narratorAr}
                  </span>
                  <span className="text-stone-500">
                    {' '}
                    ({hadith.narratorBioBriefAr}) — أن رسول الله ﷺ قال:
                  </span>
                </div>

                {/* Vocalized Prophetic Hadith Text */}
                <p
                  data-testid={`hadith-text-${hadith.id}`}
                  className="font-quran text-xl sm:text-2xl text-stone-900 leading-[2.15] py-1 select-all"
                  dir="rtl"
                >
                  {hadith.hadithArabicText}
                </p>

                {/* Takhrij, Graduation & Fiqh Benefit separated by clean hairline divider */}
                <div className="pt-3 border-t border-stone-200/80 space-y-2 text-xs sm:text-sm">
                  <div className="text-stone-800 leading-relaxed">
                    <span className="font-bold text-[#14532D]">
                      التخريج والمصدر:{' '}
                    </span>
                    <span>{hadith.takhrijAr}</span>
                    <span className="text-[#78350F] font-semibold">
                      {' '}
                      · درجة الحديث: {hadith.gradingAr}
                    </span>
                  </div>

                  <div className="text-stone-600 leading-relaxed">
                    <span className="font-bold text-stone-800">
                      الفقه والهداية النبوية:{' '}
                    </span>
                    <span>{hadith.fiqhBenefitAr}</span>
                  </div>
                </div>

                {/* Actions Toolbar: Copy with Takhrij & Narrator + Share Da'wah Card */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2">
                  {onOpenDawahCard && (
                    <button
                      type="button"
                      data-testid={`share-hadith-card-btn-${hadith.id}`}
                      onClick={() =>
                        onOpenDawahCard({
                          category: 'dua',
                          headerBadgeAr: `موسوعة الأحاديث الصحيحة · باب ${hadith.topicLabelAr}`,
                          titleAr: hadith.titleAr,
                          mainArabicText: hadith.hadithArabicText,
                          explanationOrVirtueAr: `الراوي: ${hadith.narratorAr} — الفائدة: ${hadith.fiqhBenefitAr}`,
                          sourceAndGradingAr: `${hadith.takhrijAr} (${hadith.gradingAr})`,
                        })
                      }
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#FAF5E8] hover:bg-[#EFE4CE] text-[#78350F] border border-[#D8CBB3] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>بطاقة دعوية</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid={`copy-hadith-btn-${hadith.id}`}
                    onClick={() => handleCopyHadith(hadith)}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-200" />
                        <span>تم نسخ الحديث والتخريج</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الحديث مع التخريج والراوي</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
