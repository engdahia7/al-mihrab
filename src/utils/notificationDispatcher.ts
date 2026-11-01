import {
  DailyPrayerTimes,
  MainPrayerKey,
  PRAYER_METADATA,
  parseTimeHHMMToMinutes,
} from './astronomy';
import {
  PrayerAlertItemConfig,
  checkActivePrayerAlert,
  formatMinutesToHHMM,
  DUA_AFTER_ADHAN_AR,
} from './khatmahAndAlerts';
import { playAlertSoundTone } from './soundPlayer';

export interface AndroidNativeNotificationsBridge {
  showNotification: (title: string, body: string, tag: string) => boolean;
  scheduleDelayedNotification?: (
    title: string,
    body: string,
    tag: string,
    delayMs: number
  ) => boolean;
  clearScheduledNotifications?: () => void;
  requestPermission: () => boolean;
  hasPermission: () => boolean;
}

declare global {
  interface Window {
    AndroidNativeNotifications?: AndroidNativeNotificationsBridge;
  }
}

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

export interface MobilePushDeviceCapabilities {
  isAndroidNativeApp: boolean;
  isAndroidBrowser: boolean;
  isIOSDevice: boolean;
  isStandalonePWA: boolean;
  hasServiceWorker: boolean;
  deviceLabelAr: string;
  deliveryModeLabelAr: string;
}

export function getMobilePushDeviceCapabilities(): MobilePushDeviceCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isAndroidNativeApp: false,
      isAndroidBrowser: false,
      isIOSDevice: false,
      isStandalonePWA: false,
      hasServiceWorker: false,
      deviceLabelAr: 'متصفح الويب',
      deliveryModeLabelAr: 'إشعارات فورية',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroidNativeApp = Boolean(window.AndroidNativeNotifications);
  const isAndroidBrowser = /Android/i.test(ua);
  const isIOSDevice =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalonePWA =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  const hasServiceWorker = 'serviceWorker' in navigator;

  let deviceLabelAr = 'الحاسوب / المتصفح';
  let deliveryModeLabelAr = 'شريط إشعارات النظام + إشعار علوي داخل التطبيق';

  if (isAndroidNativeApp) {
    deviceLabelAr = 'تطبيق المحراب للأندرويد (Android Native)';
    deliveryModeLabelAr = 'إشعارات أندرويد الأصلية في شريط الهاتف وشاشة القفل';
  } else if (isAndroidBrowser) {
    deviceLabelAr = isStandalonePWA
      ? 'هاتف أندرويد (تطبيق مثبّت PWA)'
      : 'هاتف أندرويد (متصفح الهاتف)';
    deliveryModeLabelAr =
      'دفع عبر Service Worker إلى شريط إشعارات الهاتف وشاشة القفل';
  } else if (isIOSDevice) {
    deviceLabelAr = isStandalonePWA
      ? 'هاتف آيفون / آيباد (مثبّت على الشاشة الرئيسية)'
      : 'هاتف آيفون / آيباد (متصفح سفاري)';
    deliveryModeLabelAr = isStandalonePWA
      ? 'دفع إشعارات iOS عبر Service Worker لشاشة القفل'
      : 'إشعار علوي فوري وصوتي (أضف التطبيق للشاشة الرئيسية لتفعيل إشعارات قفل الآيفون)';
  }

  return {
    isAndroidNativeApp,
    isAndroidBrowser,
    isIOSDevice,
    isStandalonePWA,
    hasServiceWorker,
    deviceLabelAr,
    deliveryModeLabelAr,
  };
}

/**
 * Ensures a Service Worker (/sw-push.js) is registered and active on mobile phones
 * so ServiceWorkerRegistration.showNotification() works even if Workbox is disabled or still loading.
 */
export async function ensureMobileServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });
    }

    if (reg.active) {
      return reg;
    }

    // Wait briefly (up to 1200ms) for the newly registered SW to activate on mobile
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration | null>((resolve) =>
        window.setTimeout(() => resolve(reg || null), 1200)
      ),
    ]);

    return readyReg || reg || null;
  } catch {
    return null;
  }
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
 * Computes all scheduled notifications for today and returns the next upcoming one.
 */
export function getAllScheduledNotificationsForToday(params: {
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  channelsConfig: PushNotificationChannelsConfig;
  lastThirdStartHHMM?: string;
}): {
  titleAr: string;
  timeHHMM: string;
  targetMins: number;
  category: NotificationCategory;
}[] {
  const { todayTimes, alertsConfig, channelsConfig, lastThirdStartHHMM } =
    params;

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

  return candidates;
}

