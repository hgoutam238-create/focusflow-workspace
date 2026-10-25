import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Bold, Italic, Heading1, Heading2, Heading3, Code, FileCode, List, AlertTriangle, Star, Lock, Unlock, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/omni/Shell";
import { useData, uid, THOUGHT_MODES, projectById, type ThoughtMode, type Note } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Power-Note Lab · OmniFocus Matrix" },
      { name: "description", content: "Markdown notes segregated by project and thought mode." },
      { property: "og:title", content: "Power-Note Lab · OmniFocus Matrix" },
      { property: "og:description", content: "Markdown notes segregated by project and thought mode." },
    ],
  }),
  component: NotesPage,
});

export const MODE_STYLE: Record<ThoughtMode, string> = {
  "Study/Theory": "bg-interactive/15 text-interactive",
  "Fleeting Thought": "bg-warn/15 text-warn",
  "Deep Reflection": "bg-chart-5/15 text-chart-5",
  "Action Plan": "bg-break/15 text-break",
};

function NotesPage() {
  const { notes, projects, add, update, remove } = useData();
  const [sel, setSel] = useState<string | null>(notes[0]?.id ?? null);
  const [pf, setPf] = useState(""); const [mf, setMf] = useState(""); const [q, setQ] = useState("");
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const list = useMemo(() => [...notes]
    .filter((n) => (!pf || n.project_id === pf) && (!mf || n.category_tag === mf) && (!q || (n.title + n.raw_content).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [notes, pf, mf, q]);
  const note = notes.find((n) => n.id === sel);

  const create = () => {
    const now = new Date().toISOString(); const id = uid();
    const raw = "# New note\n\nStart writing…";
    add("notes", { id, project_id: pf || projects[0]?.id || "", title: "Untitled note", raw_content: raw, markdown_html: renderMarkdown(raw), created_at: now, updated_at: now, category_tag: (mf as ThoughtMode) || "Fleeting Thought", absolute_privacy_flag: false });
    setSel(id);
  };

  return (
    <>
      <PageHeader eyebrow="Tab 05" title="Power-Note Lab"><button className="btn-blue" onClick={create}><Plus className="h-4 w-4" />New note</button></PageHeader>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="field pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <select className="field" value={pf} onChange={(e) => setPf(e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select className="field" value={mf} onChange={(e) => setMf(e.target.value)}><option value="">All modes</option>{THOUGHT_MODES.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
          <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
            {list.map((n) => {
              const p = projectById(projects, n.project_id);
              const hidden = n.absolute_privacy_flag && !revealed[n.id];
              return (
                <button key={n.id} onClick={() => setSel(n.id)} className={`w-full rounded-xl border p-3 text-left transition ${sel === n.id ? "border-interactive bg-elevated" : "border-border bg-card hover:border-interactive/40"}`}>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`chip ${MODE_STYLE[n.category_tag]}`}>[{n.category_tag}]</span>
                    {p && <span className="chip" style={{ background: `color-mix(in oklab, ${p.color_hex} 18%, transparent)`, color: p.color_hex }}>{p.name}</span>}
                    {n.absolute_privacy_flag && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="mt-2 truncate font-semibold">{n.title}</div>
                  <div className={`mt-0.5 line-clamp-2 text-xs text-muted-foreground ${hidden ? "blur-sm select-none" : ""}`}>{n.raw_content.replace(/[#*`>:]/g, "").slice(0, 140)}</div>
                  <div className="mono mt-2 text-[10px] text-muted-foreground">Updated {new Date(n.updated_at).toLocaleString()}</div>
                </button>
              );
            })}
            {!list.length && <div className="panel text-center text-sm text-muted-foreground">No notes yet.</div>}
          </div>
        </div>
        {note ? <Editor key={note.id} note={note} view={view} setView={setView} revealed={!!revealed[note.id]} reveal={() => setRevealed({ ...revealed, [note.id]: true })}
          onChange={(patch) => update("notes", note.id, { ...patch, updated_at: new Date().toISOString(), ...(patch.raw_content !== undefined ? { markdown_html: renderMarkdown(patch.raw_content) } : {}) })}
          onDelete={() => { remove("notes", note.id); setSel(null); }} />
          : <div className="panel grid min-h-[60vh] place-items-center text-muted-foreground">Select or create a note.</div>}
      </div>
    </>
  );
}

function Editor({ note, view, setView, onChange, onDelete, revealed, reveal }: {
  note: Note; view: "split" | "edit" | "preview"; setView: (v: "split" | "edit" | "preview") => void;
  onChange: (p: Partial<Note>) => void; onDelete: () => void; revealed: boolean; reveal: () => void;
}) {
  const projects = useData((s) => s.projects);
  const ta = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = before, placeholder = "text", line = false) => {
    const el = ta.current; if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const pre = line && s > 0 && value[s - 1] !== "\n" ? "\n" : "";
    const next = value.slice(0, s) + pre + before + selected + after + value.slice(e);
    onChange({ raw_content: next });
    requestAnimationFrame(() => { el.focus(); const st = s + pre.length + before.length; el.setSelectionRange(st, st + selected.length); });
  };
  const tools = [
    { icon: Bold, fn: () => wrap("**"), t: "Bold" }, { icon: Italic, fn: () => wrap("*"), t: "Italic" },
    { icon: Heading1, fn: () => wrap("# ", "", "Heading", true), t: "H1" }, { icon: Heading2, fn: () => wrap("## ", "", "Heading", true), t: "H2" },
    { icon: Heading3, fn: () => wrap("### ", "", "Heading", true), t: "H3" }, { icon: Code, fn: () => wrap("`"), t: "Inline code" },
    { icon: FileCode, fn: () => wrap("```python\n", "\n```", "E = m * c ** 2", true), t: "Code block" },
    { icon: List, fn: () => wrap("- ", "\n  - nested item", "item", true), t: "List" },
  ];
  if (note.absolute_privacy_flag && !revealed) {
    return <div className="panel grid min-h-[60vh] place-items-center text-center"><div><Lock className="mx-auto h-8 w-8 text-muted-foreground" /><div className="mt-3 font-semibold">Private note</div><button className="btn-ghost mt-4" onClick={reveal}>Reveal for this session</button></div></div>;
  }
  return (
    <div className="panel relative">
      <input value={note.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full bg-transparent text-2xl font-extrabold outline-none" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="field !w-auto" value={note.project_id} onChange={(e) => onChange({ project_id: e.target.value })}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {THOUGHT_MODES.map((m) => <button key={m} onClick={() => onChange({ category_tag: m })} className={`chip !px-3 !py-1 ${note.category_tag === m ? MODE_STYLE[m] + " ring-1 ring-current" : "bg-muted text-muted-foreground"}`}>[{m}]</button>)}
        <div className="ml-auto flex gap-1">
          <button className="btn-icon" title="Privacy" onClick={() => onChange({ absolute_privacy_flag: !note.absolute_privacy_flag })}>{note.absolute_privacy_flag ? <Lock className="h-4 w-4 text-warn" /> : <Unlock className="h-4 w-4" />}</button>
          <button className="btn-icon hover:!text-focus" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 border-y border-border py-2">
        {tools.map(({ icon: I, fn, t }) => <button key={t} title={t} className="btn-icon" onClick={fn}><I className="h-4 w-4" /></button>)}
        <div className="ml-auto flex rounded-lg bg-background/60 p-0.5 text-xs">
          {(["edit", "split", "preview"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-md px-2.5 py-1 capitalize ${view === v ? "bg-elevated" : "text-muted-foreground"}`}>{v}</button>)}
        </div>
      </div>
      <div className={`mt-4 grid gap-4 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
        {view !== "preview" && <textarea ref={ta} value={note.raw_content} onChange={(e) => onChange({ raw_content: e.target.value })} className="mono min-h-[60vh] w-full resize-none rounded-xl bg-background/60 p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-interactive/30" spellCheck={false} />}
        {view !== "edit" && <div className="prose-note min-h-[60vh] overflow-y-auto rounded-xl border border-border p-5" dangerouslySetInnerHTML={{ __html: note.markdown_html }} />}
      </div>
      <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-2">
        <button className="btn rounded-full bg-warn px-4 py-3 text-background shadow-lg" onClick={() => wrap(":::warning\n", "\n:::", "Careful here…", true)}><AlertTriangle className="h-4 w-4" />Warning Callout</button>
        <button className="btn-break rounded-full px-4 py-3" onClick={() => wrap(":::takeaway\n", "\n:::", "The key insight…", true)}><Star className="h-4 w-4" />Key Takeaway</button>
      </div>
    </div>
  );
}
