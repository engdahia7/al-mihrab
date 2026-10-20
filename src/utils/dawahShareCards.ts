import { toArabicNumerals, sanitizeQuranicText } from './astronomy';

export type DawahCardCategory = 'ayah' | 'dhikr' | 'dua' | 'asma' | 'waqf';
export type DawahCardThemeId = 'parchment' | 'emerald' | 'night' | 'makkah_gold';
export type DawahCardAspectRatio = 'square' | 'story';

export type WaqfDedicationCategory =
  | 'general_lillah'
  | 'deceased_male'
  | 'deceased_female'
  | 'parents_mercy'
  | 'parents_blessing'
  | 'family_all';

export interface WaqfDedicationConfig {
  enabled: boolean;
  category: WaqfDedicationCategory;
  recipientName: string;
  customDuaAr: string;
  includeOnShareCards: boolean;
}

export const WAQF_DEDICATION_STORAGE_KEY = 'almihrab_waqf_dedication_v1';

export const WAQF_DEDICATION_PRESETS: {
  id: WaqfDedicationCategory;
  labelAr: string;
  badgeTitleAr: string;
  defaultDuaAr: string;
  placeholderNameAr: string;
}[] = [
  {
    id: 'general_lillah',
    labelAr: 'خالصاً لوجه الله تعالى وعامة المسلمين',
    badgeTitleAr: 'وقفٌ خالصٌ لوجه الله تعالى',
    defaultDuaAr:
      'اللهم تقبّل هذا العمل خالصاً لوجهك الكريم، واجعله نوراً وهدايةً وصدقةً جاريةً لنا ولوالدينا ولجميع المسلمين.',
    placeholderNameAr: 'عموم المسلمين والمسلمات',
  },
  {
    id: 'deceased_male',
    labelAr: 'صدقة جارية عن روح متوفى (رحمه الله)',
    badgeTitleAr: 'صدقةٌ جاريةٌ ووقفٌ عن روح المغفور له بإذن الله',
    defaultDuaAr:
      'اللهم اغفر له وارحمه، وعافه واعفُ عنه، وأكرم نزله، ووسّع مدخله، واجعل قبره روضةً من رياض الجنة، واجعل ثواب ما يُقرأ في هذا المحراب نوراً ورفعةً له في الفردوس الأعلى.',
    placeholderNameAr: 'مثال: والدي الحبيب / فلان بن فلان رحمه الله',
  },
  {
    id: 'deceased_female',
    labelAr: 'صدقة جارية عن روح متوفاة (رحمها الله)',
    badgeTitleAr: 'صدقةٌ جاريةٌ ووقفٌ عن روح المغفور لها بإذن الله',
    defaultDuaAr:
      'اللهم اغفر لها وارحمها، وعافها واعفُ عنها، وأكرم نزلها، ووسّع مدخلها، واجعل قبرها روضةً من رياض الجنة، واجعل ثواب ما يُقرأ في هذا المحراب نوراً ورفعةً لها في الفردوس الأعلى.',
    placeholderNameAr: 'مثال: والدتي الغالية / فلانة بنت فلان رحمها الله',
  },
  {
    id: 'parents_mercy',
    labelAr: 'وقفٌ وبرٌّ بالوالدين (رحمهما الله)',
    badgeTitleAr: 'صدقةٌ جاريةٌ وبرٌّ بالوالدين الكريمين',
    defaultDuaAr:
      'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا — اللهم اغفر لوالديّ وارحمهما، واجزهما عنّا خير الجزاء، واجمعنا بهما في الفردوس الأعلى من الجنة بغير حساب.',
    placeholderNameAr: 'مثال: والديّ الكريمين رحمهما الله',
  },
  {
    id: 'parents_blessing',
    labelAr: 'برٌّ بالوالدين (حفظهما الله وأطال عمرهما)',
    badgeTitleAr: 'وقفٌ وبرٌّ بالوالدين الكريمين',
    defaultDuaAr:
      'اللهم احفظ والديّ بحفظك، وأطل في عمرهما على طاعتك، وألبسهما ثوب الصحة والعافية، واختم بالصالحات أعمالهما، وارزقنا برّهما ورضاهما.',
    placeholderNameAr: 'مثال: والديّ الغاليين حفظهما الله',
  },
  {
    id: 'family_all',
    labelAr: 'عن الأسرة والأحبة وأموات المسلمين',
    badgeTitleAr: 'صدقةٌ جاريةٌ عن الأسرة وأموات المسلمين',
    defaultDuaAr:
      'اللهم اغفر للمؤمنين والمؤمنات، والمسلمين والمسلمات، الأحياء منهم والأموات، واجعل هذا العمل خالصاً لوجهك الكريم.',
    placeholderNameAr: 'مثال: أسرتنا الكريمة وجميع موتانا وموتى المسلمين',
  },
];