/**
 * Syncs today's upcoming prayer & adhkar notifications with the Native Android bridge
 * so that even if the phone screen is locked, the native Android handler triggers them.
 */
export function syncTodayNotificationsWithPhoneOS(params: {
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  channelsConfig: PushNotificationChannelsConfig;
  cityNameAr: string;
  lastThirdStartHHMM?: string;
}): number {
  if (typeof window === 'undefined') return 0;

  const candidates = getAllScheduledNotificationsForToday(params);
  const now = new Date();
  const nowSecondsOfDay =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const bridge = window.AndroidNativeNotifications;
  if (bridge && typeof bridge.clearScheduledNotifications === 'function') {
    try {
      bridge.clearScheduledNotifications();
    } catch {
      // ignore
    }
  }

  let scheduledCount = 0;
  for (const item of candidates) {
    const targetSecondsOfDay = item.targetMins * 60;
    let deltaSeconds = targetSecondsOfDay - nowSecondsOfDay;
    if (deltaSeconds <= 0) {
      deltaSeconds += 86400;
    }
    scheduledCount += 1;

    if (bridge && typeof bridge.scheduleDelayedNotification === 'function') {
      try {
        bridge.scheduleDelayedNotification(
          `المحراب · ${item.titleAr} (${item.timeHHMM})`,
          `حسب التوقيت المحلي لمدينة ${params.cityNameAr} — حيّ على الصلاة، حيّ على الفلاح.`,
          `scheduled-${item.category}-${item.timeHHMM}`,
          deltaSeconds * 1000
        );
      } catch {
        // ignore
      }
    }
  }

  return scheduledCount;
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
  const { currentHours, currentMinutes } = params;
  const nowTotalMins = currentHours * 60 + currentMinutes;
  const candidates = getAllScheduledNotificationsForToday(params);

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
    titleAr: `إشعار المحراب على الهاتف — صلاة ${nextPrayerNameAr} (${nextPrayerTime})`,
    bodyAr: `تم ربط وتفعيل دفع الإشعارات على هاتفك لمدينة ${cityNameAr} بنجاح. ستصلك تنبيهات الأذان والصلوات والأذكار في شريط الهاتف العلوي وشاشة القفل.`,
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
  (
    active: DispatchedIslamicNotification | null,
    history: DispatchedIslamicNotification[]
  ) => void
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
      navigator.vibrate([200, 80, 200, 80, 300]);
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
 * Updates the mobile phone's Lock-Screen Media Session widget with the active
 * notification title, body, and Al-Mihrab icons.
 */
function updatePhoneLockScreenMediaMetadata(
  notification: DispatchedIslamicNotification
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: notification.titleAr,
      artist: 'برنامج المحراب · مواقيت الصلاة والأذان',
      album: notification.bodyAr,
      artwork: [
        {
          src: `${origin}/pwa-192x192.png`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: `${origin}/pwa-512x512.png`,
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });
  } catch {
    // ignore MediaMetadata errors on older browsers
  }
}

