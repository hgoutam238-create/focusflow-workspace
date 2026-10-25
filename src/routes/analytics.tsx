import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { PageHeader } from "@/components/omni/Shell";
import { useData, THOUGHT_MODES } from "@/lib/store";
import { durMin, fmtHours } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard · OmniFocus Matrix" },
      { name: "description", content: "Focus yield, task velocity, distraction density and intensity curves." },
      { property: "og:title", content: "Analytics Dashboard · OmniFocus Matrix" },
      { property: "og:description", content: "Focus yield, task velocity, distraction density and intensity curves." },
    ],
  }),
  component: AnalyticsPage,
});

const MODE_COLORS = ["var(--interactive)", "var(--warn)", "var(--chart-5)", "var(--break)"];
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" } };

function AnalyticsPage() {
  const { timeLogs, tasks, notes, brainDump } = useData();
  const m = useMemo(() => {
    const now = new Date(); const sod = new Date(now); sod.setHours(0, 0, 0, 0);
    const sow = new Date(sod); sow.setDate(sod.getDate() - ((sod.getDay() + 6) % 7));
    const som = new Date(sod.getFullYear(), sod.getMonth(), 1);
    const since = (d: Date) => timeLogs.filter((l) => new Date(l.start_time) >= d).reduce((a, l) => a + durMin(l.start_time, l.end_time), 0);
    const totalMin = timeLogs.reduce((a, l) => a + durMin(l.start_time, l.end_time), 0);
    const totalDistr = timeLogs.reduce((a, l) => a + l.total_distractions, 0);
    const curve = timeLogs.map((l) => ({ minutes: Math.round(durMin(l.start_time, l.end_time)), intensity: l.intensity_score })).sort((a, b) => a.minutes - b.minutes);
    // Bucket into 15-minute bands for the average curve
    const bands: Record<number, number[]> = {};
    curve.forEach((c) => { const b = Math.floor(c.minutes / 15) * 15; (bands[b] ||= []).push(c.intensity); });
    const avgCurve = Object.entries(bands).map(([b, v]) => ({ minutes: +b, intensity: +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2) })).sort((a, b) => a.minutes - b.minutes);
    const collapse = avgCurve.find((p, i) => i > 0 && p.intensity < (avgCurve[0]?.intensity ?? 0) - 1);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(sod); d.setDate(sod.getDate() - 13 + i); const e = new Date(d); e.setDate(d.getDate() + 1);
      const ls = timeLogs.filter((l) => new Date(l.start_time) >= d && new Date(l.start_time) < e);
      return { day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), hours: +(ls.reduce((a, l) => a + durMin(l.start_time, l.end_time), 0) / 60).toFixed(2), distractions: ls.reduce((a, l) => a + l.total_distractions, 0) };
    });
    const modes = THOUGHT_MODES.map((t) => ({ name: t, value: notes.filter((n) => n.category_tag === t).length }));
    return {
      today: since(sod), week: since(sow), month: since(som), totalMin, totalDistr,
      dph: totalMin ? totalDistr / (totalMin / 60) : 0,
      done: tasks.filter((t) => t.completed_boolean).length,
      poms: tasks.reduce((a, t) => a + t.completed_pomodoros, 0), est: tasks.reduce((a, t) => a + t.estimated_pomodoros, 0),
      avgInt: timeLogs.length ? timeLogs.reduce((a, l) => a + l.intensity_score, 0) / timeLogs.length : 0,
      goalRate: (() => { const g = timeLogs.filter((l) => l.goal_achieved !== null); return g.length ? (g.filter((l) => l.goal_achieved).length / g.length) * 100 : 0; })(),
      curve, avgCurve, collapse, days, modes,
    };
  }, [timeLogs, tasks, notes]);
  const noteTotal = m.modes.reduce((a, x) => a + x.value, 0);

  return (
    <>
      <PageHeader eyebrow="Tab 07" title="Granular Analytics" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel xl:col-span-2">
          <div className="label-xs">Total Focus Yield</div>
          <div className="mt-3 grid grid-cols-3 gap-4">
            {[["Today", m.today], ["This week", m.week], ["This month", m.month]].map(([l, v]) => (
              <div key={l as string}><div className="mono text-3xl font-bold">{fmtHours(v as number)}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="label-xs">Task Velocity</div>
          <div className="mono mt-3 text-3xl font-bold text-break">{m.done}<span className="text-base text-muted-foreground"> tasks done</span></div>
          <div className="mt-1 text-sm text-muted-foreground">🍅 {m.poms} consumed / {m.est} estimated</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-break" style={{ width: `${m.est ? Math.min(100, (m.poms / m.est) * 100) : 0}%` }} /></div>
        </div>
        <div className="panel" style={{ boxShadow: "var(--glow-focus)" }}>
          <div className="label-xs">Distraction Density Analyzer</div>
          <div className="mono mt-3 text-4xl font-bold text-focus">{m.dph.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Your Average Distractions per Hour</div>
          <div className="mt-1 text-xs text-muted-foreground">{m.totalDistr} in sessions · {brainDump.length} journaled</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Stat label="Sessions logged" value={String(timeLogs.length)} />
        <Stat label="Average intensity" value={m.avgInt.toFixed(2) + " / 5"} />
        <Stat label="Milestone hit rate" value={m.goalRate.toFixed(0) + "%"} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="panel">
          <div className="flex items-baseline justify-between">
            <div><div className="label-xs">Intensity–Duration Curve</div><div className="text-sm text-muted-foreground">Session length (min) vs. logged focus intensity</div></div>
            {m.collapse && <span className="chip bg-focus/15 text-focus">Endurance collapse ≈ {m.collapse.minutes} min</span>}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={m.avgCurve.length ? m.avgCurve : [{ minutes: 0, intensity: 0 }]}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="minutes" type="number" domain={[0, "dataMax"]} stroke="var(--muted-foreground)" fontSize={12} unit="m" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip {...tip} />
                <Line type="monotone" dataKey="intensity" stroke="var(--focus)" strokeWidth={3} dot={{ r: 4, fill: "var(--focus)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="label-xs">Thought Mode Distribution</div>
          <div className="mt-2 h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={noteTotal ? m.modes : [{ name: "No notes", value: 1 }]} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {(noteTotal ? m.modes : [0]).map((_, i) => <Cell key={i} fill={noteTotal ? MODE_COLORS[i] : "var(--muted)"} />)}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {m.modes.map((x, i) => (
              <div key={x.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODE_COLORS[i] }} /><span className="flex-1">[{x.name}]</span>
                <span className="mono">{noteTotal ? ((x.value / noteTotal) * 100).toFixed(1) : "0.0"}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel mt-4">
        <div className="label-xs">14-Day Focus Hours & Distractions</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <BarChart data={m.days}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip {...tip} cursor={{ fill: "var(--accent)" }} />
              <Legend />
              <Bar dataKey="hours" fill="var(--interactive)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="distractions" fill="var(--focus)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="panel-tight px-5"><div className="label-xs">{label}</div><div className="mono mt-1 text-2xl font-bold">{value}</div></div>;
}
