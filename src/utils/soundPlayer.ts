import {
  ALERT_SOUND_OPTIONS,
  AlertSoundId,
  AlertSoundSpec,
  getSanitizedAdhanTitleAr,
} from './khatmahAndAlerts';

export interface CustomAdhanFileMeta {
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  uploadedAtISO: string;
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

const CUSTOM_ADHAN_META_KEY = 'almihrab_custom_adhan_meta_v1';
const CUSTOM_ADHAN_DB_NAME = 'almihrab_custom_adhan_db';
const CUSTOM_ADHAN_STORE_NAME = 'custom_adhan_files';
const CUSTOM_ADHAN_RECORD_KEY = 'primary_adhan_blob';

let activeAudioEl: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let progressIntervalId: number | null = null;
let activeAudioCtx: AudioContext | null = null;

let currentState: AdhanPlaybackState = {
  isPlaying: false,
  isPaused: false,
  activeSoundId: null,
  currentTimeSec: 0,
  durationSec: 14,
  volume: 0.9,
  activeLabelAr: 'الأذان الشرعي',
  fileSourceLabelAr: 'صوت الأذان المعتمد',
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

function openCustomAdhanDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB غير مدعوم'));
      return;
    }
    const req = window.indexedDB.open(CUSTOM_ADHAN_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_ADHAN_STORE_NAME)) {
        db.createObjectStore(CUSTOM_ADHAN_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error || new Error('تعذر فتح قاعدة بيانات الصوت'));
  });
}

export function getCustomAdhanFileMeta(): CustomAdhanFileMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_ADHAN_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomAdhanFileMeta;
    return {
      mimeType: parsed.mimeType || 'audio/mpeg',
      sizeBytes: parsed.sizeBytes || 0,
      durationSeconds: parsed.durationSeconds || 14,
      uploadedAtISO: parsed.uploadedAtISO || new Date().toISOString(),
      customUrl: parsed.customUrl,
    };
  } catch {
    return null;
  }
}

function probeAudioDuration(blobOrUrl: Blob | string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(14);
      return;
    }
    const tempAudio = new Audio();
    let tempUrl: string | null = null;
    const cleanup = () => {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(14);
    }, 2500);

    tempAudio.preload = 'metadata';
    tempAudio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const dur =
        Number.isFinite(tempAudio.duration) && tempAudio.duration > 0
          ? tempAudio.duration
          : 14;
      cleanup();
      resolve(dur);
    };
    tempAudio.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(14);
    };

    if (typeof blobOrUrl === 'string') {
      tempAudio.src = blobOrUrl;
    } else {
      tempUrl = URL.createObjectURL(blobOrUrl);
      tempAudio.src = tempUrl;
    }
  });
}

export async function saveCustomAdhanAudioFile(
  file: File
): Promise<CustomAdhanFileMeta> {
  const durationSeconds = await probeAudioDuration(file);
  const meta: CustomAdhanFileMeta = {
    mimeType: file.type || 'audio/mpeg',
    sizeBytes: file.size || 0,
    durationSeconds,
    uploadedAtISO: new Date().toISOString(),
  };

  try {
    const db = await openCustomAdhanDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CUSTOM_ADHAN_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CUSTOM_ADHAN_STORE_NAME);
      store.put(file, CUSTOM_ADHAN_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = URL.createObjectURL(file);
    meta.customUrl = activeObjectUrl;
  }

  try {
    localStorage.setItem(CUSTOM_ADHAN_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore storage quota errors
  }

  return meta;
}

export async function saveCustomAdhanAudioUrl(
  url: string
): Promise<CustomAdhanFileMeta> {
  const trimmed = url.trim();
  const durationSeconds = await probeAudioDuration(trimmed);

  const meta: CustomAdhanFileMeta = {
    mimeType: 'audio/mpeg',
    sizeBytes: 617444,
    durationSeconds,
    uploadedAtISO: new Date().toISOString(),
    customUrl: trimmed,
  };

  try {
    localStorage.setItem(CUSTOM_ADHAN_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
  return meta;
}

export async function clearCustomAdhanAudioFile(): Promise<void> {
  stopActiveAdhanAudio();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CUSTOM_ADHAN_META_KEY);
    } catch {
      // ignore
    }
    try {
      const db = await openCustomAdhanDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(CUSTOM_ADHAN_STORE_NAME, 'readwrite');
        tx.objectStore(CUSTOM_ADHAN_STORE_NAME).delete(CUSTOM_ADHAN_RECORD_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      });
    } catch {
      // ignore
    }
  }
}

async function resolveCustomAudioSourceUrl(): Promise<{
  url: string;
  durationSec: number;
}> {
  const meta = getCustomAdhanFileMeta();
  if (meta?.customUrl) {
    return {
      url: meta.customUrl,
      durationSec: meta.durationSeconds || 14,
    };
  }

  try {
    const db = await openCustomAdhanDB();
    const blob = await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(CUSTOM_ADHAN_STORE_NAME, 'readonly');
      const req = tx
        .objectStore(CUSTOM_ADHAN_STORE_NAME)
        .get(CUSTOM_ADHAN_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as Blob) || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });

    if (blob) {
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = URL.createObjectURL(blob);
      return {
        url: activeObjectUrl,
        durationSec: meta?.durationSeconds || 14,
      };
    }
  } catch {
    // fallback to single local adhan audio
  }

  return {
    url: '/adhan.wav',
    durationSec: 14,
  };
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
 * Plays the single unified Adhan audio (uploaded custom file in IndexedDB or local /adhan.wav)
 * without ever exposing any file name.
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
  const resolved = await resolveCustomAudioSourceUrl();
  const sourceUrl = resolved.url;
  const durationSec = resolved.durationSec;
  const activeLabel = getSanitizedAdhanTitleAr(prayerNameAr);

  currentState = {
    ...currentState,
    isPlaying: true,
    isPaused: false,
    activeSoundId: 'custom_file',
    currentTimeSec: 0,
    durationSec,
    activeLabelAr: activeLabel,
    fileSourceLabelAr: 'صوت الأذان المعتمد',
  };
  notifyListeners();

  try {
    const audio = new Audio(sourceUrl);
    audio.volume = currentState.volume;
    activeAudioEl = audio;

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        currentState = {
          ...currentState,
          durationSec: audio.duration,
        };
        notifyListeners();
      }
    };

    audio.ontimeupdate = () => {
      currentState = {
        ...currentState,
        currentTimeSec: audio.currentTime,
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
      const elapsed = (Date.now() - startedAt) / 1000;
      const actualTime =
        activeAudioEl && activeAudioEl.currentTime > 0.1
          ? activeAudioEl.currentTime
          : elapsed;

      if (actualTime >= currentState.durationSec) {
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
          currentTimeSec: actualTime,
        };
        notifyListeners();
      }
    }, 250);

    await audio.play();
  } catch {
    playSynthesizedTone(spec);
  }
}
