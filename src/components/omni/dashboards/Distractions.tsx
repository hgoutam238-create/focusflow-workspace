import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/omni/Shell";
import { useData, DISTRACTION_CATEGORIES } from "@/lib/store";



const CAT_STYLE: Record<string, string> = {
  "Digital Temptation": "text-interactive", "Internal Anxiety": "text-focus", "External Noise": "text-warn", "Random Ideas": "text-break", Uncategorized: "text-muted-foreground",
};

export function DistractionsPage() {
  const { brainDump, update, remove } = useData();
  const [q, setQ] = useState(""); const [cat, setCat] = useState("");
  const list = brainDump.filter((d) => (!cat || d.core_category === cat) && (!q || `${d.raw_thought_text} ${d.task_title} ${d.core_category}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader eyebrow="Tab 06" title="Distraction Journal & Brain Dump">
        <div className="flex gap-2">
          <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="field pl-9" placeholder="Search thoughts, tasks or tags…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="field w-48" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{DISTRACTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
      </PageHeader>
      <div className="mb-5 grid grid-cols-5 gap-3">
        {DISTRACTION_CATEGORIES.map((c) => (
          <div key={c} className="panel-tight"><div className="label-xs">{c}</div><div className={`mono mt-1 text-2xl font-bold ${CAT_STYLE[c]}`}>{brainDump.filter((d) => d.core_category === c).length}</div></div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((d) => (
          <div key={d.id} className="panel flex flex-col">
            <div className="flex items-center justify-between">
              <span className="mono text-xs text-muted-foreground">{new Date(d.timestamp).toLocaleString()}</span>
              <Button variant="ghost" className="btn-icon" onClick={() => remove("brainDump", d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="mt-3 flex-1 text-lg font-medium leading-snug">“{d.raw_thought_text}”</p>
            <div className="mt-4 text-xs text-muted-foreground">While working on: <span className="text-foreground">{d.task_title}</span></div>
            <select value={d.core_category} onChange={(e) => update("brainDump", d.id, { core_category: e.target.value })} className={`field mt-3 font-semibold ${CAT_STYLE[d.core_category] ?? ""}`}>
              {DISTRACTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>
      {!list.length && <div className="panel text-center text-muted-foreground">No entries. Use the crimson distraction button in Focus Command to capture thoughts.</div>}
    </>
  );
}
