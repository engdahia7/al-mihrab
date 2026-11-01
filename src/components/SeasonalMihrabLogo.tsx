import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Calendar, BookOpen, Heart, Moon, Check } from 'lucide-react';
import { gregorianToHijri, toArabicNumerals } from '../utils/astronomy';

export type HijriDate = ReturnType<typeof gregorianToHijri>;

export type SeasonalOccasionId =
  | 'auto'
  | 'default'
  | 'ramadan'
  | 'laylat_al_qadr'
  | 'hajj_arafah'
  | 'eid'
  | 'jumuah'
  | 'white_days'
  | 'ashura_muharram';

export interface SeasonalOccasionMeta {
  id: Exclude<SeasonalOccasionId, 'auto'>;
  titleAr: string;
  badgeTextAr: string;
  subtitleAr: string;
  descriptionAr: string;
  sunnahDeedsAr: string[];
  duaOrDhikrAr: string;
  recommendedTab: 'prayers' | 'quran' | 'adhkar' | 'duas' | 'qibla';
  recommendedTabLabelAr: string;
}

const SEASONAL_STORAGE_KEY = 'almihrab_seasonal_logo_mode_v1';

export const SEASONAL_OCCASIONS: Record<
  Exclude<SeasonalOccasionId, 'auto'>,
  SeasonalOccasionMeta
