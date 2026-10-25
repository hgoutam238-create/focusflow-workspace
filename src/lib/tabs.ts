import { create } from "zustand";

export const TAB_IDS = ["focus", "clock", "calendar", "tasks", "notes", "distractions", "analytics"] as const;
export type TabId = typeof TAB_IDS[number];
export const useTabs = create<{ activeTab: TabId; setTab: (tab: TabId) => void }>((set) => ({
  activeTab: "focus", setTab: (activeTab) => set({ activeTab }),
}));