import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Pin,
  X,
  RotateCcw,
  Smartphone,
  Copy,
  Check,
  Bell,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  CityLocation,
  DailyPrayerTimes,
  NextPrayerStatus,
  HijriDateDetails,
  PRAYER_METADATA,
  toArabicNumerals,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
} from '../utils/astronomy';
import {
  WidgetSizePreset,
  WidgetThemeId,
  WidgetCardId,
  WIDGET_THEMES,
  WIDGET_CATALOG,
  calculatePrayerIntervalProgress,
  getWidgetDailyAyah,
  getUpcomingHijriNoteAr,
  buildStandalonePhoneWidgetUrl,
  buildLockScreenNotificationPayload,
  generateIOSScriptableWidgetScript,
} from '../utils/widgetEngine';

const WIDGET_PREFS_KEY = 'almihrab_smart_widget_prefs_v1';

const QUICK_DHIKR_LIST = [
  'سبحان الله وبحمده',
  'سبحان الله العظيم',
  'أستغفر الله وأتوب إليه',
  'لا إله إلا الله وحده لا شريك له',
  'اللهم صلِّ وسلم على نبينا محمد',
];

interface SmartIslamicWidgetsProps {
  selectedCity: CityLocation;
  todayTimes: DailyPrayerTimes;
  nextPrayerInfo: NextPrayerStatus;
  hijriDate: HijriDateDetails;
  qiblaAngle: number;
  now: Date;
  onOpenMushafPage?: (page: number) => void;
  onNavigateToQibla?: () => void;
  onDetectLocation?: () => void;
  standaloneMode?: boolean;
  initialSize?: WidgetSizePreset;
  initialTheme?: WidgetThemeId;
  initialCard?: WidgetCardId | 'all';
}

