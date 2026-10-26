import { create } from "zustand";
import { useData, uid, type Method } from "./store";
import { RECOVERY_BREAK_MIN, STUCK_PROTOCOL_MIN } from "./energy";

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
  pendingQueue: Pending[]; heartbeat: number; activeProjectId: string | null; shieldOpen: boolean;
  sw: { running: boolean; startAt: number | null; title: string; projectId: string | null; method: Method };
  activity: { running: boolean; startAt: number | null; title: string };
  cd: { running: boolean; endAt: number | null; remaining: number; total: number };
  cu: { running: boolean; startAt: number | null; acc: number };
  stuck: { open: boolean; endsAt: number | null; resume: boolean };
  recoveryNext: boolean; recoveryActive: boolean;
  openStuck: () => void; closeStuck: () => void; mandateRecovery: () => void;
  cuStart: () => void; cuPause: () => void; cuReset: () => void;
  start: () => void; pause: () => void; reset: () => void; skip: () => void;
  setMode: (m: Mode) => void; setDuration: (m: Mode, min: number) => void;
  tick: () => void; endEarly: () => void; afterReflection: () => void;
  setActiveTask: (id: string | null) => void; setTarget: (t: string | null) => void;
  addDistraction: () => void;
  swStart: (title: string, projectId: string | null) => void; swStop: () => void;
  quickStart: (title: string) => void; activityStart: (title: string) => void; activityStop: () => void;
  cdStart: (sec: number) => void; cdPause: () => void; cdReset: () => void;
}

