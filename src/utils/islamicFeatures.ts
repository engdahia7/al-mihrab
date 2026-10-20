import type { CityLocation } from './astronomy.ts';
import { KAABA_COORDS, calculateQiblaDirection } from './astronomy.ts';

// ============================================================================
// 1. حاسبة المواريث الشرعية المبسطة (Islamic Inheritance / Fara'id Calculator)
// ============================================================================

export interface InheritanceInput {
  estateAmount: number;
  deceasedGender: 'male' | 'female';
  hasHusband: boolean; // valid when deceasedGender === 'female'
  wivesCount: number; // 0..4, valid when deceasedGender === 'male'
  hasFather: boolean;
  hasMother: boolean;
  sonsCount: number;
  daughtersCount: number;
  fullBrothersCount: number;
  fullSistersCount: number;
}

export interface HeirShareItem {
  id: string;
  heirTitleAr: string;
  count: number;
  shareTypeAr: 'فرض' | 'تعصيب' | 'فرض وتعصيب' | 'فرض وردّ' | 'محجوب';
  fractionLabelAr: string;
  shareRatio: number; // 0..1 of estate
  totalAmount: number;
  amountPerPerson: number;
  quranicEvidenceAr: string;
  explanationAr: string;
}

export interface InheritanceResult {
  estateAmount: number;
  shares: HeirShareItem[];
  blockedHeirs: HeirShareItem[];
  caseTypeAr: 'عادلة' | 'عَوْل (زيادة الفروض على التركة)' | 'رَدّ (فائض يُردّ على أصحاب الفروض)' | 'تعصيب';
  summaryNoteAr: string;
}