/**
 * Dispatches a notification across all Mobile Phone & Web layers:
 * 1) Top-of-Phone Heads-Up Push Banner with Al-Mihrab Logo & History
 * 2) Native Android App Bridge (window.AndroidNativeNotifications.showNotification) for .aab/.apk builds
 * 3) Mobile ServiceWorkerRegistration.showNotification (via /sw-push.js or Workbox SW) for Android Chrome & iOS PWA
 * 4) window.Notification fallback for desktop browsers
 * 5) Phone Lock-Screen MediaSession + Vibration + Audio (Full Adhan or Chime)
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

  updatePhoneLockScreenMediaMetadata(notification);

  if (notification.shouldPlayFullAdhan) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 120, 300, 120, 400]);
      } catch {
        // ignore
      }
    }
    playAlertSoundTone('custom_file', notification.prayerNameAr);
  } else {
    playGentleNotificationChime();
  }

  if (typeof window === 'undefined') return;

  const systemTitle = `المحراب · ${notification.titleAr}`;
  const fullBody = `${notification.bodyAr}\n${notification.subtitleOrHadithAr}`;

  // Layer A: Native Android Bridge (.aab / .apk installed on phone)
  if (window.AndroidNativeNotifications) {
    try {
      window.AndroidNativeNotifications.showNotification(
        systemTitle,
        fullBody,
        notification.id
      );
      return;
    } catch {
      // fall through to Web / SW notification
    }
  }

  // Layer B: Request Web Notification permission if still 'default'
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  // Layer C: Mobile Service Worker & System Tray Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const resolvedPngLogo = new URL(
      'pwa-192x192.png',
      window.location.origin + '/'
    ).href;

    const swOptions: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
      requireInteraction?: boolean;
      data?: Record<string, unknown>;
    } = {
      body: fullBody,
      dir: 'rtl',
      lang: 'ar',
      icon: resolvedPngLogo,
      badge: resolvedPngLogo,
      tag: notification.id,
      renotify: true,
      requireInteraction: notification.category === 'ADHAN',
      vibrate: [250, 100, 250, 100, 350],
      data: {
        url: '/',
        actionTab: notification.actionTab,
        mushafPage: notification.mushafPage,
      },
    };

    const basicOptions: NotificationOptions = {
      body: fullBody,
      dir: 'rtl',
      lang: 'ar',
      icon: resolvedPngLogo,
      tag: notification.id,
    };

    let deliveredViaSW = false;
    const reg = await ensureMobileServiceWorkerRegistration();
    if (reg) {
      if (typeof reg.showNotification === 'function') {
        try {
          await reg.showNotification(systemTitle, swOptions);
          deliveredViaSW = true;
        } catch {
          try {
            await reg.showNotification(systemTitle, basicOptions);
            deliveredViaSW = true;
          } catch {
            // fallback below
          }
        }
      }

      if (!deliveredViaSW && reg.active) {
        try {
          reg.active.postMessage({
            type: 'SHOW_PHONE_NOTIFICATION',
            title: systemTitle,
            options: swOptions,
          });
          deliveredViaSW = true;
        } catch {
          // fallback below
        }
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
  if (typeof window === 'undefined') {
    return 'unsupported';
  }
  if (window.AndroidNativeNotifications) {
    try {
      return window.AndroidNativeNotifications.hasPermission()
        ? 'granted'
        : 'default';
    } catch {
      return 'granted';
    }
  }
  if (!('Notification' in window)) {
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
  // Pre-register the mobile Service Worker so it is ready on the phone immediately
  await ensureMobileServiceWorkerRegistration();

  // If running inside the Android Native App, trigger the native Android 13+ permission dialog
  if (typeof window !== 'undefined' && window.AndroidNativeNotifications) {
    try {
      window.AndroidNativeNotifications.requestPermission();
    } catch {
      // ignore
    }
  }

  const testNotif = buildTestPushNotification(
    cityNameAr,
    nextPrayerNameAr,
    nextPrayerTime
  );

  // Immediately show the in-app heads-up push banner, chime & native/SW notification
  await dispatchSystemAndInAppNotification(testNotif);

  if (typeof window !== 'undefined' && window.AndroidNativeNotifications) {
    return {
      permissionState: 'granted',
      statusMessageAr:
        'تم تفعيل إشعارات هاتف الأندرويد الأصلية وإرسال إشعار فوري إلى شريط الهاتف العلوي وشاشة القفل بنجاح.',
    };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    const caps = getMobilePushDeviceCapabilities();
    if (caps.isIOSDevice && !caps.isStandalonePWA) {
      return {
        permissionState: 'unsupported',
        statusMessageAr:
          'تم إرسال الإشعار الفوري والصوتي أعلى الشاشة بنجاح. (على آيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية» لتفعيل إشعارات شاشة القفل).',
      };
    }
    return {
      permissionState: 'unsupported',
      statusMessageAr:
        'تم تفعيل وإرسال إشعار المحراب الفوري أعلى الشاشة مع التنبيه الصوتي والاهتزاز بنجاح.',
    };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      return {
        permissionState: 'granted',
        statusMessageAr:
          'تم تفعيل دفع الإشعارات على الهاتف بنجاح وإرسال إشعار تأكيدي الآن إلى شريط إشعارات الهاتف وأعلى الشاشة.',
      };
    }
    if (perm === 'denied') {
      return {
        permissionState: 'denied',
        statusMessageAr:
          'تم إرسال الإشعار الفوري والصوتي داخل التطبيق بنجاح (لتفعيل ظهور الإشعار في شاشة قفل الهاتف يرجى السماح بالإشعارات من إعدادات المتصفح/الهاتف).',
      };
    }
    return {
      permissionState: 'default',
      statusMessageAr:
        'تم تفعيل الإشعارات الفورية على الهاتف وإرسال إشعار تجريبي أعلى الشاشة بنجاح.',
    };
  } catch {
    return {
      permissionState: getBrowserNotificationPermissionState(),
      statusMessageAr:
        'تم تفعيل وإرسال إشعار المحراب الفوري والصوتي على الهاتف بنجاح.',
    };
  }
}
