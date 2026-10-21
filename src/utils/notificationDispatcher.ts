import {
  DailyPrayerTimes,
  MainPrayerKey,
  PRAYER_METADATA,
} from './astronomy';
import {
  PrayerAlertItemConfig,
  checkActivePrayerAlert,
  formatMinutesToHHMM,
  DUA_AFTER_ADHAN_AR,
} from './khatmahAndAlerts';
import { parseTimeHHMMToMinutes } from './astronomy';
import { playAlertSoundTone } from './soundPlayer';

export const PUSH_CHANNELS_STORAGE_KEY = 'almihrab_push_channels_v1';
export const PUSH_HISTORY_STORAGE_KEY = 'almihrab_push_history_v1';

export interface PushNotificationChannelsConfig {
  adhanPush: boolean;
  preAdhanPush: boolean;
  iqamahPush: boolean;
  adhkarPush: boolean;
  lastThirdPush: boolean;
  fridayKahfPush: boolean;
}

export type NotificationCategory =
  | 'ADHAN'
  | 'PRE_ADHAN'
  | 'IQAMAH'
  | 'ADHKAR_MORNING'
  | 'ADHKAR_EVENING'
  | 'LAST_THIRD'
  | 'FRIDAY_KAHF'
  | 'TEST';

export interface DispatchedIslamicNotification {
  id: string;
  category: NotificationCategory;
  titleAr: string;
  bodyAr: string;
  subtitleOrHadithAr: string;
  timestampHHMM: string;
  createdAtMs: number;
  shouldPlayFullAdhan: boolean;
  prayerNameAr?: string;
  actionTab: 'prayers' | 'quran' | 'adhkar' | 'duas' | 'qibla';
  actionLabelAr: string;
  mushafPage?: number;
}

export function getDefaultPushChannelsConfig(): PushNotificationChannelsConfig {
  return {
    adhanPush: true,
    preAdhanPush: true,
    iqamahPush: true,
    adhkarPush: true,
    lastThirdPush: true,
    fridayKahfPush: true,
  };
}

export function loadPushChannelsConfig(): PushNotificationChannelsConfig {
  if (typeof window === 'undefined') return getDefaultPushChannelsConfig();
  try {
    const raw = localStorage.getItem(PUSH_CHANNELS_STORAGE_KEY);
    if (!raw) return getDefaultPushChannelsConfig();
    const parsed = JSON.parse(raw) as Partial<PushNotificationChannelsConfig>;
    return {
      ...getDefaultPushChannelsConfig(),
      ...parsed,
    };
  } catch {
    return getDefaultPushChannelsConfig();
  }
}