export function calculateInheritance(input: InheritanceInput): InheritanceResult {
  const estate = Math.max(0, Number(input.estateAmount) || 0);
  const hasChildren = input.sonsCount > 0 || input.daughtersCount > 0;
  const hasMaleDescendant = input.sonsCount > 0;
  const siblingsTotal = input.fullBrothersCount + input.fullSistersCount;
  const hasMultipleSiblings = siblingsTotal >= 2;

  const rawFixedShares: {
    id: string;
    heirTitleAr: string;
    count: number;
    shareTypeAr: HeirShareItem['shareTypeAr'];
    fractionLabelAr: string;
    rawWeight: number;
    eligibleForRadd: boolean;
    quranicEvidenceAr: string;
    explanationAr: string;
  }[] = [];

  const blockedHeirs: HeirShareItem[] = [];

  // 1. الزوج أو الزوجات
  if (input.deceasedGender === 'female' && input.hasHusband) {
    const weight = hasChildren ? 0.25 : 0.5;
    rawFixedShares.push({
      id: 'husband',
      heirTitleAr: 'الزوج',
      count: 1,
      shareTypeAr: 'فرض',
      fractionLabelAr: hasChildren ? 'الرُّبُع (١/٤)' : 'النِّصْف (١/٢)',
      rawWeight: weight,
      eligibleForRadd: false, // الزوجان لا يُردّ عليهما عند الجمهور
      quranicEvidenceAr:
        'قال تعالى: ﴿وَلَكُمْ نِصْفُ مَا تَرَكَ أَزْوَاجُكُمْ إِن لَّمْ يَكُن لَّهُنَّ وَلَدٌ فَإِن كَانَ لَهُنَّ وَلَدٌ فَلَكُمُ الرُّبُعُ﴾ [النساء: ١٢]',
      explanationAr: hasChildren
        ? 'يرث الزوج الربع لوجود الفرع الوارث (الأبناء أو البنات).'
        : 'يرث الزوج النصف لعدم وجود الفرع الوارث.',
    });
  } else if (input.deceasedGender === 'male' && input.wivesCount > 0) {
    const wives = Math.min(4, Math.max(1, Math.round(input.wivesCount)));
    const weight = hasChildren ? 0.125 : 0.25;
    rawFixedShares.push({
      id: 'wives',
      heirTitleAr: wives === 1 ? 'الزوجة' : `الزوجات (${wives})`,
      count: wives,
      shareTypeAr: 'فرض',
      fractionLabelAr: hasChildren ? 'الثُّمُن (١/٨)' : 'الرُّبُع (١/٤)',
      rawWeight: weight,
      eligibleForRadd: false,
      quranicEvidenceAr:
        'قال تعالى: ﴿وَلَهُنَّ الرُّبُعُ مِمَّا تَرَكْتُمْ إِن لَّمْ يَكُن لَّكُمْ وَلَدٌ فَإِن كَانَ لَكُمْ وَلَدٌ فَلَهُنَّ الثُّمُنُ﴾ [النساء: ١٢]',
      explanationAr: hasChildren
        ? 'ترث الزوجة (أو الزوجات بالتساوي) الثمن لوجود الفرع الوارث.'
        : 'ترث الزوجة (أو الزوجات بالتساوي) الربع لعدم وجود الفرع الوارث.',
    });
  }

  // 2. الأم
  if (input.hasMother) {
    const getsSixth = hasChildren || hasMultipleSiblings;
    const weight = getsSixth ? 1 / 6 : 1 / 3;
    rawFixedShares.push({
      id: 'mother',
      heirTitleAr: 'الأم',
      count: 1,
      shareTypeAr: 'فرض',
      fractionLabelAr: getsSixth ? 'السُّدُس (١/٦)' : 'الثُّلُث (١/٣)',
      rawWeight: weight,
      eligibleForRadd: true,
      quranicEvidenceAr:
        'قال تعالى: ﴿وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ فَإِن لَّمْ يَكُن لَّهُ وَلَدٌ وَوَرِثَهُ أَبَوَاهُ فَلِأُمِّهِ الثُّلُثُ فَإِن كَانَ لَهُ إِخْوَةٌ فَلِأُمِّهِ السُّدُسُ﴾ [النساء: ١١]',
      explanationAr: getsSixth
        ? 'ترث الأم السدس لوجود الفرع الوارث أو جمع من الإخوة.'
        : 'ترث الأم الثلث لعدم وجود الفرع الوارث ولا جمع من الإخوة.',
    });
  }

  // 3. الأب (إذا وُجد فرع وارث مذكر يرث السدس فرضاً، وإذا وُجدت بنات فقط يرث السدس فرضاً والباقي تعصيباً، وإذا لم يوجد فرع وارث يرث بالتعصيب)
  if (input.hasFather && hasMaleDescendant) {
    rawFixedShares.push({
      id: 'father',
      heirTitleAr: 'الأب',
      count: 1,
      shareTypeAr: 'فرض',
      fractionLabelAr: 'السُّدُس (١/٦)',
      rawWeight: 1 / 6,
      eligibleForRadd: true,
      quranicEvidenceAr:
        'قال تعالى: ﴿وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ﴾ [النساء: ١١]',
      explanationAr: 'يرث الأب السدس فرضاً لوجود الفرع الوارث المذكر (الابن).',
    });
  } else if (input.hasFather && !hasMaleDescendant && input.daughtersCount > 0) {
    rawFixedShares.push({
      id: 'father',
      heirTitleAr: 'الأب',
      count: 1,
      shareTypeAr: 'فرض وتعصيب',
      fractionLabelAr: 'السُّدُس فرضاً + الباقي تعصيباً',
      rawWeight: 1 / 6,
      eligibleForRadd: false,
      quranicEvidenceAr:
        'قال تعالى: ﴿وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ﴾ وحديث: «ألحقوا الفرائض بأهلها فما بقي فهو لأولى رجل ذكر» (متفق عليه)',
      explanationAr:
        'يرث الأب السدس فرضاً مع وجود البنات، ويأخذ ما بقي بعد الفروض تعصيباً.',
    });
  }

  // 4. البنات عند عدم وجود ابن ذكر (صاحبات فرض: النصف لواحدة، الثلثان لاثنتين فأكثر)
  if (input.daughtersCount > 0 && input.sonsCount === 0) {
    const isSingle = input.daughtersCount === 1;
    const weight = isSingle ? 0.5 : 2 / 3;
    rawFixedShares.push({
      id: 'daughters_fixed',
      heirTitleAr: isSingle ? 'البنت' : `البنات (${input.daughtersCount})`,
      count: input.daughtersCount,
      shareTypeAr: 'فرض',
      fractionLabelAr: isSingle ? 'النِّصْف (١/٢)' : 'الثُّلُثَان (٢/٣)',
      rawWeight: weight,
      eligibleForRadd: true,
      quranicEvidenceAr:
        'قال تعالى: ﴿فَإِن كُنَّ نِسَاءً فَوْقَ اثْنَتَيْنِ فَلَهُنَّ ثُلُثَا مَا تَرَكَ وَإِن كَانَتْ وَاحِدَةً فَلَهَا النِّصْفُ﴾ [النساء: ١١]',
      explanationAr: isSingle
        ? 'ترث البنت الواحدة النصف فرضاً لعدم وجود معصِّب (ابن).'
        : 'ترث البنات الثلثين بالتساوي لعدم وجود ابن معصِّب.',
    });
  }

  // 5. الإخوة والأخوات الأشقاء (يُحجبون بالأب أو بالابن الذكر اتفاقاً)
  if (siblingsTotal > 0) {
    if (input.hasFather || hasMaleDescendant) {
      blockedHeirs.push({
        id: 'siblings_blocked',
        heirTitleAr: 'الإخوة والأخوات الأشقاء',
        count: siblingsTotal,
        shareTypeAr: 'محجوب',
        fractionLabelAr: 'محجوبون (٠٪)',
        shareRatio: 0,
        totalAmount: 0,
        amountPerPerson: 0,
        quranicEvidenceAr:
          'قال تعالى: ﴿يَسْتَفْتُونَكَ قُلِ اللَّهُ يُفْتِيكُمْ فِي الْكَلَالَةِ﴾ [النساء: ١٧٦] — والكلالة من لا ولد له ولا والد',
        explanationAr: hasMaleDescendant
          ? 'يُحجب الإخوة والأخوات حجب حرمان بوجود الفرع الوارث المذكر (الابن).'
          : 'يُحجب الإخوة والأخوات حجب حرمان بوجود الأصل الوارث المذكر (الأب).',
      });
    } else if (!hasChildren && input.fullBrothersCount === 0 && input.fullSistersCount > 0) {
      // كلالة: أخوات شقيقات فقط بدون إخوة ذكور وبدون فرع وارث ولا أب
      const isSingleSister = input.fullSistersCount === 1;
      const weight = isSingleSister ? 0.5 : 2 / 3;
      rawFixedShares.push({
        id: 'sisters_kalalah',
        heirTitleAr: isSingleSister
          ? 'الأخت الشقيقة'
          : `الأخوات الشقيقات (${input.fullSistersCount})`,
        count: input.fullSistersCount,
        shareTypeAr: 'فرض',
        fractionLabelAr: isSingleSister ? 'النِّصْف (١/٢)' : 'الثُّلُثَان (٢/٣)',
        rawWeight: weight,
        eligibleForRadd: true,
        quranicEvidenceAr:
          'قال تعالى: ﴿إِنِ امْرُؤٌ هَلَكَ لَيْسَ لَهُ وَلَدٌ وَلَهُ أُخْتٌ فَلَهَا نِصْفُ مَا تَرَكَ... فَإِن كَانَتَا اثْنَتَيْنِ فَلَهُمَا الثُّلُثَانِ مِمَّا تَرَكَ﴾ [النساء: ١٧٦]',
        explanationAr: isSingleSister
          ? 'ترث الأخت الشقيقة النصف فرضاً في الكلالة (عدم الولد والوالد).'
          : 'ترث الأخوات الشقيقات الثلثين فرضاً في الكلالة.',
      });
    }
  }

  // مجموع الفروض الأولية
  const totalFixedWeight = rawFixedShares.reduce((acc, s) => acc + s.rawWeight, 0);

  const finalShares: HeirShareItem[] = [];
  let caseTypeAr: InheritanceResult['caseTypeAr'] = 'عادلة';
  let summaryNoteAr = 'توزعت التركة وفق الفروض والتعصيب الشرعي في كتاب الله وسنة رسوله ﷺ.';

  // الحالة الأولى: عَوْل (مجموع الفروض أكبر من 1)
  if (totalFixedWeight > 1.0001) {
    caseTypeAr = 'عَوْل (زيادة الفروض على التركة)';
    summaryNoteAr =
      'مسألة عَوْل: زادت سهام أصحاب الفروض على أصل المسألة، فتدخل النقص على جميع أصحاب الفروض بنسبة فروضهم.';
    for (const s of rawFixedShares) {
      const normalizedRatio = s.rawWeight / totalFixedWeight;
      const totalAmt = estate * normalizedRatio;
      finalShares.push({
        id: s.id,
        heirTitleAr: s.heirTitleAr,
        count: s.count,
        shareTypeAr: s.shareTypeAr,
        fractionLabelAr: `${s.fractionLabelAr} (بعد العول: ${(normalizedRatio * 100).toFixed(1)}٪)`,
        shareRatio: normalizedRatio,
        totalAmount: totalAmt,
        amountPerPerson: totalAmt / s.count,
        quranicEvidenceAr: s.quranicEvidenceAr,
        explanationAr: s.explanationAr,
      });
    }
    return {
      estateAmount: estate,
      shares: finalShares,
      blockedHeirs,
      caseTypeAr,
      summaryNoteAr,
    };
  }

  // المتبقي بعد أصحاب الفروض
  const remainder = Math.max(0, 1 - totalFixedWeight);

  // هل يوجد عاصب يأخذ الباقي؟
  // 1) الأبناء الذكور (مع البنات إن وجدن للذكر مثل حظ الأنثيين)
  // 2) الأب (عند عدم وجود ابن ذكر)
  // 3) الإخوة الأشقاء (عند عدم وجود أب ولا ابن، ومع البنات أو الأخوات)
  // 4) الأخوات الشقيقات مع البنات (عصبة مع الغير: الأخوات مع البنات عصبة)

  const hasAsabah =
    input.sonsCount > 0 ||
    (input.hasFather && !hasMaleDescendant) ||
    (!input.hasFather && !hasMaleDescendant && input.fullBrothersCount > 0) ||
    (!input.hasFather &&
      !hasMaleDescendant &&
      input.daughtersCount > 0 &&
      input.fullSistersCount > 0 &&
      input.fullBrothersCount === 0);

  if (hasAsabah) {
    caseTypeAr = 'تعصيب';
    // أضف الفروض كما هي (مع دمج الباقي للأب إن كان فرضاً وتعصيباً)
    for (const s of rawFixedShares) {
      if (s.id === 'father' && s.shareTypeAr === 'فرض وتعصيب') {
        const combinedRatio = s.rawWeight + remainder;
        const totalAmt = estate * combinedRatio;
        finalShares.push({
          id: s.id,
          heirTitleAr: s.heirTitleAr,
          count: 1,
          shareTypeAr: 'فرض وتعصيب',
          fractionLabelAr: `السدس + الباقي (${(combinedRatio * 100).toFixed(1)}٪)`,
          shareRatio: combinedRatio,
          totalAmount: totalAmt,
          amountPerPerson: totalAmt,
          quranicEvidenceAr: s.quranicEvidenceAr,
          explanationAr: s.explanationAr,
        });
      } else {
        const totalAmt = estate * s.rawWeight;
        finalShares.push({
          id: s.id,
          heirTitleAr: s.heirTitleAr,
          count: s.count,
          shareTypeAr: s.shareTypeAr,
          fractionLabelAr: s.fractionLabelAr,
          shareRatio: s.rawWeight,
          totalAmount: totalAmt,
          amountPerPerson: totalAmt / s.count,
          quranicEvidenceAr: s.quranicEvidenceAr,
          explanationAr: s.explanationAr,
        });
      }
    }

    // توزيع الباقي على العصبة:
    if (input.sonsCount > 0) {
      const totalUnits = input.sonsCount * 2 + input.daughtersCount;
      const unitRatio = remainder / totalUnits;

      // نصيب الأبناء الذكور
      const sonsRatio = unitRatio * 2 * input.sonsCount;
      const sonsAmt = estate * sonsRatio;
      finalShares.push({
        id: 'sons',
        heirTitleAr: input.sonsCount === 1 ? 'الابن' : `الأبناء الذكور (${input.sonsCount})`,
        count: input.sonsCount,
        shareTypeAr: 'تعصيب',
        fractionLabelAr:
          input.daughtersCount > 0
            ? `تعصيب للذكر مثل حظ الأنثيين (${(sonsRatio * 100).toFixed(1)}٪)`
            : `الباقي تعصيباً (${(sonsRatio * 100).toFixed(1)}٪)`,
        shareRatio: sonsRatio,
        totalAmount: sonsAmt,
        amountPerPerson: sonsAmt / input.sonsCount,
        quranicEvidenceAr:
          'قال تعالى: ﴿يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ﴾ [النساء: ١١]',
        explanationAr:
          input.daughtersCount > 0
            ? 'يشترك الأبناء والبنات في الباقي بعد الفروض للذكر مثل حظ الأنثيين.'
            : 'يرث الأبناء الباقي بعد أصحاب الفروض بالتساوي بينهم تعصيباً.',
      });

      // نصيب البنات بالغير (مع الابن)
      if (input.daughtersCount > 0) {
        const daughtersRatio = unitRatio * input.daughtersCount;
        const daughtersAmt = estate * daughtersRatio;
        finalShares.push({
          id: 'daughters_asabah',
          heirTitleAr:
            input.daughtersCount === 1 ? 'البنت' : `البنات (${input.daughtersCount})`,
          count: input.daughtersCount,
          shareTypeAr: 'تعصيب',
          fractionLabelAr: `تعصيب بالغير مع الابن (${(daughtersRatio * 100).toFixed(1)}٪)`,
          shareRatio: daughtersRatio,
          totalAmount: daughtersAmt,
          amountPerPerson: daughtersAmt / input.daughtersCount,
          quranicEvidenceAr:
            'قال تعالى: ﴿يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ﴾ [النساء: ١١]',
          explanationAr: 'يعصّب الابنُ أختَه (البنت) فيقتسمون الباقي للذكر مثل حظ الأنثيين.',
        });
      }
    } else if (input.hasFather && input.daughtersCount === 0) {
      // الأب منفرداً عن الفرع الوارث يأخذ الباقي تعصيباً
      const fatherAmt = estate * remainder;
      finalShares.push({
        id: 'father_asabah',
        heirTitleAr: 'الأب',
        count: 1,
        shareTypeAr: 'تعصيب',
        fractionLabelAr: `الباقي تعصيباً (${(remainder * 100).toFixed(1)}٪)`,
        shareRatio: remainder,
        totalAmount: fatherAmt,
        amountPerPerson: fatherAmt,
        quranicEvidenceAr:
          'حديث ابن عباس رضي الله عنهما: «ألحقوا الفرائض بأهلها فما بقي فهو لأولى رجل ذكر» (متفق عليه)',
        explanationAr: 'يرث الأب جميع التركة أو ما بقي بعد الفروض تعصيباً لعدم وجود فرع وارث.',
      });
    } else if (!input.hasFather && !hasMaleDescendant && input.fullBrothersCount > 0) {
      // الإخوة الأشقاء عصبة بأنفسهم (ومعهم الأخوات الشقيقات للذكر مثل حظ الأنثيين)
      const totalUnits = input.fullBrothersCount * 2 + input.fullSistersCount;
      const unitRatio = remainder / totalUnits;
      const brosRatio = unitRatio * 2 * input.fullBrothersCount;
      const brosAmt = estate * brosRatio;

      finalShares.push({
        id: 'brothers_asabah',
        heirTitleAr:
          input.fullBrothersCount === 1
            ? 'الأخ الشقيق'
            : `الإخوة الأشقاء (${input.fullBrothersCount})`,
        count: input.fullBrothersCount,
        shareTypeAr: 'تعصيب',
        fractionLabelAr: `تعصيب (${(brosRatio * 100).toFixed(1)}٪)`,
        shareRatio: brosRatio,
        totalAmount: brosAmt,
        amountPerPerson: brosAmt / input.fullBrothersCount,
        quranicEvidenceAr:
          'قال تعالى: ﴿وَإِن كَانُوا إِخْوَةً رِّجَالًا وَنِسَاءً فَلِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ﴾ [النساء: ١٧٦]',
        explanationAr:
          'يرث الإخوة الأشقاء ما بقي بعد الفروض تعصيباً لعدم وجود الأب أو الابن.',
      });

      if (input.fullSistersCount > 0) {
        const sisRatio = unitRatio * input.fullSistersCount;
        const sisAmt = estate * sisRatio;
        finalShares.push({
          id: 'sisters_with_brothers',
          heirTitleAr:
            input.fullSistersCount === 1
              ? 'الأخت الشقيقة'
              : `الأخوات الشقيقات (${input.fullSistersCount})`,
          count: input.fullSistersCount,
          shareTypeAr: 'تعصيب',
          fractionLabelAr: `تعصيب بالغير (${(sisRatio * 100).toFixed(1)}٪)`,
          shareRatio: sisRatio,
          totalAmount: sisAmt,
          amountPerPerson: sisAmt / input.fullSistersCount,
          quranicEvidenceAr:
            'قال تعالى: ﴿وَإِن كَانُوا إِخْوَةً رِّجَالًا وَنِسَاءً فَلِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ﴾ [النساء: ١٧٦]',
          explanationAr: 'ترث الأخوات الشقيقات مع الإخوة الأشقاء للذكر مثل حظ الأنثيين.',
        });
      }
    } else if (
      !input.hasFather &&
      !hasMaleDescendant &&
      input.daughtersCount > 0 &&
      input.fullSistersCount > 0 &&
      input.fullBrothersCount === 0
    ) {
      // الأخوات الشقيقات مع البنات عصبة مع الغير
      const sisAmt = estate * remainder;
      finalShares.push({
        id: 'sisters_ma_alghayr',
        heirTitleAr:
          input.fullSistersCount === 1
            ? 'الأخت الشقيقة'
            : `الأخوات الشقيقات (${input.fullSistersCount})`,
        count: input.fullSistersCount,
        shareTypeAr: 'تعصيب',
        fractionLabelAr: `الباقي عصبة مع الغير (${(remainder * 100).toFixed(1)}٪)`,
        shareRatio: remainder,
        totalAmount: sisAmt,
        amountPerPerson: sisAmt / input.fullSistersCount,
        quranicEvidenceAr:
          'قضاء النبي ﷺ في ابنة وابنة ابن وأخت: جعل للأخت ما بقي (رواه البخاري ٦٧٣٦)',
        explanationAr:
          'الأخوات الشقيقات مع البنات عند عدم الأب والابن عصبة مع الغير يأخذن ما بقي بعد الفروض.',
      });
    }

    return {
      estateAmount: estate,
      shares: finalShares,
      blockedHeirs,
      caseTypeAr,
      summaryNoteAr,
    };
  }

  // لا يوجد عاصب، ومجموع الفروض أقل من 1 -> مسألة رَدّ (Radd)
  if (remainder > 0.0001 && rawFixedShares.length > 0) {
    caseTypeAr = 'رَدّ (فائض يُردّ على أصحاب الفروض)';
    const raddEligibleWeight = rawFixedShares
      .filter((s) => s.eligibleForRadd)
      .reduce((acc, s) => acc + s.rawWeight, 0);

    summaryNoteAr =
      'مسألة رَدّ: بقي فائض من التركة بعد الفروض ولم يوجد عاصب، فرُدّ الفائض على أصحاب الفروض النسبية بقدر سهامهم (دون الزوجين عند جمهور الفقهاء).';

    for (const s of rawFixedShares) {
      let finalRatio = s.rawWeight;
      if (s.eligibleForRadd && raddEligibleWeight > 0) {
        finalRatio = s.rawWeight + remainder * (s.rawWeight / raddEligibleWeight);
      } else if (raddEligibleWeight === 0) {
        // لم يوجد إلا أحد الزوجين فقط
        finalRatio = 1;
      }
      const totalAmt = estate * finalRatio;
      finalShares.push({
        id: s.id,
        heirTitleAr: s.heirTitleAr,
        count: s.count,
        shareTypeAr: s.eligibleForRadd ? 'فرض وردّ' : 'فرض',
        fractionLabelAr: s.eligibleForRadd
          ? `${s.fractionLabelAr} + الرَّدّ (${(finalRatio * 100).toFixed(1)}٪)`
          : s.fractionLabelAr,
        shareRatio: finalRatio,
        totalAmount: totalAmt,
        amountPerPerson: totalAmt / s.count,
        quranicEvidenceAr: s.quranicEvidenceAr,
        explanationAr: s.explanationAr,
      });
    }

    return {
      estateAmount: estate,
      shares: finalShares,
      blockedHeirs,
      caseTypeAr,
      summaryNoteAr,
    };
  }

  // مسألة عادلة تماماً
  for (const s of rawFixedShares) {
    const totalAmt = estate * s.rawWeight;
    finalShares.push({
      id: s.id,
      heirTitleAr: s.heirTitleAr,
      count: s.count,
      shareTypeAr: s.shareTypeAr,
      fractionLabelAr: s.fractionLabelAr,
      shareRatio: s.rawWeight,
      totalAmount: totalAmt,
      amountPerPerson: totalAmt / s.count,
      quranicEvidenceAr: s.quranicEvidenceAr,
      explanationAr: s.explanationAr,
    });
  }

  return {
    estateAmount: estate,
    shares: finalShares,
    blockedHeirs,
    caseTypeAr,
    summaryNoteAr,
  };
}