export const SmartIslamicWidgets: React.FC<SmartIslamicWidgetsProps> = ({
  selectedCity,
  todayTimes,
  nextPrayerInfo,
  hijriDate,
  qiblaAngle,
  now,
  onOpenMushafPage,
  onNavigateToQibla,
  onDetectLocation,
  standaloneMode = false,
  initialSize,
  initialTheme,
  initialCard,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | WidgetCardId>(
    initialCard || 'next_prayer_arc'
  );

  const [sizePreset] = useState<WidgetSizePreset>(() => {
    if (initialSize) return initialSize;
    return 'large';
  });

  const [themeId, setThemeId] = useState<WidgetThemeId>(() => {
    if (initialTheme) return initialTheme;
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeId && WIDGET_THEMES[parsed.themeId as WidgetThemeId]) {
          return parsed.themeId;
        }
      }
    } catch {
      // ignore
    }
    return 'emerald';
  });

  const [floatingPinned, setFloatingPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.floatingPinned);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [tasbihCount, setTasbihCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.tasbihCount === 'number') return parsed.tasbihCount;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [dhikrIndex, setDhikrIndex] = useState<number>(0);
  const [ayahOffset, setAyahOffset] = useState<number>(0);
  const [standbyFullscreen, setStandbyFullscreen] = useState<boolean>(false);

  // External Mobile Phone Widget Hub state
  const [showPhoneWidgetModal, setShowPhoneWidgetModal] = useState<boolean>(false);
  const [selectedExternalCard, setSelectedExternalCard] =
    useState<WidgetCardId>('next_prayer_arc');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [externalStatusMsg, setExternalStatusMsg] = useState<string | null>(null);
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);

  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (standaloneMode) return;
    try {
      localStorage.setItem(
        WIDGET_PREFS_KEY,
        JSON.stringify({
          sizePreset,
          themeId,
          floatingPinned,
          tasbihCount,
        })
      );
    } catch {
      // ignore
    }
  }, [sizePreset, themeId, floatingPinned, tasbihCount, standaloneMode]);

  const theme = WIDGET_THEMES[themeId] || WIDGET_THEMES.emerald;

  const intervalProgress = useMemo(() => {
    return calculatePrayerIntervalProgress(
      todayTimes,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }, [todayTimes, now]);

  const dailyAyah = useMemo(() => {
    return getWidgetDailyAyah(hijriDate.day, ayahOffset);
  }, [hijriDate.day, ayahOffset]);

  const distanceToKaaba = useMemo(() => {
    return calculateDistanceToKaaba(selectedCity.latitude, selectedCity.longitude);
  }, [selectedCity]);

  const cardinalAr = useMemo(() => {
    return getCardinalDirectionAr(qiblaAngle);
  }, [qiblaAngle]);

  const hijriOccasionNote = useMemo(() => {
    return getUpcomingHijriNoteAr(hijriDate.day, hijriDate.monthNameAr);
  }, [hijriDate.day, hijriDate.monthNameAr]);

  const currentClockFormatted = useMemo(() => {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [now]);

  // Export High-DPI PNG Card using HTML5 Canvas
  const handleDownloadWidgetImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1200, 675);
    grad.addColorStop(0, theme.canvasBgStart);
    grad.addColorStop(1, theme.canvasBgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 675);

    ctx.strokeStyle = theme.canvasAccent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(36, 36, 1128, 603);

    ctx.beginPath();
    ctx.arc(600, 210, 150, Math.PI, 0, false);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 34px Cairo, sans-serif';
    ctx.fillText(`المحراب · ${selectedCity.nameAr}`, 1110, 105);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '24px Cairo, sans-serif';
    ctx.fillText(
      `${toArabicNumerals(hijriDate.day)} ${hijriDate.monthNameAr} ${toArabicNumerals(
        hijriDate.year
      )} هـ  |  القبلة ${toArabicNumerals(Math.round(qiblaAngle))}°`,
      1110,
      148
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '26px Cairo, sans-serif';
    ctx.fillText(
      `الصلاة القادمة: صلاة ${nextPrayerInfo.nextPrayerNameAr} (${nextPrayerInfo.nextPrayerTime})`,
      600,
      235
    );

    ctx.fillStyle = theme.canvasTextPrimary;
    ctx.font = 'bold 74px monospace';
    ctx.fillText(`-${nextPrayerInfo.remainingFormatted}`, 600, 320);

    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 30px Amiri, serif';
    ctx.fillText(`﴿ ${dailyAyah.ayahText} ﴾`, 600, 405);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '20px Cairo, sans-serif';
    ctx.fillText(
      `${dailyAyah.surahNameAr} · آية ${toArabicNumerals(dailyAyah.ayahNumber)}`,
      600,
      442
    );

    const prayers = PRAYER_METADATA.map((meta) => ({
      name: meta.nameAr,
      time: todayTimes[meta.key],
      isNext: nextPrayerInfo.nextPrayerKey === meta.key,
    }));

    const slotWidth = 170;
    const startX = 1110;
    prayers.forEach((p, idx) => {
      const boxRight = startX - idx * 182;
      const boxLeft = boxRight - slotWidth;
      ctx.fillStyle = p.isNext
        ? 'rgba(253, 230, 138, 0.22)'
        : 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(boxLeft, 490, slotWidth, 110);

      if (p.isNext) {
        ctx.strokeStyle = theme.canvasAccent;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxLeft, 490, slotWidth, 110);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = p.isNext ? theme.canvasAccent : theme.canvasTextSecondary;
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillText(p.name, boxLeft + slotWidth / 2, 532);

      ctx.fillStyle = theme.canvasTextPrimary;
      ctx.font = 'bold 28px monospace';
      ctx.fillText(p.time, boxLeft + slotWidth / 2, 576);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `mihrab-widget-${selectedCity.id}.png`;
    link.click();
  };

  // Draw live frame onto the hidden PiP Canvas whenever `now` or theme updates
  const drawLivePiPCanvasFrame = () => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, theme.canvasBgStart);
    grad.addColorStop(1, theme.canvasBgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = theme.canvasAccent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.globalAlpha = 1;

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`المحراب · ${selectedCity.nameAr}`, w - 26, 44);

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '15px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      `${toArabicNumerals(hijriDate.day)} ${hijriDate.monthNameAr} ${toArabicNumerals(
        hijriDate.year
      )} هـ`,
      26,
      44
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = 'bold 19px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      `الصلاة القادمة: صلاة ${nextPrayerInfo.nextPrayerNameAr} (${nextPrayerInfo.nextPrayerTime})`,
      w / 2,
      98
    );

    ctx.fillStyle = theme.canvasTextPrimary;
    ctx.font = 'bold 50px monospace';
    ctx.fillText(`-${nextPrayerInfo.remainingFormatted}`, w / 2, 158);

    const fivePrayers: { key: keyof DailyPrayerTimes; label: string }[] = [
      { key: 'fajr', label: 'الفجر' },
      { key: 'dhuhr', label: 'الظهر' },
      { key: 'asr', label: 'العصر' },
      { key: 'maghrib', label: 'المغرب' },
      { key: 'isha', label: 'العشاء' },
    ];
    const slotW = 94;
    const startRight = w - 24;
    fivePrayers.forEach((p, idx) => {
      const rightX = startRight - idx * 102;
      const leftX = rightX - slotW;
      const isNext = nextPrayerInfo.nextPrayerKey === p.key;
      ctx.fillStyle = isNext
        ? 'rgba(253, 230, 138, 0.24)'
        : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(leftX, 196, slotW, 74);
      if (isNext) {
        ctx.strokeStyle = theme.canvasAccent;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftX, 196, slotW, 74);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = isNext ? theme.canvasAccent : theme.canvasTextSecondary;
      ctx.font = 'bold 14px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(p.label, leftX + slotW / 2, 224);

      ctx.fillStyle = theme.canvasTextPrimary;
      ctx.font = 'bold 17px monospace';
      ctx.fillText(todayTimes[p.key], leftX + slotW / 2, 252);
    });
  };

  useEffect(() => {
    drawLivePiPCanvasFrame();
  }, [now, themeId, selectedCity, todayTimes, nextPrayerInfo]);

  // Launch Native OS Picture-in-Picture Floating Window (Stays outside browser over phone Home Screen!)
  const handleToggleExternalPiPWidget = async () => {
    try {
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        return;
      }

      drawLivePiPCanvasFrame();
      const canvas = pipCanvasRef.current;
      const video = pipVideoRef.current;
      if (!canvas || !video) return;

      const anyCanvas = canvas as HTMLCanvasElement & {
        captureStream?: (fps?: number) => MediaStream;
      };
      if (typeof anyCanvas.captureStream === 'function') {
        if (!video.srcObject) {
          video.srcObject = anyCanvas.captureStream(1);
        }
        await video.play();
      }

      const anyVideo = video as HTMLVideoElement & {
        webkitSetPresentationMode?: (mode: string) => void;
      };
      if (typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
        setExternalStatusMsg(
          'تم تشغيل الويدجت العائمة فوق شاشة الهاتف! يمكنك الآن الخروج للشاشة الرئيسية أو فتح أي تطبيق آخر وستبقى الويدجت ظاهرة.'
        );
      } else if (typeof anyVideo.webkitSetPresentationMode === 'function') {
        anyVideo.webkitSetPresentationMode('picture-in-picture');
        setIsPiPActive(true);
        setExternalStatusMsg(
          'تم تشغيل الويدجت العائمة على آيفون! اخرج الآن للشاشة الرئيسية وستبقى الويدجت ظاهرة أمامك.'
        );
      } else {
        setFloatingPinned(true);
        setExternalStatusMsg(
          'تم تثبيت الويدجت العائمة؛ ولإظهارها على شاشة الهاتف الرئيسية استخدم خيار «ويدجت الآيفون Scriptable» أو «رابط الويدجت المستقل» أدناه.'
        );
      }
    } catch {
      setFloatingPinned(true);
      setExternalStatusMsg(
        'تم تفعيل الويدجت العائمة؛ يمكنك أيضاً تثبيت إشعار شاشة القفل أو إضافة ويدجت الشاشة الرئيسية من الخيارات أدناه.'
      );
    }
  };

  // Pin Persistent Live Prayer Schedule to Phone Lock Screen & Notification Shade
  const handlePinToPhoneLockScreenNotification = async () => {
    const payload = buildLockScreenNotificationPayload({
      cityNameAr: selectedCity.nameAr,
      nextPrayerNameAr: nextPrayerInfo.nextPrayerNameAr,
      nextPrayerTime: nextPrayerInfo.nextPrayerTime,
      remainingFormatted: nextPrayerInfo.remainingFormatted,
      times: todayTimes,
      hijriFormattedAr: `${toArabicNumerals(hijriDate.day)} ${hijriDate.monthNameAr} ${toArabicNumerals(
        hijriDate.year
      )} هـ`,
    });

    // Also set MediaSession metadata so Lock Screen displays the prayer card artwork
    try {
      drawLivePiPCanvasFrame();
      const artworkUrl = pipCanvasRef.current?.toDataURL('image/png');
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: payload.title,
          artist: `المحراب · ${selectedCity.nameAr}`,
          album: payload.body,
          artwork: artworkUrl
            ? [{ src: artworkUrl, sizes: '560x310', type: 'image/png' }]
            : [{ src: './pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
        });
      }
    } catch {
      // ignore mediaSession errors
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setExternalStatusMsg(
        'تم تحديث بيانات شاشة القفل (MediaSession). على آيفون، تأكد من فتح التطبيق من أيقونة الشاشة الرئيسية لتفعيل إشعارات شاشة القفل.'
      );
      return;
    }

    try {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }
      if (perm !== 'granted') {
        setExternalStatusMsg(
          'يرجى السماح بالإشعارات في متصفح/إعدادات الهاتف ليظهر جدول مواقيت الصلاة في شاشة القفل وستارة الإشعارات.'
        );
        return;
      }

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(payload.title, {
          body: payload.body,
          tag: payload.tag,
          icon: './pwa-192x192.png',
          badge: './pwa-192x192.png',
          silent: true,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body,
          tag: payload.tag,
          icon: './pwa-192x192.png',
        });
      }
      setExternalStatusMsg(
        'تم تثبيت ويدجت مواقيت الصلاة في شاشة القفل وستارة إشعارات الهاتف بنجاح!'
      );
    } catch {
      setExternalStatusMsg(
        'تم تفعيل بطاقة شاشة القفل؛ يمكنك أيضاً استخدام ويدجت الشاشة الرئيسية للآيفون أو الأندرويد أدناه.'
      );
    }
  };

  // Generate 1080x2340 Phone Lock-Screen Wallpaper with top clock safe-zone
  const handleDownloadLockScreenWallpaper = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 2340;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1080, 2340);
    grad.addColorStop(0, theme.canvasBgStart);
    grad.addColorStop(1, theme.canvasBgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 2340);

    // Subtle geometric arch ornament
    ctx.strokeStyle = theme.canvasAccent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.22;
    ctx.strokeRect(54, 54, 972, 2232);
    ctx.beginPath();
    ctx.arc(540, 920, 380, Math.PI, 0, false);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Bottom Widget Card Area (Leaves top 1..850px clear for iPhone/Android Lock Screen Clock!)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(84, 980, 912, 1140);
    ctx.strokeStyle = theme.canvasAccent;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(84, 980, 912, 1140);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 44px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`المحراب · مواقيت صلاة ${selectedCity.nameAr}`, 540, 1075);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      `${toArabicNumerals(hijriDate.day)} ${hijriDate.monthNameAr} ${toArabicNumerals(
        hijriDate.year
      )} هـ  ·  اتجاه القبلة ${toArabicNumerals(Math.round(qiblaAngle))}°`,
      540,
      1140
    );

    const prayers = PRAYER_METADATA.map((meta) => ({
      name: meta.nameAr,
      time: todayTimes[meta.key],
      isNext: nextPrayerInfo.nextPrayerKey === meta.key,
    }));

    prayers.forEach((p, idx) => {
      const y = 1215 + idx * 102;
      ctx.fillStyle = p.isNext
        ? 'rgba(253, 230, 138, 0.24)'
        : 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(130, y, 820, 84);
      if (p.isNext) {
        ctx.strokeStyle = theme.canvasAccent;
        ctx.lineWidth = 2;
        ctx.strokeRect(130, y, 820, 84);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = p.isNext ? theme.canvasAccent : theme.canvasTextPrimary;
      ctx.font = 'bold 34px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(`صلاة ${p.name}`, 910, y + 54);

      ctx.textAlign = 'left';
      ctx.font = 'bold 38px monospace';
      ctx.fillText(p.time, 170, y + 55);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.canvasAccent;
    ctx.font = 'bold 34px "Amiri", serif';
    ctx.fillText(`﴿ ${dailyAyah.ayahText} ﴾`, 540, 1935);

    ctx.fillStyle = theme.canvasTextSecondary;
    ctx.font = '26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      `${dailyAyah.surahNameAr} · آية ${toArabicNumerals(dailyAyah.ayahNumber)}`,
      540,
      1995
    );

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `mihrab-lockscreen-${selectedCity.id}.png`;
    link.click();
  };

  const baseAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://al-mihrab.example.com/';

  const standaloneWidgetUrl = useMemo(() => {
    return buildStandalonePhoneWidgetUrl(
      baseAppUrl,
      selectedCity.id,
      themeId,
      selectedExternalCard
    );
  }, [baseAppUrl, selectedCity.id, themeId, selectedExternalCard]);

  const iosScriptableCode = useMemo(() => {
    return generateIOSScriptableWidgetScript({
      cityNameAr: selectedCity.nameAr,
      cityId: selectedCity.id,
      times: todayTimes,
      hijriFormattedAr: `${toArabicNumerals(hijriDate.day)} ${
        hijriDate.monthNameAr
      } ${toArabicNumerals(hijriDate.year)} هـ`,
      qiblaAngle,
      dailyAyahText: dailyAyah.ayahText,
      dailyAyahSurahAr: dailyAyah.surahNameAr,
      themeId,
      appUrl: baseAppUrl,
    });
  }, [
    selectedCity,
    todayTimes,
    hijriDate,
    qiblaAngle,
    dailyAyah,
    themeId,
    baseAppUrl,
  ]);

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadIOSScript = () => {
    const blob = new Blob([iosScriptableCode], {
      type: 'application/javascript;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AlMihrab-Widget-${selectedCity.id}.js`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // WIDGET 1: الصلاة القادمة والقوس الفلكي (Next Prayer & Horizon Arc)
  // ============================================================================
  const renderNextPrayerArcWidget = () => {
    const arcRadius = 70;
    const arcLength = Math.PI * arcRadius;
    const arcOffset =
      arcLength - (intervalProgress.progressPercent / 100) * arcLength;
    const angleRad = (intervalProgress.progressPercent / 100) * Math.PI;
    const orbX = 100 + arcRadius * Math.cos(angleRad);
    const orbY = 86 - arcRadius * Math.sin(angleRad);

    return (
      <article
        data-testid="widget-card-next_prayer_arc"
        className={`rounded-3xl border p-5 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            الصلاة القادمة
          </span>
          <span className={`text-[11px] ${theme.textSecondaryClass}`}>
            {selectedCity.nameAr}
          </span>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold">
              صلاة {nextPrayerInfo.nextPrayerNameAr}
            </h3>
            <div
              data-testid="widget-live-countdown"
              className="font-tabular text-2xl font-bold tracking-tight"
            >
              -{nextPrayerInfo.remainingFormatted}
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <svg className="w-32 h-16 overflow-visible" viewBox="0 0 200 95">
              <path
                d="M 170 86 A 70 70 0 0 0 30 86"
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 170 86 A 70 70 0 0 0 30 86"
                fill="none"
                stroke={theme.arcFillHex}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={arcOffset}
              />
              <circle cx={orbX} cy={orbY} r="6.5" fill={theme.arcFillHex} />
              <text
                x="100"
                y="74"
                textAnchor="middle"
                fill="currentColor"
                className="text-xs font-bold"
              >
                {toArabicNumerals(intervalProgress.progressPercent)}٪
              </text>
            </svg>
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>السابقة: {intervalProgress.previousPrayerNameAr}</span>
          <span className="font-tabular font-semibold">
            الأذان: {nextPrayerInfo.nextPrayerTime}
          </span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 2: مواقيت اليوم (Daily 6 Prayers Schedule)
  // ============================================================================
  const renderDailyScheduleWidget = () => {
    return (
      <article
        data-testid="widget-card-daily_schedule"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            مواقيت اليوم
          </span>
          <span className={`text-[11px] ${theme.textSecondaryClass}`}>
            {toArabicNumerals(hijriDate.day)} {hijriDate.monthNameAr}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 my-auto py-2">
          {PRAYER_METADATA.map((item) => {
            const isNext = nextPrayerInfo.nextPrayerKey === item.key;
            return (
              <div
                key={item.key}
                className={`rounded-2xl border p-2 text-center transition-colors ${
                  isNext ? theme.activeSlotBgClass : theme.cardInnerBgClass
                }`}
              >
                <span className="text-[11px] font-bold block">
                  {item.nameAr}
                </span>
                <span className="font-tabular text-sm font-bold block">
                  {todayTimes[item.key]}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>
            منتصف الليل: <strong className="font-tabular">{todayTimes.midnight}</strong>
          </span>
          <span className={theme.accentTextClass}>
            الثلث الأخير: <strong className="font-tabular">{todayTimes.lastThird}</strong>
          </span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 3: آية اليوم (Daily Quranic Ayah)
  // ============================================================================
  const renderQuranWirdWidget = () => {
    return (
      <article
        data-testid="widget-card-quran_wird"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${theme.accentTextClass}`}>
            آية اليوم
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="widget-next-ayah-btn"
              onClick={() => setAyahOffset((prev) => prev + 1)}
              className="px-2 py-1 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              title="آية أخرى"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تغيير</span>
            </button>
            {onOpenMushafPage && (
              <button
                type="button"
                data-testid="widget-open-mushaf-btn"
                onClick={() => onOpenMushafPage(dailyAyah.mushafPage)}
                className="px-2 py-1 rounded-lg bg-current/15 hover:bg-current/25 text-[11px] font-semibold cursor-pointer"
              >
                ص {toArabicNumerals(dailyAyah.mushafPage)}
              </button>
            )}
          </div>
        </div>

        <div className="my-auto py-2">
          <p
            data-testid="widget-daily-ayah-text"
            className="font-quran text-lg sm:text-xl leading-relaxed"
          >
            ﴿ {dailyAyah.ayahText} ﴾
          </p>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span className="font-semibold">
            {dailyAyah.surahNameAr} · آية {toArabicNumerals(dailyAyah.ayahNumber)}
          </span>
          <span>{dailyAyah.reflectionAr}</span>
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 4: المسبحة الإلكترونية (Interactive Digital Tasbih)
  // ============================================================================
  const renderTasbihDhikrWidget = () => {
    const cycleProgress = ((tasbihCount % 33) / 33) * 100;
    return (
      <article
        data-testid="widget-card-tasbih_dhikr"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${theme.accentTextClass}`}>
            المسبحة
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setDhikrIndex((prev) => (prev + 1) % QUICK_DHIKR_LIST.length)
              }
              className="px-2 py-1 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-medium cursor-pointer"
            >
              تغيير الذكر
            </button>
            <button
              type="button"
              onClick={() => setTasbihCount(0)}
              aria-label="تصفير عداد التسبيح"
              className="p-1.5 rounded-lg bg-current/10 hover:bg-current/20 cursor-pointer"
              title="تصفير العداد"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="my-auto py-2 text-center space-y-2">
          <p className="font-display text-lg font-bold">
            {QUICK_DHIKR_LIST[dhikrIndex]}
          </p>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-current/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${cycleProgress}%`,
                backgroundColor: theme.arcFillHex,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          data-testid="widget-tasbih-btn"
          onClick={() => setTasbihCount((prev) => prev + 1)}
          className={`w-full min-h-[42px] py-2 px-4 rounded-2xl border font-bold text-xs flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer ${theme.activeSlotBgClass}`}
        >
          <span>اضغط للتسبيح</span>
          <span
            data-testid="widget-tasbih-count"
            className="font-sans tabular-nums text-lg font-bold"
          >
            {toArabicNumerals(tasbihCount)}
          </span>
        </button>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 5: اتجاه القبلة والتقويم (Qibla Compass & Hijri)
  // ============================================================================
  const renderQiblaHijriWidget = () => {
    return (
      <article
        data-testid="widget-card-qibla_hijri"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            اتجاه القبلة · {selectedCity.nameAr}
          </span>
          <div className="flex items-center gap-1">
            {onDetectLocation && (
              <button
                type="button"
                onClick={onDetectLocation}
                className="px-2 py-0.5 rounded-lg bg-current/10 hover:bg-current/20 text-[11px] font-semibold cursor-pointer"
                title="تحديد موقعي الحالي لحساب القبلة"
              >
                موقعي
              </button>
            )}
            {onNavigateToQibla && (
              <button
                type="button"
                onClick={onNavigateToQibla}
                className="px-2 py-0.5 rounded-lg bg-current/15 hover:bg-current/25 text-[11px] font-semibold cursor-pointer"
              >
                البوصلة
              </button>
            )}
          </div>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-tabular text-2xl font-bold">
              {selectedCity.id === 'makkah'
                ? 'جوار الكعبة (٠°)'
                : `${toArabicNumerals(Math.round(qiblaAngle))}° ${cardinalAr}`}
            </div>
            <span className={`text-xs block ${theme.accentTextClass}`}>
              {distanceToKaaba === 0
                ? 'مكة المكرمة — المسجد الحرام'
                : `المسافة للكعبة: ${distanceToKaaba.toLocaleString('en-US')} كم`}
            </span>
          </div>

          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="3"
              />
              <text
                x="50"
                y="21"
                textAnchor="middle"
                fill="currentColor"
                className="text-[9px] font-bold opacity-75"
              >
                ش
              </text>
              <g transform={`rotate(${qiblaAngle} 50 50)`}>
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="20"
                  stroke={theme.arcFillHex}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <polygon
                  points="50,11 44,23 56,23"
                  fill={theme.arcFillHex}
                />
              </g>
              <circle cx="50" cy="50" r="4" fill={theme.arcFillHex} />
            </svg>
          </div>
        </div>

        <div
          className={`text-[11px] pt-2 border-t border-current/10 truncate ${theme.textSecondaryClass}`}
        >
          {hijriOccasionNote}
        </div>
      </article>
    );
  };

  // ============================================================================
  // WIDGET 6: شاشة القفل والساعة (Lock-Screen Circular Widget)
  // ============================================================================
  const renderLockscreenCompactWidget = () => {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (intervalProgress.progressPercent / 100) * circumference;

    return (
      <article
        data-testid="widget-card-lockscreen_compact"
        className={`rounded-3xl border p-5 shadow-md flex flex-col justify-between min-h-[235px] transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`font-bold ${theme.accentTextClass}`}>
            شاشة القفل
          </span>
          <span className="font-tabular text-xs font-bold">
            {currentClockFormatted}
          </span>
        </div>

        <div className="my-auto py-2 flex items-center justify-between gap-4">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={theme.arcTrackHex}
                strokeWidth="5.5"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={theme.arcFillHex}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-[10px] font-semibold ${theme.textSecondaryClass}`}>
                {nextPrayerInfo.nextPrayerNameAr}
              </span>
              <span className="font-tabular text-xs font-bold">
                {nextPrayerInfo.nextPrayerTime}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <span className={`text-[11px] block ${theme.textSecondaryClass}`}>
              المتبقي للأذان
            </span>
            <div className="font-tabular text-2xl font-bold tracking-tight">
              -{nextPrayerInfo.remainingFormatted}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] pt-2 border-t border-current/10 ${theme.textSecondaryClass}`}
        >
          <span>انقضى {toArabicNumerals(intervalProgress.progressPercent)}٪</span>
          <button
            type="button"
            onClick={() => setFloatingPinned((prev) => !prev)}
            className="font-semibold underline cursor-pointer"
          >
            {floatingPinned ? 'إلغاء التثبيت' : 'تثبيت عائم'}
          </button>
        </div>
      </article>
    );
  };

  const renderCardById = (cardId: WidgetCardId) => {
    switch (cardId) {
      case 'next_prayer_arc':
        return renderNextPrayerArcWidget();
      case 'daily_schedule':
        return renderDailyScheduleWidget();
      case 'quran_wird':
        return renderQuranWirdWidget();
      case 'tasbih_dhikr':
        return renderTasbihDhikrWidget();
      case 'qibla_hijri':
        return renderQiblaHijriWidget();
      case 'lockscreen_compact':
        return renderLockscreenCompactWidget();
    }
  };

  if (standaloneMode) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 ${theme.bgClass}`}
        dir="rtl"
      >
        <div className="w-full max-w-xl space-y-3" data-testid="live-widget-card">
          {activeFilter === 'all' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderNextPrayerArcWidget()}
              {renderDailyScheduleWidget()}
              {renderQuranWirdWidget()}
              {renderTasbihDhikrWidget()}
              {renderQiblaHijriWidget()}
              {renderLockscreenCompactWidget()}
            </div>
          ) : (
            renderCardById(activeFilter)
          )}

          {/* Compact switcher bar at the bottom of Standalone Mobile Home Screen Widget */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-black/25 backdrop-blur-md text-white text-xs border border-white/15">
            <div className="flex items-center gap-1 overflow-x-auto">
              {WIDGET_CATALOG.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveFilter(item.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    activeFilter === item.id
                      ? 'bg-[#FDE68A] text-stone-950 font-bold'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.shortTitleAr}
                </button>
              ))}
            </div>
            <a
              href="./"
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold whitespace-nowrap"
            >
              فتح المحراب ←
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="مجموعة ويدجت المحراب التفاعلية"
      data-testid="smart-widgets-studio"
      className="space-y-4"
    >
      {/* Single Compact Control Bar: Widget Filter + Theme Dots + Quick Actions */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Filter Pills */}
        <div className="flex flex-nowrap overflow-x-auto items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
          <button
            type="button"
            data-testid="widget-filter-all"
            onClick={() => setActiveFilter('all')}
            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            الكل (٦)
          </button>
          {WIDGET_CATALOG.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`widget-filter-${item.id}`}
              onClick={() => setActiveFilter(item.id)}
              className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === item.id
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {item.shortTitleAr}
            </button>
          ))}
        </div>

        {/* Themes & Utility Actions */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Theme Switcher */}
          <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
            {Object.values(WIDGET_THEMES).map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`widget-theme-${t.id}`}
                onClick={() => setThemeId(t.id)}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  themeId === t.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.nameAr.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Quick Actions (Consolidated to eliminate duplicate toolbar buttons) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="open-phone-widget-hub-btn"
              onClick={() => {
                setExternalStatusMsg(null);
                setShowPhoneWidgetModal(true);
              }}
              title="استخدام وتثبيت الويدجت خارج التطبيق على شاشة الهاتف (آيفون وأندرويد)"
              className="min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold bg-[#14532D] hover:bg-[#14532D]/90 text-[#FDE68A] border border-[#14532D] flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>تفعيل على شاشة الهاتف</span>
            </button>

            <button
              type="button"
              data-testid="open-standby-mode-btn"
              onClick={() => setStandbyFullscreen(true)}
              title="وضع ساعة المكتب"
              className="min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FBF9F5] hover:bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#78350F]" />
              <span className="hidden sm:inline">ملء الشاشة</span>
            </button>

            <button
              type="button"
              data-testid="export-widget-png-btn"
              onClick={handleDownloadWidgetImage}
              title="حفظ كبطاقة صورة"
              className="min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FBF9F5] hover:bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#14532D]" />
              <span className="hidden sm:inline">صورة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Canvas & Video Stream for Native OS Picture-in-Picture Floating Phone Widget */}
      <div className="sr-only pointer-events-none" aria-hidden="true">
        <canvas ref={pipCanvasRef} width={560} height={310} />
        <video
          ref={pipVideoRef}
          playsInline
          muted
        />
      </div>

      {/* Direct 6-Widget Bento Grid (No Nested Wrapper Boxes) */}
      <div
        data-testid="live-widget-card"
        data-widget-theme={themeId}
      >
        {activeFilter === 'all' ? (
          <div
            data-testid="multi-widgets-bento-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {renderNextPrayerArcWidget()}
            {renderDailyScheduleWidget()}
            {renderQuranWirdWidget()}
            {renderTasbihDhikrWidget()}
            {renderQiblaHijriWidget()}
            {renderLockscreenCompactWidget()}
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            {renderCardById(activeFilter)}
          </div>
        )}
      </div>

      {/* Portaled Floating Mini-Widget (Stays visible in corner when pinned) */}
      {floatingPinned &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            dir="rtl"
            data-testid="floating-mini-widget"
            className={`fixed bottom-20 md:bottom-5 left-4 z-40 w-72 rounded-2xl border p-3.5 shadow-2xl transition-all ${theme.bgClass} ${theme.borderClass} ${theme.textPrimaryClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock className={`w-3.5 h-3.5 ${theme.accentTextClass}`} />
                <span>
                  صلاة {nextPrayerInfo.nextPrayerNameAr} ({nextPrayerInfo.nextPrayerTime})
                </span>
              </div>
              <button
                type="button"
                aria-label="إغلاق الويدجت العائمة"
                onClick={() => setFloatingPinned(false)}
                className="p-1 rounded-lg bg-current/10 hover:bg-current/20 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-tabular text-xl font-bold tracking-tight">
                -{nextPrayerInfo.remainingFormatted}
              </span>
              <span className={`text-[11px] ${theme.textSecondaryClass}`}>
                {selectedCity.nameAr} · {toArabicNumerals(hijriDate.day)}{' '}
                {hijriDate.monthNameAr}
              </span>
            </div>
          </div>,
          document.body
        )}

      {/* Portaled Full-Screen Desk / StandBy Clock Mode */}
      {standbyFullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="وضع ساعة المكتب بملء الشاشة"
            dir="rtl"
            data-testid="widget-standby-fullscreen"
            className="fixed inset-0 z-50 bg-[#090D0B] flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <div className="w-full max-w-6xl space-y-5">
              <div className="flex items-center justify-between text-white border-b border-white/15 pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-amber-300">
                    وضع ساعة المكتب الدائمة — محراب {selectedCity.nameAr}
                  </h3>
                  <p className="text-xs text-stone-300">
                    الساعة الآن {currentClockFormatted} · {toArabicNumerals(hijriDate.day)}{' '}
                    {hijriDate.monthNameAr} {toArabicNumerals(hijriDate.year)} هـ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStandbyFullscreen(false)}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>إنهاء وضع الشاشة الدائمة</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderNextPrayerArcWidget()}
                {renderDailyScheduleWidget()}
                {renderQuranWirdWidget()}
                {renderTasbihDhikrWidget()}
                {renderQiblaHijriWidget()}
                {renderLockscreenCompactWidget()}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          PORTALED MODAL: استخدام الويدجت خارج التطبيق على الهاتف (iOS & Android)
         ===================================================================== */}
      {showPhoneWidgetModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="تفعيل الويدجت خارج التطبيق على الهاتف"
            dir="rtl"
            data-testid="phone-external-widget-modal"
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setShowPhoneWidgetModal(false)}
          >
            <div
              className="w-full max-w-3xl max-h-[90dvh] flex flex-col bg-[#FBF9F5] border-2 border-[#B59E7A] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 bg-[#14532D] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-[#FDE68A] shrink-0" />
                  <div>
                    <h2 className="font-display text-base sm:text-xl font-bold">
                      تشغيل وتثبيت الويدجت خارج التطبيق على الهاتف
                    </h2>
                    <p className="text-[11px] text-stone-200">
                      ٤ طرق عملية لإظهار الويدجت على شاشة الهاتف الرئيسية، شاشة القفل، وفوق التطبيقات (آيفون وأندرويد)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhoneWidgetModal(false)}
                  aria-label="إغلاق"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                {externalStatusMsg && (
                  <div
                    role="status"
                    data-testid="external-widget-status-banner"
                    className="p-3 rounded-xl bg-[#14532D]/10 border border-[#14532D]/30 text-xs font-bold text-[#14532D] flex items-center justify-between gap-2"
                  >
                    <span>{externalStatusMsg}</span>
                    <button
                      type="button"
                      onClick={() => setExternalStatusMsg(null)}
                      className="text-stone-500 hover:text-stone-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* METHOD 1 & 2: Instant OS Floating Window (PiP) & Lock-Screen Notification Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Method 1: Picture-in-Picture Floating Window over Phone Home Screen */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-[#78350F] text-[11px] font-bold">
                        ١. فوري بدون برامج إضافية
                      </span>
                      <h3 className="font-display text-base font-bold text-stone-900">
                        نافذة عائمة حية فوق شاشة الهاتف (PiP)
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        يُخرج بطاقة العد التنازلي للصلاة ومواقيت اليوم في نافذة عائمة أصلية من النظام تبقى ظاهرة على الشاشة الرئيسية للهاتف وفوق جميع التطبيقات الأخرى.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="modal-launch-pip-btn"
                      onClick={handleToggleExternalPiPWidget}
                      className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#78350F] hover:bg-[#92400E] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>
                        {isPiPActive
                          ? 'إيقاف النافذة العائمة فوق الهاتف'
                          : 'تشغيل الويدجت العائمة فوق شاشة الهاتف الآن'}
                      </span>
                    </button>
                  </div>

                  {/* Method 2: Persistent Lock-Screen & Notification Shade Banner */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-[#14532D] text-[11px] font-bold">
                        ٢. شاشة القفل وستارة الإشعارات
                      </span>
                      <h3 className="font-display text-base font-bold text-stone-900">
                        تثبيت المواقيت في شاشة القفل وستارة الهاتف
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        يُثبّت إشعاراً صامتاً في شاشة قفل الهاتف وستارة الإشعارات العلوية يعرض الصلاة القادمة ومواقيت الصلوات الخمس لمدينتك ({selectedCity.nameAr}).
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="modal-pin-lockscreen-notification-btn"
                      onClick={handlePinToPhoneLockScreenNotification}
                      className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-4 h-4" />
                      <span>تثبيت في شاشة القفل وستارة الإشعارات</span>
                    </button>
                  </div>
                </div>

                {/* METHOD 3: iPhone / iPad Real Home Screen & Lock Screen Widget (iOS Scriptable) */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11px] font-bold mb-1">
                        ٣. ويدجت الشاشة الرئيسية للآيفون والآيباد (iOS Home &amp; Lock Screen)
                      </span>
                      <h3 className="font-display text-base font-bold text-stone-900">
                        كود ويدجت آيفون الجاهز لمدينة {selectedCity.nameAr} (يعمل بدون إنترنت)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="copy-ios-scriptable-btn"
                        onClick={() =>
                          handleCopyText('ios_script', iosScriptableCode)
                        }
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === 'ios_script' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم نسخ كود الآيفون</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ كود ويدجت الآيفون</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        data-testid="download-ios-scriptable-btn"
                        onClick={handleDownloadIOSScript}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F4EFE6] hover:bg-stone-200 text-stone-900 border border-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#78350F]" />
                        <span>تحميل ملف .js</span>
                      </button>
                    </div>
                  </div>

                  <ol className="text-xs text-stone-700 space-y-1 list-decimal list-inside bg-[#FBF9F5] border border-stone-200/80 rounded-xl p-3">
                    <li>
                      حمّل تطبيق <strong>Scriptable</strong> المجاني من متجر آبل (App Store)، ثم افتحه واضغط علامة <strong>(+)</strong> في الأعلى.
                    </li>
                    <li>
                      اضغط زر <strong>«نسخ كود ويدجت الآيفون»</strong> أعلاه والصقه داخل التطبيق ثم اضغط <strong>Done</strong>.
                    </li>
                    <li>
                      اخرج إلى شاشة الآيفون الرئيسية، اضغط مطولاً على الشاشة ← <strong>(+)</strong> ← اختر ويدجت <strong>Scriptable</strong> وحدد السكربت لتظهر مواقيت {selectedCity.nameAr} والعد التنازلي وآية اليوم على شاشة هاتفك دائماً!
                    </li>
                  </ol>
                </div>

                {/* METHOD 4: Android Home Screen Web-Widget URL + Standalone Shortcut + Lock Screen Wallpaper */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11px] font-bold mb-1">
                      ٤. ويدجت الشاشة الرئيسية للأندرويد + اختصار الويدجت المستقل
                    </span>
                    <h3 className="font-display text-base font-bold text-stone-900">
                      رابط الويدجت المستقل لتطبيقات شاشة أندرويد (Web Widget / Widgetify / KWGT)
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      اختر نوع الويدجت الذي تريده على شاشة هاتفك، ثم انسخ رابطه لوضعه في تطبيق <strong>Web Widget</strong> على أندرويد، أو افتحه مباشرةً وأضفه للشاشة الرئيسية:
                    </p>
                  </div>

                  {/* Select which of the 6 cards to generate standalone URL for */}
                  <div className="flex flex-wrap gap-1.5">
                    {WIDGET_CATALOG.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedExternalCard(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                          selectedExternalCard === item.id
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-[#FBF9F5] text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {item.titleAr}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      dir="ltr"
                      value={standaloneWidgetUrl}
                      aria-label="رابط الويدجت المستقل للهاتف"
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-mono text-stone-800"
                    />
                    <button
                      type="button"
                      data-testid="copy-standalone-widget-url-btn"
                      onClick={() =>
                        handleCopyText('standalone_url', standaloneWidgetUrl)
                      }
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'standalone_url' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم نسخ الرابط</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ رابط الويدجت</span>
                        </>
                      )}
                    </button>
                    <a
                      href={standaloneWidgetUrl}
                      data-testid="open-standalone-widget-link"
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#F4EFE6] hover:bg-stone-200 text-stone-900 border border-stone-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#78350F]" />
                      <span>فتح كوويدجت مستقل</span>
                    </a>
                  </div>

                  {/* Lock Screen Wallpaper Generator Button */}
                  <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-stone-600">
                      أو حمّل <strong>خلفية شاشة قفل الهاتف الطولية (1080×2340)</strong> بمواقيت صلاة {selectedCity.nameAr} وآية اليوم:
                    </span>
                    <button
                      type="button"
                      data-testid="download-lockscreen-wallpaper-btn"
                      onClick={handleDownloadLockScreenWallpaper}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#92400E] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل خلفية شاشة القفل بمواقيت اليوم</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
