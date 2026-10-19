import {
  ALL_SURAHS,
  PRELOADED_MUSHAF_PAGES,
  PRELOADED_SURAHS,
  type MushafPageSurahBlock,
} from '../data/quranData.ts';
import { THEMATIC_QURAN_VERSES } from '../data/thematicAndNamesData.ts';
import { sanitizeQuranicText, stripLeadingBasmalah, toArabicNumerals } from './astronomy.ts';

export interface QuranSearchResult {
  id: string;
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  textUthmani: string;
  tafsirSnippet?: string;
}

export interface QuranWordMeaning {
  word: string;
  meaningAr: string;
}

export interface MemorizationLoopState {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  currentAyah: number;
  ayahRepeatTarget: number; // 1, 2, 3, 5
  currentAyahIteration: number; // 1..ayahRepeatTarget
  rangeRepeatTarget: number; // 1, 3, 5, 10, 0 (0 = infinite loop)
  currentRangeIteration: number; // 1..rangeRepeatTarget
}

export interface MemorizationLoopStepResult {
  finished: boolean;
  nextState: MemorizationLoopState;
}

/**
 * Strips Arabic diacritics (tashkeel), tatweel, Quranic stop marks, and normalizes
 * Uthmani spelling variations so users can search with plain unvocalized Arabic words.
 */