// ============================================================================
// 2. وضع السفر (أحكام القصر والجمع وحساب المسافة بين المدن)
// ============================================================================

export const QASR_THRESHOLD_KM = 80; // مسافة القصر عند جمهور الفقهاء (٤ برد ≈ ٨٠ كم)

export interface TravelRulingResult {
  originCity: CityLocation;
  destinationCity: CityLocation;
  distanceKm: number;
  isQasrPermitted: boolean;
  rulingTitleAr: string;
  rulingExplanationAr: string;
  prayerRakats: {
    prayerNameAr: string;
    residentRakats: number;
    travelerRakats: number;
    canShorten: boolean;
    noteAr: string;
  }[];
  jamOptions: {
    titleAr: string;
    prayersAr: string;
    explanationAr: string;
  }[];
}

export function calculateCityDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateTravelStatus(
  originCity: CityLocation,
  destinationCity: CityLocation
): TravelRulingResult {
  const distanceKm = calculateCityDistanceKm(
    originCity.latitude,
    originCity.longitude,
    destinationCity.latitude,
    destinationCity.longitude
  );
  const isQasrPermitted = distanceKm >= QASR_THRESHOLD_KM;

  const prayerRakats = [
    {
      prayerNameAr: 'الفجر',
      residentRakats: 2,
      travelerRakats: 2,
      canShorten: false,
      noteAr: 'تصلى ركعتين في الحضر والسفر ولا يدخلها القصر',
    },
    {
      prayerNameAr: 'الظهر',
      residentRakats: 4,
      travelerRakats: isQasrPermitted ? 2 : 4,
      canShorten: isQasrPermitted,
      noteAr: isQasrPermitted
        ? 'تُقصر إلى ركعتين سنةً مؤكدةً ويجوز جمعها مع العصر'
        : 'تُصلى أربع ركعات لعدم بلوغ مسافة القصر',
    },
    {
      prayerNameAr: 'العصر',
      residentRakats: 4,
      travelerRakats: isQasrPermitted ? 2 : 4,
      canShorten: isQasrPermitted,
      noteAr: isQasrPermitted
        ? 'تُقصر إلى ركعتين ويجوز جمعها مع الظهر تقديماً أو تأخيراً'
        : 'تُصلى أربع ركعات تامة',
    },
    {
      prayerNameAr: 'المغرب',
      residentRakats: 3,
      travelerRakats: 3,
      canShorten: false,
      noteAr: isQasrPermitted
        ? 'تُصلى ثلاث ركعات ولا تُقصر، ويجوز جمعها مع العشاء'
        : 'تُصلى ثلاث ركعات تامة',
    },
    {
      prayerNameAr: 'العشاء',
      residentRakats: 4,
      travelerRakats: isQasrPermitted ? 2 : 4,
      canShorten: isQasrPermitted,
      noteAr: isQasrPermitted
        ? 'تُقصر إلى ركعتين ويجوز جمعها مع المغرب تقديماً أو تأخيراً'
        : 'تُصلى أربع ركعات تامة',
    },
  ];

  const jamOptions = [
    {
      titleAr: 'الجمع بين الظهر والعصر (قصراً: ركعتان + ركعتان)',
      prayersAr: 'الظهر + العصر',
      explanationAr:
        'يجوز للمسافر جمع التقديم في وقت الظهر أو جمع التأخير في وقت العصر بأذان واحد وإقامتين.',
    },
    {
      titleAr: 'الجمع بين المغرب والعشاء (٣ ركعات + ركعتان)',
      prayersAr: 'المغرب + العشاء',
      explanationAr:
        'يجوز للمسافر جمع التقديم في وقت المغرب أو جمع التأخير في وقت العشاء بأذان واحد وإقامتين.',
    },
  ];

  return {
    originCity,
    destinationCity,
    distanceKm,
    isQasrPermitted,
    rulingTitleAr: isQasrPermitted
      ? `تتحقق رخصة السفر (المسافة ${distanceKm} كم ≥ ٨٠ كم)`
      : `مسافة داخل النطاق الحضري (${distanceKm} كم < ٨٠ كم)`,
    rulingExplanationAr: isQasrPermitted
      ? 'يُشرع لك قصر الصلاة الرباعية (الظهر، العصر، العشاء) ركعتين بدلاً من أربع بمجرد مفارقة بنيان مدينتك، مع رخصة الجمع بين الظهر والعصر وبين المغرب والعشاء، والفطر في رمضان مع القضاء.'
      : 'المسافة بين الموقعين أقل من مسافة القصر المحددة عند جمهور الفقهاء (نحو ٨٠ كم)، فتُصلى الصلوات الرباعية تامة أربع ركعات.',
    prayerRakats,
    jamOptions,
  };
}