export const DEFAULT_WAQF_DEDICATION: WaqfDedicationConfig = {
  enabled: false,
  category: 'general_lillah',
  recipientName: '',
  customDuaAr: WAQF_DEDICATION_PRESETS[0].defaultDuaAr,
  includeOnShareCards: true,
};

export function loadWaqfDedicationConfig(): WaqfDedicationConfig {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseWaqfFromSearchParams(params);
    if (fromUrl) {
      try {
        localStorage.setItem(WAQF_DEDICATION_STORAGE_KEY, JSON.stringify(fromUrl));
      } catch {
        // ignore
      }
      return fromUrl;
    }

    try {
      const raw = localStorage.getItem(WAQF_DEDICATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_WAQF_DEDICATION,
            ...parsed,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_WAQF_DEDICATION;
}

export function saveWaqfDedicationConfig(config: WaqfDedicationConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WAQF_DEDICATION_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function parseWaqfFromSearchParams(
  params: URLSearchParams
): WaqfDedicationConfig | null {
  const waqfName = params.get('waqf_name')?.trim();
  const waqfCat = params.get('waqf_cat') as WaqfDedicationCategory | null;
  const waqfDua = params.get('waqf_dua')?.trim();

  if (!waqfName && !waqfCat) return null;

  const matchedPreset =
    WAQF_DEDICATION_PRESETS.find((p) => p.id === waqfCat) ||
    WAQF_DEDICATION_PRESETS[1];

  return {
    enabled: true,
    category: matchedPreset.id,
    recipientName: waqfName || '',
    customDuaAr: waqfDua || matchedPreset.defaultDuaAr,
    includeOnShareCards: true,
  };
}

export function buildWaqfShareUrl(
  baseUrl: string,
  config: WaqfDedicationConfig
): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.delete('widget');
    if (config.enabled && (config.recipientName.trim() || config.category !== 'general_lillah')) {
      url.searchParams.set('waqf_cat', config.category);
      if (config.recipientName.trim()) {
        url.searchParams.set('waqf_name', config.recipientName.trim());
      }
      if (config.customDuaAr.trim()) {
        url.searchParams.set('waqf_dua', config.customDuaAr.trim().slice(0, 260));
      }
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function formatWaqfDedicationLineAr(config: WaqfDedicationConfig): string {
  if (!config.enabled) {
    return 'صدقةٌ جاريةٌ خالصةٌ لوجه الله · لا تنسونا من صالح دعائكم';
  }
  const preset =
    WAQF_DEDICATION_PRESETS.find((p) => p.id === config.category) ||
    WAQF_DEDICATION_PRESETS[0];
  const name = config.recipientName.trim();
  if (!name) {
    return `${preset.badgeTitleAr} · لا تنسونا من صالح دعائكم`;
  }
  return `${preset.badgeTitleAr}: ${name}`;
}

export interface DawahShareCardPayload {
  category: DawahCardCategory;
  headerBadgeAr: string;
  titleAr: string;
  mainArabicText: string;
  explanationOrVirtueAr?: string;
  sourceAndGradingAr?: string;
  waqfDedicationLineAr?: string;
}

interface CardThemePalette {
  id: DawahCardThemeId;
  nameAr: string;
  bgPrimary: string;
  bgSecondary: string;
  outerBorder: string;
  innerBorder: string;
  headerBg: string;
  headerText: string;
  titleColor: string;
  mainTextColor: string;
  explanationLabelColor: string;
  explanationTextColor: string;
  dividerColor: string;
  waqfBoxBg: string;
  waqfBoxBorder: string;
  waqfBoxText: string;
  footerText: string;
}

export const DAWAH_CARD_THEMES: Record<DawahCardThemeId, CardThemePalette> = {
  parchment: {
    id: 'parchment',
    nameAr: 'مخطوطة المحراب (كريمي)',
    bgPrimary: '#FAF5E8',
    bgSecondary: '#F3EBD8',
    outerBorder: '#14532D',
    innerBorder: '#B59E7A',
    headerBg: '#14532D',
    headerText: '#FDE68A',
    titleColor: '#78350F',
    mainTextColor: '#1C1917',
    explanationLabelColor: '#78350F',
    explanationTextColor: '#292524',
    dividerColor: '#C8B696',
    waqfBoxBg: '#EFE4CE',
    waqfBoxBorder: '#B59E7A',
    waqfBoxText: '#14532D',
    footerText: '#57534E',
  },
  emerald: {
    id: 'emerald',
    nameAr: 'روضة المسجد (زمردي)',
    bgPrimary: '#0D381E',
    bgSecondary: '#14532D',
    outerBorder: '#D97706',
    innerBorder: '#FDE68A',
    headerBg: '#092614',
    headerText: '#FDE68A',
    titleColor: '#FCD34D',
    mainTextColor: '#FFFFFF',
    explanationLabelColor: '#FDE68A',
    explanationTextColor: '#E7E5E4',
    dividerColor: '#B45309',
    waqfBoxBg: '#092614',
    waqfBoxBorder: '#D97706',
    waqfBoxText: '#FDE68A',
    footerText: '#D6D3D1',
  },
  night: {
    id: 'night',
    nameAr: 'ليالي الوحي (كحلي داكن)',
    bgPrimary: '#0F172A',
    bgSecondary: '#1E293B',
    outerBorder: '#B59E7A',
    innerBorder: '#475569',
    headerBg: '#1E293B',
    headerText: '#FDE68A',
    titleColor: '#FCD34D',
    mainTextColor: '#F8FAFC',
    explanationLabelColor: '#FDE68A',
    explanationTextColor: '#CBD5E1',
    dividerColor: '#475569',
    waqfBoxBg: '#1E293B',
    waqfBoxBorder: '#B59E7A',
    waqfBoxText: '#FDE68A',
    footerText: '#94A3B8',
  },
  makkah_gold: {
    id: 'makkah_gold',
    nameAr: 'فجر مكة المذهّب (فاخر)',
    bgPrimary: '#2A1808',
    bgSecondary: '#451A03',
    outerBorder: '#F59E0B',
    innerBorder: '#FDE68A',
    headerBg: '#78350F',
    headerText: '#FEF3C7',
    titleColor: '#FCD34D',
    mainTextColor: '#FFFBEB',
    explanationLabelColor: '#FDE68A',
    explanationTextColor: '#FDE68A',
    dividerColor: '#D97706',
    waqfBoxBg: '#1C1006',
    waqfBoxBorder: '#F59E0B',
    waqfBoxText: '#FDE68A',
    footerText: '#E7E5E4',
  },
};

/**
 * Generates a high-resolution PNG Data URL for sharing an Ayah, Dhikr, Dua, Asma Allah, or Waqf Dedication card.
 */
export function generateDawahCardDataUrl(
  payload: DawahShareCardPayload,
  options?: {
    theme?: DawahCardThemeId;
    aspectRatio?: DawahCardAspectRatio;
  }
): string | null {
  if (typeof document === 'undefined') return null;

  const themeId = options?.theme || 'parchment';
  const aspectRatio = options?.aspectRatio || 'square';
  const palette = DAWAH_CARD_THEMES[themeId] || DAWAH_CARD_THEMES.parchment;

  const width = 1080;
  const height = aspectRatio === 'story' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, palette.bgPrimary);
  grad.addColorStop(1, palette.bgSecondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Architectural Double Frame
  const padOuter = 36;
  const padInner = 54;
  ctx.strokeStyle = palette.outerBorder;
  ctx.lineWidth = 10;
  ctx.strokeRect(padOuter, padOuter, width - padOuter * 2, height - padOuter * 2);

  ctx.strokeStyle = palette.innerBorder;
  ctx.lineWidth = 3;
  ctx.strokeRect(padInner, padInner, width - padInner * 2, height - padInner * 2);

  // Corner ornamental accents & subtle Mihrab Arch watermark
  const cornerSize = 22;
  ctx.fillStyle = palette.outerBorder;
  [
    [padInner, padInner],
    [width - padInner - cornerSize, padInner],
    [padInner, height - padInner - cornerSize],
    [width - padInner - cornerSize, height - padInner - cornerSize],
  ].forEach(([cx, cy]) => {
    ctx.fillRect(cx, cy, cornerSize, cornerSize);
  });

  // Subtle architectural Mihrab pointed arch behind the text
  ctx.save();
  ctx.strokeStyle = palette.innerBorder;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const archLeft = 110;
  const archRight = width - 110;
  const archTop = aspectRatio === 'story' ? 235 : 195;
  const archShoulderY = aspectRatio === 'story' ? 420 : 340;
  const archBottom = height - (aspectRatio === 'story' ? 270 : 200);
  ctx.moveTo(archLeft, archBottom);
  ctx.lineTo(archLeft, archShoulderY);
  ctx.quadraticCurveTo(archLeft, archTop + 30, width / 2, archTop);
  ctx.quadraticCurveTo(archRight, archTop + 30, archRight, archShoulderY);
  ctx.lineTo(archRight, archBottom);
  ctx.stroke();
  ctx.restore();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  // 3. Top Header Banner
  const headerY = aspectRatio === 'story' ? 120 : 86;
  const headerH = 92;
  ctx.fillStyle = palette.headerBg;
  ctx.fillRect(88, headerY, width - 176, headerH);
  ctx.strokeStyle = palette.innerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(88, headerY, width - 176, headerH);

  ctx.fillStyle = palette.headerText;
  ctx.font = 'bold 34px "Amiri Quran", "Amiri", serif';
  ctx.fillText(payload.headerBadgeAr, width / 2, headerY + 58);

  // Word-wrap helper
  const wrapArabicLines = (
    text: string,
    maxWidth: number,
    fontSpec: string,
    maxLines: number
  ): string[] => {
    ctx.font = fontSpec;
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length >= maxLines - 1) break;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    return lines;
  };

  let cursorY = headerY + headerH + (aspectRatio === 'story' ? 90 : 60);

  // 4. Optional Title (for Dua / Dhikr / Waqf)
  if (payload.titleAr && payload.category !== 'ayah') {
    ctx.fillStyle = palette.titleColor;
    ctx.font = 'bold 34px "Amiri Quran", "Amiri", serif';
    ctx.fillText(payload.titleAr, width / 2, cursorY);
    cursorY += aspectRatio === 'story' ? 75 : 58;
  }

  // 5. Main Arabic Text (Ayah / Dhikr / Dua / Waqf Recipient)
  const cleanMain = sanitizeQuranicText(payload.mainArabicText);
  const formattedMain =
    payload.category === 'ayah' ? `﴿ ${cleanMain} ﴾` : `« ${cleanMain} »`;

  const mainFontSize =
    cleanMain.length > 260 ? 36 : cleanMain.length > 140 ? 42 : 48;
  const mainLineHeight = Math.round(mainFontSize * 1.68);
  const maxMainLines = aspectRatio === 'story' ? 11 : 6;

  const mainLines = wrapArabicLines(
    formattedMain,
    860,
    `bold ${mainFontSize}px "Amiri Quran", "Amiri", serif`,
    maxMainLines
  );

  ctx.fillStyle = palette.mainTextColor;
  ctx.font = `bold ${mainFontSize}px "Amiri Quran", "Amiri", serif`;
  for (const line of mainLines) {
    ctx.fillText(line, width / 2, cursorY);
    cursorY += mainLineHeight;
  }

  // 6. Divider
  const minDividerY = aspectRatio === 'story' ? 920 : 545;
  const dividerY = Math.max(cursorY + 12, minDividerY);
  ctx.strokeStyle = palette.dividerColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, dividerY);
  ctx.lineTo(width - 160, dividerY);
  ctx.stroke();

  let lowerY = dividerY + (aspectRatio === 'story' ? 68 : 48);

  // 7. Explanation / Virtue / Tafsir
  if (payload.explanationOrVirtueAr) {
    const expLines = wrapArabicLines(
      payload.explanationOrVirtueAr,
      850,
      '28px "Amiri Quran", "Amiri", serif',
      aspectRatio === 'story' ? 7 : 4
    );
    ctx.fillStyle = palette.explanationTextColor;
    ctx.font = '28px "Amiri Quran", "Amiri", serif';
    for (const line of expLines) {
      ctx.fillText(line, width / 2, lowerY);
      lowerY += 48;
    }
  }

  if (payload.sourceAndGradingAr) {
    ctx.fillStyle = palette.explanationLabelColor;
    ctx.font = 'bold 24px "Amiri Quran", "Amiri", serif';
    ctx.fillText(payload.sourceAndGradingAr, width / 2, lowerY + 8);
    lowerY += 46;
  }

  // 8. Waqf & Sadaqah Jariyah Dedication Box at bottom
  const waqfLine =
    payload.waqfDedicationLineAr ||
    'في محراب الطاعة · صدقةٌ جاريةٌ خالصةٌ لوجه الله';
  const waqfBoxY = height - (aspectRatio === 'story' ? 250 : 185);
  const waqfBoxH = 68;

  ctx.fillStyle = palette.waqfBoxBg;
  ctx.fillRect(110, waqfBoxY, width - 220, waqfBoxH);
  ctx.strokeStyle = palette.waqfBoxBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(110, waqfBoxY, width - 220, waqfBoxH);

  ctx.fillStyle = palette.waqfBoxText;
  ctx.font = 'bold 25px "Amiri Quran", "Amiri", serif';
  ctx.fillText(waqfLine, width / 2, waqfBoxY + 44);

  // 9. App Brand & Slogan Footer
  ctx.fillStyle = palette.footerText;
  ctx.font = 'bold 22px "Amiri Quran", "Amiri", serif';
  ctx.fillText(
    `تطبيق المحراب · نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله.. لا تنسونا من صالح دعائكم`,
    width / 2,
    height - (aspectRatio === 'story' ? 110 : 76)
  );

  return canvas.toDataURL('image/png');
}

/**
 * Converts a PNG Data URL into a File object for Web Share API (`navigator.share({ files })`).
 */
export async function dataUrlToPngFile(
  dataUrl: string,
  fileName: string
): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: 'image/png' });
  } catch {
    return null;
  }
}

