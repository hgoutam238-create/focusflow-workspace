import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sigma, X, Plus, Trash2, Zap, FileText, LifeBuoy, RotateCw, Check, ChevronRight } from "lucide-react";
import { useTimer } from "@/lib/timer";
import { useData, uid } from "@/lib/store";
import { useTabs } from "@/lib/tabs";
import { chime, playAmbient, stopAmbient } from "@/lib/audio";
import { enduranceThreshold, fatigueState, pingDelayMs, RECOVERY_BREAK_MIN } from "@/lib/energy";
import { buildWeeklyLedger } from "@/lib/ledger";
import { deckFor } from "@/lib/flashcards";
import { pad, ms } from "@/lib/format";

export const openShield = () => { useTabs.getState().setTab("focus"); window.dispatchEvent(new CustomEvent("omni:open-shield")); };

/* ---------- Hyper-Focus Mode ---------- */
export function HyperFocusToggle() {
  const on = useData((s) => s.settings.hyperFocus);
  const setSettings = useData((s) => s.setSettings);
  return <label className="panel-tight flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-focus" />Hyper-Focus Mode</span><Switch checked={on} onCheckedChange={(hyperFocus) => setSettings({ hyperFocus })} /></label>;
}

export function HyperFocusOverlay() {
  const { hyperFocus, volume, muted, ambientMix } = useData((s) => s.settings);
  const setSettings = useData((s) => s.setSettings);
  const { tasks } = useData();
  const t = useTimer();
  const [pulse, setPulse] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hyperFocus) return;
    let raf = 0; const loop = () => { setNow(Date.now()); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hyperFocus]);
  useEffect(() => { if (!hyperFocus && pulse) { stopAmbient("pulse"); setPulse(false); } }, [hyperFocus, pulse]);
  if (!hyperFocus) return null;
  const left = t.running && t.endAt ? Math.max(0, t.endAt - now) : t.remaining * 1000;
  const msPart = Math.floor(left % 1000);
  const task = tasks.find((x) => x.id === t.activeTaskId);
  const color = t.mode === "work" ? "text-focus" : "text-break";
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background animate-in fade-in" role="dialog" aria-label="Hyper-Focus Mode">
      <div className="label-xs text-muted-foreground">Hyper-Focus · {t.mode === "work" ? "Work block" : "Break"}</div>
      <div className="mt-3 max-w-3xl px-6 text-center text-2xl font-bold">{task?.title ?? t.activeTargetTitle ?? "No Active Focus Target Selected"}</div>
      <div className={`mono mt-8 flex items-baseline font-bold ${color}`}>
        <span className="text-[min(18vw,11rem)] leading-none">{ms(Math.ceil(left / 1000) - (msPart ? 1 : 0))}</span>
        <span className="ml-2 w-[4ch] text-[min(6vw,3.5rem)] opacity-80">.{String(msPart).padStart(3, "0")}</span>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {t.running ? <Button variant="ghost" className="btn-ghost" onClick={t.pause}>Pause</Button> : <Button variant="ghost" className="btn-focus" onClick={t.start}>Play</Button>}
        <Button variant="ghost" className={pulse ? "btn-blue" : "btn-ghost"} onClick={() => { if (pulse) stopAmbient("pulse"); else playAmbient("pulse", (ambientMix["pulse"] ?? 0.35) * (muted ? 0 : volume * 2)); setPulse(!pulse); }}>Adrenaline Pulse {pulse ? "on" : "off"}</Button>
        <Button variant="ghost" className="btn-ghost" onClick={() => setSettings({ hyperFocus: false })}><X className="h-4 w-4" />Exit</Button>
      </div>
    </div>
  );
}

