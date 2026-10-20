import {
  ALERT_SOUND_OPTIONS,
  AlertSoundId,
  AlertSoundSpec,
  getSanitizedAdhanTitleAr,
  PRIMARY_PINNED_ADHAN_URL,
  PRIMARY_PINNED_ADHAN_DURATION_SEC,
  PRIMARY_PINNED_ADHAN_SIZE_BYTES,
} from './khatmahAndAlerts';

export interface CustomAdhanFileMeta {
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  uploadedAtISO: string;
  isPinned: boolean;
  isLockedPrimary: boolean;
  customUrl?: string;
}

export interface AdhanPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  activeSoundId: AlertSoundId | null;
  currentTimeSec: number;
  durationSec: number;
  volume: number;
  activeLabelAr: string;
  fileSourceLabelAr: string;
}

const LEGACY_CUSTOM_ADHAN_META_KEY = 'almihrab_custom_adhan_meta_v1';
const LEGACY_CUSTOM_ADHAN_DATAURL_KEY = 'almihrab_custom_adhan_dataurl_v1';
const LEGACY_CUSTOM_ADHAN_DB_NAME = 'almihrab_custom_adhan_db';

const LOCKED_PRIMARY_META: CustomAdhanFileMeta = Object.freeze({
  mimeType: 'audio/mpeg',
  sizeBytes: PRIMARY_PINNED_ADHAN_SIZE_BYTES,
  durationSeconds: PRIMARY_PINNED_ADHAN_DURATION_SEC,
  uploadedAtISO: '2026-10-20T08:21:00.000Z',
  isPinned: true,
  isLockedPrimary: true,
  customUrl: PRIMARY_PINNED_ADHAN_URL,
});

let activeAudioEl: HTMLAudioElement | null = null;
let progressIntervalId: number | null = null;
let activeAudioCtx: AudioContext | null = null;

let currentState: AdhanPlaybackState = {
  isPlaying: false,
  isPaused: false,
  activeSoundId: null,
  currentTimeSec: 0,
  durationSec: PRIMARY_PINNED_ADHAN_DURATION_SEC,
  volume: 0.9,
  activeLabelAr: 'الأذان الشرعي المعتمد',
  fileSourceLabelAr: 'صوت الأذان الأساسي المثبّت',
};

const listeners = new Set<(state: AdhanPlaybackState) => void>();

function notifyListeners() {
  const snapshot = { ...currentState };
  listeners.forEach((fn) => fn(snapshot));
}

export function getAdhanPlaybackState(): AdhanPlaybackState {
  return { ...currentState };
}

export function subscribeAdhanPlaybackState(
  listener: (state: AdhanPlaybackState) => void
): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Always returns the locked primary Adhan metadata (cannot be changed or overridden).
 */
export function getCustomAdhanFileMeta(): CustomAdhanFileMeta {
  return { ...LOCKED_PRIMARY_META };
}

/**
 * Purges any legacy browser overrides so only the locked primary Adhan file is ever used.
 */
export async function syncAndPinExistingAdhanAudio(): Promise<CustomAdhanFileMeta> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_CUSTOM_ADHAN_META_KEY);
      localStorage.removeItem(LEGACY_CUSTOM_ADHAN_DATAURL_KEY);
    } catch {
      // ignore
    }
    try {
      if ('indexedDB' in window) {
        window.indexedDB.deleteDatabase(LEGACY_CUSTOM_ADHAN_DB_NAME);
      }
    } catch {
      // ignore
    }
  }
  return { ...LOCKED_PRIMARY_META };
}

function clearProgressTimer() {
  if (progressIntervalId !== null && typeof window !== 'undefined') {
    window.clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}

export function stopActiveAdhanAudio(): void {
  clearProgressTimer();
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioEl = null;
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close().catch(() => {});
    } catch {
      // ignore
    }
    activeAudioCtx = null;
  }
  currentState = {
    ...currentState,
    isPlaying: false,
    isPaused: false,
    currentTimeSec: 0,
  };
  notifyListeners();
}

export function togglePauseActiveAdhan(): void {
  if (!activeAudioEl) return;
  if (activeAudioEl.paused) {
    activeAudioEl.play().catch(() => {});
    currentState = { ...currentState, isPlaying: true, isPaused: false };
  } else {
    activeAudioEl.pause();
    currentState = { ...currentState, isPlaying: false, isPaused: true };
  }
  notifyListeners();
}

