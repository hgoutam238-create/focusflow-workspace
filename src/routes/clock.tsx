import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Square, Pause, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/omni/Shell";
import { useTimer } from "@/lib/timer";
import { useData, projectById } from "@/lib/store";
import { hms, pad } from "@/lib/format";

export const Route = createFileRoute("/clock")({
  head: () => ({
    meta: [
      { title: "Time & Clock Hub · OmniFocus Matrix" },
      { name: "description", content: "Wall clock, Toggl-style live stopwatch and a free countdown timer." },
      { property: "og:title", content: "Time & Clock Hub · OmniFocus Matrix" },
      { property: "og:description", content: "Wall clock, live stopwatch and countdown timer." },
    ],
  }),
  component: ClockPage,
});

function ClockPage() {
  useTimer((s) => s.remaining);
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -now.getTimezoneOffset() / 60;
  return (
    <>
      <PageHeader eyebrow="Tab 02" title="Mechanical Time & Clock Hub" />
      <Stopwatch />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel flex flex-col items-center justify-center py-14">
          <div className="mono text-[7rem] font-bold leading-none tracking-tight">
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
  const projects = useData((s) => s.projects.filter((p) => !p.archived_status));
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
        ? <button onClick={swStop} className="btn-focus"><Square className="h-4 w-4" />Stop</button>
        : <button onClick={() => { swStart(title, pid || null); setTitle(""); }} className="btn-blue"><Play className="h-4 w-4" />Start Tracking</button>}
    </div>
  );
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
        {cd.running ? <button onClick={cdPause} className="btn-ghost"><Pause className="h-4 w-4" />Pause</button>
          : <button disabled={idle && !total} onClick={() => cdStart(total)} className="btn-blue"><Play className="h-4 w-4" />{idle ? "Start" : "Resume"}</button>}
        <button onClick={cdReset} className="btn-ghost"><RotateCcw className="h-4 w-4" />Reset</button>
      </div>
    </div>
  );
}

function Dial({ v, set, max, label }: { v: number; set: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <button className="btn-icon" onClick={() => set((v + 1) % (max + 1))}>▲</button>
      <input type="number" min={0} max={max} value={pad(v)} onChange={(e) => set(Math.min(max, Math.max(0, +e.target.value || 0)))}
        className="mono w-20 rounded-xl bg-background/60 py-2 text-center text-4xl font-bold outline-none focus:ring-2 focus:ring-interactive/40" />
      <button className="btn-icon" onClick={() => set((v - 1 + max + 1) % (max + 1))}>▼</button>
      <span className="label-xs mt-1">{label}</span>
    </div>
  )}