> = {
  default: {
    id: 'default',
    titleAr: 'الشعار اليومي (محراب الطاعة)',
    badgeTextAr: 'في محراب الطاعة · لوجه الله',
    subtitleAr: 'نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله',
    descriptionAr:
      'التصميم الأصيل لشعار المحراب بالقوس الإسلامي المذهّب والمصحف المفتوح والهلال.',
    sunnahDeedsAr: [
      'المحافظة على الصلوات الخمس في جماعة وفي أول وقتها',
      'قراءة الورد اليومي من القرآن الكريم بتدبر',
      'المداومة على أذكار الصباح والمساء وأذكار ما بعد الصلاة',
    ],
    duaOrDhikrAr:
      '«اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ»',
    recommendedTab: 'prayers',
    recommendedTabLabelAr: 'مواقيت الصلاة اليومية',
  },
  ramadan: {
    id: 'ramadan',
    titleAr: 'شهر رمضان المبارك',
    badgeTextAr: 'رمضان مبارك · شهر القرآن',
    subtitleAr: 'توهج فانوس رمضان المذهّب وهلال الشهر الفضيل',
    descriptionAr:
      'يتزين المحراب بفانوس رمضاني ذهبي متوهج وهلال الشهر الكريم احتفاءً بموسم الصيام والقرآن.',
    sunnahDeedsAr: [
      'ختم القرآن الكريم وتدبر آياته في شهر التنزيل',
      'تعجيل الفطر وتأخير السحور والدعاء عند الإفطار',
      'الحرص على صلاة التراويح والقيام مع الإمام حتى ينصرف',
    ],
    duaOrDhikrAr:
      '«ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ»',
    recommendedTab: 'quran',
    recommendedTabLabelAr: 'فتح المصحف ومتتبع الختمة',
  },
  laylat_al_qadr: {
    id: 'laylat_al_qadr',
    titleAr: 'العشر الأواخر وليلة القدر',
    badgeTextAr: 'العشر الأواخر · خيرٌ من ألف شهر',
    subtitleAr: 'سماء الليالي الوترية المرصعة بالنجوم والسكينة',
    descriptionAr:
      'يكتسي المحراب بلون الليل الكحلي المذهّب مع تلألؤ النجوم الهادئ إحياءً لليالي العشر الأواخر.',
    sunnahDeedsAr: [
      'تحرّي ليلة القدر في الليالي الوترية من العشر الأواخر',
      'إحياء الليل بالصلاة وتلاوة القرآن والاعتكاف والصدقة',
      'الإكثار من دعاء العفو المأثور عن النبي ﷺ',
    ],
    duaOrDhikrAr:
      '«اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي»',
    recommendedTab: 'duas',
    recommendedTabLabelAr: 'جوامع الدعاء والأحاديث',
  },
  hajj_arafah: {
    id: 'hajj_arafah',
    titleAr: 'عشر ذي الحجة ويوم عرفة',
    badgeTextAr: 'عشر ذي الحجة · لبيك اللهم لبيك',
    subtitleAr: 'تجلّي الكعبة المشرفة بالحزام الذهبي داخل المحراب',
    descriptionAr:
      'تظهر الكعبة المشرفة بحزامها الذهبي في قلب المحراب تذكيراً بأعظم أيام الدنيا ويوم عرفة.',
    sunnahDeedsAr: [
      'الإكثار من التهليل والتكبير والتحميد في الأيام العشر',
      'صيام يوم عرفة لغير الحاج (يكفّر السنة الماضية والباقية)',
      'الاجتهاد في الدعاء والذكر عشية يوم عرفة',
    ],
    duaOrDhikrAr:
      '«لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ»',
    recommendedTab: 'adhkar',
    recommendedTabLabelAr: 'التكبير وأذكار المسلم',
  },
  eid: {
    id: 'eid',
    titleAr: 'عيد الفطر وعيد الأضحى المبارك',
    badgeTextAr: 'عيدكم مبارك · تقبل الله طاعتكم',
    subtitleAr: 'إشراقة العيد الذهبية وزخارف البهجة الإسلامية',
    descriptionAr:
      'يتألق المحراب بهالة ذهبية مشرقة ونجوم احتفالية بهيجة بمناسبة حلول عيد المسلمين.',
    sunnahDeedsAr: [
      'التكبير من ليلة العيد حتى صلاة العيد',
      'الاغتسال والتطيب ولبس أحسن الثياب وشهود مصلى العيد',
      'صلة الأرحام وإدخال السرور على الأهل والمسلمين',
    ],
    duaOrDhikrAr:
      '«تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ صَالِحَ الأَعْمَالِ»',
    recommendedTab: 'prayers',
    recommendedTabLabelAr: 'مواقيت الصلاة والسنن',
  },
  jumuah: {
    id: 'jumuah',
    titleAr: 'يوم الجمعة المبارك',
    badgeTextAr: 'جمعة مباركة · الكهف والصلاة على النبي ﷺ',
    subtitleAr: 'نور الجمعة الأسبوعي ومشكاة المحراب المضيئة',
    descriptionAr:
      'يتوهج المحراب بمشكاة نورانية زمردية وذهبية كل يوم جمعة لتذكير المسلم بسنن خير يوم طلعت عليه الشمس.',
    sunnahDeedsAr: [
      'قراءة سورة الكهف والإكثار من الصلاة والسلام على النبي ﷺ',
      'الاغتسال والتطيب والتبكير إلى المسجد والإنصات للخطبة',
      'تحرّي ساعة الاستجابة في آخر ساعة بعد العصر قبل الغروب',
    ],
    duaOrDhikrAr:
      '«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
    recommendedTab: 'quran',
    recommendedTabLabelAr: 'قراءة سورة الكهف في المصحف',
  },
  white_days: {
    id: 'white_days',
    titleAr: 'الأيام البيض (١٣ و ١٤ و ١٥ هـ)',
    badgeTextAr: 'الأيام البيض · وصية النبي ﷺ بالصيام',
    subtitleAr: 'اكتمال البدر المضيء في قلب المحراب',
    descriptionAr:
      'يتحول الهلال في المحراب إلى بدرٍ مكتمل مضيء خلال أيام ١٣ و ١٤ و ١٥ من كل شهر هجري تذكيراً بصيامها.',
    sunnahDeedsAr: [
      'صيام الأيام البيض الثلاثة (كصيام الدهر في الأجر)',
      'الجمع بين عبادتي الصيام بالنهار والقيام بالليل',
      'الدعاء عند الفطر والإكثار من الصدقة والذكر',
    ],
    duaOrDhikrAr:
      '«أوصاني خليلي ﷺ بثلاث: صيام ثلاثة أيام من كل شهر، وركعتي الضحى، وأن أوتر قبل أن أنام»',
    recommendedTab: 'duas',
    recommendedTabLabelAr: 'الأحاديث النبوية في فضل الصيام',
  },
  ashura_muharram: {
    id: 'ashura_muharram',
    titleAr: 'شهر الله المحرّم ويوم عاشوراء',
    badgeTextAr: 'شهر الله المحرّم · يوم عاشوراء',
    subtitleAr: 'إشراقة العام الهجري وصيام يوم عاشوراء',
    descriptionAr:
      'توهج ذهبي هادئ في مطلع العام الهجري ويوم العاشر من محرم تذكيراً بأفضل الصيام بعد رمضان.',
    sunnahDeedsAr: [
      'صيام يوم عاشوراء (العاشر من محرم) ويوم تاسوعاء (التاسع)',
      'الإكثار من صيام التطوع في شهر الله المحرّم',
      'استفتاح العام بالتوبة النصوح وتجديد النية في الطاعات',
    ],
    duaOrDhikrAr:
      '«صِيَامُ يَوْمِ عَاشُورَاءَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ»',
    recommendedTab: 'prayers',
    recommendedTabLabelAr: 'التقويم الهجري والمواقيت',
  },
};

