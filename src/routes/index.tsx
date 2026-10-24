import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, RotateCcw, Square, AlertTriangle, Upload, Trash2, Volume2, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/omni/Shell";
import { useTimer, type Mode } from "@/lib/timer";
import { useData, uid, projectById } from "@/lib/store";
import { AMBIENT_TRACKS, playAmbient, stopAmbient, setAmbientVolume, audioDb, fileToDataUrl, type BinauralAudio } from "@/lib/audio";
import { ms } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Focus Command Center · OmniFocus Matrix" },
      { name: "description", content: "Pomodoro engine, ambient audio, binaural breaks and a distraction shield in one focus cockpit." },
      { property: "og:title", content: "Focus Command Center · OmniFocus Matrix" },
      { property: "og:description", content: "Pomodoro engine, ambient audio, binaural breaks and a distraction shield." },
    ],
  }),
  component: FocusPage,
});

const MODE_LABEL: Record<Mode, string> = { work: "Work", short: "Short Break", long: "Long Break" };

function FocusPage() {
  return (
    <>
      <PageHeader eyebrow="Tab 01" title="Focus Command Center" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6"><TimerPanel /><AudioMatrix /><BinauralMatrix /></div>
        <div className="space-y-6"><ContextBinder /><DistractionShield /></div>
      </div>
    </>
  );
}

function TimerPanel() {
  const t = useTimer();
  const total = t.durations[t.mode] * 60;
  const pct = total ? t.remaining / total : 0;
  const R = 130, C = 2 * Math.PI * R;
  const color = t.mode === "work" ? "var(--focus)" : "var(--break)";
  return (
    <div className="panel">
      <div className="flex gap-1 rounded-xl bg-background/60 p-1">
        {(["work", "short", "long"] as Mode[]).map((m) => (
          <button key={m} onClick={() => t.setMode(m)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${t.mode === m ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{MODE_LABEL[m]}</button>
        ))}
      </div>
      <div className="relative mx-auto my-6 h-[300px] w-[300px]">
        <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
          <circle cx="150" cy="150" r={R} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle cx="150" cy="150" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .3s linear", filter: `drop-shadow(0 0 10px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="label-xs" style={{ color }}>{MODE_LABEL[t.mode]} · #{t.workCount + 1}</div>
          <div className="mono mt-1 text-6xl font-bold">{ms(t.remaining)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.running ? "In progress" : "Paused"}</div>
        </div>
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={t.reset} className="btn-ghost" title="Reset"><RotateCcw className="h-4 w-4" /></button>
        {t.running
          ? <button onClick={t.pause} className="btn-blue w-36"><Pause className="h-4 w-4" />Pause</button>
          : <button onClick={t.start} className={t.mode === "work" ? "btn-focus w-36" : "btn-break w-36"}><Play className="h-4 w-4" />Play</button>}
        <button onClick={t.skip} className="btn-ghost" title="Skip cycle"><SkipForward className="h-4 w-4" /></button>
        <button onClick={t.endEarly} disabled={t.mode !== "work" || !t.sessionStartedAt} className="btn-ghost" title="End session & reflect"><Square className="h-4 w-4" />End</button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(["work", "short", "long"] as Mode[]).map((m) => (
          <label key={m} className="block">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">{MODE_LABEL[m]}</span><span className="mono">{t.durations[m]}m</span></div>
            <input type="range" min={1} max={180} value={t.durations[m]} onChange={(e) => t.setDuration(m, +e.target.value)} className="mt-2 w-full" />
          </label>
        ))}
      </div>
    </div>
  );
}

function AudioMatrix() {
  const { settings, setSettings } = useData();
  const toggle = (id: string) => {
    if (settings.ambientTrack === id) { stopAmbient(); setSettings({ ambientTrack: null }); }
    else { playAmbient(id, settings.volume); setSettings({ ambientTrack: id }); }
  };
  useEffect(() => () => { /* keep playing across tabs */ }, []);
  return (
    <div className="panel">
      <div className="mb-3 flex items-center justify-between"><div className="label-xs">Integrated Audio Matrix</div><Volume2 className="h-4 w-4 text-muted-foreground" /></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AMBIENT_TRACKS.map((tr) => (
          <button key={tr.id} onClick={() => toggle(tr.id)} className={settings.ambientTrack === tr.id ? "btn-blue" : "btn-ghost"}>{tr.label}</button>
        ))}
      </div>
      <input type="range" min={0} max={1} step={0.01} value={settings.volume} onChange={(e) => { setSettings({ volume: +e.target.value }); setAmbientVolume(+e.target.value); }} className="mt-4 w-full" />
    </div>
  );
}