// ============================================================================
// 3. دليل ومطوّف الحج والعمرة التفاعلي (Tawaf & Sa'i 7-Lap Logic)
// ============================================================================

export interface LapInfo {
  type: 'tawaf' | 'sai';
  lapNumber: number; // 1..7
  titleAr: string;
  routeAr: string;
  sunnahActionAr: string;
  duaTextAr: string;
  duaSourceAr: string;
}

const TAWAF_LAP_DUAS: { dua: string; source: string; sunnah: string }[] = [
  {
    dua: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ إِيمَانًا بِكَ وَتَصْدِيقًا بِكِتَابِكَ وَوَفَاءً بِعَهْدِكَ وَاتِّبَاعًا لِسُنَّةِ نَبِيِّكَ مُحَمَّدٍ ﷺ. رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.',
    source: 'التكبير عند الحجر الأسود والدعاء بين الركنين (متفق عليه)',
    sunnah: 'يُسنّ للرجال الاضطباع والرَّمَل (إسراع المشي مع تقارب الخطى) في الأشواط الثلاثة الأولى من طواف القدوم.',
  },
  {
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدِّينِ وَالدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا.',
    source: 'من جوامع الدعاء المأثور في الطواف',
    sunnah: 'يُستحب استلام الركن اليماني باليد اليمنى دون تقبيله، والقول بينه وبين الحجر الأسود: ربنا آتنا في الدنيا حسنة...',
  },
  {
    dua: 'اللَّهُمَّ يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ وَأَعُوذُ بِكَ مِنْ سَخَطِكَ وَالنَّارِ.',
    source: 'رواه الترمذي وصححه الألباني',
    sunnah: 'آخر أشواط الرَّمَل للرجال في طواف العمرة أو طواف القدوم.',
  },
  {
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ، وَأَعُوذُ بِكَ مِنَ الشَّرِّ كُلِّهِ عَاجِلِهِ وَآجِلِهِ.',
    source: 'رواه ابن ماجه وصححه الألباني',
    sunnah: 'المشي على الهينة والسكينة في الأشواط الأربعة الباقية مع الإكثار من الذكر والدعاء.',
  },
  {
    dua: 'اللَّهُمَّ أَظِلَّنِي تَحْتَ ظِلِّ عَرْشِكَ يَوْمَ لَا ظِلَّ إِلَّا ظِلُّكَ، وَاسْقِنِي مِنْ حَوْضِ نَبِيِّكَ مُحَمَّدٍ ﷺ شَرْبَةً هَنِيئَةً لَا أَظْمَأُ بَعْدَهَا أَبَدًا.',
    source: 'من الأدعية الجامعة في الطواف',
    sunnah: 'الإقبال على الله بالخشوع والتضرع والتكبير كلما حاذيت الحجر الأسود.',
  },
  {
    dua: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي، اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِجَمِيعِ الْمُسْلِمِينَ وَالْمُسْلِمَاتِ.',
    source: 'رواه الترمذي (٣٥١٣)',
    sunnah: 'الدعاء للنفس والوالدين والأهل وعموم المسلمين بخيري الدنيا والآخرة.',
  },
  {
    dua: 'اللَّهُمَّ تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ، وَتَوَفَّنَا مُسْلِمِينَ وَأَلْحِقْنَا بِالصَّالِحِينَ.',
    source: 'سورة البقرة [١٢٧-١٢٨]',
    sunnah: 'بعد إتمام الشوط السابع تُغطي كتفيك وتُصلي ركعتين خلف مقام إبراهيم إن تيسر وتقرأ فيهما (الكافرون) و(الإخلاص).',
  },
];

