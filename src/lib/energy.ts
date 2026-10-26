import type { TimeLog } from "./store";
import { durMin } from "./format";

export const DEFAULT_THRESHOLD = 55;
export const RECOVERY_BREAK_MIN = 25;
export const STUCK_PROTOCOL_MIN = 7;

const isFocus = (l: TimeLog) => (l.method_used === "Pomodoro" || l.method_used === "Stopwatch") && l.intensity_score > 0;

/** Minute at which logged intensity historically drops at least one point below short-session baseline. */
export function enduranceThreshold(logs: TimeLog[]): { minutes: number; fromHistory: boolean } {
  const focus = logs.filter(isFocus).map((l) => ({ m: durMin(l.start_time, l.end_time), i: l.intensity_score }));
  if (focus.length < 3) return { minutes: DEFAULT_THRESHOLD, fromHistory: false };
  const short = focus.filter((f) => f.m < 45);
  const base = (short.length ? short : focus).reduce((a, f) => a + f.i, 0) / (short.length || focus.length);
  const bands = new Map<number, number[]>();
  focus.forEach((f) => { const b = Math.floor(f.m / 5) * 5; bands.set(b, [...(bands.get(b) ?? []), f.i]); });
  const drop = [...bands.entries()].sort((a, b) => a[0] - b[0])
    .find(([b, v]) => b >= 30 && v.reduce((x, y) => x + y, 0) / v.length <= base - 1);
  return drop ? { minutes: drop[0], fromHistory: true } : { minutes: DEFAULT_THRESHOLD, fromHistory: false };
}

/** Cognitive fuel remaining for a live session; warning fires 5 minutes before the threshold. */
export function fatigueState(elapsedMin: number, threshold: number) {
  const fuel = Math.max(0, Math.min(100, Math.round(100 * (1 - elapsedMin / (threshold * 1.2)))));
  return { fuel, show: elapsedMin >= 45, warn: elapsedMin >= threshold - 5 };
}

/** Daily Study Fuel: starts at 100% and burns by minutes weighted by intensity (12h at intensity 3 empties it). */
export function dailyFuel(todayLogs: TimeLog[]) {
  const burn = todayLogs.reduce((a, l) => a + durMin(l.start_time, l.end_time) * (0.5 + 0.25 * l.intensity_score), 0) / 9;
  return Math.max(0, Math.round(100 - burn));
}

/** Three consecutive focus blocks of 90+ minutes rated intensity 5 mandate a long recovery break. */
export function needsRecovery(logs: TimeLog[]) {
  const last = logs.filter(isFocus).sort((a, b) => b.end_time.localeCompare(a.end_time)).slice(0, 3);
  return last.length === 3 && last.every((l) => l.intensity_score === 5 && durMin(l.start_time, l.end_time) >= 90);
}

/** Mindfulness ping delay: random between 12 and 18 minutes. */
export const pingDelayMs = (rand = Math.random()) => (12 + rand * 6) * 60000;
