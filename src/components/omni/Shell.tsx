import { Link } from "@tanstack/react-router";
import { Target, Clock, CalendarRange, KanbanSquare, NotebookPen, BrainCircuit, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { useTimer } from "@/lib/timer";
import { ms, hms } from "@/lib/format";

const NAV = [
  { to: "/", label: "Focus Command", icon: Target },
  { to: "/clock", label: "Time & Clock", icon: Clock },
  { to: "/calendar", label: "Timeline", icon: CalendarRange },
  { to: "/tasks", label: "Task Manager", icon: KanbanSquare },
  { to: "/notes", label: "Power-Note Lab", icon: NotebookPen },
  { to: "/distractions", label: "Brain Dump", icon: BrainCircuit },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { running, remaining, mode, sw } = useTimer();
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
            <div className="label-xs">Matrix</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground" }}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {running && (
            <Link to="/" className="panel-tight block">
              <div className="label-xs">{mode === "work" ? "Focusing" : "On break"}</div>
              <div className={`mono text-xl font-bold ${mode === "work" ? "text-focus" : "text-break"}`}>{ms(remaining)}</div>
            </Link>
          )}
          {sw.running && sw.startAt && (
            <Link to="/clock" className="panel-tight block">
              <div className="label-xs">Tracking</div>
              <SwLive startAt={sw.startAt} />
            </Link>
          )}
          <div className="px-2 text-[11px] text-muted-foreground">All data stored locally on this device.</div>
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