export function detectAutoSeasonalOccasion(
  hijri: HijriDate,
  now: Date = new Date()
): Exclude<SeasonalOccasionId, 'auto'> {
  const { day, monthIndex: monthNumber } = hijri;
  const isFriday = now.getDay() === 5;

  // 1. Eid al-Fitr (1-3 Shawwal) or Eid al-Adha (10-13 Dhul-Hijjah)
  if (
    (monthNumber === 10 && day >= 1 && day <= 3) ||
    (monthNumber === 12 && day >= 10 && day <= 13)
  ) {
    return 'eid';
  }

  // 2. Last 10 nights of Ramadan (21-30 Ramadan)
  if (monthNumber === 9 && day >= 21) {
    return 'laylat_al_qadr';
  }

  // 3. Ramadan (1-20 Ramadan)
  if (monthNumber === 9 && day >= 1 && day <= 20) {
    return 'ramadan';
  }

  // 4. First 9 days of Dhul-Hijjah & Day of Arafah (1-9 Dhul-Hijjah)
  if (monthNumber === 12 && day >= 1 && day <= 9) {
    return 'hajj_arafah';
  }

  // 5. Ashura & New Hijri Year (1-10 Muharram)
  if (monthNumber === 1 && (day === 1 || (day >= 9 && day <= 11))) {
    return 'ashura_muharram';
  }

  // 6. White Days (13, 14, 15 of every Hijri month)
  if (day >= 13 && day <= 15) {
    return 'white_days';
  }

  // 7. Weekly Friday (Yawm al-Jumu'ah)
  if (isFriday) {
    return 'jumuah';
  }

  return 'default';
}

interface SeasonalMihrabLogoProps {
  todayHijri: HijriDate;
  onNavigateTab: (tab: 'prayers' | 'quran' | 'adhkar' | 'duas' | 'qibla') => void;
}

