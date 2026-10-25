import { useTabs } from "@/lib/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Target, Check, Archive } from "lucide-react";
import { PageHeader } from "@/components/omni/Shell";
import { useData, uid, BUCKETS, PRIORITY_RANK, projectById, type Bucket, type Task, type Priority } from "@/lib/store";
import { useTimer } from "@/lib/timer";



const PRIO: Record<Priority, string> = { "Urgent Critical": "bg-focus text-primary-foreground", High: "bg-focus/15 text-focus", Medium: "bg-warn/15 text-warn", Low: "bg-break/15 text-break" };
const COLORS = ["#3B82F6", "#FF4A5A", "#10B981", "#F59E0B", "#A855F7", "#06B6D4"];

export function TasksPage() {
  const { projects, tasks, add, update } = useData();
  const [filter, setFilter] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [newProj, setNewProj] = useState(""); const [color, setColor] = useState<string>(COLORS[0] ?? "var(--interactive)");
  const active = projects.filter((p) => !p.archived_status);
  const visible = tasks.filter((t) => (!filter || t.project_id === filter) && (showDone || !t.completed_boolean));

  return (
    <>
      <PageHeader eyebrow="Tab 04" title="Task Manager & Project Groups">
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Show completed</label>
      </PageHeader>
      <div className="flex gap-5">
        <aside className="w-56 shrink-0 space-y-1">
          <Button variant="ghost" onClick={() => setFilter(null)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${!filter ? "bg-elevated" : "text-muted-foreground hover:bg-card"}`}>
            All Projects<span className="mono text-xs">{tasks.filter((t) => !t.completed_boolean).length}</span>
          </Button>
          {active.map((p) => (
            <div key={p.id} className={`group flex items-center rounded-lg ${filter === p.id ? "bg-elevated" : "hover:bg-card"}`}>
              <Button variant="ghost" onClick={() => setFilter(p.id)} className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color_hex }} /><span className="flex-1 truncate">{p.name}</span>
                <span className="mono text-xs text-muted-foreground">{tasks.filter((t) => t.project_id === p.id && !t.completed_boolean).length}</span>
              </Button>
              <Button variant="ghost" title="Archive" className="btn-icon opacity-0 group-hover:opacity-100" onClick={() => update("projects", p.id, { archived_status: true })}><Archive className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <div className="panel-tight mt-4 space-y-2">
            <input className="field" placeholder="New project" value={newProj} onChange={(e) => setNewProj(e.target.value)} />
            <div className="flex gap-1.5">{COLORS.map((c) => <Button variant="ghost" key={c} onClick={() => setColor(c)} className={`h-5 w-5 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`} style={{ background: c }} />)}</div>
            <Button variant="ghost" className="btn-ghost w-full" disabled={!newProj.trim()} onClick={() => { add("projects", { id: uid(), name: newProj.trim(), color_hex: color, description: "", archived_status: false }); setNewProj(""); }}><Plus className="h-4 w-4" />Add project</Button>
          </div>
        </aside>
        <div className="grid min-w-0 flex-1 auto-cols-[minmax(250px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
          {BUCKETS.map((b) => <Column key={b} bucket={b} tasks={visible.filter((t) => t.daily_grouping_bucket === b).sort((a, b) => PRIORITY_RANK[b.priority_level] - PRIORITY_RANK[a.priority_level])} defaultProject={filter ?? active[0]?.id ?? ""} />)}
        </div>
      </div>
    </>
  );
}

function Column({ bucket, tasks, defaultProject }: { bucket: Bucket; tasks: Task[]; defaultProject: string }) {
  const { add, update } = useData();
  const [title, setTitle] = useState("");
  const [over, setOver] = useState(false);
  const create = () => {
    if (!title.trim()) return;
    add("tasks", { id: uid(), project_id: defaultProject, title: title.trim(), notes: "", priority_level: "Medium", due_date: "", completed_boolean: false, estimated_pomodoros: 1, completed_pomodoros: 0, daily_grouping_bucket: bucket });
    setTitle("");
  };
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const id = e.dataTransfer.getData("text/task"); if (id) update("tasks", id, { daily_grouping_bucket: bucket }); }}
      className={`flex flex-col rounded-2xl border bg-card/50 p-3 transition ${over ? "border-interactive bg-interactive/5" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={`text-sm font-bold ${bucket === "Today" ? "text-focus" : ""}`}>{bucket === "Inbox" ? "Inbox / Backlog" : bucket}</span>
        <span className="mono text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex-1 space-y-2">{tasks.map((t) => <TaskCard key={t.id} task={t} />)}</div>
      <div className="mt-3 flex gap-1">
        <input className="field !py-1.5" placeholder="Add task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
        <Button variant="ghost" className="btn-icon" onClick={create}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { projects, update, remove } = useData();
  const setActive = useTimer((s) => s.setActiveTask);
  const setTab = useTabs((s) => s.setTab);
  const p = projectById(projects, task.project_id);
  const idx = BUCKETS.indexOf(task.daily_grouping_bucket);
  const move = (d: number) => { const bucket = BUCKETS[Math.min(BUCKETS.length - 1, Math.max(0, idx + d))]; if (bucket) update("tasks", task.id, { daily_grouping_bucket: bucket }); };
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData("text/task", task.id)}
      className={`cursor-grab rounded-xl border border-border bg-card p-3 transition hover:border-interactive/40 ${task.completed_boolean ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        <Button variant="ghost" onClick={() => update("tasks", task.id, { completed_boolean: !task.completed_boolean })}
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border p-0 ${task.completed_boolean ? "border-break bg-break text-background" : "border-input"}`}>
          {task.completed_boolean && <Check className="h-3 w-3" />}
        </Button>
        <div className={`flex-1 text-sm font-semibold ${task.completed_boolean ? "line-through" : ""}`}>{task.title}</div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {p && <span className="chip" style={{ background: `color-mix(in oklab, ${p.color_hex} 18%, transparent)`, color: p.color_hex }}>{p.name}</span>}
        <select value={task.priority_level} onChange={(e) => update("tasks", task.id, { priority_level: e.target.value as Priority })} className={`chip cursor-pointer border-0 outline-none ${PRIO[task.priority_level]}`}>
          {(["Low", "Medium", "High", "Urgent Critical"] as Priority[]).map((x) => <option key={x}>{x}</option>)}
        </select>
        <input type="date" value={task.due_date} onChange={(e) => update("tasks", task.id, { due_date: e.target.value })} className="chip bg-muted text-muted-foreground outline-none" />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-0.5" title={`${task.completed_pomodoros} done / ${task.estimated_pomodoros} estimated`}>
        {Array.from({ length: 10 }, (_, i) => {
          const est = i < task.estimated_pomodoros, done = i < task.completed_pomodoros;
          return <Button variant="ghost" key={i} onClick={() => update("tasks", task.id, { estimated_pomodoros: i + 1 })}
            title={`Estimate ${i + 1} pomodoros`} className={`h-6 w-5 p-0 text-sm transition hover:scale-125 ${done ? "" : est ? "opacity-40" : "opacity-10 grayscale"}`}>🍅</Button>;
        })}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Button variant="ghost" className="btn-icon" disabled={idx === 0} onClick={() => move(-1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <select value={task.daily_grouping_bucket} onChange={(e) => update("tasks", task.id, { daily_grouping_bucket: e.target.value as Bucket })} className="flex-1 rounded-md bg-background/60 px-1.5 py-1 text-xs outline-none">
          {BUCKETS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <Button variant="ghost" className="btn-icon" disabled={idx === BUCKETS.length - 1} onClick={() => move(1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" className="btn-icon hover:!text-focus" title="Focus on this" onClick={() => { setActive(task.id); setTab("focus"); }}><Target className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" className="btn-icon" onClick={() => remove("tasks", task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
