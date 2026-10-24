import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Priority = "Low" | "Medium" | "High";
export type Bucket = "Inbox" | "Today" | "Tomorrow" | "This Week" | "Backlog";
export const BUCKETS: Bucket[] = ["Inbox", "Today", "Tomorrow", "This Week", "Backlog"];
export type Method = "Pomodoro" | "Stopwatch" | "Manual";
export type ThoughtMode = "Study/Theory" | "Fleeting Thought" | "Deep Reflection" | "Action Plan";
export const THOUGHT_MODES: ThoughtMode[] = ["Study/Theory", "Fleeting Thought", "Deep Reflection", "Action Plan"];
export const DISTRACTION_CATEGORIES = ["Uncategorized", "Digital Temptation", "Internal Anxiety", "External Noise", "Random Ideas"];

export interface Project { id: string; name: string; color_hex: string; description: string; archived_status: boolean }
export interface Task {
  id: string; project_id: string; title: string; notes: string; priority_level: Priority; due_date: string;
  completed_boolean: boolean; estimated_pomodoros: number; completed_pomodoros: number; daily_grouping_bucket: Bucket;
}
export interface Habit { id: string; title: string; frequency_days: number[]; streak_count: number; current_year_history_map: Record<string, boolean> }
export interface TimeLog {
  id: string; task_id: string | null; project_id: string | null; title: string; category_string: string;
  start_time: string; end_time: string; method_used: Method; total_distractions: number; intensity_score: number;
  final_reflection_text: string; goal_achieved: boolean | null;
}
export interface Distraction { id: string; timestamp: string; raw_thought_text: string; core_category: string; task_title: string }
export interface Reminder { id: string; reference_type: "Task" | "Habit"; reference_id: string; fire_time_string: string; repeat_boolean: boolean }
export interface Note {
  id: string; project_id: string; title: string; raw_content: string; markdown_html: string;
  created_at: string; updated_at: string; category_tag: ThoughtMode; absolute_privacy_flag: boolean;
}

export interface Collections {
  projects: Project[]; tasks: Task[]; habits: Habit[]; timeLogs: TimeLog[];
  brainDump: Distraction[]; reminders: Reminder[]; notes: Note[];
}
export interface Settings { ambientTrack: string | null; volume: number; binauralAutoplay: boolean; binauralId: string | null }

interface State extends Collections {
  settings: Settings;
  add: <K extends keyof Collections>(k: K, item: Collections[K][number]) => void;
  update: <K extends keyof Collections>(k: K, id: string, patch: Partial<Collections[K][number]>) => void;
  remove: <K extends keyof Collections>(k: K, id: string) => void;
  setSettings: (p: Partial<Settings>) => void;
}

export const uid = () => crypto.randomUUID();

const SEED_PROJECTS: Project[] = [
  { id: "p-physics", name: "Physics Class", color_hex: "#3B82F6", description: "Coursework & theory", archived_status: false },
  { id: "p-startup", name: "Startup Project", color_hex: "#FF4A5A", description: "Building the product", archived_status: false },
  { id: "p-personal", name: "Personal Musings", color_hex: "#10B981", description: "Life & growth", archived_status: false },
];
const SEED_TASKS: Task[] = [
  { id: "t-1", project_id: "p-startup", title: "Draft investor update", notes: "", priority_level: "High", due_date: "", completed_boolean: false, estimated_pomodoros: 3, completed_pomodoros: 0, daily_grouping_bucket: "Today" },
  { id: "t-2", project_id: "p-physics", title: "Derive Lagrangian for double pendulum", notes: "", priority_level: "Medium", due_date: "", completed_boolean: false, estimated_pomodoros: 4, completed_pomodoros: 0, daily_grouping_bucket: "Tomorrow" },
  { id: "t-3", project_id: "p-personal", title: "Weekly review", notes: "", priority_level: "Low", due_date: "", completed_boolean: false, estimated_pomodoros: 1, completed_pomodoros: 0, daily_grouping_bucket: "This Week" },
  { id: "t-4", project_id: "p-startup", title: "Triage feedback inbox", notes: "", priority_level: "Medium", due_date: "", completed_boolean: false, estimated_pomodoros: 2, completed_pomodoros: 0, daily_grouping_bucket: "Inbox" },
];

export const useData = create<State>()(
  persist(
    (set) => ({
      projects: SEED_PROJECTS, tasks: SEED_TASKS, habits: [], timeLogs: [], brainDump: [], reminders: [], notes: [],
      settings: { ambientTrack: null, volume: 0.5, binauralAutoplay: true, binauralId: null },
      add: (k, item) => set((s) => ({ [k]: [item, ...(s[k] as unknown[])] }) as Partial<State>),
      update: (k, id, patch) =>
        set((s) => ({ [k]: (s[k] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<State>),
      remove: (k, id) => set((s) => ({ [k]: (s[k] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<State>),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
    }),
    { name: "omnifocus-matrix-v1", storage: createJSONStorage(() => localStorage) },
  ),
);

export const projectById = (projects: Project[], id: string | null | undefined) => projects.find((p) => p.id === id);
