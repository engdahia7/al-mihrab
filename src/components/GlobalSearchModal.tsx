import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  BookOpen,
  Moon,
  Heart,
  Compass,
  Clock,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';
import { ALL_SURAHS, toArabicNumerals } from '../data/quranData';
import { VERIFIED_ADHKAR, ADHKAR_CATEGORIES } from '../data/adhkarData';
import { AUTHENTIC_DUAS_LIST } from '../data/duasData';
import { ASMA_ALLAH_AL_HUSNA_LIST } from '../data/thematicAndNamesData';
import {
  AUTHENTIC_HADITHS_LIST,
  searchAuthenticHadiths,
} from '../data/hadithsData';
import {
  normalizeArabicForQuranSearch,
  searchQuranVersesLocal,
} from '../utils/quranStudyTools';
import type { DawahShareCardPayload } from '../utils/dawahShareCards';
import type { ActiveTab } from '../App';
import type { DuasSectionId } from './DuasView';
import type { PrayersSubScreen } from './PrayerTimesView';
import type { WorshipHubSubSection } from './WorshipAndQadaHub';
import type { QiblaSubTab } from './QiblaAndSourcesView';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenMushafPage: (pageNumber: number) => void;
  onOpenDawahCard: (payload: DawahShareCardPayload) => void;
  onOpenWaqfModal: () => void;
  onNavigateDuasSection?: (section: DuasSectionId) => void;
  onNavigatePrayersSubScreen?: (
    subScreen: PrayersSubScreen,
    worshipSubSection?: WorshipHubSubSection
  ) => void;
  onNavigateQiblaSubTab?: (subTab: QiblaSubTab) => void;
}

type SearchFilterCategory =
  | 'all'
  | 'quran'
  | 'hadiths'
  | 'adhkar'
  | 'duas'
  | 'asma'
  | 'tools';