export function seekActiveAdhanAudio(seconds: number): void {
  const clamped = Math.max(0, Math.min(currentState.durationSec, seconds));
  if (activeAudioEl) {
    try {
      activeAudioEl.currentTime = clamped;
    } catch {
      // ignore
    }
  }
  currentState = {
    ...currentState,
    currentTimeSec: clamped,
  };
  notifyListeners();
}

export function setActiveAdhanVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  if (activeAudioEl) {
    activeAudioEl.volume = clamped;
  }
  currentState = {
    ...currentState,
    volume: clamped,
  };
  notifyListeners();
}

function playSynthesizedTone(spec: AlertSoundSpec) {
  if (typeof window === 'undefined' || spec.frequenciesHz.length === 0) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    activeAudioCtx = ctx;
    const now = ctx.currentTime;
    const stepDuration = spec.durationMs / 1000 / spec.frequenciesHz.length;

    spec.frequenciesHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * stepDuration);

      const noteStart = now + idx * stepDuration;
      const noteEnd = noteStart + stepDuration * 0.95;

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.exponentialRampToValueAtTime(
        0.22 * currentState.volume,
        noteStart + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.02);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, spec.durationMs + 400);
  } catch {
    // Ignore audio context autoplay restrictions in headless browsers
  }
}

/**
 * Plays the locked primary Adhan audio (/assets/aistudio/6f509ec934a4_77c9e53d.mp3).
 */
export async function playAlertSoundTone(
  soundId: AlertSoundId,
  prayerNameAr?: string
): Promise<void> {
  if (soundId === 'silent' || typeof window === 'undefined') {
    stopActiveAdhanAudio();
    return;
  }

  stopActiveAdhanAudio();

  const spec = ALERT_SOUND_OPTIONS[0];
  const sourceUrl = PRIMARY_PINNED_ADHAN_URL;
  const durationSec = PRIMARY_PINNED_ADHAN_DURATION_SEC;
  const activeLabel = getSanitizedAdhanTitleAr(prayerNameAr);

  currentState = {
    ...currentState,
    isPlaying: true,
    isPaused: false,
    activeSoundId: 'custom_file',
    currentTimeSec: 0,
    durationSec,
    activeLabelAr: activeLabel,
    fileSourceLabelAr: 'صوت الأذان الأساسي المثبّت',
  };
  notifyListeners();

  try {
    const audio = new Audio(sourceUrl);
    audio.volume = currentState.volume;
    activeAudioEl = audio;

    const updateRealDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 1) {
        currentState = {
          ...currentState,
          durationSec: Math.round(audio.duration * 10) / 10,
        };
        notifyListeners();
      }
    };

    audio.onloadedmetadata = updateRealDuration;
    audio.ondurationchange = updateRealDuration;

    audio.ontimeupdate = () => {
      const cur = audio.currentTime;
      const newDur =
        Number.isFinite(audio.duration) && audio.duration > 1
          ? Math.round(audio.duration * 10) / 10
          : Math.max(currentState.durationSec, Math.ceil(cur + 1));
      currentState = {
        ...currentState,
        currentTimeSec: cur,
        durationSec: newDur,
      };
      notifyListeners();
    };

    audio.onended = () => {
      clearProgressTimer();
      currentState = {
        ...currentState,
        isPlaying: false,
        isPaused: false,
        currentTimeSec: currentState.durationSec,
      };
      notifyListeners();
    };

    const startedAt = Date.now();
    progressIntervalId = window.setInterval(() => {
      if (!currentState.isPlaying || currentState.isPaused) return;

      if (activeAudioEl && activeAudioEl.currentTime > 0.05) {
        const cur = activeAudioEl.currentTime;
        const dur =
          Number.isFinite(activeAudioEl.duration) &&
          activeAudioEl.duration > 1
            ? Math.round(activeAudioEl.duration * 10) / 10
            : Math.max(currentState.durationSec, Math.ceil(cur + 1));
        currentState = {
          ...currentState,
          currentTimeSec: cur,
          durationSec: dur,
        };
        notifyListeners();
        return;
      }

      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed >= currentState.durationSec) {
        clearProgressTimer();
        currentState = {
          ...currentState,
          isPlaying: false,
          isPaused: false,
          currentTimeSec: currentState.durationSec,
        };
        notifyListeners();
      } else {
        currentState = {
          ...currentState,
          currentTimeSec: elapsed,
        };
        notifyListeners();
      }
    }, 250);

    await audio.play();
  } catch {
    playSynthesizedTone(spec);
  }
}