export function savePushChannelsConfig(
  config: PushNotificationChannelsConfig
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUSH_CHANNELS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export const ALL_PUSH_CHANNEL_KEYS: (keyof PushNotificationChannelsConfig)[] = [
  'adhanPush',
  'preAdhanPush',
  'iqamahPush',
  'adhkarPush',
  'lastThirdPush',
  'fridayKahfPush',
];

export function setAllPushChannelsState(
  enabled: boolean
): PushNotificationChannelsConfig {
  const nextConfig: PushNotificationChannelsConfig = {
    adhanPush: enabled,
    preAdhanPush: enabled,
    iqamahPush: enabled,
    adhkarPush: enabled,
    lastThirdPush: enabled,
    fridayKahfPush: enabled,
  };
  savePushChannelsConfig(nextConfig);
  return nextConfig;
}

export function countEnabledPushChannels(
  config: PushNotificationChannelsConfig
): number {
  return ALL_PUSH_CHANNEL_KEYS.filter((k) => Boolean(config[k])).length;
}

export function areAllPushChannelsEnabled(
  config: PushNotificationChannelsConfig
): boolean {
  return countEnabledPushChannels(config) === ALL_PUSH_CHANNEL_KEYS.length;
}

export function buildChannelSpecificNotification(
  channelKey: keyof PushNotificationChannelsConfig,
  params: {
    cityNameAr: string;
    nextPrayerNameAr: string;
    nextPrayerTime: string;
  }
): DispatchedIslamicNotification {
  const { cityNameAr, nextPrayerNameAr, nextPrayerTime } = params;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentHHMM = `${hh}:${mm}`;

  switch (channelKey) {
    case 'adhanPush':
      return {
        id: `manual-adhan-${Date.now()}`,
        category: 'ADHAN',
        titleAr: `حان الآن موعد أذان ${nextPrayerNameAr} (${nextPrayerTime})`,
        bodyAr: `حسب التوقيت المحلي لمدينة ${cityNameAr} — حيّ على الصلاة، حيّ على الفلاح.`,
        subtitleOrHadithAr: DUA_AFTER_ADHAN_AR,
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: true,
        prayerNameAr: nextPrayerNameAr,
        actionTab: 'prayers',
        actionLabelAr: 'عرض المواقيت والدعاء',
      };

    case 'preAdhanPush':
      return {
        id: `manual-pre-adhan-${Date.now()}`,
        category: 'PRE_ADHAN',
        titleAr: `اقترب أذان ${nextPrayerNameAr} (متبقٍّ ١٠ دقائق)`,
        bodyAr: `موعد أذان ${nextPrayerNameAr} في ${cityNameAr} الساعة ${nextPrayerTime} — تهيّأ بالوضوء والاستعداد للصلاة.`,
        subtitleOrHadithAr:
          'قال ﷺ: «ألا أدلّكم على ما يمحو الله به الخطايا ويرفع به الدرجات؟ إسباغ الوضوء على المكاره، وكثرة الخطا إلى المساجد، وانتظار الصلاة بعد الصلاة» — رواه مسلم',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        prayerNameAr: nextPrayerNameAr,
        actionTab: 'prayers',
        actionLabelAr: 'مواقيت الصلاة',
      };

    case 'iqamahPush':
      return {
        id: `manual-iqamah-${Date.now()}`,
        category: 'IQAMAH',
        titleAr: `تذكير إقامة صلاة ${nextPrayerNameAr} والسنن الرواتب`,
        bodyAr: `اقتربت إقامة صلاة ${nextPrayerNameAr} في ${cityNameAr} — لا تنسَ السنن الرواتب وأذكار دبر الصلاة.`,
        subtitleOrHadithAr:
          'قال ﷺ: «مَن صلّى في يوم وليلة اثنتي عشرة ركعة تطوعاً غير الفريضة بنى الله له بيتاً في الجنة» — رواه مسلم',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        prayerNameAr: nextPrayerNameAr,
        actionTab: 'adhkar',
        actionLabelAr: 'أذكار بعد الصلاة',
      };

    case 'adhkarPush':
      return {
        id: `manual-adhkar-${Date.now()}`,
        category: 'ADHKAR_MORNING',
        titleAr: 'تذكير أذكار الصباح والمساء — حصن المسلم',
        bodyAr:
          'حصّن نفسك وأهلك بتلاوة أذكار الصباح والمساء المأثورة عن النبي ﷺ بالعدّاد التفاعلي.',
        subtitleOrHadithAr:
          'قال تعالى: ﴿وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا﴾ [طه: ١٣٠]',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        actionTab: 'adhkar',
        actionLabelAr: 'فتح حصن المسلم',
      };

    case 'lastThirdPush':
      return {
        id: `manual-last-third-${Date.now()}`,
        category: 'LAST_THIRD',
        titleAr: 'منبّه الثلث الأخير من الليل — وقت التهجّد والدعاء',
        bodyAr:
          'وقت الأسحار والتنزّل الإلهي واستجابة الدعاء — أوتر ولو بركعة وناجِ ربك.',
        subtitleOrHadithAr:
          'قال ﷺ: «ينزل ربنا تبارك وتعالى كل ليلة إلى السماء الدنيا حين يبقى ثلث الليل الآخر فيقول: من يدعوني فأستجيب له» — متفق عليه',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        actionTab: 'duas',
        actionLabelAr: 'أدعية قيام الليل',
      };

    case 'fridayKahfPush':
      return {
        id: `manual-friday-kahf-${Date.now()}`,
        category: 'FRIDAY_KAHF',
        titleAr: 'سنن يوم الجمعة: سورة الكهف والصلاة على النبي ﷺ',
        bodyAr:
          'أكثروا من الصلاة على النبي ﷺ في يوم الجمعة، ونوّروا جمعتكم بتلاوة سورة الكهف.',
        subtitleOrHadithAr:
          'قال ﷺ: «مَن قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين» — صححه الألباني',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        actionTab: 'quran',
        actionLabelAr: 'فتح سورة الكهف (ص ٢٩٣)',
        mushafPage: 293,
      };
  }
}

/**
 * Pure function that evaluates whether the current HH:MM matches any enabled
 * Prayer Adhan, Pre-Adhan, Iqamah, Morning/Evening Adhkar, Last Third of Night, or Friday Kahf alert.
 */
export function evaluateScheduledNotificationsForMinute(params: {
  currentHHMM: string;
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  channelsConfig: PushNotificationChannelsConfig;
  cityNameAr: string;
  lastThirdStartHHMM?: string;
  isFriday?: boolean;
}): DispatchedIslamicNotification | null {
  const {
    currentHHMM,
    todayTimes,
    alertsConfig,
    channelsConfig,
    cityNameAr,
    lastThirdStartHHMM,
    isFriday = false,
  } = params;

  // 1. Check Prayer Alerts (ADHAN, BEFORE, AFTER)
  const prayerTrigger = checkActivePrayerAlert(
    todayTimes,
    alertsConfig,
    currentHHMM
  );

  if (prayerTrigger) {
    const prayerMeta = PRAYER_METADATA.find(
      (p) => p.key === prayerTrigger.prayerKey
    );
    const prayerNameAr = prayerMeta?.nameAr || 'الصلاة';
    const itemCfg = alertsConfig[prayerTrigger.prayerKey];

    if (prayerTrigger.type === 'ADHAN' && channelsConfig.adhanPush) {
      return {
        id: `adhan-${prayerTrigger.prayerKey}-${currentHHMM}`,
        category: 'ADHAN',
        titleAr: `حان الآن موعد أذان ${prayerNameAr} (${currentHHMM})`,
        bodyAr: `حسب التوقيت المحلي لمدينة ${cityNameAr} — حيّ على الصلاة، حيّ على الفلاح.`,
        subtitleOrHadithAr: DUA_AFTER_ADHAN_AR,
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: prayerTrigger.soundId !== 'silent',
        prayerNameAr,
        actionTab: 'prayers',
        actionLabelAr: 'عرض المواقيت والدعاء',
      };
    }

    if (prayerTrigger.type === 'BEFORE' && channelsConfig.preAdhanPush) {
      const mins = itemCfg?.beforeMinutes || 10;
      return {
        id: `pre-adhan-${prayerTrigger.prayerKey}-${currentHHMM}`,
        category: 'PRE_ADHAN',
        titleAr: `اقترب أذان ${prayerNameAr} (متبقٍّ ${mins} دقيقة)`,
        bodyAr: `موعد أذان ${prayerNameAr} في ${cityNameAr} الساعة ${todayTimes[prayerTrigger.prayerKey]} — تهيّأ بالوضوء والاستعداد للصلاة.`,
        subtitleOrHadithAr:
          'قال ﷺ: «ألا أدلّكم على ما يمحو الله به الخطايا ويرفع به الدرجات؟ إسباغ الوضوء على المكاره، وكثرة الخطا إلى المساجد، وانتظار الصلاة بعد الصلاة» — رواه مسلم',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        prayerNameAr,
        actionTab: 'prayers',
        actionLabelAr: 'مواقيت الصلاة',
      };
    }

    if (prayerTrigger.type === 'AFTER' && channelsConfig.iqamahPush) {
      const isSunrise = prayerTrigger.prayerKey === 'sunrise';
      return {
        id: `iqamah-${prayerTrigger.prayerKey}-${currentHHMM}`,
        category: 'IQAMAH',
        titleAr: isSunrise
          ? `حان وقت صلاة الإشراق والضحى (${currentHHMM})`
          : `تذكير إقامة صلاة ${prayerNameAr} والسنن الرواتب`,
        bodyAr: isSunrise
          ? 'ارتفعت الشمس قيد رمح وخرج وقت النهي — صلاة الأوابين تعدل ٣٦٠ صدقة.'
          : `مضى ${itemCfg?.afterMinutes || 15} دقيقة على أذان ${prayerNameAr} — لا تنسَ أذكار دبر الصلاة والسنن الرواتب.`,
        subtitleOrHadithAr: isSunrise
          ? 'قال ﷺ: «يُصبح على كل سُلامى من أحدكم صدقة... ويجزئ من ذلك ركعتان يركعهما من الضحى» — رواه مسلم'
          : 'قال ﷺ: «مَن صلّى في يوم وليلة اثنتي عشرة ركعة تطوعاً غير الفريضة بنى الله له بيتاً في الجنة» — رواه مسلم',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        prayerNameAr,
        actionTab: 'adhkar',
        actionLabelAr: 'أذكار بعد الصلاة',
      };
    }
  }

  // 2. Check Morning & Evening Adhkar Windows
  if (channelsConfig.adhkarPush) {
    const sunriseMins = parseTimeHHMMToMinutes(todayTimes.sunrise);
    const morningAdhkarHHMM = formatMinutesToHHMM(sunriseMins + 20);
    if (currentHHMM === morningAdhkarHHMM) {
      return {
        id: `adhkar-morning-${currentHHMM}`,
        category: 'ADHKAR_MORNING',
        titleAr: 'تذكير أذكار الصباح — حصن المسلم',
        bodyAr:
          'ابدأ يومك في حفظ الله وكنفه بتلاوة أذكار الصباح المأثورة عن النبي ﷺ.',
        subtitleOrHadithAr:
          'قال تعالى: ﴿وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا﴾ [طه: ١٣٠]',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        actionTab: 'adhkar',
        actionLabelAr: 'فتح أذكار الصباح',
      };
    }

    const asrMins = parseTimeHHMMToMinutes(todayTimes.asr);
    const eveningAdhkarHHMM = formatMinutesToHHMM(asrMins + 25);
    if (currentHHMM === eveningAdhkarHHMM) {
      return {
        id: `adhkar-evening-${currentHHMM}`,
        category: 'ADHKAR_EVENING',
        titleAr: 'تذكير أذكار المساء — حصن المسلم',
        bodyAr:
          'أمسينا وأمسى الملك لله — حصّن نفسك وأهلك بأذكار المساء الصحيحة.',
        subtitleOrHadithAr:
          'قال تعالى: ﴿فَاصْبِرْ عَلَىٰ مَا يَقُولُونَ وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ الْغُرُوبِ﴾ [ق: ٣٩]',
        timestampHHMM: currentHHMM,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        actionTab: 'adhkar',
        actionLabelAr: 'فتح أذكار المساء',
      };
    }
  }

  // 3. Check Last Third of the Night (Tahajjud)
  if (
    channelsConfig.lastThirdPush &&
    lastThirdStartHHMM &&
    currentHHMM === lastThirdStartHHMM
  ) {
    return {
      id: `last-third-${currentHHMM}`,
      category: 'LAST_THIRD',
      titleAr: `دخل الآن الثلث الأخير من الليل (${currentHHMM})`,
      bodyAr:
        'وقت التهجّد والأسحار واستجابة الدعاء — أوتر ولو بركعة وناجِ ربك.',
      subtitleOrHadithAr:
        'قال ﷺ: «ينزل ربنا تبارك وتعالى كل ليلة إلى السماء الدنيا حين يبقى ثلث الليل الآخر فيقول: من يدعوني فأستجيب له» — متفق عليه',
      timestampHHMM: currentHHMM,
      createdAtMs: Date.now(),
      shouldPlayFullAdhan: false,
      actionTab: 'duas',
      actionLabelAr: 'أدعية قيام الليل',
    };
  }

  // 4. Check Friday Surah Al-Kahf & Salawat Reminder (10:00 AM on Fridays)
  if (channelsConfig.fridayKahfPush && isFriday && currentHHMM === '10:00') {
    return {
      id: `friday-kahf-${currentHHMM}`,
      category: 'FRIDAY_KAHF',
      titleAr: 'سنن يوم الجمعة: سورة الكهف والصلاة على النبي ﷺ',
      bodyAr:
        'أكثروا من الصلاة على النبي ﷺ في يوم الجمعة، ونوّروا جمعتكم بتلاوة سورة الكهف.',
      subtitleOrHadithAr:
        'قال ﷺ: «مَن قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين» — صححه الألباني',
      timestampHHMM: currentHHMM,
      createdAtMs: Date.now(),
      shouldPlayFullAdhan: false,
      actionTab: 'quran',
      actionLabelAr: 'فتح سورة الكهف (ص ٢٩٣)',
      mushafPage: 293,
    };
  }

  return null;
}

export interface UpcomingScheduledNotificationInfo {
  titleAr: string;
  timeHHMM: string;
  remainingMinutes: number;
  category: NotificationCategory;
}

/**
 * Computes the next scheduled automatic notification across today's enabled channels and prayers
 */
export function getUpcomingScheduledNotificationInfo(params: {
  currentHours: number;
  currentMinutes: number;
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  channelsConfig: PushNotificationChannelsConfig;
  lastThirdStartHHMM?: string;
}): UpcomingScheduledNotificationInfo | null {
  const {
    currentHours,
    currentMinutes,
    todayTimes,
    alertsConfig,
    channelsConfig,
    lastThirdStartHHMM,
  } = params;

  const nowTotalMins = currentHours * 60 + currentMinutes;
  const candidates: {
    titleAr: string;
    timeHHMM: string;
    targetMins: number;
    category: NotificationCategory;
  }[] = [];

  for (const meta of PRAYER_METADATA) {
    const cfg = alertsConfig[meta.key];
    if (!cfg || !cfg.enabled) continue;
    const baseMins = parseTimeHHMMToMinutes(todayTimes[meta.key]);

    if (channelsConfig.preAdhanPush && cfg.beforeMinutes > 0) {
      const preMins = (baseMins - cfg.beforeMinutes + 1440) % 1440;
      candidates.push({
        titleAr: `تنبيه قبل أذان ${meta.nameAr} (${cfg.beforeMinutes} د)`,
        timeHHMM: formatMinutesToHHMM(preMins),
        targetMins: preMins,
        category: 'PRE_ADHAN',
      });
    }

    if (channelsConfig.adhanPush && cfg.atAdhan && meta.key !== 'sunrise') {
      candidates.push({
        titleAr: `أذان صلاة ${meta.nameAr}`,
        timeHHMM: todayTimes[meta.key],
        targetMins: baseMins,
        category: 'ADHAN',
      });
    }

    if (channelsConfig.iqamahPush && cfg.afterMinutes > 0) {
      const postMins = (baseMins + cfg.afterMinutes) % 1440;
      candidates.push({
        titleAr:
          meta.key === 'sunrise'
            ? 'تذكير صلاة الإشراق والضحى'
            : `تذكير إقامة صلاة ${meta.nameAr}`,
        timeHHMM: formatMinutesToHHMM(postMins),
        targetMins: postMins,
        category: 'IQAMAH',
      });
    }
  }

  if (channelsConfig.adhkarPush) {
    const morningMins = (parseTimeHHMMToMinutes(todayTimes.sunrise) + 20) % 1440;
    candidates.push({
      titleAr: 'تذكير أذكار الصباح',
      timeHHMM: formatMinutesToHHMM(morningMins),
      targetMins: morningMins,
      category: 'ADHKAR_MORNING',
    });

    const eveningMins = (parseTimeHHMMToMinutes(todayTimes.asr) + 25) % 1440;
    candidates.push({
      titleAr: 'تذكير أذكار المساء',
      timeHHMM: formatMinutesToHHMM(eveningMins),
      targetMins: eveningMins,
      category: 'ADHKAR_EVENING',
    });
  }

  if (channelsConfig.lastThirdPush && lastThirdStartHHMM) {
    const ltMins = parseTimeHHMMToMinutes(lastThirdStartHHMM);
    candidates.push({
      titleAr: 'منبّه الثلث الأخير من الليل',
      timeHHMM: lastThirdStartHHMM,
      targetMins: ltMins,
      category: 'LAST_THIRD',
    });
  }

  if (candidates.length === 0) return null;

  let best: (typeof candidates)[0] | null = null;
  let bestDelta = Infinity;

  for (const c of candidates) {
    let delta = c.targetMins - nowTotalMins;
    if (delta <= 0) {
      delta += 1440;
    }
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }

  if (!best) return null;
  return {
    titleAr: best.titleAr,
    timeHHMM: best.timeHHMM,
    remainingMinutes: bestDelta,
    category: best.category,
  };
}

export function buildTestPushNotification(
  cityNameAr: string,
  nextPrayerNameAr: string,
  nextPrayerTime: string
): DispatchedIslamicNotification {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    id: `test-push-${Date.now()}`,
    category: 'TEST',
    titleAr: `إشعار المحراب مفعّل — صلاة ${nextPrayerNameAr} (${nextPrayerTime})`,
    bodyAr: `نظام دفع الإشعارات يعمل بنجاح لمدينة ${cityNameAr}. سيصلك تنبيه الأذان وتذكيرات الصلوات والأذكار في وقتها بدقة.`,
    subtitleOrHadithAr:
      '«في محراب الطاعة.. نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله»',
    timestampHHMM: `${hh}:${mm}`,
    createdAtMs: Date.now(),
    shouldPlayFullAdhan: false,
    prayerNameAr: nextPrayerNameAr,
    actionTab: 'prayers',
    actionLabelAr: 'عرض المواقيت',
  };
}