export function calculateTawafOrSaiLapInfo(
  type: 'tawaf' | 'sai',
  lapNumber: number
): LapInfo {
  const clamped = Math.max(1, Math.min(7, Math.round(lapNumber)));
  const entry = TAWAF_LAP_DUAS[clamped - 1];

  if (type === 'tawaf') {
    return {
      type: 'tawaf',
      lapNumber: clamped,
      titleAr: `الشوط ${clamped} من ٧ — الطواف حول الكعبة المشرفة`,
      routeAr: 'يبدأ من محاذاة الحجر الأسود وينتهي عند الحجر الأسود (الكعبة عن يسارك)',
      sunnahActionAr: entry.sunnah,
      duaTextAr: entry.dua,
      duaSourceAr: entry.source,
    };
  }

  const isOdd = clamped % 2 === 1;
  return {
    type: 'sai',
    lapNumber: clamped,
    titleAr: `الشوط ${clamped} من ٧ — السعي بين الصفا والمروة`,
    routeAr: isOdd
      ? 'الاتجاه: من جبل الصَّفَا إلى جبل المَرْوَة (شوط فردي)'
      : 'الاتجاه: من جبل المَرْوَة إلى جبل الصَّفَا (شوط زوجي)',
    sunnahActionAr:
      clamped === 1
        ? 'تبدأ بالصفا فتقرأ: ﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ﴾ «أبدأ بما بدأ الله به»، وتستقبل القبلة وتكبّر ثلاثاً وتهلل وتدعو، ويسعى الرجال سعياً شديداً بين العلمين الأخضرين.'
        : clamped === 7
        ? 'ينتهي الشوط السابع عند جبل المروة، وبذلك يتم السعي ويعقبه الحلق أو التقصير للتحلل.'
        : 'الوقوف على الصفا والمروة لاستقبال القبلة والتكبير والتهليل والدعاء، مع الإسراع للرجال بين العلمين الأخضرين.',
    duaTextAr:
      'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ. رَبِّ اغْفِرْ وَارْحَمْ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ.',
    duaSourceAr: 'رواه مسلم (١٢١٨) من حديث جابر رضي الله عنه في صفة حجة النبي ﷺ',
  };
}

// ============================================================================
// 4. الختمة الجماعية أو العائلية (Group / Family 30-Juz Khatmah)
// ============================================================================

export interface GroupJuzAssignment {
  juzNumber: number; // 1..30
  readerName: string;
  completed: boolean;
}

export interface GroupKhatmahSummary {
  totalJuz: 30;
  completedCount: number;
  remainingCount: number;
  completionPercent: number;
  assignedCount: number;
  participantsCount: number;
}

export function calculateGroupKhatmahSummary(
  assignments: GroupJuzAssignment[]
): GroupKhatmahSummary {
  const completedCount = assignments.filter((a) => a.completed).length;
  const remainingCount = 30 - completedCount;
  const completionPercent = Math.round((completedCount / 30) * 100);
  const nonEmptyReaders = assignments
    .map((a) => a.readerName.trim())
    .filter((name) => name.length > 0);
  const assignedCount = nonEmptyReaders.length;
  const participantsCount = new Set(nonEmptyReaders).size;

  return {
    totalJuz: 30,
    completedCount,
    remainingCount,
    completionPercent,
    assignedCount,
    participantsCount,
  };
}

export function distributeJuzAmongMembers(
  currentAssignments: GroupJuzAssignment[],
  memberNames: string[]
): GroupJuzAssignment[] {
  const cleanMembers = memberNames.map((m) => m.trim()).filter(Boolean);
  if (cleanMembers.length === 0) return currentAssignments;

  return currentAssignments.map((item, idx) => ({
    ...item,
    readerName: cleanMembers[idx % cleanMembers.length],
  }));
}

// ============================================================================
// 5. منبّه الفجر الذكي (Smart Fajr Alarm Calculations)
// ============================================================================

export function calculateSmartFajrAlarmTime(
  fajrTimeHHMM: string,
  offsetMinutesBefore: number
): { alarmTimeHHMM: string; descriptionAr: string } {
  const parts = fajrTimeHHMM.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) ? parts[0] : 4;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 30;
  const fajrTotalMins = hours * 60 + minutes;
  const offset = Math.max(0, Math.min(120, Math.round(offsetMinutesBefore)));
  const targetMins = (fajrTotalMins - offset + 1440) % 1440;
  const h = Math.floor(targetMins / 60);
  const m = targetMins % 60;
  const alarmTimeHHMM = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const descriptionAr =
    offset === 0
      ? `مع أذان الفجر تماماً (${alarmTimeHHMM})`
      : `قبل أذان الفجر بـ ${offset} دقيقة لقيام الليل والوتر (${alarmTimeHHMM})`;

  return { alarmTimeHHMM, descriptionAr };
}

// ============================================================================
// 6. محدد المساجد القريبة والبوصلة الميدانية (Nearby Mosques & Qibla Vector)
// ============================================================================

export interface NearbyMosque {
  id: string;
  nameAr: string;
  districtAr: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  walkingMinutes: number;
  drivingMinutes: number;
  qiblaBearingDeg: number;
  featuresAr: string;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
}

export interface MosqueNavigationUrls {
  googleMapsDirUrl: string;
  googleMapsPlaceUrl: string;
  appleMapsDirUrl: string;
  wazeNavUrl: string;
}

export function calculateMetersBetweenCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function buildMosqueNavigationUrls(
  origin: { lat: number; lng: number },
  destination: {
    lat: number;
    lng: number;
    placeId?: string | null;
    googleMapsURI?: string | null;
  },
  travelMode: 'walking' | 'driving' = 'walking'
): MosqueNavigationUrls {
  const originParam = `${origin.lat},${origin.lng}`;
  const destParam = `${destination.lat},${destination.lng}`;
  const placeIdParam =
    destination.placeId && !destination.placeId.startsWith('mosque-')
      ? `&destination_place_id=${encodeURIComponent(destination.placeId)}`
      : '';

  const googleMapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}${placeIdParam}&travelmode=${travelMode}`;

  const googleMapsPlaceUrl =
    destination.googleMapsURI ||
    `https://www.google.com/maps/search/?api=1&query=${destParam}${
      destination.placeId && !destination.placeId.startsWith('mosque-')
        ? `&query_place_id=${encodeURIComponent(destination.placeId)}`
        : ''
    }`;

  const appleDirFlag = travelMode === 'walking' ? 'w' : 'd';
  const appleMapsDirUrl = `https://maps.apple.com/?saddr=${originParam}&daddr=${destParam}&dirflg=${appleDirFlag}`;

  const wazeNavUrl = `https://waze.com/ul?ll=${destParam}&navigate=yes`;

  return {
    googleMapsDirUrl,
    googleMapsPlaceUrl,
    appleMapsDirUrl,
    wazeNavUrl,
  };
}

export interface RawGooglePlaceLike {
  id?: string | null;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?:
    | {
        lat: number | (() => number);
        lng: number | (() => number);
      }
    | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
}

