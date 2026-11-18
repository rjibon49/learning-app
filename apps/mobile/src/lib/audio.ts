/**
 * One place that plays German for the whole app:
 *  - a recorded file (CMS media) when there is one, otherwise the device's
 *    German voice;
 *  - Normal / Slow speed, remembered on the device;
 *  - only one sound at a time, and screens can see what is playing
 *    (to highlight it) through useNowPlaying().
 */
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { speakGerman, stopGermanSpeech } from "./german-speech";

export type Speed = "normal" | "slow";

const SPEED_KEY = "audio_speed_v1";
const TTS_RATE: Record<Speed, number> = { normal: 0.85, slow: 0.5 };
const FILE_RATE: Record<Speed, number> = { normal: 1, slow: 0.75 };

let speed: Speed = "normal";
let nowPlaying: string | null = null;
let queueRunning: string | null = null; // which "Play all" is running
let generation = 0; // bumps on every stop; a running queue checks it
let player: AudioPlayer | null = null;
let audioModeSet = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function setNowPlaying(key: string | null) {
  nowPlaying = key;
  emit();
}

void AsyncStorage.getItem(SPEED_KEY)
  .then((v) => {
    if (v === "slow" || v === "normal") {
      speed = v;
      emit();
    }
  })
  .catch(() => undefined);

export function getSpeed(): Speed {
  return speed;
}

export function setSpeed(next: Speed) {
  speed = next;
  emit();
  void AsyncStorage.setItem(SPEED_KEY, next).catch(() => undefined);
}

export type PlayItem = {
  /** German text (spoken by the device voice when there is no recording). */
  text: string;
  /** Recorded audio (https) — preferred when present. */
  url?: string | null;
  /** Identifies the button/line to highlight; defaults to the text. */
  key?: string;
};

function playFile(url: string, done: () => void): () => void {
  if (!audioModeSet) {
    audioModeSet = true;
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }
  if (!player) player = createAudioPlayer(null);
  const p = player;
  p.replace({ uri: url });
  p.setPlaybackRate(FILE_RATE[speed]);
  const sub = p.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish) {
      sub.remove();
      done();
    }
  });
  p.play();
  return () => sub.remove();
}

async function playOne(item: PlayItem, myGeneration: number): Promise<void> {
  const url = item.url && /^https:\/\//i.test(item.url) ? item.url : null;
  if (url) {
    try {
      await new Promise<void>((resolve) => {
        const cancel = playFile(url, resolve);
        // Stop() during playback: resolve so a queue can move on/exit.
        const check = setInterval(() => {
          if (generation !== myGeneration) {
            clearInterval(check);
            cancel();
            resolve();
          }
        }, 150);
        // Safety net for files that never report "finished".
        setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 20000);
      });
      return;
    } catch {
      // Fall through to the device voice.
    }
  }
  await speakGerman(item.text, TTS_RATE[speed]);
}

/** Stops whatever is playing. */
export async function stopAudio(): Promise<void> {
  generation += 1;
  queueRunning = null;
  setNowPlaying(null);
  try {
    player?.pause();
  } catch {
    // Player not ready.
  }
  await stopGermanSpeech().catch(() => undefined);
}

/** Plays one item; tapping the same item while it plays stops it. */
export async function play(item: PlayItem): Promise<void> {
  const key = item.key ?? item.text;
  if (nowPlaying === key) {
    await stopAudio();
    return;
  }
  await stopAudio();
  const mine = generation;
  setNowPlaying(key);
  try {
    await playOne(item, mine);
  } finally {
    if (generation === mine) setNowPlaying(null);
  }
}

/** Plays items one after another with a short pause ("Play all"). */
export async function playAll(items: PlayItem[], queueKey = "__queue__"): Promise<void> {
  await stopAudio();
  const mine = generation;
  for (const item of items) {
    if (generation !== mine) return;
    setNowPlaying(item.key ?? item.text);
    queueRunning = queueKey;
    emit();
    try {
      await playOne(item, mine);
    } catch {
      // Skip a phrase that cannot be played.
    }
    if (generation !== mine) return;
    await new Promise((r) => setTimeout(r, speed === "slow" ? 900 : 600));
  }
  if (generation === mine) {
    queueRunning = null;
    setNowPlaying(null);
  }
}

/** Re-renders when playback or speed changes. */
function useAudioState<T>(select: () => T): T {
  const [value, setValue] = useState(select);
  useEffect(() => {
    const update = () => setValue(select);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select reads module state
  }, []);
  return value;
}

export function useNowPlaying(): string | null {
  return useAudioState(() => nowPlaying);
}

export function useSpeed(): Speed {
  return useAudioState(() => speed);
}

export function useQueueRunning(queueKey = "__queue__"): boolean {
  return useAudioState(() => queueRunning === queueKey && nowPlaying !== null);
}