let activeBannerNotification: DispatchedIslamicNotification | null = null;
let activeBannerTimeoutId: number | null = null;
const notificationSubscribers = new Set<
  (active: DispatchedIslamicNotification | null, history: DispatchedIslamicNotification[]) => void
>();

export function getPushNotificationHistory(): DispatchedIslamicNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PUSH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function appendToNotificationHistory(
  item: DispatchedIslamicNotification
): DispatchedIslamicNotification[] {
  const current = getPushNotificationHistory().filter((n) => n.id !== item.id);
  const updated = [item, ...current].slice(0, 8);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PUSH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}

function notifySubscribers() {
  const hist = getPushNotificationHistory();
  notificationSubscribers.forEach((fn) => fn(activeBannerNotification, hist));
}

export function subscribePushNotifications(
  listener: (
    active: DispatchedIslamicNotification | null,
    history: DispatchedIslamicNotification[]
  ) => void
): () => void {
  notificationSubscribers.add(listener);
  listener(activeBannerNotification, getPushNotificationHistory());
  return () => {
    notificationSubscribers.delete(listener);
  };
}

export function dismissActivePushBanner(): void {
  if (typeof window !== 'undefined' && activeBannerTimeoutId !== null) {
    window.clearTimeout(activeBannerTimeoutId);
    activeBannerTimeoutId = null;
  }
  activeBannerNotification = null;
  notifySubscribers();
}

