import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Play, Square, Pause, RotateCcw, Utensils, Gamepad2, Dumbbell, BedDouble } from "lucide-react";
import { PageHeader } from "@/components/omni/Shell";
import { useTimer } from "@/lib/timer";
import { useData, projectById } from "@/lib/store";
import { hms, pad } from "@/lib/format";



export function ClockPage() {
  useTimer((s) => s.heartbeat);
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -now.getTimezoneOffset() / 60;
  return (
    <>
      <PageHeader eyebrow="Tab 02" title="Mechanical Time & Clock Hub" />
      <Stopwatch />
      <QuickActivities />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel flex flex-col items-center justify-center py-14">
          <div className="mono flex flex-wrap items-baseline justify-center text-5xl font-bold leading-none sm:text-7xl lg:text-[7rem]">
            {pad(now.getHours())}<span className="text-muted-foreground">:</span>{pad(now.getMinutes())}
            <span className="ml-3 text-5xl text-interactive">{pad(now.getSeconds())}</span>
          </div>
          <div className="mt-5 text-xl font-semibold">{now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          <div className="mt-2 flex gap-2">
            <span className="chip bg-interactive/15 text-interactive">{tz}</span>
            <span className="chip bg-muted text-muted-foreground">UTC{offset >= 0 ? "+" : ""}{offset}</span>
          </div>
        </div>
        <Countdown />
      </div>
    </>
  );
}

function Stopwatch() {
  const { sw, swStart, swStop } = useTimer();
  const allProjects = useData((s) => s.projects);
  const projects = allProjects.filter((p) => !p.archived_status);
  const [title, setTitle] = useState("");
  const [pid, setPid] = useState<string>("");
  const proj = projectById(projects, sw.running ? sw.projectId : pid);
  return (
    <div className="panel flex flex-wrap items-center gap-3">
      <input className="field min-w-[260px] flex-1 !bg-transparent !text-base" placeholder="What objective are you executing right now?"
        value={sw.running ? sw.title : title} disabled={sw.running} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: proj?.color_hex ?? "var(--muted-foreground)" }} />
        <select className="field w-48" value={sw.running ? sw.projectId ?? "" : pid} disabled={sw.running} onChange={(e) => setPid(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>● {p.name}</option>)}
        </select>
      </div>
      <div className="mono w-32 text-right text-2xl font-bold">{hms(sw.running && sw.startAt ? (Date.now() - sw.startAt) / 1000 : 0)}</div>
      {sw.running
        ? <Button variant="ghost" onClick={swStop} className="btn-focus"><Square className="h-4 w-4" />Stop</Button>
        : <Button variant="ghost" onClick={() => { swStart(title, pid || null); setTitle(""); }} className="btn-blue"><Play className="h-4 w-4" />Start Tracking</Button>}
    </div>
  );
}

function QuickActivities() {
  const { quickStart, activity, activityStart, activityStop, heartbeat, pending } = useTimer();
  const [title, setTitle] = useState("Gaming");
  return <div className="mt-6">
    <div className="label-xs mb-3">Quick routines</div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { title: "Eating Food", icon: Utensils, color: "text-warn" }, { title: "Gaming", icon: Gamepad2, color: "text-interactive" },
      { title: "Exercise", icon: Dumbbell, color: "text-break" }, { title: "Power Nap", icon: BedDouble, color: "text-focus" },
    ].map(({ title: name, icon: Icon, color }) => <Button key={name} variant="outline" disabled={!!pending} onClick={() => quickStart(name)} className="h-20 flex-col gap-2 bg-card"><Icon className={color} />{name}</Button>)}</div>
    <div className="panel mt-4 flex flex-wrap items-center gap-3"><div className="label-xs">Activity count-up</div><input aria-label="Activity title" className="field min-w-32 flex-1" value={title} disabled={activity.running} onChange={(e) => setTitle(e.target.value)} /><div className="mono w-28 text-xl">{hms(activity.running && activity.startAt ? (heartbeat - activity.startAt) / 1000 : 0)}</div><Button variant="ghost" className={activity.running ? "btn-focus" : "btn-blue"} onClick={() => activity.running ? activityStop() : activityStart(title)}>{activity.running ? <Square /> : <Play />}{activity.running ? "Stop activity" : "Start activity"}</Button></div>
  </div>;
}

function Countdown() {
  const { cd, cdStart, cdPause, cdReset } = useTimer();
  const [h, setH] = useState(0), [m, setM] = useState(10), [s, setS] = useState(0);
  const total = h * 3600 + m * 60 + s;
  const idle = !cd.running && cd.remaining === 0;
  const pct = cd.total ? cd.remaining / cd.total : 1;
  return (
    <div className="panel">
      <div className="label-xs">Independent Countdown Timer</div>
      {idle ? (
        <div className="mt-6 flex justify-center gap-3"><Dial v={h} set={setH} max={23} label="Hours" /><Dial v={m} set={setM} max={59} label="Minutes" /><Dial v={s} set={setS} max={59} label="Seconds" /></div>
      ) : (
        <div className="py-8 text-center">
          <div className="mono text-6xl font-bold text-warn">{hms(cd.remaining)}</div>
          <div className="mx-auto mt-5 h-1.5 w-3/4 overflow-hidden rounded-full bg-muted"><div className="h-full bg-warn transition-all" style={{ width: `${pct * 100}%` }} /></div>
        </div>
      )}
      <div className="mt-6 flex justify-center gap-2">
        {cd.running ? <Button variant="ghost" onClick={cdPause} className="btn-ghost"><Pause className="h-4 w-4" />Pause</Button>
          : <Button variant="ghost" disabled={idle && !total} onClick={() => cdStart(total)} className="btn-blue"><Play className="h-4 w-4" />{idle ? "Start" : "Resume"}</Button>}
        <Button variant="ghost" onClick={cdReset} className="btn-ghost"><RotateCcw className="h-4 w-4" />Reset</Button>
      </div>
    </div>
  );
}

function Dial({ v, set, max, label }: { v: number; set: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <Button variant="ghost" className="btn-icon" onClick={() => set((v + 1) % (max + 1))}>▲</Button>
      <input type="number" min={0} max={max} value={pad(v)} onChange={(e) => set(Math.min(max, Math.max(0, +e.target.value || 0)))}
        className="mono w-20 rounded-xl bg-background/60 py-2 text-center text-4xl font-bold outline-none focus:ring-2 focus:ring-interactive/40" />
      <Button variant="ghost" className="btn-icon" onClick={() => set((v - 1 + max + 1) % (max + 1))}>▼</Button>
      <span className="label-xs mt-1">{label}</span>
    </div>
  )}