export function normalizeArabicForQuranSearch(input: string): string {
  if (!input) return '';
  let text = input
    // Remove Arabic harakat, dagger/superscript alef (U+0670), and Quranic annotation marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g, '')
    // Remove tatweel and zero-width characters
    .replace(/[\u0640\u200B-\u200F\uFEFF]/g, '')
    // Normalize all Alef forms (أ إ آ ٱ) to bare Alef (ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Alef Maqsura (ى) to Ya (ي)
    .replace(/ى/g, 'ي')
    // Normalize Ta Marbuta (ة) to Ha (ه)
    .replace(/ة/g, 'ه')
    // Normalize Hamza forms
    .replace(/[ؤئ]/g, 'ء')
    // Unify Uthmani and modern Imla'i spellings so both match seamlessly
    .replace(/الرحمان/g, 'الرحمن')
    .replace(/السماوات/g, 'السموات')
    .replace(/سماوات/g, 'سموات')
    .replace(/الاه/g, 'اله')
    .replace(/هاذا/g, 'هذا')
    .replace(/ذالك/g, 'ذلك')
    .replace(/اولاءك/g, 'اولءك')
    .replace(/الصلوه/g, 'الصلاه')
    .replace(/الزكوه/g, 'الزكاه')
    .replace(/الحيوه/g, 'الحياه')
    .replace(/الغدوه/g, 'الغداه')
    .replace(/مشكوه/g, 'مشكاه')
    .replace(/نجوه/g, 'نجاه')
    // Keep only Arabic letters, numbers, and spaces
    .replace(/[^\u0621-\u064A0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Built-in landmark verses so common searches work instantaneously offline (0ms)
 * even before full Mushaf pages are downloaded.
 */
const BUILTIN_SEARCH_LANDMARKS: QuranSearchResult[] = [
  {
    id: '2:255',
    surahNumber: 2,
    surahNameAr: 'البقرة',
    ayahNumber: 255,
    pageNumber: 42,
    textUthmani:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    tafsirSnippet: 'آية الكرسي — أعظم آية في كتاب الله، فيها توحيد الله وعظمته وإحاطة ملكه وعلمه.',
  },
  {
    id: '2:286',
    surahNumber: 2,
    surahNameAr: 'البقرة',
    ayahNumber: 286,
    pageNumber: 49,
    textUthmani:
      'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا',
    tafsirSnippet: 'خواتيم سورة البقرة — دين الله يسر لا مشقة فيه، ودعاء المؤمنين برفع الإصر والمغفرة.',
  },
  {
    id: '2:186',
    surahNumber: 2,
    surahNameAr: 'البقرة',
    ayahNumber: 186,
    pageNumber: 28,
    textUthmani:
      'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ۖ فَلْيَسْتَجِيبُوا لِي وَلْيُؤْمِنُوا بِي لَعَلَّهُمْ يَرْشُدُونَ',
    tafsirSnippet: 'قرب الله عز وجل من عباده وإجابته لدعائهم دون واسطة.',
  },
  {
    id: '24:35',
    surahNumber: 24,
    surahNameAr: 'النور',
    ayahNumber: 35,
    pageNumber: 354,
    textUthmani:
      'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۚ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ ۖ الْمِصْبَاحُ فِي زُجَاجَةٍ',
    tafsirSnippet: 'آية النور — الله هادي أهل السماوات والأرض ومنوّر قلوب المؤمنين بالإيمان والقرآن.',
  },
  {
    id: '39:53',
    surahNumber: 39,
    surahNameAr: 'الزمر',
    ayahNumber: 53,
    pageNumber: 464,
    textUthmani:
      'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ',
    tafsirSnippet: 'أرجى آية في القرآن الكريم؛ نداء إلهي بفتح باب التوبة والمغفرة لكل تائب.',
  },
  {
    id: '65:2',
    surahNumber: 65,
    surahNameAr: 'الطلاق',
    ayahNumber: 2,
    pageNumber: 558,
    textUthmani:
      'وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    tafsirSnippet: 'آية الفرج والرزق والكفاية لمن اتقى الله وتوكل عليه.',
  },
  {
    id: '94:5',
    surahNumber: 94,
    surahNameAr: 'الشرح',
    ayahNumber: 5,
    pageNumber: 596,
    textUthmani: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    tafsirSnippet: 'وعد الله الصادق بأن مع كل ضيق وشدة فرجاً ويسراً مضاعفاً.',
  },
  {
    id: '18:10',
    surahNumber: 18,
    surahNameAr: 'الكهف',
    ayahNumber: 10,
    pageNumber: 294,
    textUthmani:
      'إِذْ أَوَى الْفِتْيَةُ إِلَى الْكَهْفِ فَقَالُوا رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا',
    tafsirSnippet: 'دعاء فتية أصحاب الكهف بطلب الرحمة والرشاد والتوفيق.',
  },
  {
    id: '59:22',
    surahNumber: 59,
    surahNameAr: 'الحشر',
    ayahNumber: 22,
    pageNumber: 548,
    textUthmani:
      'هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ۖ عَالِمُ الْغَيْبِ وَالشَّهَادَةِ ۖ هُوَ الرَّحْمَٰنُ الرَّحِيمُ',
    tafsirSnippet: 'خواتيم سورة الحشر الجامعة لأسماء الله الحسنى وصفاته العلى.',
  },
];

/**
 * Instant synchronous search across loaded Mushaf pages, preloaded Surahs, thematic verses, and landmarks.
 */
export function searchQuranVersesLocal(
  rawQuery: string,
  pagesCache: Record<number, MushafPageSurahBlock[]> = PRELOADED_MUSHAF_PAGES
): QuranSearchResult[] {
  const normalizedQuery = normalizeArabicForQuranSearch(rawQuery);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const seenKeys = new Set<string>();
  const results: QuranSearchResult[] = [];

  const pushIfMatches = (item: QuranSearchResult, extraSearchText: string = '') => {
    const key = `${item.surahNumber}:${item.ayahNumber}`;
    if (seenKeys.has(key)) return;

    const haystack = normalizeArabicForQuranSearch(
      `${item.textUthmani} سوره ${item.surahNameAr} ${item.tafsirSnippet || ''} ${extraSearchText}`
    );

    const allMatch = queryTokens.every((token) => haystack.includes(token));
    if (allMatch) {
      seenKeys.add(key);
      results.push({
        ...item,
        textUthmani: sanitizeQuranicText(item.textUthmani),
      });
    }
  };

  // 1. Check loaded Mushaf pages
  for (const [pageStr, blocks] of Object.entries(pagesCache)) {
    const pageNum = Number(pageStr);
    for (const block of blocks) {
      const surahMeta = ALL_SURAHS.find((s) => s.number === block.surahNumber);
      const surahNameAr = surahMeta?.nameAr || '';
      for (const ayah of block.ayahs) {
        pushIfMatches({
          id: `${block.surahNumber}:${ayah.numberInSurah}`,
          surahNumber: block.surahNumber,
          surahNameAr,
          ayahNumber: ayah.numberInSurah,
          pageNumber: ayah.page || pageNum,
          textUthmani: sanitizeQuranicText(
            stripLeadingBasmalah(ayah.textUthmani, block.surahNumber, ayah.numberInSurah)
          ),
          tafsirSnippet: ayah.tafsirMuyassar,
        });
      }
    }
  }

  // 2. Check preloaded Surahs
  for (const [surahStr, ayahs] of Object.entries(PRELOADED_SURAHS)) {
    const surahNum = Number(surahStr);
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNum);
    const surahNameAr = surahMeta?.nameAr || '';
    for (const ayah of ayahs) {
      pushIfMatches({
        id: `${surahNum}:${ayah.numberInSurah}`,
        surahNumber: surahNum,
        surahNameAr,
        ayahNumber: ayah.numberInSurah,
        pageNumber: ayah.page || surahMeta?.startPage || 1,
        textUthmani: sanitizeQuranicText(
          stripLeadingBasmalah(ayah.textUthmani, surahNum, ayah.numberInSurah)
        ),
        tafsirSnippet: ayah.tafsirMuyassar,
      });
    }
  }

  // 3. Check thematic Quran verses
  for (const v of THEMATIC_QURAN_VERSES) {
    pushIfMatches(
      {
        id: `${v.surahNumber}:${v.ayahNumber}`,
        surahNumber: v.surahNumber,
        surahNameAr: v.surahNameAr,
        ayahNumber: v.ayahNumber,
        pageNumber: v.mushafPage,
        textUthmani: sanitizeQuranicText(v.uthmaniText),
        tafsirSnippet: v.reflectionAr,
      },
      v.topicTitleAr
    );
  }

  // 4. Check built-in landmarks (e.g., Ayat al-Kursi, Ayat an-Nur, etc.)
  for (const lm of BUILTIN_SEARCH_LANDMARKS) {
    pushIfMatches(lm, lm.tafsirSnippet || '');
  }

  return results.slice(0, 35);
}

/**
 * Estimates the Mushaf page for a given Surah and Ayah using startPage interpolation,
 * and can be refined via API when selected.
 */
export function estimateMushafPageForAyah(surahNumber: number, ayahNumber: number): number {
  const currentSurah = ALL_SURAHS.find((s) => s.number === surahNumber);
  if (!currentSurah) return 1;
  if (ayahNumber <= 1) return currentSurah.startPage;

  const nextSurah = ALL_SURAHS.find((s) => s.number === surahNumber + 1);
  const endPage = nextSurah ? Math.max(currentSurah.startPage, nextSurah.startPage - 1) : 604;
  const totalPages = Math.max(1, endPage - currentSurah.startPage + 1);
  const ratio = Math.min(1, Math.max(0, (ayahNumber - 1) / Math.max(1, currentSurah.ayahCount)));
  return Math.min(604, Math.max(1, Math.round(currentSurah.startPage + ratio * (totalPages - 1))));
}

/**
 * Searches all 6,236 verses of the Holy Quran via api.alquran.cloud (diacritic-free edition)
 * and merges with local results.
 */
export async function searchQuranVersesOnline(
  rawQuery: string,
  localResults: QuranSearchResult[] = []
): Promise<QuranSearchResult[]> {
  const cleanQuery = rawQuery
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .trim();
  if (cleanQuery.length < 2) return localResults;

  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(cleanQuery)}/all/quran-simple-clean`
    );
    if (!response.ok) return localResults;
    const payload = await response.json();
    const matches = payload?.data?.matches;
    if (!Array.isArray(matches)) return localResults;

    const merged = [...localResults];
    const seen = new Set(merged.map((r) => `${r.surahNumber}:${r.ayahNumber}`));

    for (const m of matches.slice(0, 30)) {
      const sNum = Number(m?.surah?.number || 1);
      const aNum = Number(m?.numberInSurah || 1);
      const key = `${sNum}:${aNum}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const surahMeta = ALL_SURAHS.find((s) => s.number === sNum);
      merged.push({
        id: key,
        surahNumber: sNum,
        surahNameAr: surahMeta?.nameAr || m?.surah?.name || `سورة ${sNum}`,
        ayahNumber: aNum,
        pageNumber: estimateMushafPageForAyah(sNum, aNum),
        textUthmani: sanitizeQuranicText(String(m?.text || '').replace(/^\uFEFF/, '')),
      });
    }

    return merged.slice(0, 40);
  } catch {
    return localResults;
  }
}