export function clearPushNotificationHistory(): void {
  if (typeof window !== 'undefined') {
    if (activeBannerTimeoutId !== null) {
      window.clearTimeout(activeBannerTimeoutId);
      activeBannerTimeoutId = null;
    }
    try {
      localStorage.removeItem(PUSH_HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  activeBannerNotification = null;
  notifySubscribers();
}

/**
 * Plays a gentle three-note warm chime for non-Adhan notifications (Pre-Adhan, Adhkar, Test)
 */
export function playGentleNotificationChime(): void {
  if (typeof window === 'undefined') return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 140]);
    } catch {
      // ignore
    }
  }
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const notes = [528, 660, 792];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // ignore Web Audio restrictions
  }
}

export const ALMIHRAB_LOGO_ICON_PATH = '/icon.svg';
export const ALMIHRAB_LOGO_PNG_PATH = '/pwa-192x192.png';

/**
 * Dispatches a notification across:
 * 1) Top-of-Phone Heads-Up Push Banner with Al-Mihrab Logo & History
 * 2) ServiceWorkerRegistration.showNotification (PWA mobile/desktop native push with logo)
 * 3) window.Notification fallback with logo
 * 4) Audio (Full Adhan for ADHAN alerts, or gentle chime for reminders)
 */
export async function dispatchSystemAndInAppNotification(
  notification: DispatchedIslamicNotification
): Promise<void> {
  appendToNotificationHistory(notification);
  activeBannerNotification = notification;
  notifySubscribers();

  if (typeof window !== 'undefined') {
    if (activeBannerTimeoutId !== null) {
      window.clearTimeout(activeBannerTimeoutId);
    }
    activeBannerTimeoutId = window.setTimeout(() => {
      if (activeBannerNotification?.id === notification.id) {
        activeBannerNotification = null;
        notifySubscribers();
      }
    }, 18000);
  }

  if (notification.shouldPlayFullAdhan) {
    playAlertSoundTone('custom_file', notification.prayerNameAr);
  } else {
    playGentleNotificationChime();
  }

  if (typeof window === 'undefined') return;

  // If browser Notification permission is still 'default', request it opportunistically
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  // Attempt native Service Worker / System Notification at top of phone if granted
  if ('Notification' in window && Notification.permission === 'granted') {
    const resolvedPngLogo = new URL(
      'pwa-192x192.png',
      window.location.origin + '/'
    ).href;
    const fullBody = `${notification.bodyAr}\n${notification.subtitleOrHadithAr}`;
    const swOptions: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
      requireInteraction?: boolean;
    } = {
      body: fullBody,
      dir: 'rtl',
      lang: 'ar',
      icon: resolvedPngLogo,
      badge: resolvedPngLogo,
      tag: notification.id,
      renotify: true,
      requireInteraction: notification.category === 'ADHAN',
      vibrate: [200, 100, 200],
    };

    const basicOptions: NotificationOptions = {
      body: fullBody,
      dir: 'rtl',
      lang: 'ar',
      icon: resolvedPngLogo,
      tag: notification.id,
    };

    const systemTitle = `المحراب · ${notification.titleAr}`;

    let deliveredViaSW = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          try {
            await reg.showNotification(systemTitle, swOptions);
            deliveredViaSW = true;
          } catch {
            await reg.showNotification(systemTitle, basicOptions);
            deliveredViaSW = true;
          }
        }
      } catch {
        // fall through to window.Notification
      }
    }

    if (!deliveredViaSW) {
      try {
        new Notification(systemTitle, basicOptions);
      } catch {
        // ignore illegal constructor on mobile without SW
      }
    }
  }
}

