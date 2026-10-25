import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTimer } from "@/lib/timer";
import { useData, uid } from "@/lib/store";
import { audioDb, beep } from "@/lib/audio";

/** Global ticker + binaural break automation + reflection modal. */
export function Engine() {
  const tick = useTimer((s) => s.tick);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { tick(); force((x) => x + 1); }, 250);
    const onCd = () => { beep(); toast.success("Countdown complete"); };
    const onBreak = () => { beep(); toast("Break over — time to focus."); };
    window.addEventListener("omni:countdown-done", onCd);
    window.addEventListener("omni:break-done", onBreak);
    return () => { clearInterval(t); window.removeEventListener("omni:countdown-done", onCd); window.removeEventListener("omni:break-done", onBreak); };
  }, [tick]);

  const pendingAt = useTimer((s) => s.pending?.end);
  useEffect(() => { if (pendingAt) beep(); }, [pendingAt]);

  return <><BinauralController /><ReflectionModal /></>;
}

function BinauralController() {
  const mode = useTimer((s) => s.mode);
  const running = useTimer((s) => s.running);
  const { binauralAutoplay, binauralId, volume } = useData((s) => s.settings);
  const el = useRef<HTMLAudioElement | null>(null);
  const loaded = useRef<string | null>(null);
  const isBreak = mode !== "work" && running;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!el.current) { el.current = new Audio(); el.current.loop = true; }
      const a = el.current;
      if (isBreak && binauralAutoplay && binauralId) {
        if (loaded.current !== binauralId) {
          const rec = await audioDb.get(binauralId);
          if (!rec || cancelled) return;
          a.src = rec.data_url_string; loaded.current = binauralId;
        }
        a.volume = volume; a.play().catch(() => toast.error("Click anywhere to allow audio playback"));
      } else { a.pause(); a.currentTime = 0; }
    })();
    return () => { cancelled = true; };
  }, [isBreak, binauralAutoplay, binauralId, volume]);
  return null;
}

function ReflectionModal() {
  const pending = useTimer((s) => s.pending);
  const after = useTimer((s) => s.afterReflection);
  const { tasks, add, update } = useData();
  const [intensity, setIntensity] = useState(3);
  const [goal, setGoal] = useState<boolean | null>(null);
  const [summary, setSummary] = useState("");
  if (!pending) return null;
  const task = tasks.find((t) => t.id === pending.taskId);
  const minutes = Math.round((pending.end - pending.start) / 60000);
  const ok = goal !== null && summary.trim().length > 0;

  const submit = () => {
    if (!ok) return;
    add("timeLogs", {
      id: uid(), task_id: task?.id ?? null, project_id: task?.project_id ?? pending.projectId,
      title: task?.title ?? (pending.title || "Focus block"), category_string: pending.method === "Pomodoro" ? "Focus" : "Tracking",
      start_time: new Date(pending.start).toISOString(), end_time: new Date(pending.end).toISOString(),
      method_used: pending.method, total_distractions: pending.distractions, intensity_score: intensity,
      final_reflection_text: summary.trim(), goal_achieved: goal,
    });
    if (task && pending.method === "Pomodoro" && pending.fullPomodoro) update("tasks", task.id, { completed_pomodoros: task.completed_pomodoros + 1 });
    setIntensity(3); setGoal(null); setSummary("");
    toast.success(`Logged ${minutes} min`);
    after();
  };
  const labels = ["", "Brain fog", "Scattered", "Steady", "Locked in", "Flow state"];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-6 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-2xl animate-in zoom-in-95">
        <div className="label-xs text-interactive">Session complete · {minutes} min · {pending.method}</div>
        <h2 className="mt-2 text-2xl font-extrabold">Reflect before you log</h2>
        <p className="mt-1 text-sm text-muted-foreground">{task?.title ?? pending.title ?? "Untitled block"}{pending.distractions ? ` · ${pending.distractions} distractions` : ""}</p>

        <div className="mt-7">
          <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">1. Intensity Matrix</span><span className="mono text-sm text-interactive">{intensity} · {labels[intensity]}</span></div>
          <input type="range" min={1} max={5} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="mt-3 w-full" />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>1 · Completely distracted</span><span>5 · Hyper-focus</span></div>
        </div>
        <div className="mt-6">
          <div className="text-sm font-semibold">2. Did you achieve your intended milestone for this block?</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setGoal(true)} className={goal === true ? "btn-break" : "btn-ghost"}>Yes</button>
            <button onClick={() => setGoal(false)} className={goal === false ? "btn-focus" : "btn-ghost"}>No</button>
          </div>
        </div>
        <div className="mt-6">
          <label className="text-sm font-semibold">3. Quick Summary / Lessons Learned from this block</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="field mt-3 resize-none" placeholder="What moved forward? What got in the way?" />
        </div>
        <div className="mt-7 flex gap-2">
          <button onClick={() => { useTimer.setState({ pending: null }); }} className="btn-ghost">Discard</button>
          <button onClick={submit} disabled={!ok} className="btn-blue flex-1">Log session</button>
        </div>
      </div>
    </div>
  );
}
