import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  BellRing,
  Play,
  Pause,
  Square,
  Send,
  ShieldCheck,
  Sparkles,
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
  loadPushChannelsConfig,
  savePushChannelsConfig,
  getBrowserNotificationPermissionState,
  requestAndVerifyPushPermission,
  buildTestPushNotification,
  dispatchSystemAndInAppNotification,
} from '../utils/notificationDispatcher';

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
  descAr: string;
}[] = [
  {
    key: 'adhanPush',
    titleAr: 'إشعار دخول وقت الصلاة والأذان',
    descAr: 'دفع إشعار فوري مع تشغيل الأذان الأساسي المثبّت عند حلول الوقت',
  },
  {
    key: 'preAdhanPush',
    titleAr: 'التذكير قبل الأذان (الاستعداد والوضوء)',
    descAr: 'تنبيه استباقي قبل دخول وقت الصلاة بالدقائق المحددة لكل فرض',
  },
  {
    key: 'iqamahPush',
    titleAr: 'تذكير الإقامة والسنن الرواتب والضحى',
    descAr: 'إشعار بعد الأذان للتذكير بالإقامة والسنن الرواتب وصلاة الإشراق',
  },
  {
    key: 'adhkarPush',
    titleAr: 'إشعارات أذكار الصباح والمساء',
    descAr: 'تذكير يومي في وقت الشروق وبعد العصر لتلاوة حصن المسلم',
  },
  {
    key: 'lastThirdPush',
    titleAr: 'منبّه الثلث الأخير من الليل (التهجّد)',
    descAr: 'إشعار عند بدء الثلث الأخير من الليل لقيام الليل والوتر والدعاء',
  },
  {
    key: 'fridayKahfPush',
    titleAr: 'سنن يوم الجمعة (سورة الكهف والصلاة على النبي ﷺ)',
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

  const [playbackState, setPlaybackState] = useState<AdhanPlaybackState>(() =>
    getAdhanPlaybackState()
  );

  useEffect(() => {
    let mounted = true;
    syncAndPinExistingAdhanAudio().catch(() => {});
    const unsub = subscribeAdhanPlaybackState((state) => {
      if (mounted) setPlaybackState(state);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleToggleChannel = (key: keyof PushNotificationChannelsConfig) => {
    setChannelsConfig((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      savePushChannelsConfig(updated);
      return updated;
    });
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

  const handleSendTestPush = async () => {
    const testNotif = buildTestPushNotification(
      cityNameAr,
      nextPrayerNameAr,
      nextPrayerTime
    );
    await dispatchSystemAndInAppNotification(testNotif);
    setTestAlertBanner(
      `تم دفع إشعار تجريبي فوري لمدينة ${cityNameAr} (صلاة ${nextPrayerNameAr} الساعة ${nextPrayerTime}).`
    );
  };

  const handleTogglePrayerEnabled = (key: MainPrayerKey) => {
    onChangeAlertsConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
        atAdhan: !prev[key].enabled ? true : prev[key].atAdhan,
        soundId: !prev[key].enabled ? 'custom_file' : prev[key].soundId,
      },
    }));
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
      {/* Compact Header & Push Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              data-testid="enable-push-notifications-btn"
              onClick={handleEnablePushNotifications}
              className="min-h-[34px] px-3 py-1 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/20 border border-[#14532D]/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>تفعيل دفع الإشعارات للنظام</span>
            </button>
          )}

          <button
            type="button"
            data-testid="send-test-push-btn"
            onClick={handleSendTestPush}
            className="min-h-[34px] px-3 py-1 text-xs font-semibold text-stone-800 bg-[#F7F4EE] hover:bg-stone-200/80 border border-stone-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#78350F]" />
            <span>إرسال إشعار تجريبي</span>
          </button>

          <button
            type="button"
            data-testid="test-alert-btn"
            onClick={() => handlePlayAdhan()}
            className="min-h-[34px] px-3.5 py-1 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#14532D]/90 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>معاينة الأذان</span>
          </button>
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#78350F]" />
            <h4 className="text-xs sm:text-sm font-bold text-stone-900">
              قنوات دفع الإشعارات والتذكيرات الآلية
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            تعمل تلقائياً في أوقاتها الشرعية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PUSH_CHANNEL_ITEMS.map((ch) => {
            const isOn = channelsConfig[ch.key];
            return (
              <div
                key={ch.key}
                data-testid={`push-channel-${ch.key}`}
                className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-2.5 ${
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
                <button
                  type="button"
                  data-testid={`toggle-channel-${ch.key}`}
                  onClick={() => handleToggleChannel(ch.key)}
                  className={`shrink-0 min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    isOn
                      ? 'bg-[#14532D] text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {isOn ? 'مفعّل' : 'موقوف'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6-Card Prayer Alert Timing & Toggle Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
                  onClick={() => handleTogglePrayerEnabled(meta.key)}
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
    </section>
  );
};