/**
 * Generates a dedicated Waqf Certificate Card Payload from a WaqfDedicationConfig.
 */
export function buildWaqfCertificateCardPayload(
  config: WaqfDedicationConfig,
  completedKhatmahsCount: number = 1
): DawahShareCardPayload {
  const preset =
    WAQF_DEDICATION_PRESETS.find((p) => p.id === config.category) ||
    WAQF_DEDICATION_PRESETS[0];

  const recipientLabel = config.recipientName.trim()
    ? config.recipientName.trim()
    : preset.placeholderNameAr;

  return {
    category: 'waqf',
    headerBadgeAr: 'وثيقة إهداء وصدقة جارية · تطبيق المحراب',
    titleAr: `${preset.badgeTitleAr}: ${recipientLabel}`,
    mainArabicText:
      config.customDuaAr.trim() || preset.defaultDuaAr,
    explanationOrVirtueAr:
      'إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا — كل ما يُتلى في هذا التطبيق من قرآنٍ كريم وأذكارٍ وأدعيةٍ صدقةٌ جاريةٌ خالصةٌ لوجه الله تعالى.',
    sourceAndGradingAr:
      completedKhatmahsCount > 0
        ? `الختمات المنجزة والمشاركة في الأجر: ${toArabicNumerals(completedKhatmahsCount)} · ما كان لله دام واتصل`
        : 'ما كان لله دام واتصل · تطبيقٌ خالصٌ لوجه الله',
    waqfDedicationLineAr: formatWaqfDedicationLineAr({
      ...config,
      enabled: true,
    }),
  };
}