interface QuickToolShortcut {
  id: string;
  titleAr: string;
  subtitleAr: string;
  keywords: string;
  action: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenMushafPage,
  onOpenDawahCard,
  onOpenWaqfModal,
  onNavigateDuasSection,
  onNavigatePrayersSubScreen,
  onNavigateQiblaSubTab,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterCategory>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const quickTools: QuickToolShortcut[] = useMemo(
    () => [
      {
        id: 'tool-prophetic-hadiths',
        titleAr: 'موسوعة الأحاديث النبوية الصحيحة (مرتبة حسب الموضوع مع التخريج والرواة)',
        subtitleAr: 'أحاديث الصحيحين والسنن في الصبر والشكر والدعاء والإيمان والأخلاق مع البحث',
        keywords: 'حديث احاديث نبوية صحيحة البخاري مسلم الصبر الشكر الدعاء الراوي التخريج متفق عليه',
        action: () => {
          if (onNavigateDuasSection) {
            onNavigateDuasSection('hadiths');
          } else {
            onNavigateTab('duas');
          }
          onClose();
        },
      },
      {
        id: 'tool-prophets-stories',
        titleAr: 'موسوعة قصص الأنبياء في القرآن وأدعيتهم (٢٥ نبياً ورسولاً)',
        subtitleAr: 'شجرة الأنبياء التفاعلية ومعجزاتهم وأدعيتهم القرآنية المستجابة مع الاستماع الصوتي',
        keywords: 'قصص الانبياء المرسلين ادم نوح ابراهيم موسى عيسى محمد يونس ايوب يوسف سليمان داود دعاء',
        action: () => {
          if (onNavigateDuasSection) {
            onNavigateDuasSection('prophets_stories');
          } else {
            onNavigateTab('duas');
          }
          onClose();
        },
      },
      {
        id: 'tool-istikhara-guide',
        titleAr: 'مُرشِد صلاة الاستخارة والتوبة والحاجة والضحى التفاعلي',
        subtitleAr: 'مُركِّب دعاء الاستخارة التفاعلي باسم حاجتك مع الخطوات العملية وسجل الاستخارات',
        keywords: 'استخارة الاستخارة صلاة التوبة الحاجة الضحى التسبيح دعاء قرار',
        action: () => {
          if (onNavigateDuasSection) {
            onNavigateDuasSection('istikhara_guide');
          } else {
            onNavigateTab('duas');
          }
          onClose();
        },
      },
      {
        id: 'tool-revived-sunnahs',
        titleAr: 'السنن المهجورة والآداب النبوية اليومية (بالدليل الصحيح)',
        subtitleAr: 'بطاقة سنة اليوم وسنن الفطرة والطعام واللباس والمنزل والجمعة مع متابعة التطبيق',
        keywords: 'السنن المهجورة سنة اليوم الاداب النبوية الفطرة الطعام الشراب اللباس الجمعة',
        action: () => {
          if (onNavigatePrayersSubScreen) {
            onNavigatePrayersSubScreen('worship_qada', 'sunnah');
          } else {
            onNavigateTab('prayers');
          }
          onClose();
        },
      },
      {
        id: 'tool-night-thirds',
        titleAr: 'الثلث الأخير من الليل وصلاة الضحى وأوقات النهي',
        subtitleAr: 'حساب فلكي دقيق لوقت التهجّد والتنزّل الإلهي ومنتصف الليل الشرعي والضحى',
        keywords: 'الثلث الاخير الليل التهجد قيام الضحى الشروق النهي منتصف',
        action: () => {
          if (onNavigatePrayersSubScreen) {
            onNavigatePrayersSubScreen('worship_qada', 'tracker');
          } else {
            onNavigateTab('prayers');
          }
          onClose();
        },
      },
      {
        id: 'tool-zakat',
        titleAr: 'حاسبة الزكاة الشرعية الشاملة (المال، الذهب، التجارة، الفطر)',
        subtitleAr: 'حساب نصاب الذهب (٨٥جم) والفضة (٥٩٥جم) وربع العشر ٢.٥٪ وزكاة الفطر',
        keywords: 'زكاة الزكاة نصاب ذهب فضة مال تجارة فطر صاع',
        action: () => {
          if (onNavigateQiblaSubTab) {
            onNavigateQiblaSubTab('hijri_sources');
          } else {
            onNavigateTab('qibla');
          }
          onClose();
        },
      },
      {
        id: 'tool-inheritance',
        titleAr: 'حاسبة المواريث الشرعية (الفرائض والعول والرد والحجب)',
        subtitleAr: 'توزيع الأنصبة الشرعية للورثة مع الأدلة القرآنية من سورة النساء',
        keywords: 'مواريث ميراث تركة فرائض عول حجب نصيب',
        action: () => {
          if (onNavigateQiblaSubTab) {
            onNavigateQiblaSubTab('inheritance');
          } else {
            onNavigateTab('qibla');
          }
          onClose();
        },
      },
      {
        id: 'tool-mosques',
        titleAr: 'خريطة المساجد المحيطة والملاحة المباشرة',
        subtitleAr: 'البحث عن أقرب المساجد والجوامع وفتح الملاحة عبر خرائط جوجل وWaze',
        keywords: 'مسجد مساجد خريطة ملاحة قريب جامع قبلة',
        action: () => {
          if (onNavigateQiblaSubTab) {
            onNavigateQiblaSubTab('qibla_mosques');
          } else {
            onNavigateTab('qibla');
          }
          onClose();
        },
      },
      {
        id: 'tool-waqf',
        titleAr: 'إهداء الصدقة الجارية وبطاقة الوقف (للوالدين أو متوفى)',
        subtitleAr: 'تخصيص سطر إهداء وشهادة وقف رقمية مصورة ورابط صدقة جارية',
        keywords: 'وقف صدقة جارية اهداء متوفى والدين ثواب ختمة',
        action: () => {
          onClose();
          onOpenWaqfModal();
        },
      },
    ],
    [
      onNavigateTab,
      onClose,
      onOpenWaqfModal,
      onNavigateDuasSection,
      onNavigatePrayersSubScreen,
      onNavigateQiblaSubTab,
    ]
  );

