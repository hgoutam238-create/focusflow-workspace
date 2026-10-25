import { create } from "zustand";
import type { Method } from "./store";

export type Mode = "work" | "short" | "long";
export interface Pending {
  method: Method; start: number; end: number; taskId: string | null; projectId: string | null;
  title: string; distractions: number; fullPomodoro: boolean;
}

interface TimerState {
  durations: Record<Mode, number>;
  mode: Mode; remaining: number; running: boolean; endAt: number | null; workCount: number;
  activeTaskId: string | null; activeTargetTitle: string | null;
  sessionDistractions: number; sessionStartedAt: number | null;
  pending: Pending | null;
  sw: { running: boolean; startAt: number | null; title: string; projectId: string | null };
  cd: { running: boolean; endAt: number | null; remaining: number; total: number };
  start: () => void; pause: () => void; reset: () => void; skip: () => void;
  setMode: (m: Mode) => void; setDuration: (m: Mode, min: number) => void;
  tick: () => void; endEarly: () => void; afterReflection: () => void;
  setActiveTask: (id: string | null) => void; setTarget: (t: string | null) => void;
  addDistraction: () => void;
  swStart: (title: string, projectId: string | null) => void; swStop: () => void;
  cdStart: (sec: number) => void; cdPause: () => void; cdReset: () => void;
}

export const useTimer = create<TimerState>()((set, get) => ({
  durations: { work: 25, short: 5, long: 15 },
  mode: "work", remaining: 25 * 60, running: false, endAt: null, workCount: 0,
  activeTaskId: null, activeTargetTitle: null, sessionDistractions: 0, sessionStartedAt: null, pending: null,
  sw: { running: false, startAt: null, title: "", projectId: null },
  cd: { running: false, endAt: null, remaining: 0, total: 0 },

  start: () => {
    const s = get();
    if (s.running || s.pending) return;
    set({ running: true, endAt: Date.now() + s.remaining * 1000, sessionStartedAt: s.mode === "work" ? (s.sessionStartedAt ?? Date.now()) : s.sessionStartedAt });
  },
  pause: () => { const s = get(); if (!s.running || !s.endAt) return; set({ running: false, endAt: null, remaining: Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)) }); },
  reset: () => set((s) => ({ running: false, endAt: null, remaining: s.durations[s.mode] * 60, sessionStartedAt: null, sessionDistractions: 0 })),
  skip: () => {
    const s = get();
    const next: Mode = s.mode === "work" ? ((s.workCount + 1) % 4 === 0 ? "long" : "short") : "work";
    set({ mode: next, running: false, endAt: null, remaining: s.durations[next] * 60, sessionStartedAt: null, sessionDistractions: 0 });
  },
  setMode: (m) => set((s) => ({ mode: m, running: false, endAt: null, remaining: s.durations[m] * 60, sessionStartedAt: null })),
  setDuration: (m, min) => set((s) => ({ durations: { ...s.durations, [m]: min }, ...(s.mode === m && !s.running ? { remaining: min * 60 } : {}) })),
  tick: () => {
    const s = get();
    if (s.cd.running && s.cd.endAt) {
      const r = Math.max(0, Math.ceil((s.cd.endAt - Date.now()) / 1000));
      set({ cd: { ...s.cd, remaining: r, running: r > 0, endAt: r > 0 ? s.cd.endAt : null } });
      if (r === 0) window.dispatchEvent(new CustomEvent("omni:countdown-done"));
    }
    if (!s.running || !s.endAt) return;
    const r = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
    if (r > 0) { if (r !== s.remaining) set({ remaining: r }); return; }
    if (s.mode === "work") {
      set({ running: false, endAt: null, remaining: 0, pending: buildPending(s, true) });
    } else {
      set({ mode: "work", running: false, endAt: null, remaining: s.durations.work * 60 });
      window.dispatchEvent(new CustomEvent("omni:break-done"));
    }
  },
  endEarly: () => {
    const s = get();
    if (s.mode !== "work" || !s.sessionStartedAt) { get().reset(); return; }
    set({ running: false, endAt: null, pending: buildPending(s, false) });
  },
  afterReflection: () => {
    const s = get();
    if (s.pending?.method === "Pomodoro") {
      const wc = s.workCount + 1;
      const next: Mode = wc % 4 === 0 ? "long" : "short";
      set({ pending: null, workCount: wc, mode: next, remaining: s.durations[next] * 60, running: true, endAt: Date.now() + s.durations[next] * 60000, sessionStartedAt: null, sessionDistractions: 0 });
    } else set({ pending: null });
  },
  setActiveTask: (id) => set({ activeTaskId: id, activeTargetTitle: null }),
  setTarget: (t) => set({ activeTargetTitle: t, activeTaskId: null }),
  addDistraction: () => set((s) => ({ sessionDistractions: s.sessionDistractions + 1 })),
  swStart: (title, projectId) => set({ sw: { running: true, startAt: Date.now(), title, projectId } }),
  swStop: () => {
    const s = get();
    if (!s.sw.running || !s.sw.startAt) return;
    set({
      sw: { ...s.sw, running: false },
      pending: { method: "Stopwatch", start: s.sw.startAt, end: Date.now(), taskId: null, projectId: s.sw.projectId, title: s.sw.title || "Untitled objective", distractions: 0, fullPomodoro: false },
    });
  },
  cdStart: (sec) => set((s) => {
    const rem = s.cd.remaining > 0 && !s.cd.running ? s.cd.remaining : sec;
    return { cd: { running: true, endAt: Date.now() + rem * 1000, remaining: rem, total: s.cd.total && s.cd.remaining > 0 ? s.cd.total : sec } };
  }),
  cdPause: () => set((s) => ({ cd: { ...s.cd, running: false, endAt: null } })),
  cdReset: () => set({ cd: { running: false, endAt: null, remaining: 0, total: 0 } }),
}));

function buildPending(s: TimerState, full: boolean): Pending {
  return {
    method: "Pomodoro", start: s.sessionStartedAt ?? Date.now() - s.durations.work * 60000, end: Date.now(),
    taskId: s.activeTaskId, projectId: null, title: s.activeTargetTitle ?? "", distractions: s.sessionDistractions, fullPomodoro: full,
  };
}