function BinauralMatrix() {
  const { settings, setSettings } = useData();
  const mode = useTimer((s) => s.mode);
  const running = useTimer((s) => s.running);
  const [files, setFiles] = useState<BinauralAudio[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => audioDb.all().then(setFiles);
  useEffect(() => { void refresh(); }, []);
  const onUpload = async (f?: File) => {
    if (!f) return;
    if (!/\.(mp3|wav)$/i.test(f.name)) { toast.error("Please upload an .mp3 or .wav file"); return; }
    const rec = { id: uid(), file_name: f.name, data_url_string: await fileToDataUrl(f) };
    await audioDb.put(rec); setSettings({ binauralId: rec.id }); void refresh(); toast.success("Binaural track saved offline");
  };
  const active = mode !== "work" && running && settings.binauralAutoplay && settings.binauralId;
  return (
    <div className={`panel transition ${mode !== "work" ? "border-break/40" : ""}`} style={mode !== "work" ? { boxShadow: "var(--glow-break)" } : undefined}>
      <div className="flex items-center justify-between">
        <div className="label-xs">Custom Binaural Beats Break Matrix</div>
        <span className={`chip ${active ? "bg-break/15 text-break" : "bg-muted text-muted-foreground"}`}><Headphones className="h-3 w-3" />{active ? "Playing" : mode === "work" ? "Standby" : "Break"}</span>
      </div>
      <button onClick={() => input.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-input py-5 text-sm text-muted-foreground transition hover:border-interactive hover:text-foreground"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onUpload(e.dataTransfer.files[0]); }}>
        <Upload className="h-4 w-4" />Import Custom Binaural Beats (.mp3/.wav)
      </button>
      <input ref={input} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" hidden onChange={(e) => void onUpload(e.target.files?.[0])} />
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f) => (
            <div key={f.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${settings.binauralId === f.id ? "bg-break/10 text-break" : "bg-background/50"}`}>
              <input type="radio" checked={settings.binauralId === f.id} onChange={() => setSettings({ binauralId: f.id })} />
              <span className="flex-1 truncate">{f.file_name}</span>
              <button className="btn-icon" onClick={async () => { await audioDb.del(f.id); if (settings.binauralId === f.id) setSettings({ binauralId: null }); void refresh(); }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <label className="mt-4 flex items-center justify-between gap-4 text-sm">
        <span>Autoplay custom binaural beats as soon as break starts</span>
        <Switch checked={settings.binauralAutoplay} onCheckedChange={(v) => setSettings({ binauralAutoplay: v })} />
      </label>
    </div>
  );
}

function ContextBinder() {
  const { tasks, projects } = useData();
  const { activeTaskId, activeTargetTitle, setActiveTask } = useTimer();
  const task = tasks.find((t) => t.id === activeTaskId);
  const proj = projectById(projects, task?.project_id);
  return (
    <div className="panel">
      <div className="label-xs mb-3">Active Context Binder</div>
      {task || activeTargetTitle ? (
        <div className="flex items-center gap-3">
          <span className="h-10 w-1.5 rounded-full" style={{ background: proj?.color_hex ?? "var(--interactive)" }} />
          <div className="min-w-0">
            <div className="truncate text-xl font-bold">{task?.title ?? activeTargetTitle}</div>
            <div className="text-xs text-muted-foreground">{proj?.name ?? "Timeline target"}{task ? ` · 🍅 ${task.completed_pomodoros}/${task.estimated_pomodoros}` : ""}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-warn/10 px-3 py-2.5 text-sm font-semibold text-warn"><AlertTriangle className="h-4 w-4" />No Active Focus Target Selected</div>
      )}
      <select className="field mt-4" value={activeTaskId ?? ""} onChange={(e) => setActiveTask(e.target.value || null)}>
        <option value="">— Select a task from the Task Hub —</option>
        {tasks.filter((t) => !t.completed_boolean).map((t) => <option key={t.id} value={t.id}>{t.daily_grouping_bucket} · {t.title}</option>)}
      </select>
    </div>
  );
}

function DistractionShield() {
  const { add, brainDump, tasks } = useData();
  const { sessionDistractions, addDistraction, activeTaskId, activeTargetTitle } = useTimer();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  const taskTitle = tasks.find((t) => t.id === activeTaskId)?.title ?? activeTargetTitle ?? "No active target";
  const save = () => {
    if (text.trim()) add("brainDump", { id: uid(), timestamp: new Date().toISOString(), raw_thought_text: text.trim(), core_category: "Uncategorized", task_title: taskTitle });
    setText(""); setOpen(false);
  };
  return (
    <div className="panel">
      <div className="mb-3 flex items-center justify-between">
        <div className="label-xs">Engross Distraction Shield</div>
        <div className="text-sm">Distractions tracking this session: <span className="mono font-bold text-focus">{sessionDistractions}</span></div>
      </div>
      <button onClick={() => { addDistraction(); setOpen(true); }}
        className="w-full rounded-2xl bg-focus px-6 py-10 text-xl font-extrabold tracking-wide text-primary-foreground transition hover:brightness-110 active:scale-[0.99]"
        style={{ boxShadow: "var(--glow-focus)" }}>
        REPORT DISTRACTION / MY MIND WANDERED
      </button>
      <div className={`grid transition-all duration-300 ${open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <label className="text-sm text-muted-foreground">Capture the exact intrusive thought to eject it from your head:</label>
          <input ref={ref} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}
            className="field mt-2" placeholder="Type and press Enter…" />
        </div>
      </div>
      <div className="mt-6">
        <div className="label-xs mb-2">Recent Brain Dump</div>
        <div className="space-y-1.5">
          {brainDump.slice(0, 6).map((d) => (
            <div key={d.id} className="flex gap-3 rounded-lg bg-background/50 px-3 py-2 text-sm">
              <span className="mono shrink-0 text-xs text-muted-foreground">{new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="truncate">{d.raw_thought_text}</span>
            </div>
          ))}
          {!brainDump.length && <div className="text-sm text-muted-foreground">Nothing captured yet.</div>}
        </div>
      </div>
    </div>
  );
}
