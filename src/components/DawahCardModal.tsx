import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Share2,
  Check,
  Heart,
  Image as ImageIcon,
  Copy,
} from 'lucide-react';
import {
  DawahShareCardPayload,
  DawahCardThemeId,
  DawahCardAspectRatio,
  DAWAH_CARD_THEMES,
  WaqfDedicationConfig,
  WAQF_DEDICATION_PRESETS,
  WaqfDedicationCategory,
  generateDawahCardDataUrl,
  dataUrlToPngFile,
  formatWaqfDedicationLineAr,
  buildWaqfCertificateCardPayload,
  buildWaqfShareUrl,
} from '../utils/dawahShareCards';

interface DawahCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayload: DawahShareCardPayload | null;
  waqfConfig: WaqfDedicationConfig;
  onSaveWaqfConfig: (next: WaqfDedicationConfig) => void;
  initialMode?: 'card' | 'waqf_settings';
}

export const DawahCardModal: React.FC<DawahCardModalProps> = ({
  isOpen,
  onClose,
  initialPayload,
  waqfConfig,
  onSaveWaqfConfig,
  initialMode = 'card',
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'waqf_settings'>(initialMode);
  const [theme, setTheme] = useState<DawahCardThemeId>('parchment');
  const [aspectRatio, setAspectRatio] = useState<DawahCardAspectRatio>('square');
  const [customDedicationOverride, setCustomDedicationOverride] = useState<string>('');
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [shareStatusMessage, setShareStatusMessage] = useState<string | null>(null);

  // Local editable Waqf form state
  const [draftWaqf, setDraftWaqf] = useState<WaqfDedicationConfig>(waqfConfig);
  const [savedWaqfFeedback, setSavedWaqfFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setDraftWaqf(waqfConfig);
      setCustomDedicationOverride(
        initialPayload?.waqfDedicationLineAr ||
          formatWaqfDedicationLineAr(waqfConfig)
      );
      setShareStatusMessage(null);
    }
  }, [isOpen, initialMode, initialPayload, waqfConfig]);

  const effectivePayload: DawahShareCardPayload = useMemo(() => {
    if (activeTab === 'waqf_settings' || !initialPayload) {
      return buildWaqfCertificateCardPayload(draftWaqf);
    }
    return {
      ...initialPayload,
      waqfDedicationLineAr:
        customDedicationOverride.trim() ||
        formatWaqfDedicationLineAr(draftWaqf),
    };
  }, [activeTab, initialPayload, draftWaqf, customDedicationOverride]);

  const cardDataUrl = useMemo(() => {
    if (!isOpen) return null;
    return generateDawahCardDataUrl(effectivePayload, {
      theme,
      aspectRatio,
    });
  }, [isOpen, effectivePayload, theme, aspectRatio]);

  if (!isOpen) return null;

  const handleSelectWaqfCategory = (catId: WaqfDedicationCategory) => {
    const preset =
      WAQF_DEDICATION_PRESETS.find((p) => p.id === catId) ||
      WAQF_DEDICATION_PRESETS[0];
    const updated: WaqfDedicationConfig = {
      ...draftWaqf,
      enabled: true,
      category: catId,
      customDuaAr: preset.defaultDuaAr,
    };
    setDraftWaqf(updated);
    setCustomDedicationOverride(formatWaqfDedicationLineAr(updated));
  };

  const handleSaveWaqfDedication = () => {
    const toSave: WaqfDedicationConfig = {
      ...draftWaqf,
      enabled: true,
    };
    onSaveWaqfConfig(toSave);
    setCustomDedicationOverride(formatWaqfDedicationLineAr(toSave));
    setSavedWaqfFeedback(true);
    window.setTimeout(() => setSavedWaqfFeedback(false), 2500);
  };

  const handleDisableWaqfDedication = () => {
    const resetConfig: WaqfDedicationConfig = {
      ...draftWaqf,
      enabled: false,
      recipientName: '',
    };
    setDraftWaqf(resetConfig);
    onSaveWaqfConfig(resetConfig);
    setCustomDedicationOverride(formatWaqfDedicationLineAr(resetConfig));
  };

  const handleShareCardImage = async () => {
    if (!cardDataUrl) return;
    const fileName = `almihrab-${effectivePayload.category}-${Date.now()}.png`;
    const file = await dataUrlToPngFile(cardDataUrl, fileName);

    const shareUrl = buildWaqfShareUrl(
      window.location.origin + window.location.pathname,
      draftWaqf
    );
    const shareText = `${effectivePayload.titleAr ? `${effectivePayload.titleAr}\n` : ''}${
      effectivePayload.mainArabicText
    }\n\n${
      effectivePayload.waqfDedicationLineAr || ''
    }\nتطبيق «المحراب» — نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله:\n${shareUrl}`;

    if (
      file &&
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: 'بطاقة دعوية من تطبيق المحراب',
          text: shareText,
        });
        return;
      } catch {
        // Fallback if user cancels
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'بطاقة دعوية من تطبيق المحراب',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to download + copy
      }
    }

    // Download the image + copy share text
    const link = document.createElement('a');
    link.href = cardDataUrl;
    link.download = fileName;
    link.click();

    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // ignore
    }
    setShareStatusMessage('تم تنزيل البطاقة المصورة (PNG) ونسخ النص للمشاركة');
    window.setTimeout(() => setShareStatusMessage(null), 3500);
  };

  const handleCopyDedicatedWaqfLink = async () => {
    const toSave: WaqfDedicationConfig = {
      ...draftWaqf,
      enabled: true,
    };
    onSaveWaqfConfig(toSave);

    const shareUrl = buildWaqfShareUrl(
      window.location.origin + window.location.pathname,
      toSave
    );
    const dedicationLine = formatWaqfDedicationLineAr(toSave);
    const shareMessage = `${dedicationLine}\n«${
      toSave.customDuaAr
    }»\n\nتطبيق «المحراب» (المصحف الشريف، مواقيت الصلاة، الأذكار، المساجد المحيطة) — شارك في التلاوة والذكر ليعمّ الأجر:\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: dedicationLine,
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 3000);
    } catch {
      // ignore
    }
  };

  const currentPreset =
    WAQF_DEDICATION_PRESETS.find((p) => p.id === draftWaqf.category) ||
    WAQF_DEDICATION_PRESETS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      dir="rtl"
    >
      <div
        data-testid="dawah-waqf-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto bg-[#FAF5E8] border-2 border-[#B59E7A] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl text-stone-900"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#D8CBB3] pb-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#14532D]">
              بطاقات المشاركة الدعوية وإهداء الصدقة الجارية
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              نورٌ في دربك، وصدقةٌ جاريةٌ لوجه الله — صمّم بطاقة مصوّرة (PNG) أو خصّص وقفاً باسم الوالدين أو متوفى
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1.5 rounded-lg bg-white border border-[#C8B696] text-stone-600 hover:text-stone-900 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EFE4CE] border border-[#D8CBB3] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'card'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-800 hover:bg-white/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>بطاقة المشاركة المصوّرة (PNG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waqf_settings')}
            data-testid="tab-waqf-dedication"
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'waqf_settings'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-800 hover:bg-white/60'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>إهداء ثواب الختمة والصدقة الجارية</span>
          </button>
        </div>

        {/* =================================================================
            TAB 1: WAQF & SADAQAH JARIYAH DEDICATION SETTINGS
           ================================================================= */}
        {activeTab === 'waqf_settings' && (
          <div className="space-y-4 bg-white border border-[#D8CBB3] rounded-2xl p-4 sm:p-5">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                تخصيص وقف رقمي وصدقة جارية (باسم متوفى أو الوالدين)
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                يمكنك تخصيص سطر إهداء يظهر في التطبيق وعلى البطاقات الدعوية وفي قسم الختمة، أو إنشاء رابط وقف خاص ومشاركته مع الأهل والأصدقاء ليظهر باسم المهدى إليه ودعائه عند فتحهم للتطبيق.
              </p>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-stone-800">
                ١. اختر نوع الإهداء أو الوقف:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {WAQF_DEDICATION_PRESETS.map((preset) => {
                  const isSelected = draftWaqf.category === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectWaqfCategory(preset.id)}
                      className={`text-right px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#14532D] text-white border-[#14532D]'
                          : 'bg-[#FAF5E8] text-stone-800 border-[#D8CBB3] hover:bg-[#EFE4CE]'
                      }`}
                    >
                      {preset.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Name Input */}
            <div>
              <label
                htmlFor="waqf-recipient-name-input"
                className="block text-xs font-bold text-stone-800 mb-1"
              >
                ٢. اسم المهدى إليه (الوالدين أو المتوفى — اختياري):
              </label>
              <input
                id="waqf-recipient-name-input"
                type="text"
                value={draftWaqf.recipientName}
                onChange={(e) => {
                  const next = {
                    ...draftWaqf,
                    enabled: true,
                    recipientName: e.target.value,
                  };
                  setDraftWaqf(next);
                  setCustomDedicationOverride(formatWaqfDedicationLineAr(next));
                }}
                placeholder={currentPreset.placeholderNameAr}
                className="w-full min-h-[40px] px-3.5 py-2 text-xs sm:text-sm bg-[#FAF5E8] border border-[#C8B696] rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            {/* Custom Dua Input */}
            <div>
              <label
                htmlFor="waqf-custom-dua-input"
                className="block text-xs font-bold text-stone-800 mb-1"
              >
                ٣. نص الدعاء المخصص في بطاقة الوقف:
              </label>
              <textarea
                id="waqf-custom-dua-input"
                rows={3}
                value={draftWaqf.customDuaAr}
                onChange={(e) =>
                  setDraftWaqf((prev) => ({
                    ...prev,
                    enabled: true,
                    customDuaAr: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#FAF5E8] border border-[#C8B696] rounded-xl text-stone-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            {/* Action Buttons for Waqf */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="save-waqf-dedication-btn"
                  onClick={handleSaveWaqfDedication}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {savedWaqfFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم حفظ الإهداء في التطبيق</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      <span>اعتماد الإهداء في التطبيق والبطاقات</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyDedicatedWaqfLink}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم نسخ رابط الوقف المخصص</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>مشاركة رابط الوقف باسم المهدى إليه</span>
                    </>
                  )}
                </button>
              </div>

              {waqfConfig.enabled && (
                <button
                  type="button"
                  onClick={handleDisableWaqfDedication}
                  className="text-xs text-stone-500 hover:text-red-700 underline cursor-pointer"
                >
                  إعادة للوضع العام (لوجه الله عامة)
                </button>
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            CARD CUSTOMIZATION & HIGH-RES PNG PREVIEW (Shown in Both Tabs)
           ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Controls Column (5 cols on md) */}
          <div className="md:col-span-5 bg-white border border-[#D8CBB3] rounded-2xl p-4 space-y-3.5">
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-stone-800">
                نمط تصميم البطاقة:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(DAWAH_CARD_THEMES) as DawahCardThemeId[]).map(
                  (tKey) => {
                    const spec = DAWAH_CARD_THEMES[tKey];
                    const active = theme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => setTheme(tKey)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between cursor-pointer ${
                          active
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-[#FAF5E8] text-stone-800 border-[#D8CBB3] hover:bg-[#EFE4CE]'
                        }`}
                      >
                        <span>{spec.nameAr}</span>
                        <span
                          className="w-4 h-4 rounded-full border border-white/50 shrink-0"
                          style={{ backgroundColor: spec.bgPrimary }}
                        />
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-stone-800">
                مقاس الصورة:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAspectRatio('square')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    aspectRatio === 'square'
                      ? 'bg-[#78350F] text-white border-[#78350F]'
                      : 'bg-[#FAF5E8] text-stone-800 border-[#D8CBB3]'
                  }`}
                >
                  مربّع (منشور)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    aspectRatio === 'story'
                      ? 'bg-[#78350F] text-white border-[#78350F]'
                      : 'bg-[#FAF5E8] text-stone-800 border-[#D8CBB3]'
                  }`}
                >
                  طولي (حالة واتساب)
                </button>
              </div>
            </div>

            {activeTab === 'card' && (
              <div>
                <label
                  htmlFor="card-dedication-override"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  سطر الصدقة الجارية أسفل البطاقة:
                </label>
                <input
                  id="card-dedication-override"
                  type="text"
                  value={customDedicationOverride}
                  onChange={(e) => setCustomDedicationOverride(e.target.value)}
                  placeholder="صدقةٌ جاريةٌ خالصةٌ لوجه الله..."
                  className="w-full min-h-[36px] px-3 py-1.5 text-xs bg-[#FAF5E8] border border-[#C8B696] rounded-xl text-stone-900"
                />
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                data-testid="share-dawah-card-native-btn"
                onClick={handleShareCardImage}
                className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة البطاقة على واتساب / الهواتف</span>
              </button>

              {cardDataUrl && (
                <a
                  href={cardDataUrl}
                  download={`almihrab-${effectivePayload.category}-${aspectRatio}.png`}
                  data-testid="download-dawah-card-png-btn"
                  className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-[#EFE4CE] hover:bg-[#E5D6B8] text-stone-900 border border-[#C8B696] text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#14532D]" />
                  <span>تنزيل البطاقة كصورة (PNG)</span>
                </a>
              )}

              {shareStatusMessage && (
                <p className="text-[11px] text-[#14532D] font-semibold text-center">
                  {shareStatusMessage}
                </p>
              )}
            </div>
          </div>

          {/* Live PNG Image Preview Column (7 cols on md) */}
          <div className="md:col-span-7 bg-white border border-[#D8CBB3] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-bold text-[#78350F]">
              {activeTab === 'waqf_settings'
                ? 'معاينة وثيقة الوقف والصدقة الجارية المصوّرة:'
                : 'معاينة البطاقة الدعوية الجاهزة للمشاركة:'}
            </span>
            {cardDataUrl && (
              <img
                src={cardDataUrl}
                alt="معاينة البطاقة الدعوية"
                data-testid="dawah-card-preview-img"
                className={`rounded-xl border border-stone-200 shadow-md object-contain ${
                  aspectRatio === 'story'
                    ? 'max-h-[380px] w-auto'
                    : 'w-full max-w-[340px] aspect-square'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
