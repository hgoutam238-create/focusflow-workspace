import type { Note, Project, TimeLog } from "./store";
import { durMin } from "./format";

export function weekStart(now: Date) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d;
}

export function buildWeeklyLedger(data: { notes: Note[]; timeLogs: TimeLog[]; projects: Project[] }, now = new Date()) {
  const start = weekStart(now); const end = new Date(start); end.setDate(start.getDate() + 7);
  const inWeek = (iso: string) => { const t = new Date(iso); return t >= start && t < end; };
  const pname = (id: string | null) => data.projects.find((p) => p.id === id)?.name ?? "No project";
  const logs = data.timeLogs.filter((l) => inWeek(l.start_time)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const notes = data.notes.filter((n) => inWeek(n.updated_at)).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const total = logs.reduce((a, l) => a + durMin(l.start_time, l.end_time), 0);
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const out = [`# Weekly Journal · Week of ${start.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, "",
    `**Tracked:** ${(total / 60).toFixed(1)}h across ${logs.length} sessions · **Notes touched:** ${notes.length}`, ""];
  const days = [...new Set(logs.map((l) => day(l.start_time)))];
  out.push("## Time Log & Reflections", "");
  if (!days.length) out.push("_No sessions logged this week._", "");
  days.forEach((d) => {
    out.push(`### ${d}`, "");
    logs.filter((l) => day(l.start_time) === d).forEach((l) => {
      out.push(`- **${time(l.start_time)}–${time(l.end_time)}** · ${l.title} _(${pname(l.project_id)}, ${l.method_used}, ${Math.round(durMin(l.start_time, l.end_time))} min)_`);
      if (l.intensity_score) out.push(`  - Intensity ${l.intensity_score}/5 · Milestone ${l.goal_achieved === null ? "n/a" : l.goal_achieved ? "achieved" : "missed"} · ${l.total_distractions} distractions`);
      if (l.final_reflection_text) out.push(`  - > ${l.final_reflection_text.replace(/\n/g, " ")}`);
    });
    out.push("");
  });
  out.push("## Notes", "");
  if (!notes.length) out.push("_No notes updated this week._", "");
  notes.forEach((n) => {
    out.push(`### ${n.title}`, `_${pname(n.project_id)} · ${n.category_tag} · updated ${day(n.updated_at)} ${time(n.updated_at)}_`, "",
      n.absolute_privacy_flag ? "_(Private note — content withheld)_" : n.raw_content, "");
  });
  return { filename: `omnifocus_week_${start.toISOString().slice(0, 10)}.md`, markdown: out.join("\n") };
}