/**
 * Resolves the exact King Fahd Madinah Mushaf page (1..604) for any (surahNumber, ayahNumber).
 */
export async function resolveExactAyahPage(
  surahNumber: number,
  ayahNumber: number,
  fallbackPage: number
): Promise<number> {
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}`
    );
    if (!res.ok) return fallbackPage;
    const json = await res.json();
    const exactPage = Number(json?.data?.page);
    if (exactPage >= 1 && exactPage <= 604) {
      return exactPage;
    }
    return fallbackPage;
  } catch {
    return fallbackPage;
  }
}

/**
 * Dictionary of frequent & classical Quranic words (غريب القرآن ومعاني المفردات)
 * keyed by normalized Arabic form.
 */
const QURANIC_WORD_MEANINGS_DICT: Record<string, { word: string; meaningAr: string }> = {
  الحمد: { word: 'الْحَمْدُ', meaningAr: 'الثناء الكامل على الله بصفاته الحسنى ونعمه الظاهرة والباطنة' },
  رب: { word: 'رَبِّ', meaningAr: 'المالك المتصرف والمربي لجميع الخلق بنعمه' },
  العالمين: { word: 'الْعَالَمِينَ', meaningAr: 'جميع المخلوقات من الإنس والجن والملائكة وسائر الكائنات' },
  الرحمن: { word: 'الرَّحْمَٰنِ', meaningAr: 'ذو الرحمة الواسعة التي وسعت جميع الخلائق' },
  الرحيم: { word: 'الرَّحِيمِ', meaningAr: 'الموصل رحمته الخاصة بالمؤمنين في الدنيا والآخرة' },
  يوم: { word: 'يَوْمِ', meaningAr: 'زمان الجزاء والحساب في الآخرة' },
  الدين: { word: 'الدِّينِ', meaningAr: 'الحساب والجزاء بالعدل يوم القيامة' },
  نعبد: { word: 'نَعْبُدُ', meaningAr: 'نخصّك وحدك بالطاعة والذل والخضوع المحبّ' },
  نستعين: { word: 'نَسْتَعِينُ', meaningAr: 'نطلب منك وحدك العون والتوفيق في كل أمورنا' },
  اهدنا: { word: 'اهْدِنَا', meaningAr: 'دلّنا وأرشدنا وثبّتنا على طريق الحق' },
  الصراط: { word: 'الصِّرَاطَ', meaningAr: 'الطريق الواضح المستقيم الذي لا اعوجاج فيه (الإسلام)' },
  المستقيم: { word: 'الْمُسْتَقِيمَ', meaningAr: 'المعتدل الواضح الموصل إلى رضوان الله وجنته' },
  المغضوب: { word: 'الْمَغْضُوبِ', meaningAr: 'الذين عرفوا الحق وتركوه عناداً واستكباراً' },
  الضالين: { word: 'الضَّالِّينَ', meaningAr: 'الذين تاهوا عن الحق وعبدوا الله على جهل وضلال' },
  الم: { word: 'الم', meaningAr: 'حروف مقطعة في أوائل السور للدلالة على إعجاز القرآن الكريم' },
  ريب: { word: 'رَيْبَ', meaningAr: 'شكّ؛ فلا شكّ أصلاً في أنه منزل من عند الله' },
  هدي: { word: 'هُدًى', meaningAr: 'نورٌ ودلالةٌ وبيانٌ يخرج من الظلمات إلى النور' },
  للمتقين: { word: 'لِلْمُتَّقِينَ', meaningAr: 'الذين يجعلون بينهم وبين عذاب الله وقاية بفعل أوامره واجتناب نواهيه' },
  بالغيب: { word: 'بِالْغَيْبِ', meaningAr: 'ما غاب عن الحواس مما أخبر الله به ورسوله كالملائكة واليوم الآخر' },
  يقيمون: { word: 'يُقِيمُونَ', meaningAr: 'يؤدونها تامة بأركانها وواجباتها وخشوعها في أوقاتها' },
  ينفقون: { word: 'يُنْفِقُونَ', meaningAr: 'يبذلون من أموالهم في الزكاة والصدقات ووجوه الخير' },
  المفلحون: { word: 'الْمُفْلِحُونَ', meaningAr: 'الفائزون بمطلوبهم والناجون من مرهوبهم في الدنيا والآخرة' },
  الحي: { word: 'الْحَيُّ', meaningAr: 'الباقي الدائم الذي له الحياة الكاملة الأزلية والأبدية' },
  القيوم: { word: 'الْقَيُّومُ', meaningAr: 'القائم بنفسه الغني عن خلقه، والمقيم لكل ما في السماوات والأرض' },
  سنه: { word: 'سِنَةٌ', meaningAr: 'نعاسٌ وغفوةٌ تسبق النوم' },
  يشفع: { word: 'يَشْفَعُ', meaningAr: 'يتوسط لأحد يوم القيامة لجلب نفع أو دفع ضر' },
  كرسيه: { word: 'كُرْسِيُّهُ', meaningAr: 'موضع قدمي الرب جل جلاله لا يعلم كيفيته إلا الله' },
  يءوده: { word: 'يَئُودُهُ', meaningAr: 'يثقله أو يعجزه أو يشقّ عليه' },
  وسعها: { word: 'وُسْعَهَا', meaningAr: 'طاقتها وقدرتها وما تقدر عليه دون حرج' },
  كسبت: { word: 'كَسَبَتْ', meaningAr: 'عملت من الخير والطاعات فلها ثوابه' },
  اكتسبت: { word: 'اكْتَسَبَتْ', meaningAr: 'ارتكبت من الإثم والمعصية فعليها وزره' },
  اصرا: { word: 'إِصْرًا', meaningAr: 'عبئاً ثقيلاً وتكليفاً شاقاً' },
  الصمد: { word: 'الصَّمَدُ', meaningAr: 'السيد الكامل في سؤدده الذي تقصده الخلائق كلها في حوائجها' },
  كفوا: { word: 'كُفُوًا', meaningAr: 'مكافئاً أو مماثلاً أو شبيهاً أو نظيراً' },
  الفلق: { word: 'الْفَلَقِ', meaningAr: 'الصبح حين ينفلق عن ظلمة الليل، وكل ما يفلق الله من الحب والنوى' },
  غاسق: { word: 'غَاسِقٍ', meaningAr: 'الليل إذا أقبل بظلامه الشديد' },
  وقب: { word: 'وَقَبَ', meaningAr: 'دخل وانتشر ظلامه وسكن فيه كل شيء' },
  النفاثات: { word: 'النَّفَّاثَاتِ', meaningAr: 'السواحر اللواتي ينفخن في عُقَد الخيوط حين يسحرن' },
  العقد: { word: 'الْعُقَدِ', meaningAr: 'ما يُعقد من الخيوط والحبال في السحر' },
  الوسواس: { word: 'الْوَسْوَاسِ', meaningAr: 'الشيطان الذي يلقي الخواطر السيئة في القلب خفيةً' },
  الخناس: { word: 'الْخَنَّاسِ', meaningAr: 'الذي يتأخر وينقبض ويختفي إذا ذكر العبدُ ربه' },
  الجنه: { word: 'الْجِنَّةِ', meaningAr: 'الجنّ أو دار النعيم المقيم التي أعدها الله لعباده المؤمنين' },
  تبارك: { word: 'تَبَارَكَ', meaningAr: 'تعاظم وكثرت بركته وخيره وإحسانه' },
  ليبلوكم: { word: 'لِيَبْلُوَكُمْ', meaningAr: 'ليختبركم ويمتحنكم في الدنيا' },
  فطور: { word: 'فُطُورٍ', meaningAr: 'شقوق أو صدوع أو خلل وعدم استواء' },
  حسير: { word: 'حَسِيرٌ', meaningAr: 'كليلٌ متعبٌ عاجزٌ عن رؤية أي نقص في خلق الله' },
  العسر: { word: 'الْعُسْرِ', meaningAr: 'الضيق والشدة والمشقة' },
  يسرا: { word: 'يُسْرًا', meaningAr: 'فرجاً وسعةً وتيسيراً من الله' },
  فانصب: { word: 'فَانْصَبْ', meaningAr: 'اجتهد في العبادة والدعاء بعد فراغك من أشغالك' },
  فارغب: { word: 'فَارْغَبْ', meaningAr: 'اجعل رغبتك وتوجهك وطلبك إلى الله وحده' },
  مخرجا: { word: 'مَخْرَجًا', meaningAr: 'فرجاً ومنفذاً من كل ضيق وكرب' },
  حسبه: { word: 'حَسْبُهُ', meaningAr: 'كافيه كل ما يهمه في دينه ودنياه' },
};

/**
 * Extracts word-by-word / key vocabulary meanings (معاني الكلمات والمفردات) for an Ayah.
 */
export function extractAyahWordMeanings(
  textUthmani: string,
  tafsirMuyassar: string = ''
): QuranWordMeaning[] {
  const clean = sanitizeQuranicText(textUthmani);
  const rawTokens = clean
    .split(/\s+/)
    .map((w) => w.replace(/[^\u0621-\u064A\u064B-\u065F\u0670]/g, '').trim())
    .filter((w) => w.length >= 2);

  const matched: QuranWordMeaning[] = [];
  const seenWords = new Set<string>();

  for (const token of rawTokens) {
    const norm = normalizeArabicForQuranSearch(token);
    if (!norm) continue;

    // Direct match or stripped prefix (و / ف / ب / ل)
    const candidates = [
      norm,
      norm.replace(/^[وفبل]/, ''),
      norm.replace(/^ال/, ''),
    ];

    for (const cand of candidates) {
      const entry = QURANIC_WORD_MEANINGS_DICT[cand];
      if (entry && !seenWords.has(entry.word)) {
        seenWords.add(entry.word);
        matched.push({
          word: token,
          meaningAr: entry.meaningAr,
        });
        break;
      }
    }

    if (matched.length >= 5) break;
  }

  // If the verse has specialized vocabulary not in the top dictionary, synthesize structured lexical segments
  // from the verse words paired with its authoritative Tafsir segments so every single verse has clear vocabulary cards.
  if (matched.length === 0 && rawTokens.length > 0) {
    const tafsirClauses = tafsirMuyassar
      .split(/[،.؛:]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 6);

    const significantTokens = rawTokens.filter((w) => {
      const n = normalizeArabicForQuranSearch(w);
      return (
        n.length >= 3 &&
        !['من', 'في', 'علي', 'الي', 'ان', 'ما', 'لا', 'هو', 'هم', 'الذي', 'الذين', 'كان', 'قال', 'قل'].includes(n)
      );
    });

    const chosenTokens = (significantTokens.length > 0 ? significantTokens : rawTokens).slice(0, 3);
    chosenTokens.forEach((tok, idx) => {
      matched.push({
        word: tok,
        meaningAr:
          tafsirClauses[idx] ||
          tafsirClauses[0] ||
          'لفظ قرآني يدل على المعنى المبيّن في سياق الآية الكريمة',
      });
    });
  }

  return matched;
}

/**
 * Pure state machine that advances the Ayah Range Memorization & Repetition loop:
 * 1. Repeats the current Ayah `ayahRepeatTarget` times.
 * 2. Moves to the next Ayah in `[fromAyah..toAyah]`.
 * 3. When `toAyah` finishes its repeats, repeats the entire range `rangeRepeatTarget` times (or infinitely if 0).
 */
export function computeNextMemorizationStep(
  state: MemorizationLoopState
): MemorizationLoopStepResult {
  const from = Math.min(state.fromAyah, state.toAyah);
  const to = Math.max(state.fromAyah, state.toAyah);
  const ayahTarget = Math.max(1, state.ayahRepeatTarget);

  // Step 1: Still repeating the same Ayah?
  if (state.currentAyahIteration < ayahTarget) {
    return {
      finished: false,
      nextState: {
        ...state,
        fromAyah: from,
        toAyah: to,
        currentAyahIteration: state.currentAyahIteration + 1,
      },
    };
  }

  // Step 2: Move to the next Ayah within the range
  if (state.currentAyah < to) {
    return {
      finished: false,
      nextState: {
        ...state,
        fromAyah: from,
        toAyah: to,
        currentAyah: state.currentAyah + 1,
        currentAyahIteration: 1,
      },
    };
  }

  // Step 3: Reached the end of the range (`toAyah`). Check if the full range should repeat.
  const isInfiniteRange = state.rangeRepeatTarget === 0;
  if (isInfiniteRange || state.currentRangeIteration < state.rangeRepeatTarget) {
    return {
      finished: false,
      nextState: {
        ...state,
        fromAyah: from,
        toAyah: to,
        currentAyah: from,
        currentAyahIteration: 1,
        currentRangeIteration: state.currentRangeIteration + 1,
      },
    };
  }

  // Completed all iterations!
  return {
    finished: true,
    nextState: state,
  };
}

/**
 * Renders an ornamental high-resolution PNG Data URL card for sharing/saving an Ayah with its Tafsir.
 */
export function generateAyahShareCardDataUrl(params: {
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  textUthmani: string;
  tafsirText: string;
  tafsirSourceLabel: string;
}): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Warm parchment background
  ctx.fillStyle = '#FAF5E8';
  ctx.fillRect(0, 0, 1080, 1080);

  // Outer emerald & bronze architectural double frame
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.strokeStyle = '#B59E7A';
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, 972, 972);

  // Header Banner
  ctx.fillStyle = '#14532D';
  ctx.fillRect(84, 84, 912, 96);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 36px "Amiri Quran", "Amiri", serif';
  ctx.fillText(
    `سُورَةُ ${params.surahNameAr} · الآية ${toArabicNumerals(params.ayahNumber)} · صفحة ${toArabicNumerals(params.pageNumber)}`,
    540,
    144
  );

  // Wrap helper
  const wrapArabicLines = (
    text: string,
    maxWidth: number,
    fontSpec: string,
    maxLines: number
  ): string[] => {
    ctx.font = fontSpec;
    const words = text.split(/\s+/);
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

  // Ayah Text
  const fullAyah = `﴿ ${sanitizeQuranicText(params.textUthmani)} ﴾`;
  const ayahLines = wrapArabicLines(
    fullAyah,
    860,
    'bold 44px "Amiri Quran", "Amiri", serif',
    7
  );

  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 44px "Amiri Quran", "Amiri", serif';
  let y = 265;
  for (const line of ayahLines) {
    ctx.fillText(line, 540, y);
    y += 72;
  }

  // Divider
  const dividerY = Math.max(y + 10, 560);
  ctx.strokeStyle = '#C8B696';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, dividerY);
  ctx.lineTo(920, dividerY);
  ctx.stroke();

  // Tafsir Header
  ctx.fillStyle = '#78350F';
  ctx.font = 'bold 28px "Amiri Quran", "Amiri", serif';
  ctx.fillText(params.tafsirSourceLabel.replace(/—/g, '·'), 540, dividerY + 52);

  // Tafsir Body
  const tafsirLines = wrapArabicLines(
    params.tafsirText,
    860,
    '28px "Amiri Quran", "Amiri", serif',
    5
  );
  ctx.fillStyle = '#292524';
  ctx.font = '28px "Amiri Quran", "Amiri", serif';
  let ty = dividerY + 108;
  for (const line of tafsirLines) {
    ctx.fillText(line, 540, ty);
    ty += 52;
  }

  // Footer Attribution
  ctx.fillStyle = '#6D4C2D';
  ctx.font = 'bold 24px "Amiri Quran", "Amiri", serif';
  ctx.fillText('المحراب · المصحف الشريف والتفسير الموثق', 540, 1005);

  return canvas.toDataURL('image/png');
}

export interface SavedReadingStop {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  snippet: string;
  savedAt: string;
}

export const READING_STOP_STORAGE_KEY = 'almihrab_reading_stop_v1';

/**
 * Builds a normalized SavedReadingStop record for a specific Ayah & Mushaf page.
 */
export function createSavedReadingStop(params: {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  textUthmani: string;
  savedAt?: string;
}): SavedReadingStop {
  const clean = sanitizeQuranicText(
    stripLeadingBasmalah(params.textUthmani, params.surahNumber, params.ayahNumber)
  );
  return {
    surahNumber: params.surahNumber,
    surahNameAr: params.surahNameAr,
    ayahNumber: params.ayahNumber,
    pageNumber: Math.max(1, Math.min(604, params.pageNumber)),
    snippet: clean.slice(0, 65),
    savedAt: params.savedAt || new Date().toLocaleDateString('ar-SA'),
  };
}

/**
 * Formats a concise Arabic label for the saved reading stop.
 */
export function formatReadingStopLabelAr(stop: SavedReadingStop): string {
  return `سورة ${stop.surahNameAr} · الآية ${toArabicNumerals(stop.ayahNumber)} (ص ${toArabicNumerals(stop.pageNumber)})`;
}

export const MUSHAF_FONT_SIZE_STORAGE_KEY = 'almihrab_mushaf_font_level_v1';

export interface MushafTypographySpec {
  level: 1 | 2 | 3 | 4 | 5;
  labelAr: string;
  verseClass: string;
  basmalahClass: string;
  surahTitleClass: string;
  rosetteClass: string;
}

/**
 * Determines whether a Mushaf surah block on a page should be centered (ceremonial layout)
 * or justified like a standard 15-line printed Madinah Mushaf page.
 * Only Page 1 (Al-Fatihah), Page 2 (opening of Al-Baqarah), or very short Juz Amma surah blocks
 * (<= 240 chars in surahs 93..114) are centered; all standard Mushaf pages (including pages
 * with 1–8 long verses like Ayat Al-Kursi or Ayat Al-Dayn) are justified.
 */
export function isCeremonialCenteredMushafBlock(
  pageNumber: number,
  surahNumber: number,
  totalBlockChars: number
): boolean {
  if (pageNumber === 1 || pageNumber === 2) {
    return true;
  }
  if (surahNumber >= 93 && totalBlockChars <= 240) {
    return true;
  }
  return false;
}

/**
 * Returns calibrated, proportional typography classes for the Mushaf page
 * across 5 distinct user-selectable font size levels (1 = صغير .. 5 = مكبّر).
 */
export function getMushafTypographySpec(
  rawLevel: number,
  isCeremonialShortBlock: boolean = false
): MushafTypographySpec {
  const level = Math.max(1, Math.min(5, Math.round(rawLevel || 2))) as 1 | 2 | 3 | 4 | 5;
  const rosetteClass =
    'inline-block mx-0.5 font-quran text-[0.76em] align-baseline whitespace-nowrap select-none';

  switch (level) {
    case 1:
      return {
        level: 1,
        labelAr: 'صغير',
        verseClass: isCeremonialShortBlock
          ? 'text-[20px] sm:text-[23px] leading-[2.2] sm:leading-[2.3]'
          : 'text-[17px] sm:text-[19px] md:text-[20px] leading-[2.05] sm:leading-[2.15]',
        basmalahClass: 'text-[18px] sm:text-[20px] leading-[2.0]',
        surahTitleClass: 'text-[18px] sm:text-[20px]',
        rosetteClass,
      };
    case 2:
      return {
        level: 2,
        labelAr: 'متوسط',
        verseClass: isCeremonialShortBlock
          ? 'text-[22px] sm:text-[26px] leading-[2.25] sm:leading-[2.35]'
          : 'text-[19px] sm:text-[22px] md:text-[23px] leading-[2.12] sm:leading-[2.22]',
        basmalahClass: 'text-[20px] sm:text-[23px] leading-[2.05]',
        surahTitleClass: 'text-[20px] sm:text-[23px]',
        rosetteClass,
      };
    case 3:
      return {
        level: 3,
        labelAr: 'كبير',
        verseClass: isCeremonialShortBlock
          ? 'text-[25px] sm:text-[29px] leading-[2.3] sm:leading-[2.4]'
          : 'text-[21px] sm:text-[25px] md:text-[26px] leading-[2.18] sm:leading-[2.28]',
        basmalahClass: 'text-[22px] sm:text-[25px] leading-[2.1]',
        surahTitleClass: 'text-[22px] sm:text-[25px]',
        rosetteClass,
      };
    case 4:
      return {
        level: 4,
        labelAr: 'كبير جداً',
        verseClass: isCeremonialShortBlock
          ? 'text-[27px] sm:text-[32px] leading-[2.32] sm:leading-[2.42]'
          : 'text-[24px] sm:text-[28px] md:text-[30px] leading-[2.22] sm:leading-[2.32]',
        basmalahClass: 'text-[24px] sm:text-[28px] leading-[2.15]',
        surahTitleClass: 'text-[24px] sm:text-[27px]',
        rosetteClass,
      };
    case 5:
      return {
        level: 5,
        labelAr: 'مكبّر',
        verseClass: isCeremonialShortBlock
          ? 'text-[30px] sm:text-[35px] leading-[2.35] sm:leading-[2.45]'
          : 'text-[26px] sm:text-[31px] md:text-[34px] leading-[2.25] sm:leading-[2.38]',
        basmalahClass: 'text-[26px] sm:text-[30px] leading-[2.15]',
        surahTitleClass: 'text-[25px] sm:text-[29px]',
        rosetteClass,
      };
  }
}

/**
 * Returns a balanced font-size and line-height class for displaying a single Ayah
 * inside the Tafsir & Study popover so long verses (like Ayat Al-Kursi or Ayat Al-Dayn)
 * remain readable without overflowing the modal.
 */
export function getTafsirPopoverVerseClass(charLength: number): string {
  if (charLength > 240) {
    return 'text-[18px] sm:text-[21px] leading-[2.05] text-justify [text-align-last:center]';
  }
  if (charLength > 120) {
    return 'text-[20px] sm:text-[23px] leading-[2.15] text-center';
  }
  return 'text-[22px] sm:text-[25px] leading-[2.2] text-center';
}

