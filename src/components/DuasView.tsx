import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Bookmark,
  Copy,
  Check,
  Image as ImageIcon,
  Heart,
} from 'lucide-react';
import {
  DUA_TOPIC_CATEGORIES,
  DuaTopicCategoryId,
  AUTHENTIC_DUAS_LIST,
  AuthenticDuaItem,
} from '../data/duasData';
import {
  THEMATIC_QURAN_CATEGORIES,
  THEMATIC_QURAN_VERSES,
  QuranThemeCategoryId,
  ASMA_ALLAH_AL_HUSNA_LIST,
  AsmaCategoryFilter,
  AsmaAllahItem,
} from '../data/thematicAndNamesData';
import { toArabicNumerals } from '../data/quranData';
import { sanitizeQuranicText } from '../utils/astronomy';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';
import { ProphetsStoriesEncyclopedia } from './ProphetsStoriesEncyclopedia';
import { SpecialPrayersAndIstikharaGuide } from './SpecialPrayersAndIstikharaGuide';

const FAVORITE_DUAS_STORAGE_KEY = 'almihrab_favorite_duas_v1';

interface DuasViewProps {
  onOpenMushafPage?: (pageNum: number) => void;
  onOpenDawahCard?: (payload: DawahShareCardPayload) => void;
  onOpenWaqfModal?: () => void;
}

