import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  BellRing,
  Play,
  Pause,
  Square,
  Send,
  ShieldCheck,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  DailyPrayerTimes,
  MainPrayerKey,
  PRAYER_METADATA,
} from '../utils/astronomy';
import {
  PrayerAlertItemConfig,
  getAdhanPhraseForProgress,
  formatAudioDurationMMSS,
  DUA_AFTER_ADHAN_AR,
} from '../utils/khatmahAndAlerts';
import {
  playAlertSoundTone,
  stopActiveAdhanAudio,
  togglePauseActiveAdhan,
  seekActiveAdhanAudio,
  setActiveAdhanVolume,
  subscribeAdhanPlaybackState,
  getAdhanPlaybackState,
  AdhanPlaybackState,
  syncAndPinExistingAdhanAudio,
} from '../utils/soundPlayer';
import {
  PushNotificationChannelsConfig,
  DispatchedIslamicNotification,
  loadPushChannelsConfig,
  savePushChannelsConfig,
  setAllPushChannelsState,
  areAllPushChannelsEnabled,
  countEnabledPushChannels,
  buildChannelSpecificNotification,
  getBrowserNotificationPermissionState,
  requestAndVerifyPushPermission,
  dispatchSystemAndInAppNotification,
  subscribePushNotifications,
  clearPushNotificationHistory,
  getUpcomingScheduledNotificationInfo,
} from '../utils/notificationDispatcher';
import { toArabicNumerals } from '../data/quranData';

interface PrayerAlertsPanelProps {
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  onChangeAlertsConfig: React.Dispatch<
    React.SetStateAction<Record<MainPrayerKey, PrayerAlertItemConfig>>
  >;
  cityNameAr?: string;
  nextPrayerNameAr?: string;
  nextPrayerTime?: string;
}

const PUSH_CHANNEL_ITEMS: {
  key: keyof PushNotificationChannelsConfig;
  titleAr: string;
  shortLabelAr: string;
  descAr: string;
}[] = [
  {
    key: 'adhanPush',
    titleAr: 'إشعار دخول وقت الصلاة والأذان',
    shortLabelAr: 'إشعار الأذان ودخول الوقت',
    descAr: 'دفع إشعار فوري مع تشغيل الأذان الأساسي المثبّت عند حلول الوقت',
  },
  {
    key: 'preAdhanPush',
    titleAr: 'التذكير قبل الأذان (الاستعداد والوضوء)',
    shortLabelAr: 'التذكير قبل الأذان',
    descAr: 'تنبيه استباقي قبل دخول وقت الصلاة بالدقائق المحددة لكل فرض',
  },
  {
    key: 'iqamahPush',
    titleAr: 'تذكير الإقامة والسنن الرواتب والضحى',
    shortLabelAr: 'تذكير الإقامة والسنن الرواتب',
    descAr: 'إشعار بعد الأذان للتذكير بالإقامة والسنن الرواتب وصلاة الإشراق',
  },
  {
    key: 'adhkarPush',
    titleAr: 'إشعارات أذكار الصباح والمساء',
    shortLabelAr: 'إشعار أذكار الصباح والمساء',
    descAr: 'تذكير يومي في وقت الشروق وبعد العصر لتلاوة حصن المسلم',
  },
  {
    key: 'lastThirdPush',
    titleAr: 'منبّه الثلث الأخير من الليل (التهجّد)',
    shortLabelAr: 'منبّه الثلث الأخير من الليل',
    descAr: 'إشعار عند بدء الثلث الأخير من الليل لقيام الليل والوتر والدعاء',
  },
  {
    key: 'fridayKahfPush',
    titleAr: 'سنن يوم الجمعة (سورة الكهف والصلاة على النبي ﷺ)',
    shortLabelAr: 'تذكير سورة الكهف يوم الجمعة',
    descAr: 'تذكير صباح كل جمعة بقراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ',
  },
];

