import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  BellRing,
  Upload,
  Play,
  Pause,
  Square,
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
  CustomAdhanFileMeta,
  getCustomAdhanFileMeta,
  saveCustomAdhanAudioFile,
} from '../utils/soundPlayer';

interface PrayerAlertsPanelProps {
  todayTimes: DailyPrayerTimes;
  alertsConfig: Record<MainPrayerKey, PrayerAlertItemConfig>;
  onChangeAlertsConfig: React.Dispatch<
    React.SetStateAction<Record<MainPrayerKey, PrayerAlertItemConfig>>
  >;
}

export const PrayerAlertsPanel: React.FC<PrayerAlertsPanelProps> = ({
  todayTimes,
  alertsConfig,
  onChangeAlertsConfig,
}) => {
  const [testAlertBanner, setTestAlertBanner] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const [customFileMeta, setCustomFileMeta] =
    useState<CustomAdhanFileMeta | null>(() => getCustomAdhanFileMeta());
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<AdhanPlaybackState>(() =>
    getAdhanPlaybackState()
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeAdhanPlaybackState((state) => {
      setPlaybackState(state);
    });
  }, []);

  const handleRequestBrowserNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setTestAlertBanner(
        'التنبيه الصوتي للأذان يعمل مباشرة داخل التطبيق في أوقات الصلوات.'
      );
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        setTestAlertBanner('تم تفعيل إشعارات المتصفح لمواقيت الصلاة بنجاح.');
      }
    } catch {
      // ignore
    }
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

  const handleUploadFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingAudio(true);

    try {
      const meta = await saveCustomAdhanAudioFile(file);
      setCustomFileMeta(meta);
      onChangeAlertsConfig((prev) => {
        const updated = { ...prev };
        (Object.keys(updated) as MainPrayerKey[]).forEach((k) => {
          updated[k] = {
            ...updated[k],
            soundId: 'custom_file',
          };
        });
        return updated;
      });
      setTestAlertBanner('تم تحديث صوت الأذان وتفعيله لجميع الصلوات.');
      await playAlertSoundTone('custom_file', 'الصلاة');
    } catch {
      setUploadError('تعذّر قراءة الملف الصوتي. يرجى اختيار ملف صوتي صالح.');
    } finally {
      setIsUploadingAudio(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePlayAdhan = (prayerLabelAr?: string) => {
    playAlertSoundTone('custom_file', prayerLabelAr);
    setTestAlertBanner(
      prayerLabelAr
        ? `جاري تشغيل أذان صلاة ${prayerLabelAr}`
        : 'جاري تشغيل الأذان الشرعي'
    );
  };

  const activeProgressPercent =
    playbackState.durationSec > 0
      ? Math.min(
          100,
          Math.round(
            (playbackState.currentTimeSec / playbackState.durationSec) * 100
          )
        )
      : 0;

  const activePhrase = getAdhanPhraseForProgress(activeProgressPercent);

  return (
    <section
      id="adhan-audio-studio"
      aria-labelledby="prayer-alerts-heading"
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#14532D]" />
          <h3
            id="prayer-alerts-heading"
            className="font-display text-base sm:text-lg font-bold text-stone-900"
          >
            مشغّل الأذان وتنبيهات الصلوات
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'granted' &&
            notificationPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestBrowserNotification}
                className="min-h-[34px] px-3 py-1 text-xs font-medium text-stone-700 bg-[#F7F4EE] hover:bg-stone-200/70 border border-stone-300 rounded-xl transition-colors cursor-pointer"
              >
                إشعارات المتصفح
              </button>
            )}
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

      {/* Hidden File Input for Updating Adhan Audio */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        onChange={handleUploadFileChange}
        className="hidden"
        data-testid="adhan-file-input"
      />

      {uploadError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800"
        >
          {uploadError}
        </div>
      )}

      {testAlertBanner && (
        <div
          role="status"
          data-testid="alert-toast-banner"
          className="p-2.5 rounded-xl bg-[#14532D]/10 border border-[#14532D]/30 text-xs text-stone-800 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#14532D] shrink-0" />
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

      {/* Interactive Adhan Audio Player */}
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
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-white">
                  {playbackState.activeLabelAr || 'الأذان الشرعي المعتمد'}
                </span>
                <span className="text-[11px] text-[#FDE68A] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مفعّل</span>
                </span>
              </div>
              {customFileMeta && (
                <p className="text-[11px] text-[#D6CEBE]">
                  المدة: {formatAudioDurationMMSS(customFileMeta.durationSeconds)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-black/20 px-2.5 py-1 rounded-xl border border-white/10">
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
                className="w-16 accent-[#FDE68A] cursor-pointer"
              />
            </div>

            <button
              type="button"
              data-testid="upload-custom-adhan-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAudio}
              className="min-h-[32px] px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingAudio ? 'جاري التحديث...' : 'تغيير الصوت'}</span>
            </button>
          </div>
        </div>

        {/* Progress Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            aria-label="شريط تقدم صوت الأذان"
            data-testid="adhan-seek-slider"
            min={0}
            max={playbackState.durationSec > 0 ? playbackState.durationSec : 100}
            step={0.1}
            value={playbackState.currentTimeSec}
            onChange={(e) => seekActiveAdhanAudio(Number(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-[#FDE68A] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-tabular text-[#D6CEBE]">
            <span>{formatAudioDurationMMSS(playbackState.currentTimeSec)}</span>
            <span className="font-quran text-xs text-[#FDE68A]">
              {playbackState.isPlaying || playbackState.isPaused
                ? `﴿ ${activePhrase.arabicText} ﴾`
                : '﴿ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ ﴾'}
            </span>
            <span>{formatAudioDurationMMSS(playbackState.durationSec)}</span>
          </div>
        </div>
      </div>

      {/* Clean 6-Card Prayer Toggle Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