export function mapPlaceResultToMosque(
  place: RawGooglePlaceLike,
  userLat: number,
  userLng: number,
  fallbackIndex = 0
): NearbyMosque | null {
  if (!place || !place.location) return null;

  const rawLat = place.location.lat;
  const rawLng = place.location.lng;
  const latitude = typeof rawLat === 'function' ? rawLat() : Number(rawLat);
  const longitude = typeof rawLng === 'function' ? rawLng() : Number(rawLng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const distanceMeters = calculateMetersBetweenCoords(
    userLat,
    userLng,
    latitude,
    longitude
  );
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75)); // ~4.5 km/h walking
  const drivingMinutes = Math.max(1, Math.round(distanceMeters / 500)); // ~30 km/h urban driving
  const qiblaBearingDeg = calculateQiblaDirection(latitude, longitude);

  const ratingText =
    typeof place.rating === 'number'
      ? `تقييم ${place.rating.toFixed(1)}${
          place.userRatingCount ? ` (${place.userRatingCount})` : ''
        }`
      : 'مسجد / جامع';

  return {
    id: place.id || `mosque-${fallbackIndex}`,
    nameAr: place.displayName || 'مسجد',
    districtAr: place.formattedAddress || '',
    latitude,
    longitude,
    distanceMeters,
    walkingMinutes,
    drivingMinutes,
    qiblaBearingDeg,
    featuresAr: ratingText,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsURI: place.googleMapsURI ?? null,
  };
}

export function sortAndEnrichMosquePlaces(
  places: RawGooglePlaceLike[],
  userLat: number,
  userLng: number
): NearbyMosque[] {
  const mapped: NearbyMosque[] = [];
  places.forEach((p, idx) => {
    const item = mapPlaceResultToMosque(p, userLat, userLng, idx);
    if (item) mapped.push(item);
  });
  mapped.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return mapped;
}

// ============================================================================
// 7. محرك المسبحة المحرابية التفاعلية (33-Bead Interactive Misbahah Engine)
// ============================================================================

export interface MasbahaPhraseSpec {
  id: string;
  titleAr: string;
  textAr: string;
  hadithAr: string;
  defaultTarget: number;
  isGuidedPostPrayer?: boolean;
}

export const MASBAHA_PHRASES: MasbahaPhraseSpec[] = [
  {
    id: 'subhanallah_wabihamdihi',
    titleAr: 'سبحان الله وبحمده',
    textAr: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    hadithAr:
      '«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن» — متفق عليه (البخاري ٦٤٠٦، مسلم ٢٦٩٤)',
    defaultTarget: 100,
  },
  {
    id: 'post_prayer_sunnah',
    titleAr: 'تسبيح دبر الصلوات المفروضة (٣٣×٣ + تمام المائة)',
    textAr: 'سُبْحَانَ اللَّهِ (٣٣) · الْحَمْدُ لِلَّهِ (٣٣) · اللَّهُ أَكْبَرُ (٣٣) · تمام المائة',
    hadithAr:
      'قال ﷺ: «مَن سبَّح الله في دُبُر كل صلاة ثلاثاً وثلاثين، وحمد الله ثلاثاً وثلاثين، وكبَّر الله ثلاثاً وثلاثين، فتلك تسعة وتسعون، وقال تمام المائة: لا إله إلا الله وحده لا شريك له... غُفرت خطاياه وإن كانت مثل زبد البحر» — رواه مسلم (٥٩٧)',
    defaultTarget: 100,
    isGuidedPostPrayer: true,
  },
  {
    id: 'istighfar',
    titleAr: 'الاستغفار والتوبة',
    textAr: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    hadithAr:
      'قال ﷺ: «والله إني لأستغفر الله وأتوب إليه في اليوم أكثر من سبعين مرّة» — رواه البخاري (٦٣٠٧)',
    defaultTarget: 100,
  },
  {
    id: 'hawqalah',
    titleAr: 'الحوقلة (كنز من كنوز الجنة)',
    textAr: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    hadithAr:
      'قال ﷺ لأبي موسى الأشعري: «ألا أدلّك على كنزٍ من كنوز الجنة؟ لا حول ولا قوة إلا بالله» — متفق عليه',
    defaultTarget: 33,
  },
  {
    id: 'salawat',
    titleAr: 'الصلاة على النبي ﷺ',
    textAr: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    hadithAr:
      'قال ﷺ: «مَن صلّى عليَّ صلاةً واحدة صلّى الله عليه عشر صلوات» — رواه مسلم (٤٠٨)',
    defaultTarget: 100,
  },
  {
    id: 'tahlil_mihrab',
    titleAr: 'التهليل والتوحيد الجامع',
    textAr:
      'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    hadithAr:
      'قال ﷺ: «مَن قالها في يوم مائة مرة كانت له عدل عشر رقاب، وكُتبت له مائة حسنة، ومُحيت عنه مائة سيئة» — متفق عليه',
    defaultTarget: 100,
  },
  {
    id: 'yunus_dua',
    titleAr: 'دعاء ذي النون (تفريج الكروب)',
    textAr: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    hadithAr:
      'قال ﷺ: «دعوة ذي النون إذ دعا وهو في بطن الحوت... فإنه لم يدعُ بها رجل مسلم في شيء قط إلا استجاب الله له» — صححه الترمذي (٣٥٠٥)',
    defaultTarget: 33,
  },
];

export interface PostPrayerStageInfo {
  stageIndex: 1 | 2 | 3 | 4;
  stageTitleAr: string;
  currentPhraseAr: string;
  countInStage: number;
  stageTarget: number;
}

export interface MasbahaComputedState {
  sessionCount: number;
  target: number;
  litBeadsCount: number; // 0..33
  activeBeadIndex: number; // -1 when 0, else 0..32
  completedRoundsOf33: number;
  completedTargetRounds: number;
  progressPercent: number; // 0..100
  isTargetMilestoneReached: boolean;
  is33CycleMilestoneReached: boolean;
  activeDisplayPhraseAr: string;
  postPrayerStage: PostPrayerStageInfo | null;
}

export function getPostPrayerTasbihStage(sessionCount: number): PostPrayerStageInfo {
  const cyclePos = Math.max(0, sessionCount) % 100;
  if (cyclePos < 33) {
    return {
      stageIndex: 1,
      stageTitleAr: 'التسبيح (١ - ٣٣)',
      currentPhraseAr: 'سُبْحَانَ اللَّهِ',
      countInStage: cyclePos,
      stageTarget: 33,
    };
  }
  if (cyclePos < 66) {
    return {
      stageIndex: 2,
      stageTitleAr: 'التحميد (٣٤ - ٦٦)',
      currentPhraseAr: 'الْحَمْدُ لِلَّهِ',
      countInStage: cyclePos - 33,
      stageTarget: 33,
    };
  }
  if (cyclePos < 99) {
    return {
      stageIndex: 3,
      stageTitleAr: 'التكبير (٦٧ - ٩٩)',
      currentPhraseAr: 'اللَّهُ أَكْبَرُ',
      countInStage: cyclePos - 66,
      stageTarget: 33,
    };
  }
  return {
    stageIndex: 4,
    stageTitleAr: 'تمام المائة (١٠٠)',
    currentPhraseAr:
      'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    countInStage: 1,
    stageTarget: 1,
  };
}

export function calculateMasbahaState(
  sessionCount: number,
  target: number,
  phraseSpec: MasbahaPhraseSpec
): MasbahaComputedState {
  const safeCount = Math.max(0, Math.floor(sessionCount));
  const safeTarget = Math.max(0, Math.floor(target));

  const litBeadsCount = safeCount === 0 ? 0 : ((safeCount - 1) % 33) + 1;
  const activeBeadIndex = safeCount === 0 ? -1 : (safeCount - 1) % 33;
  const completedRoundsOf33 = Math.floor(safeCount / 33);
  const completedTargetRounds =
    safeTarget > 0 ? Math.floor(safeCount / safeTarget) : 0;

  let progressPercent = 0;
  if (safeTarget > 0 && safeCount > 0) {
    const remainder = safeCount % safeTarget;
    const effective = remainder === 0 ? safeTarget : remainder;
    progressPercent = Math.min(100, Math.round((effective / safeTarget) * 100));
  } else if (safeTarget === 0 && safeCount > 0) {
    progressPercent = Math.min(100, Math.round((litBeadsCount / 33) * 100));
  }

  const isTargetMilestoneReached =
    safeCount > 0 && safeTarget > 0 && safeCount % safeTarget === 0;
  const is33CycleMilestoneReached = safeCount > 0 && safeCount % 33 === 0;

  const postPrayerStage = phraseSpec.isGuidedPostPrayer
    ? getPostPrayerTasbihStage(safeCount)
    : null;

  const activeDisplayPhraseAr = postPrayerStage
    ? postPrayerStage.currentPhraseAr
    : phraseSpec.textAr;

  return {
    sessionCount: safeCount,
    target: safeTarget,
    litBeadsCount,
    activeBeadIndex,
    completedRoundsOf33,
    completedTargetRounds,
    progressPercent,
    isTargetMilestoneReached,
    is33CycleMilestoneReached,
    activeDisplayPhraseAr,
    postPrayerStage,
  };
}