  const normalizedQuery = useMemo(
    () => normalizeArabicForQuranSearch(query),
    [query]
  );

  // 1. Matching Surahs
  const matchingSurahs = useMemo(() => {
    if (!normalizedQuery) return ALL_SURAHS.slice(0, 6);
    return ALL_SURAHS.filter((s) => {
      const normName = normalizeArabicForQuranSearch(`سورة ${s.nameAr}`);
      return (
        normName.includes(normalizedQuery) ||
        String(s.number) === query.trim()
      );
    }).slice(0, 6);
  }, [normalizedQuery, query]);

  // 2. Matching Quran Verses (diacritic-free)
  const matchingVerses = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return searchQuranVersesLocal(query).slice(0, 8);
  }, [normalizedQuery, query]);

  // 3. Matching Adhkar
  const matchingAdhkar = useMemo(() => {
    if (!normalizedQuery) return VERIFIED_ADHKAR.slice(0, 4);
    return VERIFIED_ADHKAR.filter((item) => {
      const haystack = normalizeArabicForQuranSearch(
        `${item.titleAr} ${item.arabicText} ${item.virtueAr}`
      );
      return haystack.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  // 4. Matching Duas
  const matchingDuas = useMemo(() => {
    if (!normalizedQuery) return AUTHENTIC_DUAS_LIST.slice(0, 4);
    return AUTHENTIC_DUAS_LIST.filter((d) => {
      const haystack = normalizeArabicForQuranSearch(
        `${d.titleAr} ${d.arabicText} ${d.occasionAr} ${d.meaningExplanationAr}`
      );
      return haystack.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  // 5. Matching 99 Names of Allah
  const matchingAsma = useMemo(() => {
    if (!normalizedQuery) return ASMA_ALLAH_AL_HUSNA_LIST.slice(0, 4);
    return ASMA_ALLAH_AL_HUSNA_LIST.filter((a) => {
      const haystack = normalizeArabicForQuranSearch(
        `${a.nameAr} ${a.meaningAr} ${a.duaWithNameAr}`
      );
      return haystack.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  // 6. Matching Authentic Prophetic Hadiths
  const matchingHadiths = useMemo(() => {
    if (!normalizedQuery) return AUTHENTIC_HADITHS_LIST.slice(0, 4);
    return searchAuthenticHadiths(query, 'all').slice(0, 6);
  }, [normalizedQuery, query]);

  // 7. Matching Tools
  const matchingTools = useMemo(() => {
    if (!normalizedQuery) return quickTools;
    return quickTools.filter((t) => {
      const haystack = normalizeArabicForQuranSearch(
        `${t.titleAr} ${t.subtitleAr} ${t.keywords}`
      );
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, quickTools]);

  if (!isOpen) return null;

  const showQuran = activeFilter === 'all' || activeFilter === 'quran';
  const showHadiths = activeFilter === 'all' || activeFilter === 'hadiths';
  const showAdhkar = activeFilter === 'all' || activeFilter === 'adhkar';
  const showDuas = activeFilter === 'all' || activeFilter === 'duas';
  const showAsma = activeFilter === 'all' || activeFilter === 'asma';
  const showTools = activeFilter === 'all' || activeFilter === 'tools';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
      data-testid="global-search-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl my-2 sm:my-6 bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
      >
        {/* Top Search Input Header */}
        <div className="p-3.5 sm:p-4 bg-[#EFE4CE] border-b border-[#C8B696] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#14532D]" />
              <h2 className="font-display text-sm sm:text-base font-bold text-stone-900">
                الباحث الشامل في المحراب (القرآن · الأحاديث · الأذكار · الأدعية · الأسماء الحسنى)
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق الباحث الشامل"
              className="p-1.5 rounded-lg bg-white border border-[#C8B696] text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              data-testid="global-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن أي آية، حديث نبوي، راوٍ، ذكر، دعاء، اسم من أسماء الله، أو أداة..."
              className="w-full min-h-[42px] pr-10 pl-3 py-2 text-xs sm:text-sm bg-white border border-[#B59E7A] rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          {/* Filter Tabs + Quick Suggestions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'quran', label: 'المصحف والآيات' },
                  { id: 'hadiths', label: 'الأحاديث الصحيحة' },
                  { id: 'adhkar', label: 'الأذكار' },
                  { id: 'duas', label: 'الأدعية' },
                  { id: 'asma', label: 'الأسماء الحسنى' },
                  { id: 'tools', label: 'الأدوات الشرعية' },
                ] as { id: SearchFilterCategory; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-[#14532D] text-white'
                      : 'bg-white/80 text-stone-700 hover:bg-white border border-[#C8B696]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-600">
              <span>بحث سريع:</span>
              {['الصبر', 'الشكر', 'آية الكرسي', 'الرزق', 'الزكاة'].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setQuery(kw)}
                  className="px-2 py-0.5 rounded bg-white border border-[#D8CBB3] hover:bg-[#FAF5E8] text-stone-800 cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Multi-Domain Results */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5">
          {/* 1. Quick Shariah Tools */}
          {showTools && matchingTools.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#78350F] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>الأدوات الشرعية والخدمات السريعة</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchingTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={tool.action}
                    className="text-right p-3 rounded-xl bg-white border border-[#D8CBB3] hover:border-[#14532D] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-[#14532D] block truncate">
                        {tool.titleAr}
                      </span>
                      <span className="text-[11px] text-stone-600 block truncate mt-0.5">
                        {tool.subtitleAr}
                      </span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-[#14532D] shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 1.B Authentic Prophetic Hadiths */}
          {showHadiths && matchingHadiths.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>الأحاديث النبوية الصحيحة (مع الرواة والتخريج)</span>
              </h3>
              <div className="space-y-2">
                {matchingHadiths.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-white border border-[#D8CBB3] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-stone-900">
                          {h.titleAr}
                        </span>
                        <span className="text-[11px] text-[#78350F] mr-2">
                          (باب {h.topicLabelAr} · {h.gradingAr})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateDuasSection) {
                            onNavigateDuasSection('hadiths');
                          } else {
                            onNavigateTab('duas');
                          }
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer"
                      >
                        قسم الأحاديث
                      </button>
                    </div>
                    <p className="font-quran text-base sm:text-lg text-stone-900 leading-relaxed">
                      {h.hadithArabicText}
                    </p>
                    <p className="text-[11px] text-stone-600">
                      الراوي: {h.narratorAr} · التخريج: {h.takhrijAr}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Quran Surahs & Verses */}
          {showQuran && (matchingSurahs.length > 0 || matchingVerses.length > 0) && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>المصحف الشريف (السور والآيات المطابقة)</span>
              </h3>

              {matchingSurahs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {matchingSurahs.map((s) => (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => {
                        onOpenMushafPage(s.startPage);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-white border border-[#D8CBB3] hover:border-[#14532D] text-right flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          سورة {s.nameAr}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {s.revelationType} · {toArabicNumerals(s.ayahCount)} آية
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FAF5E8] text-[#78350F]">
                        ص {toArabicNumerals(s.startPage)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchingVerses.length > 0 && (
                <div className="space-y-2">
                  {matchingVerses.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-white border border-[#D8CBB3] space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#14532D]">
                          سورة {v.surahNameAr} · الآية {toArabicNumerals(v.ayahNumber)} · صفحة{' '}
                          {toArabicNumerals(v.pageNumber)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenDawahCard({
                                category: 'ayah',
                                headerBadgeAr: `سُورَةُ ${v.surahNameAr} · الآية ${toArabicNumerals(
                                  v.ayahNumber
                                )} · ص ${toArabicNumerals(v.pageNumber)}`,
                                titleAr: `سورة ${v.surahNameAr}`,
                                mainArabicText: v.textUthmani,
                                explanationOrVirtueAr: v.tafsirSnippet || '',
                                sourceAndGradingAr: 'مصحف المدينة النبوية · مجمع الملك فهد',
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF5E8] border border-[#C8B696] text-[#78350F] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>بطاقة دعوية</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenMushafPage(v.pageNumber);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            افتح في المصحف
                          </button>
                        </div>
                      </div>
                      <p className="font-quran text-lg sm:text-xl text-stone-900 bg-[#FCF9F2] border border-[#E5DAC3] rounded-lg px-3 py-2 leading-relaxed">
                        ﴿{v.textUthmani}﴾
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 3. Hisn Al-Muslim Adhkar */}
          {showAdhkar && matchingAdhkar.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" />
                <span>أذكار حصن المسلم</span>
              </h3>
              <div className="space-y-2">
                {matchingAdhkar.map((dhikr) => {
                  const catName =
                    ADHKAR_CATEGORIES.find((c) => c.id === dhikr.categoryId)?.nameAr ||
                    'حصن المسلم';
                  return (
                    <div
                      key={dhikr.id}
                      className="p-3 rounded-xl bg-white border border-[#D8CBB3] space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-stone-900">
                            {dhikr.titleAr}
                          </span>
                          <span className="text-[11px] text-[#78350F] mr-2">
                            ({catName})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenDawahCard({
                                category: 'dhikr',
                                headerBadgeAr: `${catName} · حصن المسلم`,
                                titleAr: dhikr.titleAr,
                                mainArabicText: dhikr.arabicText,
                                explanationOrVirtueAr: dhikr.virtueAr,
                                sourceAndGradingAr: `${dhikr.sourceAr} (${dhikr.gradingAr})`,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF5E8] border border-[#C8B696] text-[#78350F] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>بطاقة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab('adhkar');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            قسم الأذكار
                          </button>
                        </div>
                      </div>
                      <p className="font-quran text-base sm:text-lg text-stone-800 line-clamp-2 leading-relaxed">
                        {dhikr.arabicText}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Authentic Duas */}
          {showDuas && matchingDuas.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#78350F] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                <span>الأدعية القرآنية والنبوية المأثورة</span>
              </h3>
              <div className="space-y-2">
                {matchingDuas.map((dua) => (
                  <div
                    key={dua.id}
                    className="p-3 rounded-xl bg-white border border-[#D8CBB3] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-stone-900">
                          {dua.titleAr}
                        </span>
                        <span className="text-[11px] text-[#14532D] mr-2">
                          ({dua.originType})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDawahCard({
                              category: 'dua',
                              headerBadgeAr: `${dua.originType} · الأدعية المأثورة`,
                              titleAr: dua.titleAr,
                              mainArabicText: dua.arabicText,
                              explanationOrVirtueAr: dua.meaningExplanationAr,
                              sourceAndGradingAr: `${dua.sourceAr} — ${dua.gradingAr}`,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF5E8] border border-[#C8B696] text-[#78350F] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>بطاقة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab('duas');
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          قسم الأدعية
                        </button>
                      </div>
                    </div>
                    <p className="font-quran text-base sm:text-lg text-stone-800 leading-relaxed">
                      {dua.arabicText}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Asma Allah Al-Husna */}
          {showAsma && matchingAsma.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>أسماء الله الحسنى ومعانيها</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchingAsma.map((asma) => (
                  <div
                    key={asma.number}
                    className="p-3 rounded-xl bg-white border border-[#D8CBB3] flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-quran text-lg font-bold text-[#14532D]">
                        {toArabicNumerals(asma.number)}. {asma.nameAr}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDawahCard({
                            category: 'asma',
                            headerBadgeAr: `أسماء الله الحسنى · ${asma.category}`,
                            titleAr: `اسم الله «${asma.nameAr}»`,
                            mainArabicText: `${asma.nameAr} — ${asma.meaningAr}`,
                            explanationOrVirtueAr: `الدعاء به: ${asma.duaWithNameAr}`,
                            sourceAndGradingAr: asma.evidenceAr,
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-[#FAF5E8] border border-[#C8B696] text-[#78350F] text-[10px] font-semibold cursor-pointer"
                      >
                        بطاقة الاسم
                      </button>
                    </div>
                    <p className="text-xs text-stone-700 leading-snug">
                      {asma.meaningAr}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
