import { useTabs } from "@/lib/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Timer, Watch, PenLine, Target } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/omni/Shell";
import { useData, uid, projectById, type Method } from "@/lib/store";
import { useTimer } from "@/lib/timer";
import { pad } from "@/lib/format";



const ROW = 30; // px per 30 minutes
const ICON: Record<Method, typeof Timer> = { Pomodoro: Timer, Stopwatch: Watch, Manual: PenLine };
const toHM = (min: number) => `${pad(min / 60)}:${pad(min % 60)}`;

export function CalendarPage() {
  const { timeLogs, projects, add } = useData();
  const setTarget = useTimer((s) => s.setTarget);
  const setTab = useTabs((s) => s.setTab);
  const [day, setDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [slot, setSlot] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", project: "", start: "09:00", end: "09:30" });

  const dayStart = day.getTime(), dayEnd = dayStart + 86400000;
  const logs = timeLogs.filter((l) => new Date(l.end_time).getTime() > dayStart && new Date(l.start_time).getTime() < dayEnd);
  const shift = (n: number) => setDay((d) => new Date(d.getTime() + n * 86400000));
  const nowMin = (Date.now() - dayStart) / 60000;

  const openSlot = (i: number) => { setSlot(i); setForm({ title: "", project: projects[0]?.id ?? "", start: toHM(i * 30), end: toHM(Math.min(1439, i * 30 + 30)) }); };
  const saveManual = () => {
    const [sh = 0, sm = 0] = form.start.split(":").map(Number); const [eh = 0, em = 0] = form.end.split(":").map(Number);
    const s = dayStart + (sh * 60 + sm) * 60000, e = dayStart + (eh * 60 + em) * 60000;
    if (!form.title.trim() || e <= s) { toast.error("Add a title and an end time after the start"); return; }
    add("timeLogs", { id: uid(), task_id: null, project_id: form.project || null, title: form.title.trim(), category_string: "Manual", start_time: new Date(s).toISOString(), end_time: new Date(e).toISOString(), method_used: "Manual", total_distractions: 0, intensity_score: 3, final_reflection_text: "Retroactively logged", goal_achieved: null });
    setSlot(null); toast.success("Historical block added");
  };
  const startLive = () => {
    setTarget(form.title.trim() || `Timeline block ${form.start}`);
    setSlot(null); setTab("focus");
  };

  return (
    <>
      <PageHeader eyebrow="Tab 03" title="Interactive Timeline">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="btn-ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-48 text-center font-semibold">{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
          <Button variant="ghost" className="btn-ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" className="btn-blue" onClick={() => setDay(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })}>Today</Button>
        </div>
      </PageHeader>
      <div className="panel !p-0 overflow-hidden">
        <div className="relative" style={{ height: 48 * ROW }}>
          {Array.from({ length: 48 }, (_, i) => (
            <div key={i} onClick={() => openSlot(i)} className={`absolute left-0 right-0 flex cursor-pointer border-t transition hover:bg-interactive/5 ${i % 2 ? "border-border/40 border-dashed" : "border-border"}`} style={{ top: i * ROW, height: ROW }}>
              <div className="mono w-16 shrink-0 pl-3 pt-1 text-[11px] text-muted-foreground">{i % 2 === 0 ? toHM(i * 30) : ""}</div>
            </div>
          ))}
          {nowMin > 0 && nowMin < 1440 && <div className="pointer-events-none absolute left-16 right-0 z-20 h-px bg-focus" style={{ top: (nowMin / 30) * ROW }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-focus" /></div>}
          {logs.map((l) => {
            const s = Math.max(0, (new Date(l.start_time).getTime() - dayStart) / 60000);
            const e = Math.min(1440, (new Date(l.end_time).getTime() - dayStart) / 60000);
            const p = projectById(projects, l.project_id); const Icon = ICON[l.method_used];
            const c = p?.color_hex ?? "#3B82F6";
            return (
              <div key={l.id} className="absolute left-20 right-4 z-10 overflow-hidden rounded-lg border-l-4 px-3 py-1 text-xs" title={l.final_reflection_text}
                style={{ top: (s / 30) * ROW + 1, height: Math.max(22, ((e - s) / 30) * ROW - 2), borderColor: c, background: `color-mix(in oklab, ${c} 22%, var(--card))` }}>
                <div className="flex items-center gap-1.5 font-semibold"><Icon className="h-3 w-3" />{l.title}<span className="ml-auto mono text-muted-foreground">{toHM(Math.round(s))}–{toHM(Math.round(e))}</span></div>
                <div className="text-muted-foreground">{p?.name ?? "No project"} · {l.method_used} · intensity {l.intensity_score}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={slot !== null} onOpenChange={(o) => !o && setSlot(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle>Slot {form.start}</DialogTitle></DialogHeader>
          <input className="field" placeholder="Title / objective" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="rounded-xl border border-border p-4">
            <div className="label-xs mb-3">Option 1 · Add Historical Block</div>
            <select className="field" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="time" className="field" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              <input type="time" className="field" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <Button variant="ghost" className="btn-blue mt-3 w-full" onClick={saveManual}><PenLine className="h-4 w-4" />Log block</Button>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="label-xs mb-3">Option 2 · Initiate Live Focus Session</div>
            <Button variant="ghost" className="btn-focus w-full" onClick={startLive}><Target className="h-4 w-4" />Load as focus target</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