export const PrayerAlertsPanel: React.FC<PrayerAlertsPanelProps> = ({
  todayTimes,
  alertsConfig,
  onChangeAlertsConfig,
  cityNameAr = 'مكة المكرمة',
  nextPrayerNameAr = 'القادمة',
  nextPrayerTime = '--:--',
}) => {
  const [testAlertBanner, setTestAlertBanner] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    'granted' | 'denied' | 'default' | 'unsupported'
  >(() => getBrowserNotificationPermissionState());

  const [channelsConfig, setChannelsConfig] =
    useState<PushNotificationChannelsConfig>(() => loadPushChannelsConfig());

  const [selectedTriggerType, setSelectedTriggerType] =
    useState<keyof PushNotificationChannelsConfig>('adhanPush');
  const [showPerPrayerOffsets, setShowPerPrayerOffsets] =
    useState<boolean>(false);

  const [playbackState, setPlaybackState] = useState<AdhanPlaybackState>(() =>
    getAdhanPlaybackState()
  );

  const [notificationHistory, setNotificationHistory] = useState<
    DispatchedIslamicNotification[]
  >([]);

  useEffect(() => {
    let mounted = true;
    syncAndPinExistingAdhanAudio().catch(() => {});
    const unsubAudio = subscribeAdhanPlaybackState((state) => {
      if (mounted) setPlaybackState(state);
    });
    const unsubPush = subscribePushNotifications((_active, history) => {
      if (mounted) setNotificationHistory(history);
    });
    return () => {
      mounted = false;
      unsubAudio();
      unsubPush();
    };
  }, []);

  const enabledChannelsCount = countEnabledPushChannels(channelsConfig);
  const allChannelsOn = areAllPushChannelsEnabled(channelsConfig);
  const allPrayersOn = PRAYER_METADATA.every((m) => alertsConfig[m.key]?.enabled);
  const isEverythingEnabled = allChannelsOn && allPrayersOn;

  const upcomingSchedule = useMemo(() => {
    const now = new Date();
    return getUpcomingScheduledNotificationInfo({
      currentHours: now.getHours(),
      currentMinutes: now.getMinutes(),
      todayTimes,
      alertsConfig,
      channelsConfig,
      lastThirdStartHHMM: todayTimes.lastThird,
    });
  }, [todayTimes, alertsConfig, channelsConfig]);

  const handleToggleChannel = async (
    key: keyof PushNotificationChannelsConfig
  ) => {
    const willBeEnabled = !channelsConfig[key];
    const updated = { ...channelsConfig, [key]: willBeEnabled };
    setChannelsConfig(updated);
    savePushChannelsConfig(updated);

    if (willBeEnabled) {
      const itemMeta = PUSH_CHANNEL_ITEMS.find((c) => c.key === key);
      const notif = buildChannelSpecificNotification(key, {
        cityNameAr,
        nextPrayerNameAr,
        nextPrayerTime,
      });
      await dispatchSystemAndInAppNotification(notif);
      setNotificationPermission(getBrowserNotificationPermissionState());
      setTestAlertBanner(
        `تم تفعيل ودفع «${itemMeta?.shortLabelAr || notif.titleAr}» الآن أعلى الشاشة بنجاح.`
      );
    } else {
      const itemMeta = PUSH_CHANNEL_ITEMS.find((c) => c.key === key);
      setTestAlertBanner(`تم إيقاف قناة «${itemMeta?.shortLabelAr || key}».`);
    }
  };

  const handleEnableAllNotifications = async () => {
    const nextChannels = setAllPushChannelsState(true);
    setChannelsConfig(nextChannels);

    onChangeAlertsConfig((prev) => {
      const updated = { ...prev };
      PRAYER_METADATA.forEach((meta) => {
        updated[meta.key] = {
          ...prev[meta.key],
          enabled: true,
          atAdhan: true,
          soundId: 'custom_file',
        };
      });
      return updated;
    });

    const res = await requestAndVerifyPushPermission(
      cityNameAr,
      nextPrayerNameAr,
      nextPrayerTime
    );
    setNotificationPermission(res.permissionState);
    setTestAlertBanner(
      'تم تفعيل جميع الإشعارات والصلوات والأذكار وإرسال إشعار تأكيدي الآن أعلى الشاشة.'
    );
  };

  const handleDisableAllNotifications = () => {
    stopActiveAdhanAudio();
    const nextChannels = setAllPushChannelsState(false);
    setChannelsConfig(nextChannels);

    onChangeAlertsConfig((prev) => {
      const updated = { ...prev };
      PRAYER_METADATA.forEach((meta) => {
        updated[meta.key] = {
          ...prev[meta.key],
          enabled: false,
        };
      });
      return updated;
    });

    setTestAlertBanner('تم إغلاق وإيقاف جميع الإشعارات والتنبيهات.');
  };

  const handleTriggerSpecificNotification = async (
    channelKey: keyof PushNotificationChannelsConfig
  ) => {
    const itemMeta = PUSH_CHANNEL_ITEMS.find((c) => c.key === channelKey);
    const notif = buildChannelSpecificNotification(channelKey, {
      cityNameAr,
      nextPrayerNameAr,
      nextPrayerTime,
    });
    await dispatchSystemAndInAppNotification(notif);
    setNotificationPermission(getBrowserNotificationPermissionState());
    setTestAlertBanner(
      `تم تشغيل ودفع «${itemMeta?.shortLabelAr || notif.titleAr}» أعلى الهاتف بنجاح.`
    );
  };

  const handleEnablePushNotifications = async () => {
    const res = await requestAndVerifyPushPermission(
      cityNameAr,
      nextPrayerNameAr,
      nextPrayerTime
    );
    setNotificationPermission(res.permissionState);
    setTestAlertBanner(res.statusMessageAr);
  };

  const handleTogglePrayerEnabled = async (key: MainPrayerKey) => {
    const willBeEnabled = !alertsConfig[key]?.enabled;
    onChangeAlertsConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: willBeEnabled,
        atAdhan: willBeEnabled ? true : prev[key].atAdhan,
        soundId: willBeEnabled ? 'custom_file' : prev[key].soundId,
      },
    }));

    if (willBeEnabled) {
      const meta = PRAYER_METADATA.find((m) => m.key === key);
      const pName = meta?.nameAr || 'الصلاة';
      const pTime = todayTimes[key];
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      await dispatchSystemAndInAppNotification({
        id: `enable-prayer-${key}-${Date.now()}`,
        category: 'PRE_ADHAN',
        titleAr: `تم تفعيل إشعار وأذان صلاة ${pName} (${pTime})`,
        bodyAr: `سيصلك إشعار صلاة ${pName} في مدينة ${cityNameAr} الساعة ${pTime} بإذن الله.`,
        subtitleOrHadithAr: DUA_AFTER_ADHAN_AR,
        timestampHHMM: `${hh}:${mm}`,
        createdAtMs: Date.now(),
        shouldPlayFullAdhan: false,
        prayerNameAr: pName,
        actionTab: 'prayers',
        actionLabelAr: 'عرض المواقيت',
      });
      setTestAlertBanner(
        `تم تفعيل إشعار صلاة ${pName} (${pTime}) وإرسال تنبيه تأكيدي أعلى الشاشة.`
      );
    }
  };

  const handleChangeBeforeMinutes = (key: MainPrayerKey, minutes: number) => {
    onChangeAlertsConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        beforeMinutes: minutes,
      },
    }));
  };

  const handleChangeAfterMinutes = (key: MainPrayerKey, minutes: number) => {
    onChangeAlertsConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        afterMinutes: minutes,
      },
    }));
  };

  const handlePlayAdhan = (prayerLabelAr?: string) => {
    const pName = prayerLabelAr || nextPrayerNameAr || 'الصلاة';
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    dispatchSystemAndInAppNotification({
      id: `adhan-preview-${Date.now()}`,
      category: 'ADHAN',
      titleAr: prayerLabelAr
        ? `حان الآن موعد أذان ${prayerLabelAr}`
        : 'الأذان الشرعي المعتمد — المحراب',
      bodyAr: `حسب التوقيت المحلي لمدينة ${cityNameAr} — حيّ على الصلاة، حيّ على الفلاح.`,
      subtitleOrHadithAr: DUA_AFTER_ADHAN_AR,
      timestampHHMM: `${hh}:${mm}`,
      createdAtMs: Date.now(),
      shouldPlayFullAdhan: true,
      prayerNameAr: pName,
      actionTab: 'prayers',
      actionLabelAr: 'عرض المواقيت',
    }).catch(() => {
      playAlertSoundTone('custom_file', prayerLabelAr);
    });
    setTestAlertBanner(
      prayerLabelAr
        ? `جاري تشغيل أذان صلاة ${prayerLabelAr} مع إشعار أعلى الهاتف`
        : 'جاري تشغيل الأذان الشرعي المعتمد مع إشعار أعلى الهاتف'
    );
  };

  const activeProgressRatio =
    playbackState.durationSec > 0
      ? Math.min(
          1,
          Math.max(0, playbackState.currentTimeSec / playbackState.durationSec)
        )
      : 0;

  const activePhrase = getAdhanPhraseForProgress(activeProgressRatio);

  return (
    <section
      id="adhan-audio-studio"
      aria-labelledby="prayer-alerts-heading"
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-5"
    >
      {/* Top Header & Bulk Master Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Bell className="w-4 h-4 text-[#14532D]" />
          <h3
            id="prayer-alerts-heading"
            className="font-display text-base sm:text-lg font-bold text-stone-900"
          >
            دفع الإشعارات ومشغّل الأذان المعتمد
          </h3>
          <span
            data-testid="push-permission-badge"
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
              notificationPermission === 'granted'
                ? 'bg-[#14532D]/10 text-[#14532D] border border-[#14532D]/25'
                : 'bg-[#FCF9F2] text-[#78350F] border border-[#E5DAC3]'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>
              {notificationPermission === 'granted'
                ? 'إشعارات النظام مفعّلة'
                : 'إشعارات فورية مفعّلة'}
            </span>
          </span>
        </div>

        {/* Master Enable All / Disable All + System Permission Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="enable-all-notifications-btn"
            onClick={() => void handleEnableAllNotifications()}
            className="min-h-[34px] px-3 py-1 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer bg-[#14532D] text-white hover:bg-[#14532D]/90 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {isEverythingEnabled
                ? 'تفعيل وإرسال إشعار تأكيدي الآن'
                : 'تفعيل الإشعارات كلها'}
            </span>
          </button>

          <button
            type="button"
            data-testid="disable-all-notifications-btn"
            onClick={handleDisableAllNotifications}
            disabled={
              enabledChannelsCount === 0 &&
              !PRAYER_METADATA.some((m) => alertsConfig[m.key]?.enabled)
            }
            className="min-h-[34px] px-3 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            <BellOff className="w-3.5 h-3.5 text-stone-600" />
            <span>إغلاق الإشعارات كلها</span>
          </button>

          {notificationPermission !== 'granted' && (
            <button
              type="button"
              data-testid="enable-push-notifications-btn"
              onClick={() => void handleEnablePushNotifications()}
              className="min-h-[34px] px-3 py-1 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/20 border border-[#14532D]/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>تفعيل إشعارات النظام</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Upcoming Scheduled Notification Status + Instant Test Bar */}
      <div
        data-testid="specific-notification-trigger-bar"
        className="bg-[#FBF9F5] border border-stone-200 rounded-2xl p-3.5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-200/80">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#14532D] shrink-0" />
            <div>
              <span className="text-xs font-bold text-stone-900 block">
                {upcomingSchedule
                  ? `الإشعار التلقائي القادم: ${upcomingSchedule.titleAr} — الساعة ${toArabicNumerals(upcomingSchedule.timeHHMM)}`
                  : 'لا توجد قنوات إشعارات تلقائية مفعّلة حالياً'}
              </span>
              <span className="text-[11px] text-stone-600 block">
                {upcomingSchedule
                  ? `سيُرسل تلقائياً بعد ${toArabicNumerals(upcomingSchedule.remainingMinutes)} دقيقة — أو يمكنك إرسال وتجربة أي إشعار فوراً بالأسفل`
                  : 'اضغط على «تفعيل الإشعارات كلها» لتشغيل الجدولة التلقائية وإرسال إشعار فوري'}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="instant-test-push-btn"
            onClick={() => void handleEnablePushNotifications()}
            className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#78350F] text-white text-xs font-bold hover:bg-[#78350F]/90 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال إشعار تجريبي الآن</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#78350F] shrink-0" />
            <span className="text-xs font-bold text-stone-800">
              معاينة ودفع قناة إشعار محددة فوراً أعلى الشاشة:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="اختر نوع الإشعار المراد تشغيله"
              data-testid="select-notification-type"
              value={selectedTriggerType}
              onChange={(e) =>
                setSelectedTriggerType(
                  e.target.value as keyof PushNotificationChannelsConfig
                )
              }
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#14532D] cursor-pointer"
            >
              {PUSH_CHANNEL_ITEMS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.shortLabelAr}
                </option>
              ))}
            </select>

            <button
              type="button"
              data-testid="trigger-selected-notification-type-btn"
              onClick={() =>
                void handleTriggerSpecificNotification(selectedTriggerType)
              }
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-bold hover:bg-[#14532D]/90 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>تشغيل هذا الإشعار الآن</span>
            </button>
          </div>
        </div>
      </div>

      {testAlertBanner && (
        <div
          role="status"
          data-testid="alert-toast-banner"
          className="p-2.5 rounded-xl bg-[#14532D]/10 border border-[#14532D]/30 text-xs text-stone-800 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <img
              src="/icon.svg"
              alt="لوجو المحراب"
              className="w-5 h-5 rounded-md shrink-0"
            />
            <span className="font-medium">{testAlertBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopActiveAdhanAudio();
              setTestAlertBanner(null);
            }}
            className="text-xs font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Sent Notifications History Log (So the user sees every dispatched notification) */}
      {notificationHistory.length > 0 && (
        <div
          data-testid="sent-notifications-history-box"
          className="bg-[#FCF9F2] border border-[#E5DAC3] rounded-2xl p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              <span className="text-xs font-bold text-stone-900">
                سجل الإشعارات المرسلة ({toArabicNumerals(notificationHistory.length)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => clearPushNotificationHistory()}
              className="text-[11px] font-semibold text-stone-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>مسح السجل</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {notificationHistory.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E5DAC3] rounded-xl p-2.5 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#14532D]/10 text-[#14532D]">
                      {toArabicNumerals(item.timestampHHMM)}
                    </span>
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {item.titleAr}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                    {item.bodyAr}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void dispatchSystemAndInAppNotification({
                      ...item,
                      id: `replay-${Date.now()}`,
                      createdAtMs: Date.now(),
                    })
                  }
                  className="shrink-0 px-2 py-1 rounded-lg bg-[#F7F4EE] hover:bg-stone-200 text-[#78350F] text-[10px] font-bold cursor-pointer"
                >
                  إعادة إرسال
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Primary Adhan Audio Player (Immutable & Permanent) */}
      <div
        data-testid="custom-adhan-status-card"
        className="rounded-2xl bg-[#14532D] text-[#FBF9F5] p-4 border border-[#14532D] space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="play-pause-adhan-btn"
              onClick={() => {
                if (playbackState.isPlaying || playbackState.isPaused) {
                  togglePauseActiveAdhan();
                } else {
                  handlePlayAdhan();
                }
              }}
              aria-label={
                playbackState.isPlaying ? 'إيقاف مؤقت للأذان' : 'تشغيل الأذان'
              }
              className="w-10 h-10 rounded-xl bg-[#FDE68A] text-stone-950 hover:bg-[#FDE68A]/90 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              {playbackState.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {(playbackState.isPlaying || playbackState.isPaused) && (
              <button
                type="button"
                data-testid="stop-adhan-btn"
                onClick={() => stopActiveAdhanAudio()}
                aria-label="إيقاف الأذان بالكامل"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-white">
                  {playbackState.activeLabelAr || 'الأذان الشرعي المعتمد'}
                </span>
                <span
                  data-testid="adhan-pinned-badge"
                  className="text-[11px] bg-[#FDE68A]/20 text-[#FDE68A] px-2 py-0.5 rounded-md border border-[#FDE68A]/40 flex items-center gap-1 font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>الأذان الأساسي المعتمد · مثبّت دائماً</span>
                </span>
              </div>
              <p className="text-[11px] text-[#D6CEBE] mt-0.5">
                صوت الأذان الرسمي لجميع الصلوات المفروضة · المدة:{' '}
                {formatAudioDurationMMSS(playbackState.durationSec)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
            {playbackState.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-[#D6CEBE]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#FDE68A]" />
            )}
            <input
              type="range"
              aria-label="مستوى صوت الأذان"
              min={0}
              max={1}
              step={0.05}
              value={playbackState.volume}
              onChange={(e) => setActiveAdhanVolume(Number(e.target.value))}
              className="w-20 accent-[#FDE68A] cursor-pointer"
            />
          </div>
        </div>

        {/* Progress Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            aria-label="شريط تقدم صوت الأذان"
            data-testid="adhan-seek-slider"
            min={0}
            max={playbackState.durationSec > 0 ? playbackState.durationSec : 132}
            step={0.1}
            value={playbackState.currentTimeSec}
            onChange={(e) => seekActiveAdhanAudio(Number(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-[#FDE68A] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-tabular text-[#D6CEBE]">
            <span>{formatAudioDurationMMSS(playbackState.currentTimeSec)}</span>
            <span className="font-quran text-xs text-[#FDE68A]">
              {playbackState.isPlaying || playbackState.isPaused
                ? `﴿ ${activePhrase.arabicCall || activePhrase.arabicText || 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ'} ﴾`
                : '﴿ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ ﴾'}
            </span>
            <span>{formatAudioDurationMMSS(playbackState.durationSec)}</span>
          </div>
        </div>
      </div>

      {/* Smart Push Notification Channels Grid */}
      <div
        data-testid="push-channels-grid"
        className="bg-[#FBF9F5] border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#78350F]" />
            <h4 className="text-xs sm:text-sm font-bold text-stone-900">
              قنوات دفع الإشعارات والتذكيرات الآلية
            </h4>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700">
              مفعّل {toArabicNumerals(enabledChannelsCount)} من ٦
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPerPrayerOffsets((prev) => !prev)}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            {showPerPrayerOffsets
              ? 'إخفاء تخصيص دقائق كل صلاة'
              : 'تخصيص دقائق التنبيه لكل صلاة (قبل الأذان والإقامة)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PUSH_CHANNEL_ITEMS.map((ch) => {
            const isOn = channelsConfig[ch.key];
            return (
              <div
                key={ch.key}
                data-testid={`push-channel-${ch.key}`}
                className={`p-3 rounded-xl border transition-colors flex flex-col justify-between gap-2.5 ${
                  isOn
                    ? 'bg-white border-[#14532D]/35'
                    : 'bg-stone-100/70 border-stone-200 opacity-75'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-stone-900 block">
                    {ch.titleAr}
                  </span>
                  <span className="text-[10px] text-stone-600 block mt-0.5 leading-relaxed">
                    {ch.descAr}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100">
                  <button
                    type="button"
                    data-testid={`trigger-channel-${ch.key}`}
                    onClick={() => void handleTriggerSpecificNotification(ch.key)}
                    className="min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F7F4EE] hover:bg-stone-200/80 border border-stone-200 text-[#78350F] flex items-center gap-1 transition-colors cursor-pointer"
                    title={`تشغيل وتجربة ${ch.shortLabelAr} الآن`}
                  >
                    <Send className="w-3 h-3" />
                    <span>تشغيل الآن</span>
                  </button>

                  <button
                    type="button"
                    data-testid={`toggle-channel-${ch.key}`}
                    onClick={() => void handleToggleChannel(ch.key)}
                    className={`shrink-0 min-h-[28px] px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      isOn
                        ? 'bg-[#14532D] text-white'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isOn ? 'مفعّل' : 'موقوف'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible 6-Card Prayer Alert Timing & Toggle Grid */}
      {showPerPrayerOffsets && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {PRAYER_METADATA.map((meta) => {
            const cfg = alertsConfig[meta.key];
            const timeStr = todayTimes[meta.key];
            return (
              <div
                key={meta.key}
                className={`rounded-2xl border p-3 flex flex-col justify-between gap-2.5 transition-colors ${
                  cfg.enabled
                    ? 'bg-[#FBF9F5] border-[#14532D]/40'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-sm font-bold text-stone-900">
                    {meta.nameAr}
                  </span>
                  <span className="font-tabular text-xs font-bold text-stone-600">
                    {timeStr}
                  </span>
                </div>

                {cfg.enabled && (
                  <div className="space-y-1.5 pt-1 border-t border-stone-200/70 text-[10px] text-stone-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>قبل الأذان:</span>
                      <select
                        aria-label={`التنبيه قبل أذان ${meta.nameAr}`}
                        value={cfg.beforeMinutes}
                        onChange={(e) =>
                          handleChangeBeforeMinutes(
                            meta.key,
                            Number(e.target.value)
                          )
                        }
                        className="bg-white border border-stone-300 rounded px-1 py-0.5 text-[10px] font-semibold text-stone-800 cursor-pointer"
                      >
                        <option value={0}>بدون</option>
                        <option value={5}>٥ د</option>
                        <option value={10}>١٠ د</option>
                        <option value={15}>١٥ د</option>
                        <option value={20}>٢٠ د</option>
                        <option value={30}>٣٠ د</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span>الإقامة:</span>
                      <select
                        aria-label={`تذكير إقامة ${meta.nameAr}`}
                        value={cfg.afterMinutes}
                        onChange={(e) =>
                          handleChangeAfterMinutes(
                            meta.key,
                            Number(e.target.value)
                          )
                        }
                        className="bg-white border border-stone-300 rounded px-1 py-0.5 text-[10px] font-semibold text-stone-800 cursor-pointer"
                      >
                        <option value={0}>بدون</option>
                        <option value={5}>٥ د</option>
                        <option value={10}>١٠ د</option>
                        <option value={15}>١٥ د</option>
                        <option value={20}>٢٠ د</option>
                        <option value={30}>٣٠ د</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleTogglePrayerEnabled(meta.key)}
                    className={`flex-1 min-h-[30px] px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      cfg.enabled
                        ? 'bg-[#14532D] text-white'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {cfg.enabled ? 'مفعّل' : 'صامت'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayAdhan(meta.nameAr)}
                    aria-label={`تشغيل أذان ${meta.nameAr}`}
                    className="min-h-[30px] px-2 py-1 rounded-lg bg-[#F7F4EE] hover:bg-stone-200 border border-stone-200 text-stone-700 cursor-pointer"
                    title={`معاينة أذان ${meta.nameAr}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