/**
 * Synthesizes a subtle tactile wooden/amber Masbahah bead click or milestone chime
 * using Web Audio API and triggers soft mobile haptic feedback when enabled.
 */
export function triggerMasbahaTactileFeedback(options: {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isMilestone: boolean;
}): void {
  if (typeof window === 'undefined') return;

  if (options.hapticEnabled && 'vibrate' in navigator) {
    try {
      navigator.vibrate(options.isMilestone ? [30, 45, 55] : 12);
    } catch {
      // Ignore vibration errors on unsupported browsers
    }
  }

  if (!options.soundEnabled) return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (options.isMilestone) {
      // Gentle two-note warm harmonic chime on completing 33 or target
      const freqs = [528, 660];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.34);
      });
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 550);
    } else {
      // Soft wooden bead click (short pitch-drop impulse)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.028);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 100);
    }
  } catch {
    // Ignore Web Audio restrictions
  }
}

// ============================================================================
// 8. المواقيت النورانية والسنن اليومية وأوقات النهي (Night Thirds, Duha & Prohibited Windows)
// ============================================================================

export interface SunnahAndNightWindowsResult {
  duhaStartHHMM: string;
  duhaEndHHMM: string;
  ishraqEndHHMM: string;
  firstThirdEndHHMM: string;
  islamicMidnightHHMM: string;
  lastThirdStartHHMM: string;
  fajrHHMM: string;
  nightDurationMinutes: number;
  prohibitedWindows: {
    id: 'sunrise' | 'zenith' | 'sunset';
    titleAr: string;
    fromHHMM: string;
    toHHMM: string;
    hadithNoteAr: string;
  }[];
  activeStatus: {
    kind: 'last_third' | 'duha' | 'prohibited' | 'first_two_thirds' | 'daytime';
    badgeAr: string;
    titleAr: string;
    virtueOrRulingAr: string;
  };
}

