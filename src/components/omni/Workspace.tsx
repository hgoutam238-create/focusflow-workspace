import { useEffect, useState } from "react";
import { useData } from "@/lib/store";
import { TAB_IDS, useTabs } from "@/lib/tabs";
import { FocusPage } from "./dashboards/Focus";
import { ClockPage } from "./dashboards/Clock";
import { CalendarPage } from "./dashboards/Calendar";
import { TasksPage } from "./dashboards/Tasks";
import { NotesPage } from "./dashboards/Notes";
import { DistractionsPage } from "./dashboards/Distractions";
import { AnalyticsPage } from "./dashboards/Analytics";

const dashboards = [FocusPage, ClockPage, CalendarPage, TasksPage, NotesPage, DistractionsPage, AnalyticsPage];

export function Workspace() {
  const active = useTabs((state) => state.activeTab);
  const [ready, setReady] = useState(useData.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = useData.persist.onFinishHydration(() => setReady(true));
    if (useData.persist.hasHydrated()) setReady(true);
    return unsubscribe;
  }, []);
  if (!ready) return <div className="label-xs">Loading workspace…</div>;
  return <>{TAB_IDS.map((tab, index) => {
    const Dashboard = dashboards[index];
    return Dashboard ? <section key={tab} data-dashboard={tab} aria-hidden={tab !== active} className={tab === active ? "block" : "hidden"}><Dashboard /></section> : null;
  })}</>;
}