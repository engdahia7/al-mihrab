import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Volume2,
  Check,
  Plus,
  X,
} from 'lucide-react';
import {
  ADHKAR_REMINDER_SOUND_OPTIONS,
  REMINDER_SELECTABLE_ADHKAR,
  loadAdhkarRemindersConfig,
  saveAdhkarRemindersConfig,
  type AdhkarReminderScheduleConfig,
  type AdhkarReminderSoundId,
} from '../utils/khatmahAndAlerts';
import { playAlertSoundTone } from '../utils/soundPlayer';
import { dispatchSystemAndInAppNotification } from '../utils/notificationDispatcher';
import { toArabicNumerals } from '../utils/astronomy';

interface AdhkarRemindersPanelProps {
  onSelectCategory?: (categoryId: string) => void;
}

export const AdhkarRemindersPanel: React.FC<AdhkarRemindersPanelProps> = ({
  onSelectCategory,
}) => {
  const [config, setConfig] = useState<AdhkarReminderScheduleConfig>(() =>
    loadAdhkarRemindersConfig()
  );
  const [newTimeInput, setNewTimeInput] = useState<string>('09:00');
  const [lastPreviewNotice, setLastPreviewNotice] = useState<string | null>(
    null
  );

  useEffect(() => {
    saveAdhkarRemindersConfig(config);
  }, [config]);

  const handleToggleDhikrSelection = (id: string) => {
    setConfig((prev) => {
      const exists = prev.selectedDhikrIds.includes(id);
      if (exists && prev.selectedDhikrIds.length <= 1) {
        return prev; // Keep at least one Dhikr selected
      }
      const nextIds = exists
        ? prev.selectedDhikrIds.filter((item) => item !== id)
        : [...prev.selectedDhikrIds, id];
      return {
        ...prev,
        selectedDhikrIds: nextIds,
      };
    });
  };

  const handleSelectAllAdhkar = () => {
    setConfig((prev) => ({
      ...prev,
      selectedDhikrIds: REMINDER_SELECTABLE_ADHKAR.map((d) => d.id),
    }));
  };

  const handleAddSpecificTime = () => {
    const clean = newTimeInput.trim();
    if (!/^\d{2}:\d{2}$/.test(clean)) return;
    setConfig((prev) => {
      if (prev.specificTimesHHMM.includes(clean)) return prev;
      const nextTimes = [...prev.specificTimesHHMM, clean].sort();
      return {
        ...prev,
        specificTimesHHMM: nextTimes,
      };
    });
  };

  const handleRemoveSpecificTime = (timeHHMM: string) => {
    setConfig((prev) => {
      if (prev.specificTimesHHMM.length <= 1) return prev;
      return {
        ...prev,
        specificTimesHHMM: prev.specificTimesHHMM.filter((t) => t !== timeHHMM),
      };
    });
  };

  const handleChangeSound = (soundId: AdhkarReminderSoundId) => {
    setConfig((prev) => ({
      ...prev,
      soundId,
    }));
    playAlertSoundTone(soundId, 'تذكير الأذكار').catch(() => {});
  };

  const handleTestLiveReminder = () => {
    const selectedItems = REMINDER_SELECTABLE_ADHKAR.filter((d) =>
      config.selectedDhikrIds.includes(d.id)
    );
    const chosen = selectedItems[0] || REMINDER_SELECTABLE_ADHKAR[0];
    const soundSpec =
      ADHKAR_REMINDER_SOUND_OPTIONS.find((s) => s.id === config.soundId) ||
      ADHKAR_REMINDER_SOUND_OPTIONS[0];

    playAlertSoundTone(config.soundId, chosen.titleAr).catch(() => {});

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    dispatchSystemAndInAppNotification({
      id: `adhkar-custom-rem-${Date.now()}`,
      category: 'ADHKAR_MORNING',
      titleAr: `تذكير الأذكار المخصص · ${chosen.titleAr}`,
      bodyAr: chosen.dhikrTextAr,
      subtitleOrHadithAr: chosen.virtueBriefAr,
      timestampHHMM: `${hh}:${mm}`,
      createdAtMs: Date.now(),
      shouldPlayFullAdhan: config.soundId === 'custom_file',
      actionLabelAr: 'فتح الأذكار الآن',
      actionTab: 'adhkar',
    }).catch(() => {});

    setLastPreviewNotice(
      `تم إرسال تذكير «${chosen.titleAr}» بصوت «${soundSpec.nameAr}» بنجاح.`
    );
    window.setTimeout(() => setLastPreviewNotice(null), 4000);
  };

  const activeSoundSpec =
    ADHKAR_REMINDER_SOUND_OPTIONS.find((s) => s.id === config.soundId) ||
    ADHKAR_REMINDER_SOUND_OPTIONS[0];

  return (
    <section
      aria-label="نظام تذكير المستخدمين بالأذكار المخصص"
      data-testid="adhkar-reminders-panel"
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs"
      dir="rtl"
    >
      {/* Top Header & Master Switch + Live Test Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-[#14532D] block">
            منبّه الذاكرين الذكي · تخصيص الأذكار والأوقات والنغمات الصوتية
          </span>
          <h2 className="font-display text-base sm:text-lg font-bold text-stone-900 mt-0.5">
            نظام التذكير بالأذكار (اختيار الأذكار · أوقات أو فترات زمنية · تخصيص صوت التنبيه)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            الأذكار المختارة حالياً:{' '}
            {toArabicNumerals(config.selectedDhikrIds.length)} من{' '}
            {toArabicNumerals(REMINDER_SELECTABLE_ADHKAR.length)} · نمط الجدولة:{' '}
            {config.scheduleMode === 'specific_times'
              ? `أوقات محددة (${toArabicNumerals(config.specificTimesHHMM.length)} أوقات)`
              : `فترة دورية (كل ${toArabicNumerals(config.intervalMinutes)} دقيقة)`}{' '}
            · الصوت: {activeSoundSpec.nameAr}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="toggle-adhkar-reminders-enabled-btn"
            onClick={() =>
              setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              config.enabled
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-[#F7F4EE] text-stone-700 border-stone-300'
            }`}
          >
            {config.enabled ? 'التذكير مفعّل' : 'التذكير متوقف'}
          </button>

          <button
            type="button"
            data-testid="test-adhkar-reminder-btn"
            onClick={handleTestLiveReminder}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>إرسال تذكير تجريبي الآن</span>
          </button>
        </div>
      </div>

      {lastPreviewNotice && (
        <div
          data-testid="adhkar-reminder-test-feedback"
          className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-[#14532D] flex items-center justify-between gap-2"
        >
          <span>{lastPreviewNotice}</span>
          <button
            type="button"
            onClick={() => setLastPreviewNotice(null)}
            className="text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Step 1: Select Adhkar to be Reminded Of */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-stone-900">
            ١. اختر الأذكار التي ترغب في تذكيرك بها ({toArabicNumerals(config.selectedDhikrIds.length)} مختارة):
          </h3>
          <button
            type="button"
            data-testid="select-all-reminder-adhkar-btn"
            onClick={handleSelectAllAdhkar}
            className="text-xs font-semibold text-[#14532D] hover:underline cursor-pointer"
          >
            تحديد جميع الأذكار ({toArabicNumerals(REMINDER_SELECTABLE_ADHKAR.length)})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {REMINDER_SELECTABLE_ADHKAR.map((item) => {
            const isSelected = config.selectedDhikrIds.includes(item.id);
            return (
              <div
                key={item.id}
                data-testid={`reminder-dhikr-option-${item.id}`}
                onClick={() => handleToggleDhikrSelection(item.id)}
                className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[#FAF5E8] border-[#14532D]'
                    : 'bg-[#FBF9F5] border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {item.titleAr}
                    </span>
                    {onSelectCategory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCategory(item.categoryId);
                        }}
                        className="text-[11px] text-[#78350F] hover:underline cursor-pointer"
                      >
                        عرض القسم
                      </button>
                    )}
                  </div>
                  <p className="font-quran text-sm sm:text-base text-stone-800 leading-relaxed">
                    {item.dhikrTextAr}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {item.virtueBriefAr}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-[#14532D] border-[#14532D] text-white'
                      : 'bg-white border-stone-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2 & Step 3: Schedule Mode (Specific Times vs Interval) + Alert Sound Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-stone-200/80">
        {/* Left 6 Cols: Schedule Mode (Specific Times OR Periodic Intervals) */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#14532D]" />
            <span>٢. تحديد أوقات التذكير أو الفترات الزمنية:</span>
          </h3>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F7F4EE] border border-stone-200 rounded-xl">
            <button
              type="button"
              data-testid="reminder-mode-specific-times"
              onClick={() =>
                setConfig((prev) => ({ ...prev, scheduleMode: 'specific_times' }))
              }
              className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                config.scheduleMode === 'specific_times'
                  ? 'bg-[#14532D] text-white'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              أوقات يومية محددة
            </button>
            <button
              type="button"
              data-testid="reminder-mode-interval"
              onClick={() =>
                setConfig((prev) => ({ ...prev, scheduleMode: 'interval' }))
              }
              className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                config.scheduleMode === 'interval'
                  ? 'bg-[#14532D] text-white'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              فترات زمنية دورية
            </button>
          </div>

          {config.scheduleMode === 'specific_times' ? (
            <div className="space-y-3" data-testid="specific-times-config-box">
              <div className="flex flex-wrap items-center gap-2">
                {config.specificTimesHHMM.map((timeStr) => (
                  <div
                    key={timeStr}
                    data-testid={`scheduled-time-chip-${timeStr}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF5E8] border border-[#C8B696] text-xs font-bold text-stone-900 font-tabular tabular-nums"
                  >
                    <span>{timeStr}</span>
                    {config.specificTimesHHMM.length > 1 && (
                      <button
                        type="button"
                        aria-label={`حذف وقت التذكير ${timeStr}`}
                        onClick={() => handleRemoveSpecificTime(timeStr)}
                        className="text-stone-500 hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label="إضافة وقت تذكير جديد"
                  data-testid="adhkar-reminder-add-time-input"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="min-h-[38px] px-3 py-1.5 text-xs font-bold bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular tabular-nums"
                />
                <button
                  type="button"
                  data-testid="adhkar-reminder-add-time-btn"
                  onClick={handleAddSpecificTime}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة وقت للتذكير</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5" data-testid="interval-config-box">
              <span className="text-xs text-stone-600 block">
                اختر الفترة الزمنية لتكرار التذكير بالأذكار المختارة تلقائياً:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { min: 15, label: 'كل ١٥ دقيقة' },
                  { min: 30, label: 'كل ٣٠ دقيقة' },
                  { min: 60, label: 'كل ساعة (٦٠ د)' },
                  { min: 120, label: 'كل ساعتين' },
                  { min: 240, label: 'كل ٤ ساعات' },
                ].map((opt) => (
                  <button
                    key={opt.min}
                    type="button"
                    data-testid={`reminder-interval-btn-${opt.min}`}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        intervalMinutes: opt.min,
                      }))
                    }
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      config.intervalMinutes === opt.min
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 6 Cols: Customize Alert Sound Tone */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-[#78350F]" />
              <span>٣. تخصيص صوت التنبيه:</span>
            </h3>
            <button
              type="button"
              data-testid="preview-adhkar-sound-btn"
              onClick={() =>
                playAlertSoundTone(config.soundId, 'تذكير الأذكار').catch(
                  () => {}
                )
              }
              className="min-h-[32px] px-3 py-1 rounded-lg bg-[#FAF5E8] hover:bg-[#EFE4CE] border border-[#C8B696] text-[#78350F] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>معاينة الصوت المختار</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADHKAR_REMINDER_SOUND_OPTIONS.map((sound) => {
              const isSelected = config.soundId === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  data-testid={`adhkar-sound-option-${sound.id}`}
                  onClick={() =>
                    handleChangeSound(sound.id as AdhkarReminderSoundId)
                  }
                  className={`p-2.5 rounded-xl border text-right transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-[#FBF9F5] text-stone-800 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">
                      {sound.nameAr}
                    </span>
                    <span
                      className={`text-[10px] block truncate mt-0.5 ${
                        isSelected ? 'text-stone-200' : 'text-stone-500'
                      }`}
                    >
                      {sound.descriptionAr}
                    </span>
                  </div>
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isSelected ? 'text-amber-200' : 'text-stone-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