export function getBrowserNotificationPermissionState():
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestAndVerifyPushPermission(
  cityNameAr: string,
  nextPrayerNameAr: string,
  nextPrayerTime: string
): Promise<{
  permissionState: 'granted' | 'denied' | 'default' | 'unsupported';
  statusMessageAr: string;
}> {
  const testNotif = buildTestPushNotification(
    cityNameAr,
    nextPrayerNameAr,
    nextPrayerTime
  );

  // Immediately show the in-app heads-up push banner & play chime before awaiting OS dialog
  // so the user ALWAYS gets instant visual & audio feedback even if OS dialog is blocked by iframe
  await dispatchSystemAndInAppNotification(testNotif);

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      permissionState: 'unsupported',
      statusMessageAr:
        'تم تفعيل وإرسال إشعار المحراب الفوري أعلى الشاشة مع التنبيه الصوتي بنجاح.',
    };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      return {
        permissionState: 'granted',
        statusMessageAr:
          'تم تفعيل دفع إشعارات النظام والتطبيق بنجاح وإرسال إشعار تأكيدي الآن أعلى الشاشة.',
      };
    }
    if (perm === 'denied') {
      return {
        permissionState: 'denied',
        statusMessageAr:
          'تم إرسال الإشعار الفوري والصوتي داخل التطبيق بنجاح (لتفعيل إشعارات قفل الشاشة الخارجية يرجى السماح بالإشعارات من إعدادات المتصفح).',
      };
    }
    return {
      permissionState: 'default',
      statusMessageAr:
        'تم تفعيل الإشعارات الفورية داخل التطبيق وإرسال إشعار تجريبي أعلى الشاشة بنجاح.',
    };
  } catch {
    return {
      permissionState: getBrowserNotificationPermissionState(),
      statusMessageAr:
        'تم تفعيل وإرسال إشعار المحراب الفوري والصوتي أعلى الشاشة بنجاح.',
    };
  }
}