export const useTimer = create<TimerState>()((set, get) => ({
  durations: { work: 25, short: 5, long: 15 },
  mode: "work", remaining: 25 * 60, running: false, endAt: null, workCount: 0,
  activeTaskId: null, activeTargetTitle: null, sessionDistractions: 0, sessionStartedAt: null, pending: null,
  pendingQueue: [], heartbeat: 0, activeProjectId: null, shieldOpen: false,
  sw: { running: false, startAt: null, title: "", projectId: null, method: "Stopwatch" },
  activity: { running: false, startAt: null, title: "" },
  cd: { running: false, endAt: null, remaining: 0, total: 0 },
  cu: { running: false, startAt: null, acc: 0 },
  stuck: { open: false, endsAt: null, resume: false },
  recoveryNext: false, recoveryActive: false,

  start: () => {
    const s = get();
    if (s.running || s.pending) return;
    set({ running: true, endAt: Date.now() + s.remaining * 1000, sessionStartedAt: s.mode === "work" ? (s.sessionStartedAt ?? Date.now()) : s.sessionStartedAt });
  },
  pause: () => { const s = get(); if (!s.running || !s.endAt) return; set({ running: false, endAt: null, remaining: Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)) }); },
  reset: () => set((s) => ({ running: false, endAt: null, remaining: s.durations[s.mode] * 60, sessionStartedAt: null, sessionDistractions: 0 })),
  skip: () => {
    const s = get();
    if (s.mode === "work" && s.sessionStartedAt) { get().endEarly(); return; }
    const next: Mode = s.mode === "work" ? ((s.workCount + 1) % 4 === 0 ? "long" : "short") : "work";
    set({ mode: next, running: false, endAt: null, remaining: s.durations[next] * 60, sessionStartedAt: null, sessionDistractions: 0 });
  },
  setMode: (m) => set((s) => ({ mode: m, running: false, endAt: null, remaining: s.durations[m] * 60, sessionStartedAt: null })),
  setDuration: (m, min) => { const value = Math.min(180, Math.max(1, min)); set((s) => ({ durations: { ...s.durations, [m]: value }, ...(s.mode === m && !s.running ? { remaining: value * 60 } : {}) })); },
  tick: () => {
    set({ heartbeat: Date.now() });
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
      const wc = s.workCount + 1;
      const next: Mode = wc % 4 === 0 ? "long" : "short";
      const min = breakMin(s, next);
      set({ pending: buildPending(s, true), workCount: wc, mode: next, running: true, remaining: min * 60, endAt: Date.now() + min * 60000, sessionStartedAt: null, sessionDistractions: 0, recoveryActive: s.recoveryNext, recoveryNext: false });
    } else {
      set({ mode: "work", running: false, endAt: null, remaining: s.durations.work * 60, recoveryActive: false });
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
    const nextPending = s.pendingQueue[0] ?? null;
    if (s.pending?.method === "Pomodoro" && s.mode === "work" && !s.sw.running) {
      const wc = s.workCount + 1;
      const next: Mode = wc % 4 === 0 ? "long" : "short";
      const min = breakMin(s, next);
      set({ pending: nextPending, pendingQueue: s.pendingQueue.slice(1), workCount: wc, mode: next, remaining: min * 60, running: true, endAt: Date.now() + min * 60000, sessionStartedAt: null, sessionDistractions: 0, recoveryActive: s.recoveryNext, recoveryNext: false });
    } else set({ pending: nextPending, pendingQueue: s.pendingQueue.slice(1) });
  },
  setActiveTask: (id) => set({ activeTaskId: id, activeTargetTitle: null }),
  setTarget: (t) => set({ activeTargetTitle: t, activeTaskId: null }),
  addDistraction: () => set((s) => ({ sessionDistractions: s.sessionDistractions + 1 })),
  swStart: (title, projectId) => {
    const s = get(); if (s.sw.running) return;
    if (s.mode === "work" && s.sessionStartedAt) get().endEarly();
    set({ running: false, endAt: null, sw: { running: true, startAt: Date.now(), title, projectId, method: "Stopwatch" } });
  },
  swStop: () => {
    const s = get();
    if (!s.sw.running || !s.sw.startAt) return;
    set({
      sw: { ...s.sw, running: false },
      ...enqueue(s, { method: s.sw.method, start: s.sw.startAt, end: Date.now(), taskId: null, projectId: s.sw.projectId, title: s.sw.title || "Untitled objective", distractions: 0, fullPomodoro: false }),
    });
  },
  quickStart: (title) => {
    const s = get();
    if (s.mode === "work" && s.sessionStartedAt) saveHandoff(buildPending(s, false));
    if (s.sw.running && s.sw.startAt) saveHandoff({ method: s.sw.method, start: s.sw.startAt, end: Date.now(), taskId: null, projectId: s.sw.projectId, title: s.sw.title, distractions: 0, fullPomodoro: false });
    set({ running: false, endAt: null, sessionStartedAt: null, sessionDistractions: 0, remaining: s.durations[s.mode] * 60, sw: { running: true, startAt: Date.now(), title, projectId: null, method: "QuickRoutine" } });
  },
  activityStart: (title) => set({ activity: { running: true, startAt: Date.now(), title: title || "Activity" } }),
  activityStop: () => {
    const s = get(); if (!s.activity.running || !s.activity.startAt) return;
    set({ activity: { ...s.activity, running: false }, ...enqueue(s, { method: "QuickRoutine", start: s.activity.startAt, end: Date.now(), taskId: null, projectId: null, title: s.activity.title, distractions: 0, fullPomodoro: false }) });
  },
  cdStart: (sec) => set((s) => {
    const rem = s.cd.remaining > 0 && !s.cd.running ? s.cd.remaining : sec;
    return { cd: { running: true, endAt: Date.now() + rem * 1000, remaining: rem, total: s.cd.total && s.cd.remaining > 0 ? s.cd.total : sec } };
  }),
  cdPause: () => set((s) => ({ cd: { ...s.cd, running: false, endAt: null } })),
  cdReset: () => set({ cd: { running: false, endAt: null, remaining: 0, total: 0 } }),
  cuStart: () => set((s) => (s.cu.running ? {} : { cu: { ...s.cu, running: true, startAt: Date.now() } })),
  cuPause: () => set((s) => (s.cu.running && s.cu.startAt ? { cu: { running: false, startAt: null, acc: s.cu.acc + Date.now() - s.cu.startAt } } : {})),
  cuReset: () => set({ cu: { running: false, startAt: null, acc: 0 } }),
  openStuck: () => {
    const s = get(); const resume = s.running && s.mode === "work";
    if (resume) get().pause();
    set({ stuck: { open: true, endsAt: Date.now() + STUCK_PROTOCOL_MIN * 60000, resume } });
  },
  closeStuck: () => { const resume = get().stuck.resume; set({ stuck: { open: false, endsAt: null, resume: false } }); if (resume) get().start(); },
  mandateRecovery: () => {
    const s = get();
    if (s.mode !== "work" && s.running) set({ remaining: RECOVERY_BREAK_MIN * 60, endAt: Date.now() + RECOVERY_BREAK_MIN * 60000, recoveryActive: true });
    else set({ recoveryNext: true });
  },
}));

export const cuElapsedMs = (cu: TimerState["cu"], now = Date.now()) => cu.acc + (cu.running && cu.startAt ? now - cu.startAt : 0);

function breakMin(s: TimerState, next: Mode) { return s.recoveryNext ? Math.max(RECOVERY_BREAK_MIN, s.durations[next]) : s.durations[next]; }

function buildPending(s: TimerState, full: boolean): Pending {
  return {
    method: "Pomodoro", start: s.sessionStartedAt ?? Date.now() - s.durations.work * 60000, end: Date.now(),
    taskId: s.activeTaskId, projectId: s.activeProjectId, title: s.activeTargetTitle ?? "", distractions: s.sessionDistractions, fullPomodoro: full,
  };
}

function enqueue(s: TimerState, pending: Pending) {
  return s.pending ? { pendingQueue: [...s.pendingQueue, pending] } : { pending };
}
function saveHandoff(p: Pending) {
  const task = useData.getState().tasks.find((task) => task.id === p.taskId);
  useData.getState().add("timeLogs", { id: uid(), task_id: p.taskId, project_id: task?.project_id ?? p.projectId, title: task?.title ?? (p.title || "Focus block"), category_string: p.method === "Pomodoro" ? "Focus" : "Activity", start_time: new Date(p.start).toISOString(), end_time: new Date(p.end).toISOString(), method_used: p.method, total_distractions: p.distractions, intensity_score: 0, final_reflection_text: "Switched to quick routine", goal_achieved: null });
}