/* ---------- Fatigue Forecaster (sidebar gauge) ---------- */
export function FatigueGauge() {
  const logs = useData((s) => s.timeLogs);
  const { mode, running, sessionStartedAt } = useTimer();
  useTimer((s) => s.heartbeat);
  const threshold = useMemo(() => enduranceThreshold(logs).minutes, [logs]);
  if (mode !== "work" || !running || !sessionStartedAt) return null;
  const elapsed = (Date.now() - sessionStartedAt) / 60000;
  const f = fatigueState(elapsed, threshold);
  if (!f.show) return null;
  return (
    <div className={`panel-tight ${f.warn ? "border-warn/60" : ""}`}>
      <div className="flex justify-between text-xs"><span className="label-xs">Cognitive Fuel Level</span><span className={`mono font-bold ${f.warn ? "text-warn" : "text-break"}`}>{f.fuel}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full transition-all ${f.warn ? "bg-warn animate-pulse" : "bg-break"}`} style={{ width: `${f.fuel}%` }} /></div>
      {f.warn && <p className="mt-2 text-[11px] leading-snug text-warn">Cognitive depletion incoming in {Math.max(0, Math.round(threshold - elapsed))} minutes. Stand up for 60 seconds or increase focus intensity right now to break the plateau.</p>}
    </div>
  );
}

/* ---------- Mindfulness Ping ---------- */
export function MindfulnessToggle() {
  const on = useData((s) => s.settings.mindfulnessPing);
  const setSettings = useData((s) => s.setSettings);
  return <label className="panel-tight flex items-center justify-between gap-3 text-sm"><span><span className="font-semibold">Mindfulness Ping</span><span className="block text-xs text-muted-foreground">Soft chime every 12–18 min during work timers</span></span><Switch checked={on} onCheckedChange={(mindfulnessPing) => setSettings({ mindfulnessPing })} /></label>;
}

export function MindfulnessController() {
  const on = useData((s) => s.settings.mindfulnessPing);
  const active = useTimer((s) => s.mode === "work" && s.running);
  const beat = useTimer((s) => s.heartbeat);
  const next = useRef<number | null>(null);
  useEffect(() => {
    if (!on || !active) { next.current = null; return; }
    if (!next.current) { next.current = Date.now() + pingDelayMs(); return; }
    if (Date.now() >= next.current) {
      next.current = Date.now() + pingDelayMs();
      chime();
      toast("Are you actively working right now?", { duration: 15000, action: { label: "No", onClick: openShield }, cancel: { label: "Yes", onClick: () => undefined } });
    }
  }, [on, active, beat]);
  return null;
}

/* ---------- Stuck Matrix ---------- */
export function StuckButton() {
  const open = useTimer((s) => s.openStuck);
  return <Button variant="outline" onClick={open} className="h-14 w-full border-warn/50 text-base font-extrabold tracking-wide text-warn hover:bg-warn/10 hover:text-warn"><LifeBuoy />I AM STUCK / BLOCKED</Button>;
}

const STEPS = [
  { title: "The Parameter Check", prompt: "Write down the exact variable or physical property you are trying to find." },
  { title: "The Inversion Principle", prompt: "State what information you currently have, and what formula bridges the gap." },
  { title: "The Feynman Check", prompt: "Explain the blocker to a 10-year-old in one sentence inside this box." },
];

export function StuckModal() {
  const { stuck, closeStuck, activeTaskId, activeTargetTitle } = useTimer();
  useTimer((s) => s.heartbeat);
  const { tasks, projects, add } = useData();
  const [answers, setAnswers] = useState(["", "", ""]);
  if (!stuck.open) return null;
  const left = Math.max(0, Math.ceil(((stuck.endsAt ?? 0) - Date.now()) / 1000));
  const filled = answers.every((a) => a.trim());
  const task = tasks.find((t) => t.id === activeTaskId);
  const projectId = task?.project_id ?? projects[0]?.id ?? "";
  const finish = (schedule: boolean) => {
    const raw = `# Stuck protocol · ${task?.title ?? activeTargetTitle ?? "Problem"}\n\n${STEPS.map((s, i) => `**${i + 1}. ${s.title}:** ${answers[i]}`).join("\n\n")}\n\n**4. Alternative Path:** ${schedule ? "Scheduled a Review Block and moved on." : "Resolved within the protocol."}`;
    const now = new Date().toISOString();
    add("notes", { id: uid(), project_id: projectId, title: `Stuck: ${(answers[0] ?? "").slice(0, 60)}`, raw_content: raw, markdown_html: "", created_at: now, updated_at: now, category_tag: "Action Plan", absolute_privacy_flag: false });
    if (schedule) {
      add("tasks", { id: uid(), project_id: projectId, title: `Review Block: ${(answers[0] ?? "").slice(0, 80)}`, notes: raw, priority_level: "High", due_date: "", completed_boolean: false, estimated_pomodoros: 1, completed_pomodoros: 0, daily_grouping_bucket: "Tomorrow" });
      toast.success("Review Block scheduled for tomorrow — next question!");
    } else toast.success("Blocker broken. Back to work.");
    setAnswers(["", "", ""]); closeStuck();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/90 p-6 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-label="Stuck protocol" className="w-full max-w-xl rounded-3xl border border-warn/40 bg-card p-7 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between"><div className="label-xs text-warn">Friction Break-Loop · timer frozen</div><div className={`mono text-2xl font-bold ${left < 60 ? "text-focus" : "text-warn"}`}>{pad(left / 60)}:{pad(left % 60)}</div></div>
        <h2 className="mt-2 text-2xl font-extrabold">4-Step Cognitive Reset</h2>
        {STEPS.map((s, i) => (
          <label key={s.title} className="mt-5 block">
            <span className="text-sm font-semibold">Step {i + 1}: {s.title}</span>
            <span className="block text-xs text-muted-foreground">{s.prompt}</span>
            <textarea rows={2} className="field mt-2 resize-none" value={answers[i]} onChange={(e) => setAnswers(answers.map((a, k) => (k === i ? e.target.value : a)))} />
          </label>
        ))}
        <div className="mt-5 rounded-xl bg-warn/10 p-3 text-sm"><span className="font-semibold">Step 4: The Alternative Path</span><span className="block text-xs text-muted-foreground">If you cannot solve this in 3 minutes, schedule it for an automated "Review Block" later and move to the next question immediately.</span></div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="ghost" className="btn-ghost" onClick={() => { setAnswers(["", "", ""]); closeStuck(); }}>Cancel</Button>
          <Button variant="ghost" className="btn-break flex-1" disabled={!filled} onClick={() => finish(false)}><Check />Solved — resume</Button>
          <Button variant="ghost" className="btn-blue flex-1" disabled={!filled} onClick={() => finish(true)}><ChevronRight />Schedule Review Block</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Recovery banner ---------- */
export function RecoveryBanner() {
  const active = useTimer((s) => s.recoveryActive && s.mode !== "work");
  const next = useTimer((s) => s.recoveryNext);
  if (!active && !next) return null;
  return (
    <div className="panel border-break/50 animate-pulse" style={{ boxShadow: "var(--glow-break)" }}>
      <div className="label-xs text-break">{active ? "Deep Oxygen / Caloric Reload Break" : "Next break upgraded"}</div>
      <p className="mt-1 text-sm">Three 90-minute blocks at intensity 5 — your next break is a mandatory {RECOVERY_BREAK_MIN} minutes.</p>
      <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground"><li>Drink 400–500 ml of water with a pinch of salt or an electrolyte tab</li><li>Eat slow carbs + protein (banana with nuts, yoghurt, oats)</li><li>Walk or do 2 minutes of squats and shoulder rolls; get daylight</li><li>No screens — breathe 4-7-8 for three rounds</li></ul>
    </div>
  );
}

/* ---------- Formula HUD ---------- */
export function FormulaHud() {
  const [open, setOpen] = useState(false);
  const formulas = useData((s) => s.settings.formulas);
  const setSettings = useData((s) => s.setSettings);
  const edit = (id: string, patch: Partial<(typeof formulas)[number]>) => setSettings({ formulas: formulas.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  return (
    <>
      <Button aria-label="Formula HUD" title="Formula HUD" onClick={() => setOpen(!open)} className="fixed bottom-24 right-6 z-[45] h-12 w-12 rounded-full bg-interactive p-0 text-primary-foreground shadow-lg hover:bg-interactive/90" style={{ boxShadow: "var(--glow-blue, 0 0 20px var(--interactive))" }}><Sigma /></Button>
      <aside aria-label="Formula HUD panel" className={`fixed right-0 top-0 z-[44] flex h-full w-[min(26rem,92vw)] flex-col border-l border-border bg-card/80 p-5 backdrop-blur-xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between"><div><div className="label-xs">Formula HUD</div><div className="text-lg font-bold">Live formula matrix</div></div><Button variant="ghost" size="icon" aria-label="Close Formula HUD" onClick={() => setOpen(false)}><X /></Button></div>
        <div className="mt-4 grid grid-cols-[1fr_1.4fr_0.8fr_auto] gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><span>Name</span><span>Equation / value</span><span>Units</span><span /></div>
        <div className="mt-1 flex-1 space-y-1.5 overflow-y-auto">
          {formulas.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_1.4fr_0.8fr_auto] gap-1.5">
              <input aria-label="Formula name" className="field !bg-background/40 !px-2 text-xs" value={f.name} onChange={(e) => edit(f.id, { name: e.target.value })} />
              <input aria-label="Equation" className="field mono !bg-background/40 !px-2 text-xs" value={f.expression} onChange={(e) => edit(f.id, { expression: e.target.value })} />
              <input aria-label="Units" className="field mono !bg-background/40 !px-2 text-xs" value={f.units} onChange={(e) => edit(f.id, { units: e.target.value })} />
              <Button variant="ghost" size="icon" aria-label="Delete formula" onClick={() => setSettings({ formulas: formulas.filter((x) => x.id !== f.id) })}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {!formulas.length && <p className="text-sm text-muted-foreground">Add your critical equations, constants and conversion factors.</p>}
        </div>
        <Button variant="ghost" className="btn-blue mt-3" onClick={() => setSettings({ formulas: [...formulas, { id: uid(), name: "", expression: "", units: "" }] })}><Plus />Add row</Button>
      </aside>
    </>
  );
}

/* ---------- Markdown Ledger ---------- */
export function exportLedger() {
  const { notes, timeLogs, projects } = useData.getState();
  const { filename, markdown } = buildWeeklyLedger({ notes, timeLogs, projects });
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const LedgerIcon = FileText;

/* ---------- Flashcard deck ---------- */
export function FlashcardDeck({ projectId }: { projectId: string }) {
  const notes = useData((s) => s.notes);
  const projects = useData((s) => s.projects);
  const deck = useMemo(() => deckFor(notes, projectId), [notes, projectId]);
  const [i, setI] = useState(0); const [flip, setFlip] = useState(false); const [known, setKnown] = useState(0);
  useEffect(() => { setI(0); setFlip(false); setKnown(0); }, [projectId, deck.length]);
  const card = deck[i % Math.max(1, deck.length)];
  const name = projects.find((p) => p.id === projectId)?.name ?? "Project";
  const go = (k: boolean) => { if (k) setKnown(known + 1); setFlip(false); setI(i + 1); };
  return (
    <div className="panel">
      <div className="flex items-center justify-between"><div className="label-xs">Active Flashcard Deck · {name}</div><span className="chip bg-interactive/15 text-interactive">{deck.length} cards{deck.length ? ` · ${known} known` : ""}</span></div>
      {card ? (
        <>
          <button type="button" onClick={() => setFlip(!flip)} className="mt-3 grid min-h-32 w-full place-items-center rounded-xl border border-border bg-background/50 p-5 text-center transition hover:border-interactive/50">
            <div><div className="label-xs mb-2">{flip ? "Answer" : "Question"} · {(i % deck.length) + 1}/{deck.length}</div><div className={`text-lg font-semibold ${flip ? "mono text-break" : ""}`}>{flip ? card.answer : card.question}</div><div className="mt-2 text-[10px] text-muted-foreground">from “{card.noteTitle}” · click to flip</div></div>
          </button>
          <div className="mt-3 flex gap-2"><Button variant="ghost" className="btn-focus flex-1" onClick={() => go(false)}><RotateCw />Again</Button><Button variant="ghost" className="btn-break flex-1" onClick={() => go(true)}><Check />Got it</Button></div>
        </>
      ) : <p className="mt-2 text-sm text-muted-foreground">Write lines like <code className="mono">Q: What is Faraday's Law? || A: E = -dΦ/dt</code> in this project's notes to build the deck.</p>}
    </div>
  );
}