export const SeasonalMihrabLogo: React.FC<SeasonalMihrabLogoProps> = ({
  todayHijri,
  onNavigateTab,
}) => {
  const [selectedMode, setSelectedMode] = useState<SeasonalOccasionId>(() => {
    try {
      const saved = localStorage.getItem(SEASONAL_STORAGE_KEY);
      if (saved && (saved === 'auto' || saved in SEASONAL_OCCASIONS)) {
        return saved as SeasonalOccasionId;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SEASONAL_STORAGE_KEY, selectedMode);
    } catch {
      // ignore
    }
  }, [selectedMode]);

  const autoDetectedId = useMemo(
    () => detectAutoSeasonalOccasion(todayHijri),
    [todayHijri]
  );

  const activeOccasionId: Exclude<SeasonalOccasionId, 'auto'> =
    selectedMode === 'auto' ? autoDetectedId : selectedMode;

  const meta = SEASONAL_OCCASIONS[activeOccasionId];

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {/* Main Brand & Animated Seasonal Mihrab Emblem */}
        <button
          type="button"
          data-testid="seasonal-mihrab-logo-btn"
          onClick={() => setIsModalOpen(true)}
          title={`${meta.titleAr} — اضغط لعرض مناسبة اليوم ومعاينة تأثيرات المواسم الدينية`}
          className="flex items-center gap-2.5 shrink-0 group text-right cursor-pointer focus:outline-none"
        >
          {/* Dynamic SVG Emblem */}
          <div
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-xs border transition-all duration-300 flex items-center justify-center overflow-hidden shrink-0 ${
              activeOccasionId === 'laylat_al_qadr'
                ? 'bg-[#091E26] border-[#FDE68A]/50 shadow-amber-500/10'
                : activeOccasionId === 'eid'
                  ? 'bg-[#14532D] border-[#F59E0B] ring-2 ring-[#FDE68A]/40'
                  : activeOccasionId === 'hajj_arafah'
                    ? 'bg-[#111827] border-[#F59E0B]/70'
                    : 'bg-[#14532D] border-[#14532D]/30 group-hover:border-[#F59E0B]/70'
            }`}
          >
            <svg
              viewBox="0 0 64 64"
              className="w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="mihrabGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="55%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
                <radialGradient id="lanternGlow" cx="50%" cy="45%" r="50%">
                  <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Soft internal glow for special occasions */}
              {activeOccasionId !== 'default' && (
                <circle
                  cx="32"
                  cy="30"
                  r="22"
                  fill="url(#lanternGlow)"
                  className="animate-pulse"
                />
              )}

              {/* Outer Mihrab Arch */}
              <path
                d="M12 56 L12 30 C12 17 21 9 32 6 C43 9 52 17 52 30 L52 56 Z"
                fill={
                  activeOccasionId === 'laylat_al_qadr'
                    ? '#06151C'
                    : activeOccasionId === 'hajj_arafah'
                      ? '#0B131E'
                      : '#0A2E19'
                }
                stroke="url(#mihrabGold)"
                strokeWidth="2.6"
              />

              {/* Occasion-Specific Centerpiece */}
              {activeOccasionId === 'ramadan' && (
                /* Glowing Ramadan Fanous (Lantern) + Crescent */
                <g>
                  <line
                    x1="32"
                    y1="8"
                    x2="32"
                    y2="17"
                    stroke="#FDE68A"
                    strokeWidth="1.5"
                  />
                  {/* Fanous dome & body */}
                  <polygon
                    points="27,17 37,17 40,23 24,23"
                    fill="url(#mihrabGold)"
                  />
                  <polygon
                    points="25,23 39,23 37,37 27,37"
                    fill="#FDE68A"
                    fillOpacity="0.9"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                    className="animate-pulse"
                  />
                  <polygon
                    points="26,37 38,37 35,41 29,41"
                    fill="url(#mihrabGold)"
                  />
                  {/* Small Crescent at bottom */}
                  <path
                    d="M35 50 A5 5 0 1 1 29 45 A4 4 0 1 0 35 50 Z"
                    fill="#FDE68A"
                  />
                </g>
              )}

              {activeOccasionId === 'laylat_al_qadr' && (
                /* Twinkling Stars + Crescent + Open Quran */
                <g>
                  <circle
                    cx="22"
                    cy="20"
                    r="1.4"
                    fill="#FDE68A"
                    className="animate-ping"
                  />
                  <circle
                    cx="42"
                    cy="18"
                    r="1.3"
                    fill="#FDE68A"
                    className="animate-pulse"
                  />
                  <circle cx="20" cy="32" r="1.1" fill="#FDE68A" />
                  <circle cx="44" cy="30" r="1.2" fill="#FDE68A" />
                  <path
                    d="M36 25 A6.5 6.5 0 1 1 28 17 A5.2 5.2 0 1 0 36 25 Z"
                    fill="url(#mihrabGold)"
                  />
                  <path
                    d="M20 45 Q26 42 32 45 Q38 42 44 45 L44 36 Q38 33 32 36 Q26 33 20 36 Z"
                    fill="url(#mihrabGold)"
                  />
                </g>
              )}

              {activeOccasionId === 'hajj_arafah' && (
                /* Kaaba Silhouette with Golden Kiswah Belt */
                <g>
                  <rect
                    x="21"
                    y="22"
                    width="22"
                    height="24"
                    rx="1.5"
                    fill="#111827"
                    stroke="#FDE68A"
                    strokeWidth="1.4"
                  />
                  {/* Golden Kiswah Band */}
                  <rect
                    x="21"
                    y="27"
                    width="22"
                    height="4.5"
                    fill="url(#mihrabGold)"
                  />
                  {/* Kaaba Door */}
                  <rect
                    x="34"
                    y="35"
                    width="4.5"
                    height="8"
                    rx="0.8"
                    fill="url(#mihrabGold)"
                  />
                </g>
              )}

              {activeOccasionId === 'eid' && (
                /* Festive 8-Point Islamic Star & Crescent */
                <g>
                  <rect
                    x="24"
                    y="20"
                    width="16"
                    height="16"
                    fill="url(#mihrabGold)"
                    transform="rotate(45 32 28)"
                  />
                  <rect
                    x="24"
                    y="20"
                    width="16"
                    height="16"
                    fill="url(#mihrabGold)"
                  />
                  <circle cx="32" cy="28" r="5" fill="#0A2E19" />
                  <circle
                    cx="32"
                    cy="28"
                    r="2.5"
                    fill="#FDE68A"
                    className="animate-ping"
                  />
                  <path
                    d="M21 48 Q26.5 45 32 48 Q37.5 45 43 48"
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {activeOccasionId === 'white_days' && (
                /* Full Luminous Badr Moon + Open Mushaf */
                <g>
                  <circle
                    cx="32"
                    cy="23"
                    r="7.5"
                    fill="#FDE68A"
                    className="animate-pulse"
                  />
                  <circle
                    cx="32"
                    cy="23"
                    r="9.5"
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M20 46 Q26 43 32 46 Q38 43 44 46 L44 36 Q38 33 32 36 Q26 33 20 36 Z"
                    fill="url(#mihrabGold)"
                  />
                </g>
              )}

              {(activeOccasionId === 'default' ||
                activeOccasionId === 'jumuah' ||
                activeOccasionId === 'ashura_muharram') && (
                /* Classic Mihrab with Hanging Crescent & Open Mushaf (+ Jumuah / Ashura Rays) */
                <g>
                  <line
                    x1="32"
                    y1="8"
                    x2="32"
                    y2="16"
                    stroke="url(#mihrabGold)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M35.5 23 A5.8 5.8 0 1 1 28.5 16 A4.6 4.6 0 1 0 35.5 23 Z"
                    fill="url(#mihrabGold)"
                  />
                  {activeOccasionId !== 'default' && (
                    <circle
                      cx="32"
                      cy="20"
                      r="9"
                      fill="none"
                      stroke="#FDE68A"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}
                  <path
                    d="M20 45 Q26 42 32 45 Q38 42 44 45 L44 35 Q38 32 32 35 Q26 32 20 35 Z"
                    fill="url(#mihrabGold)"
                  />
                </g>
              )}
            </svg>

            {/* Small indicator dot showing interactive seasonal feature */}
            <span
              className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-white"
              aria-hidden="true"
            />
          </div>

          {/* Brand Wordmark + Dynamic Occasion Subtitle */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap group-hover:text-[#14532D] transition-colors">
                المحراب
              </span>
              <span
                data-testid="seasonal-logo-badge-text"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#14532D] whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 text-[#B45309] shrink-0" />
                <span>{meta.badgeTextAr}</span>
              </span>
            </div>
            <span className="hidden xl:block text-[11px] text-stone-500 font-medium leading-tight mt-0.5 whitespace-nowrap">
              {meta.subtitleAr}
            </span>
          </div>
        </button>
      </div>

      {/* Interactive Seasonal Occasion & Logo Effect Preview Modal */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            aria-label="تأثيرات شعار المحراب والمناسبات الدينية"
            data-testid="seasonal-logo-modal"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-[#FBF9F5] border border-stone-200 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 bg-[#14532D] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#FDE68A]/35 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#FDE68A]" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold">
                      شعار المحراب التفاعلي والمواسم الإيمانية
                    </h2>
                    <p className="text-[11px] sm:text-xs text-stone-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FDE68A]" />
                      <span>
                        التاريخ الهجري اليوم: {toArabicNumerals(todayHijri.day)}{' '}
                        {todayHijri.monthNameAr} {toArabicNumerals(todayHijri.year)} هـ
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="إغلاق"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Active Occasion Spotlight Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-[#78350F] block">
                        التأثير النشط حالياً على الشعار:
                      </span>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-[#14532D]">
                        {meta.titleAr}
                      </h3>
                    </div>
                    <span className="text-xs text-stone-500">
                      {selectedMode === 'auto'
                        ? 'وضع تلقائي حسب التقويم الهجري'
                        : 'وضع معاينة مخصص'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    {meta.descriptionAr}
                  </p>

                  {/* Recommended Sunnah Deeds for this Occasion */}
                  <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-stone-200/80 space-y-2">
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-[#14532D]" />
                      <span>أبرز السنن والأعمال المستحبة في هذه المناسبة:</span>
                    </div>
                    <ul className="text-xs text-stone-700 space-y-1.5 list-disc list-inside leading-relaxed">
                      {meta.sunnahDeedsAr.map((deed, idx) => (
                        <li key={idx}>{deed}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Featured Dua / Dhikr */}
                  <div className="p-3.5 rounded-xl bg-[#14532D]/8 border border-[#14532D]/20 text-center space-y-1">
                    <span className="text-[11px] text-[#78350F] font-semibold block">
                      الذكر أو الدعاء المأثور:
                    </span>
                    <p className="font-quran text-base sm:text-lg text-[#14532D] font-bold leading-relaxed">
                      {meta.duaOrDhikrAr}
                    </p>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab(meta.recommendedTab);
                        setIsModalOpen(false);
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>انتقل إلى: {meta.recommendedTabLabelAr}</span>
                    </button>
                  </div>
                </div>

                {/* Seasonal Effects Switcher Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm sm:text-base font-bold text-stone-900">
                      معاينة وتخصيص تأثيرات الشعار مع الأحداث الدينية:
                    </h4>
                    {selectedMode !== 'auto' && (
                      <button
                        type="button"
                        onClick={() => setSelectedMode('auto')}
                        className="text-xs font-bold text-[#14532D] hover:underline cursor-pointer"
                      >
                        العودة للوضع التلقائي حسب التاريخ الهجري
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Auto Option */}
                    <button
                      type="button"
                      data-testid="season-mode-auto"
                      onClick={() => setSelectedMode('auto')}
                      className={`p-3 rounded-xl border text-right transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        selectedMode === 'auto'
                          ? 'bg-[#14532D] text-white border-[#14532D]'
                          : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">
                          تلقائي حسب التقويم الهجري والجمعة
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            selectedMode === 'auto'
                              ? 'text-[#FDE68A]'
                              : 'text-stone-500'
                          }`}
                        >
                          يتغير تلقائياً مع كل مناسبة دينية
                        </div>
                      </div>
                      {selectedMode === 'auto' && (
                        <Check className="w-4 h-4 text-[#FDE68A] shrink-0" />
                      )}
                    </button>

                    {/* All 8 Occasions */}
                    {(
                      Object.keys(SEASONAL_OCCASIONS) as Array<
                        Exclude<SeasonalOccasionId, 'auto'>
                      >
                    ).map((id) => {
                      const item = SEASONAL_OCCASIONS[id];
                      const isSelected = selectedMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          data-testid={`season-mode-${id}`}
                          onClick={() => setSelectedMode(id)}
                          className={`p-3 rounded-xl border text-right transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#14532D] text-white border-[#14532D]'
                              : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{item.titleAr}</div>
                            <div
                              className={`text-[11px] mt-0.5 ${
                                isSelected ? 'text-[#FDE68A]' : 'text-stone-500'
                              }`}
                            >
                              {item.badgeTextAr}
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-[#FDE68A] shrink-0" />
                          ) : (
                            <Heart className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
