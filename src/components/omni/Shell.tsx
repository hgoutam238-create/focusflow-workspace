import { Target, Clock, CalendarRange, KanbanSquare, NotebookPen, BrainCircuit, BarChart3, FolderSync, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTabs, type TabId } from "@/lib/tabs";
import { useBackup, linkBackupFolder, downloadBackup } from "@/lib/backup";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { useTimer } from "@/lib/timer";
import { ms, hms } from "@/lib/format";

const NAV = [
  { to: "focus", label: "Focus Command", icon: Target },
  { to: "clock", label: "Time & Clock", icon: Clock },
  { to: "calendar", label: "Timeline", icon: CalendarRange },
  { to: "tasks", label: "Task Manager", icon: KanbanSquare },
  { to: "notes", label: "Power-Note Lab", icon: NotebookPen },
  { to: "distractions", label: "Brain Dump", icon: BrainCircuit },
  { to: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { running, remaining, mode, sw } = useTimer();
  const { activeTab, setTab } = useTabs();
  const backup = useBackup();
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 grid-cols-2 gap-0.5 rounded-xl bg-card p-1.5">
            <span className="rounded-sm bg-focus" /><span className="rounded-sm bg-interactive" />
            <span className="rounded-sm bg-break" /><span className="rounded-sm bg-warn" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">OmniFocus</div>
            <div className="label-xs">Matrix Engine</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Button variant="ghost" key={to} onClick={() => setTab(to as TabId)} aria-pressed={activeTab === to}
              className={`h-auto justify-start gap-3 px-3 py-2.5 text-sm ${activeTab === to ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}>
              <Icon className="h-4 w-4" />{label}
            </Button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {running && (
            <Button variant="ghost" onClick={() => setTab("focus")} className="panel-tight h-auto w-full flex-col items-start">
              <div className="label-xs">{mode === "work" ? "Focusing" : "On break"}</div>
              <div className={`mono text-xl font-bold ${mode === "work" ? "text-focus" : "text-break"}`}>{ms(remaining)}</div>
            </Button>
          )}
          {sw.running && sw.startAt && (
            <Button variant="ghost" onClick={() => setTab("clock")} className="panel-tight h-auto w-full flex-col items-start">
              <div className="label-xs">Tracking</div>
              <SwLive startAt={sw.startAt} />
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start text-xs" onClick={() => linkBackupFolder().catch((error: Error) => { if (error.name !== "AbortError") toast.error(error.message); })}><FolderSync />Link Backup Folder</Button>
          <div className="px-2 text-[10px] text-muted-foreground break-words">{backup.folder && `${backup.folder} · `}{backup.status}</div>
          <Button variant="ghost" className="w-full justify-start text-xs" onClick={() => downloadBackup().catch(() => toast.error("Could not create backup"))}><Download />Download Backup</Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}

function SwLive({ startAt }: { startAt: number }) {
  useTimer((s) => s.remaining); // re-render on ticks
  return <div className="mono text-xl font-bold text-interactive">{hms((Date.now() - startAt) / 1000)}</div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label-xs mb-1">{eyebrow}</div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