function parseMinutes(hhmm: string): number {
  const parts = (hhmm || '00:00').split(':').map(Number);
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isMinuteWithinRange(target: number, start: number, end: number): boolean {
  if (start <= end) {
    return target >= start && target < end;
  }
  // Crosses midnight (e.g. 22:00 to 04:30)
  return target >= start || target < end;
}

/**
 * Calculates astronomical Sunnah prayer windows (Ishraq, Duha, Islamic Midnight,
 * First/Middle/Last Third of the Night from Maghrib to Fajr) and the 3 authentic
 * prohibited voluntary prayer intervals.
 */
export function calculateSunnahAndNightWindows(params: {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  currentHours?: number;
  currentMinutes?: number;
}): SunnahAndNightWindowsResult {
  const fajrMin = parseMinutes(params.fajr);
  const sunriseMin = parseMinutes(params.sunrise);
  const dhuhrMin = parseMinutes(params.dhuhr);
  const maghribMin = parseMinutes(params.maghrib);

  // Night duration from Maghrib until next Fajr
  const nightDurationMinutes =
    fajrMin >= maghribMin
      ? fajrMin - maghribMin
      : 1440 - maghribMin + fajrMin;

  const oneThirdMinutes = nightDurationMinutes / 3;
  const firstThirdEndMin = (maghribMin + oneThirdMinutes) % 1440;
  const islamicMidnightMin = (maghribMin + nightDurationMinutes / 2) % 1440;
  const lastThirdStartMin = (maghribMin + oneThirdMinutes * 2) % 1440;

  // Duha window: starts 15 minutes after sunrise (قيد رمح) and ends 10 minutes before Dhuhr (قبيل الزوال)
  const duhaStartMin = (sunriseMin + 15) % 1440;
  const ishraqEndMin = (sunriseMin + 35) % 1440;
  const duhaEndMin = (dhuhrMin - 10 + 1440) % 1440;

  // Prohibited voluntary prayer windows (أوقات النهي الثلاثة المضبوطة)
  const sunsetProhibitedStartMin = (maghribMin - 15 + 1440) % 1440;

  const prohibitedWindows: SunnahAndNightWindowsResult['prohibitedWindows'] = [
    {
      id: 'sunrise',
      titleAr: 'من طلوع الشمس حتى ترتفع قيد رمح',
      fromHHMM: formatMinutesToHHMM(sunriseMin),
      toHHMM: formatMinutesToHHMM(duhaStartMin),
      hadithNoteAr: 'نحو ١٥ دقيقة بعد الشروق (رواه مسلم ٨٣١)',
    },
    {
      id: 'zenith',
      titleAr: 'عند قيام الشمس في كبد السماء حتى تزول',
      fromHHMM: formatMinutesToHHMM(duhaEndMin),
      toHHMM: formatMinutesToHHMM(dhuhrMin),
      hadithNoteAr: 'نحو ١٠ دقائق قبيل أذان الظهر (رواه مسلم ٨٣١)',
    },
    {
      id: 'sunset',
      titleAr: 'عند اصفرار الشمس وميلها للغروب حتى تغرب',
      fromHHMM: formatMinutesToHHMM(sunsetProhibitedStartMin),
      toHHMM: formatMinutesToHHMM(maghribMin),
      hadithNoteAr: 'نحو ١٥ دقيقة قبيل أذان المغرب للنافلة المطلقة',
    },
  ];

  const nowMin =
    typeof params.currentHours === 'number' &&
    typeof params.currentMinutes === 'number'
      ? (params.currentHours * 60 + params.currentMinutes) % 1440
      : 720;

  let activeStatus: SunnahAndNightWindowsResult['activeStatus'];

  if (isMinuteWithinRange(nowMin, lastThirdStartMin, fajrMin)) {
    activeStatus = {
      kind: 'last_third',
      badgeAr: 'الآن: الثلث الأخير من الليل',
      titleAr: 'وقت التنزّل الإلهي والتهجّد والاستغفار بالأسحار',
      virtueOrRulingAr:
        '«يَنْزِلُ رَبُّنَا تَبَارَكَ وَتَعَالَى كُلَّ لَيْلَةٍ إِلَى السَّمَاءِ الدُّنْيَا حِينَ يَبْقَى ثُلُثُ اللَّيْلِ الآخِرُ يَقُولُ: مَنْ يَدْعُونِي فَأَسْتَجِيبَ لَهُ» (متفق عليه)',
    };
  } else if (isMinuteWithinRange(nowMin, duhaStartMin, duhaEndMin)) {
    activeStatus = {
      kind: 'duha',
      badgeAr: 'الآن: وقت صلاة الضحى (الأوابين)',
      titleAr: 'وقت صلاة الإشراق والضحى مفتوح الآن',
      virtueOrRulingAr:
        '«يُصْبِحُ عَلَى كُلِّ سُلَامَى مِنْ أَحَدِكُمْ صَدَقَةٌ... وَيُجْزِئُ مِنْ ذَلِكَ رَكْعَتَانِ يَرْكَعُهُمَا مِنَ الضُّحَى» (رواه مسلم ٧٢٠)',
    };
  } else if (
    isMinuteWithinRange(nowMin, sunriseMin, duhaStartMin) ||
    isMinuteWithinRange(nowMin, duhaEndMin, dhuhrMin) ||
    isMinuteWithinRange(nowMin, sunsetProhibitedStartMin, maghribMin)
  ) {
    activeStatus = {
      kind: 'prohibited',
      badgeAr: 'تنبيه فقهي: وقت نهي عن النافلة المطلقة',
      titleAr: 'يُمسك الآن عن التطوع المطلق بالصلاة حتى يدخل الوقت التالي',
      virtueOrRulingAr:
        'يُشرع في هذا الوقت الذكر والاستغفار وتلاوة القرآن، وتجوز الفرائض المقضية وذوات الأسباب على القول الراجح.',
    };
  } else if (isMinuteWithinRange(nowMin, maghribMin, lastThirdStartMin)) {
    activeStatus = {
      kind: 'first_two_thirds',
      badgeAr: 'أول الليل وأوسطه',
      titleAr: `يبدأ الثلث الأخير من الليل الساعة ${formatMinutesToHHMM(lastThirdStartMin)}`,
      virtueOrRulingAr: `منتصف الليل الشرعي الساعة ${formatMinutesToHHMM(islamicMidnightMin)} — يمتد وقت العشاء الاختياري والقيام.`,
    };
  } else {
    activeStatus = {
      kind: 'daytime',
      badgeAr: 'أوقات النهار المباركة',
      titleAr: `يبدأ الثلث الأخير من الليل القادم الساعة ${formatMinutesToHHMM(lastThirdStartMin)}`,
      virtueOrRulingAr:
        'حافظ على السنن الرواتب الاثنتي عشرة ركعة وأذكار ما بعد الصلوات المفروضة.',
    };
  }

  return {
    duhaStartHHMM: formatMinutesToHHMM(duhaStartMin),
    duhaEndHHMM: formatMinutesToHHMM(duhaEndMin),
    ishraqEndHHMM: formatMinutesToHHMM(ishraqEndMin),
    firstThirdEndHHMM: formatMinutesToHHMM(firstThirdEndMin),
    islamicMidnightHHMM: formatMinutesToHHMM(islamicMidnightMin),
    lastThirdStartHHMM: formatMinutesToHHMM(lastThirdStartMin),
    fajrHHMM: formatMinutesToHHMM(fajrMin),
    nightDurationMinutes,
    prohibitedWindows,
    activeStatus,
  };
}

// ============================================================================
// 9. حاسبة الزكاة الشرعية الشاملة (المال، الذهب والفضة، التجارة، وزكاة الفطر)
// ============================================================================

export interface ZakatInput {
  cashAndSavings: number;
  tradeGoodsAndStocks: number;
  goldGrams24K: number;
  goldGrams21K: number;
  goldGrams18K: number;
  silverGrams: number;
  immediateDebts: number;
  goldPricePerGram24K: number;
  silverPricePerGram: number;
  nisabStandard: 'gold_85g' | 'silver_595g';
  calendarYearType: 'hijri_lunar' | 'gregorian_solar';
  familyMembersCount: number;
  fitrCostPerPerson: number;
}

export interface ZakatCalculationResult {
  pureGoldEquivalentGrams: number;
  goldValuationAmount: number;
  silverValuationAmount: number;
  grossZakatableWealth: number;
  netZakatableWealth: number;
  goldNisabThresholdAmount: number;
  silverNisabThresholdAmount: number;
  activeNisabThresholdAmount: number;
  isNisabReached: boolean;
  zakatRatePercent: number;
  totalZakatDueAmount: number;
  zakatAlFitrTotalAmount: number;
  zakatAlFitrTotalKg: number;
  rulingSummaryAr: string;
  shariahEvidenceAr: string;
}

export const GOLD_NISAB_GRAMS_24K = 85;
export const SILVER_NISAB_GRAMS = 595;
export const SA_WEIGHT_KG = 2.5; // الصاع النبوي يقدر بنحو 2.5 كجم من غالب قوت البلد

/**
 * Calculates comprehensive Shariah Zakat across cash, trade goods, multi-karat gold
 * (24K, 21K, 18K normalized to 24K pure gold), silver, minus immediate debts,
 * plus Zakat Al-Fitr (in both weight Kg and cash equivalent).
 */
export function calculateComprehensiveZakat(
  input: ZakatInput
): ZakatCalculationResult {
  const safeCash = Math.max(0, input.cashAndSavings || 0);
  const safeTrade = Math.max(0, input.tradeGoodsAndStocks || 0);
  const safeG24 = Math.max(0, input.goldGrams24K || 0);
  const safeG21 = Math.max(0, input.goldGrams21K || 0);
  const safeG18 = Math.max(0, input.goldGrams18K || 0);
  const safeSilverG = Math.max(0, input.silverGrams || 0);
  const safeDebts = Math.max(0, input.immediateDebts || 0);

  const goldPrice24 = Math.max(1, input.goldPricePerGram24K || 310);
  const silverPrice = Math.max(0.5, input.silverPricePerGram || 3.8);

  // Convert 21K (21/24 = 0.875) and 18K (18/24 = 0.75) to pure 24K equivalent grams
  const pureGoldEquivalentGrams =
    safeG24 + safeG21 * (21 / 24) + safeG18 * (18 / 24);
  const goldValuationAmount = pureGoldEquivalentGrams * goldPrice24;
  const silverValuationAmount = safeSilverG * silverPrice;

  const grossZakatableWealth =
    safeCash + safeTrade + goldValuationAmount + silverValuationAmount;
  const netZakatableWealth = Math.max(0, grossZakatableWealth - safeDebts);

  const goldNisabThresholdAmount = GOLD_NISAB_GRAMS_24K * goldPrice24;
  const silverNisabThresholdAmount = SILVER_NISAB_GRAMS * silverPrice;

  const activeNisabThresholdAmount =
    input.nisabStandard === 'silver_595g'
      ? silverNisabThresholdAmount
      : goldNisabThresholdAmount;

  const isNisabReached =
    netZakatableWealth >= activeNisabThresholdAmount &&
    activeNisabThresholdAmount > 0;

  // Hijri lunar year rate is 2.5% (ربع العشر); Gregorian solar year is 2.577% (365/354.36 * 2.5%)
  const zakatRatePercent =
    input.calendarYearType === 'gregorian_solar' ? 2.577 : 2.5;

  const totalZakatDueAmount = isNisabReached
    ? (netZakatableWealth * zakatRatePercent) / 100
    : 0;

  const safeFamilyCount = Math.max(1, Math.round(input.familyMembersCount || 1));
  const safeFitrCost = Math.max(0, input.fitrCostPerPerson || 25);
  const zakatAlFitrTotalAmount = safeFamilyCount * safeFitrCost;
  const zakatAlFitrTotalKg = safeFamilyCount * SA_WEIGHT_KG;

  const rulingSummaryAr = isNisabReached
    ? `بلغ صافي مالك النصاب الشرعي المعتمد (${Math.round(
        activeNisabThresholdAmount
      ).toLocaleString('en-US')}) وحال عليه الحول، فتجب فيه الزكاة بنسبة ${
        zakatRatePercent === 2.5 ? '٢.٥٪ (ربع العشر)' : '٢.٥٧٧٪ (للسنة الميلادية)'
      }.`
    : `صافي الوعاء الزكوي بعد خصم الديون (${Math.round(
        netZakatableWealth
      ).toLocaleString(
        'en-US'
      )}) لم يبلغ النصاب الشرعي (${Math.round(
        activeNisabThresholdAmount
      ).toLocaleString('en-US')})، فلا زكاة واجبة فيه، وتُستحب الصدقة التطوعية.`;

  const shariahEvidenceAr =
    'قال الله تعالى: ﴿خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِمْ بِهَا﴾ [التوبة: ١٠٣]، وقال ﷺ: «لَيْسَ فِيمَا دُونَ خَمْسِ أَوَاقٍ صَدَقَةٌ» (متفق عليه)، ونصاب الذهب عشرون مثقالاً (٨٥ جراماً عيار ٢٤)، ونصاب الفضة مئتا درهم (٥٩٥ جراماً).';

  return {
    pureGoldEquivalentGrams: Number(pureGoldEquivalentGrams.toFixed(2)),
    goldValuationAmount: Math.round(goldValuationAmount),
    silverValuationAmount: Math.round(silverValuationAmount),
    grossZakatableWealth: Math.round(grossZakatableWealth),
    netZakatableWealth: Math.round(netZakatableWealth),
    goldNisabThresholdAmount: Math.round(goldNisabThresholdAmount),
    silverNisabThresholdAmount: Math.round(silverNisabThresholdAmount),
    activeNisabThresholdAmount: Math.round(activeNisabThresholdAmount),
    isNisabReached,
    zakatRatePercent,
    totalZakatDueAmount: Math.round(totalZakatDueAmount * 100) / 100,
    zakatAlFitrTotalAmount: Math.round(zakatAlFitrTotalAmount),
    zakatAlFitrTotalKg: Number(zakatAlFitrTotalKg.toFixed(1)),
    rulingSummaryAr,
    shariahEvidenceAr,
  };
}