export const DuasView: React.FC<DuasViewProps> = ({
  onOpenMushafPage,
  onOpenDawahCard,
  onOpenWaqfModal,
}) => {
  // Primary Section Switcher: Authentic Duas | Prophets Stories (25) | Istikhara & Special Prayers | Asma Allah Al-Husna | Thematic Quran Index
  const [activeSection, setActiveSection] = useState<
    'duas' | 'prophets_stories' | 'istikhara_guide' | 'asma_husna' | 'thematic_quran'
  >('duas');

  const [selectedTopic, setSelectedTopic] = useState<DuaTopicCategoryId>('all');
  const [originFilter, setOriginFilter] = useState<
    'ALL' | 'قرآن كريم' | 'سنة نبوية صحيحة' | 'FAVORITES'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedDuaId, setCopiedDuaId] = useState<string | null>(null);

  // Asma Allah Al-Husna filters
  const [asmaCategory, setAsmaCategory] = useState<AsmaCategoryFilter>('ALL');

  // Thematic Quran filters
  const [selectedQuranTheme, setSelectedQuranTheme] =
    useState<QuranThemeCategoryId>('all');

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_DUAS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return ['dua-q1', 'dua-k1'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITE_DUAS_STORAGE_KEY,
        JSON.stringify(favoriteIds)
      );
    } catch {
      // ignore
    }
  }, [favoriteIds]);

  const activeCategoryMeta = useMemo(() => {
    return (
      DUA_TOPIC_CATEGORIES.find((c) => c.id === selectedTopic) ||
      DUA_TOPIC_CATEGORIES[0]
    );
  }, [selectedTopic]);

  const filteredDuas = useMemo(() => {
    return AUTHENTIC_DUAS_LIST.filter((dua) => {
      if (selectedTopic !== 'all' && dua.categoryId !== selectedTopic) {
        return false;
      }
      if (originFilter === 'FAVORITES' && !favoriteIds.includes(dua.id)) {
        return false;
      }
      if (
        (originFilter === 'قرآن كريم' ||
          originFilter === 'سنة نبوية صحيحة') &&
        dua.originType !== originFilter
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        dua.titleAr.includes(q) ||
        dua.arabicText.includes(q) ||
        dua.meaningExplanationAr.includes(q) ||
        dua.occasionAr.includes(q) ||
        dua.sourceAr.includes(q)
      );
    });
  }, [selectedTopic, originFilter, favoriteIds, searchQuery]);

  const filteredAsmaList = useMemo(() => {
    return ASMA_ALLAH_AL_HUSNA_LIST.filter((item) => {
      if (asmaCategory !== 'ALL' && item.category !== asmaCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        item.nameAr.includes(q) ||
        item.meaningAr.includes(q) ||
        item.worshipImpactAr.includes(q) ||
        item.duaWithNameAr.includes(q)
      );
    });
  }, [asmaCategory, searchQuery]);

  const filteredThematicVerses = useMemo(() => {
    return THEMATIC_QURAN_VERSES.filter((v) => {
      if (selectedQuranTheme !== 'all' && v.themeId !== selectedQuranTheme) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        v.topicTitleAr.includes(q) ||
        v.uthmaniText.includes(q) ||
        v.reflectionAr.includes(q) ||
        v.surahNameAr.includes(q)
      );
    });
  }, [selectedQuranTheme, searchQuery]);

  const handleToggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  };

  const handleCopyDua = (item: AuthenticDuaItem) => {
    const text = `${item.titleAr}\n${sanitizeQuranicText(
      item.arabicText
    )}\n— المناسبة: ${item.occasionAr}\n— شرح المعنى: ${
      item.meaningExplanationAr
    }\n— المصدر: ${item.sourceAr} (${item.gradingAr})`;
    navigator.clipboard?.writeText(text);
    setCopiedDuaId(item.id);
    setTimeout(() => setCopiedDuaId(null), 2000);
  };

  const handleCopyAsma = (item: AsmaAllahItem) => {
    const text = `${item.nameAr}\n— الدليل: ${item.evidenceAr}\n— المعنى: ${item.meaningAr}\n— أثر التعبد به: ${item.worshipImpactAr}\n— الدعاء به: ${item.duaWithNameAr}`;
    navigator.clipboard?.writeText(text);
    setCopiedDuaId(`asma-${item.number}`);
    setTimeout(() => setCopiedDuaId(null), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
            الأدعية وقصص الأنبياء والأسماء الحسنى
          </h1>
          {onOpenWaqfModal && (
            <button
              type="button"
              data-testid="duas-open-waqf-btn"
              onClick={onOpenWaqfModal}
              className="min-h-[34px] px-3 py-1 rounded-xl bg-[#14532D]/10 hover:bg-[#14532D]/15 text-[#14532D] border border-[#14532D]/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>وقف وإهداء للوالدين أو متوفى</span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="ابحث في الأدعية أو أسماء الله الحسنى أو المواضيع القرآنية"
            placeholder="ابحث في الدعاء أو الاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[38px] pr-9 pl-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
          />
        </div>
      </div>

      {/* Top 5-Section Switcher */}
      <div
        role="tablist"
        aria-label="أقسام الأدعية وقصص الأنبياء والاستخارة والأسماء الحسنى والمفهرس الموضوعي"
        className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-[#F4EFE6] border border-stone-200 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          data-testid="duas-tab-duas"
          aria-selected={activeSection === 'duas'}
          onClick={() => setActiveSection('duas')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'duas'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>جوامع الأدعية</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="duas-tab-prophets"
          aria-selected={activeSection === 'prophets_stories'}
          onClick={() => setActiveSection('prophets_stories')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'prophets_stories'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>قصص الأنبياء وأدعيتهم (٢٥)</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="duas-tab-istikhara"
          aria-selected={activeSection === 'istikhara_guide'}
          onClick={() => setActiveSection('istikhara_guide')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'istikhara_guide'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>مرشد الاستخارة والصلوات</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="duas-tab-asma"
          aria-selected={activeSection === 'asma_husna'}
          onClick={() => setActiveSection('asma_husna')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'asma_husna'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>الأسماء الحسنى</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="duas-tab-thematic"
          aria-selected={activeSection === 'thematic_quran'}
          onClick={() => setActiveSection('thematic_quran')}
          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSection === 'thematic_quran'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>آيات موضوعية</span>
        </button>
      </div>

      {/* SECTION: PROPHETS STORIES & QURANIC DUAS (25 PROPHETS) */}
      {activeSection === 'prophets_stories' && (
        <ProphetsStoriesEncyclopedia
          onOpenMushafPage={onOpenMushafPage}
          onOpenDawahCard={onOpenDawahCard}
        />
      )}

      {/* SECTION: INTERACTIVE ISTIKHARA, TAWBAH & SPECIAL PRAYERS GUIDE */}
      {activeSection === 'istikhara_guide' && (
        <SpecialPrayersAndIstikharaGuide onOpenDawahCard={onOpenDawahCard} />
      )}

      {/* =====================================================================
          SECTION 1: AUTHENTIC DUAS
         ===================================================================== */}
      {activeSection === 'duas' && (
        <>
          {/* Compact Combined Topic & Origin Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            <div
              role="tablist"
              aria-label="تصنيف الأدعية حسب الموضوع والمناسبة"
              className="flex flex-nowrap overflow-x-auto items-center gap-1"
            >
              {DUA_TOPIC_CATEGORIES.map((cat) => {
                const isActive = cat.id === selectedTopic;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedTopic(cat.id)}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#14532D] text-white font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {cat.nameAr}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl shrink-0">
              {(
                [
                  { id: 'ALL', label: 'الكل' },
                  { id: 'قرآن كريم', label: 'القرآن' },
                  { id: 'سنة نبوية صحيحة', label: 'السنّة' },
                  {
                    id: 'FAVORITES',
                    label: `المفضلة (${toArabicNumerals(favoriteIds.length)})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOriginFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    originFilter === tab.id
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredDuas.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm text-stone-600">
                لا توجد أدعية مطابقة لفلتر البحث الحالي.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setOriginFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg cursor-pointer"
              >
                عرض جميع الأدعية المأثورة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredDuas.map((dua) => {
                const isFav = favoriteIds.includes(dua.id);
                const isCopied = copiedDuaId === dua.id;
                const cleanArabicText = sanitizeQuranicText(dua.arabicText);

                return (
                  <article
                    key={dua.id}
                    className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 hover:border-stone-300 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 mb-0.5">
                            <span className="font-semibold text-[#14532D]">
                              {dua.originType}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{dua.occasionAr}</span>
                          </div>
                          <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                            {dua.titleAr}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {onOpenDawahCard && (
                            <button
                              type="button"
                              data-testid={`dua-share-card-btn-${dua.id}`}
                              onClick={() =>
                                onOpenDawahCard({
                                  category: 'dua',
                                  headerBadgeAr: `${dua.originType} · ${dua.occasionAr}`,
                                  titleAr: dua.titleAr,
                                  mainArabicText: cleanArabicText,
                                  explanationOrVirtueAr: dua.meaningExplanationAr,
                                  sourceAndGradingAr: `${dua.sourceAr} (${dua.gradingAr})`,
                                })
                              }
                              aria-label={`بطاقة دعوية لـ ${dua.titleAr}`}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[#14532D]/20 bg-[#14532D]/8 text-[#14532D] hover:bg-[#14532D]/15 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>بطاقة دعوية</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(dua.id)}
                            aria-label={
                              isFav
                                ? `إزالة ${dua.titleAr} من المفضلة`
                                : `حفظ ${dua.titleAr} في المفضلة`
                            }
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              isFav
                                ? 'bg-amber-50 border-amber-300 text-[#78350F]'
                                : 'bg-[#FBF9F5] border-stone-200 text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>{isFav ? 'محفوظ' : 'حفظ'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyDua(dua)}
                            aria-label={`نسخ ${dua.titleAr}`}
                            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-stone-200 bg-[#FBF9F5] text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#14532D]" />
                                <span className="text-[#14532D]">نُسخ</span>
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

                      <p
                        className="font-quran text-xl sm:text-2xl leading-[2.15] text-stone-900 text-right select-all py-1"
                        dir="rtl"
                      >
                        {cleanArabicText}
                      </p>

                      <p className="text-xs text-stone-600 leading-relaxed pt-2.5 border-t border-stone-100">
                        <strong className="text-[#78350F]">المعنى: </strong>
                        {dua.meaningExplanationAr}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                      <span>{dua.sourceAr}</span>
                      <span className="font-semibold text-[#14532D]">
                        {dua.gradingAr}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          SECTION 2: ASMA ALLAH AL-HUSNA ENCYCLOPEDIA (موسوعة أسماء الله الحسنى)
         ===================================================================== */}
      {activeSection === 'asma_husna' && (
        <div className="space-y-4" data-testid="asma-husna-section">
          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-stone-200 rounded-2xl p-2.5">
            {(
              [
                'ALL',
                'أسماء الجمال والرحمة',
                'أسماء الجلال والعظمة',
                'أسماء العلم والحكمة',
                'أسماء الرزق والربوبية',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAsmaCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  asmaCategory === cat
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                {cat === 'ALL' ? 'جميع الأسماء' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAsmaList.map((item) => {
              const isCopied = copiedDuaId === `asma-${item.number}`;
              return (
                <article
                  key={item.number}
                  className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {toArabicNumerals(item.number)}
                        </span>
                        <div>
                          <h2 className="font-quran text-2xl font-bold text-stone-900">
                            {item.nameAr}
                          </h2>
                          <span className="text-xs text-[#78350F]">
                            {item.category} · {item.evidenceAr}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenDawahCard && (
                          <button
                            type="button"
                            data-testid={`asma-share-card-btn-${item.number}`}
                            onClick={() =>
                              onOpenDawahCard({
                                category: 'asma',
                                headerBadgeAr: `موسوعة أسماء الله الحسنى · ${item.category}`,
                                titleAr: `اسم الله «${item.nameAr}» (${item.evidenceAr})`,
                                mainArabicText: item.duaWithNameAr,
                                explanationOrVirtueAr: `${item.meaningAr} — ${item.worshipImpactAr}`,
                                sourceAndGradingAr: 'وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا',
                              })
                            }
                            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[#14532D]/20 bg-[#14532D]/8 text-xs font-semibold text-[#14532D] hover:bg-[#14532D]/15 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>بطاقة دعوية</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyAsma(item)}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg border border-stone-200 bg-[#FBF9F5] text-xs text-stone-700 hover:text-stone-900 flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#14532D]" />
                              <span>نُسخ</span>
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

                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-2 border-t border-stone-100">
                      <strong className="text-stone-900">المعنى: </strong>
                      {item.meaningAr}
                    </p>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      <strong className="text-[#14532D]">أثر التعبّد: </strong>
                      {item.worshipImpactAr}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-stone-100">
                    <p className="font-quran text-lg text-[#78350F] leading-relaxed">
                      «{item.duaWithNameAr}»
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: THEMATIC QURAN INDEX (المفهرس الموضوعي للقرآن الكريم)
         ===================================================================== */}
      {activeSection === 'thematic_quran' && (
        <div className="space-y-4" data-testid="thematic-quran-section">
          {/* Theme Category Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-stone-200 rounded-2xl">
            {THEMATIC_QURAN_CATEGORIES.map((cat) => {
              const active = cat.id === selectedQuranTheme;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedQuranTheme(cat.id)}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#14532D] text-white'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {cat.nameAr}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredThematicVerses.map((v) => (
              <article
                key={v.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[#14532D] block">
                        سورة {v.surahNameAr} · الآية {toArabicNumerals(v.ayahNumber)}
                      </span>
                      <h2 className="font-display text-base sm:text-lg font-bold text-stone-900 mt-0.5">
                        {v.topicTitleAr}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenDawahCard && (
                        <button
                          type="button"
                          data-testid={`thematic-share-card-btn-${v.id}`}
                          onClick={() =>
                            onOpenDawahCard({
                              category: 'ayah',
                              headerBadgeAr: `سُورَةُ ${v.surahNameAr} · الآية ${toArabicNumerals(v.ayahNumber)} · صفحة ${toArabicNumerals(v.mushafPage)}`,
                              titleAr: v.topicTitleAr,
                              mainArabicText: v.uthmaniText,
                              explanationOrVirtueAr: v.reflectionAr,
                              sourceAndGradingAr: `الموضوع: ${v.topicTitleAr}`,
                            })
                          }
                          className="min-h-[32px] px-2.5 py-1 rounded-xl border border-[#14532D]/20 bg-[#14532D]/8 text-[#14532D] text-xs font-semibold hover:bg-[#14532D]/15 flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>بطاقة دعوية</span>
                        </button>
                      )}
                      {onOpenMushafPage && (
                        <button
                          type="button"
                          onClick={() => onOpenMushafPage(v.mushafPage)}
                          className="min-h-[32px] px-3 py-1 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 cursor-pointer shrink-0"
                        >
                          المصحف (ص {toArabicNumerals(v.mushafPage)})
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-stone-900 leading-[2.15] text-right py-1">
                    ﴿{v.uthmaniText}﴾
                  </p>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed pt-2.5 border-t border-stone-100">
                  <strong className="text-[#78350F]">التوجيه القرآني: </strong>
                  {v.reflectionAr}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
