// Locally synthesized ambient tracks (Web Audio) + IndexedDB storage for custom binaural audio.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const mixes = new Map<string, { gain: GainNode; sources: AudioScheduledSourceNode[]; timers: number[] }>();

function getCtx() {
  if (!ctx) { ctx = new AudioContext(); master = ctx.createGain(); master.connect(ctx.destination); }
  return ctx;
}
function noise(c: AudioContext, brown: boolean) {
  const len = c.sampleRate * 3; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.4; }
  const src = c.createBufferSource(); src.buffer = b; src.loop = true; return src;
}

export const AMBIENT_TRACKS = [
  { id: "tick", label: "Mechanical Ticking" },
  { id: "rain", label: "Rain Sound" },
  { id: "white", label: "White Noise" },
  { id: "lofi", label: "Lofi Beats" },
  { id: "pulse", label: "Adrenaline Pulse" },
];

export function stopAmbient(track?: string) {
  for (const [id, mix] of mixes) {
    if (track && track !== id) continue;
    mix.sources.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    mix.timers.forEach((t) => clearInterval(t));
    mix.gain.disconnect(); mixes.delete(id);
  }
}
export function setAmbientVolume(v: number) { if (master) master.gain.value = v; }
export function setTrackVolume(track: string, volume: number) { const mix = mixes.get(track); if (mix) mix.gain.gain.value = volume; }

export function playAmbient(track: string, volume: number) {
  stopAmbient(track);
  const c = getCtx(); void c.resume();
  if (!master) return;
  const out = c.createGain(); out.gain.value = volume; out.connect(master);
  const sources: AudioScheduledSourceNode[] = [], timers: number[] = [];
  mixes.set(track, { gain: out, sources, timers });
  if (track === "white") { const n = noise(c, false); n.connect(out); n.start(); sources.push(n); }
  if (track === "rain") {
    const n = noise(c, false); const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
    n.connect(lp).connect(hp).connect(out); n.start();
    const b = noise(c, true); const g = c.createGain(); g.gain.value = 0.6; b.connect(g).connect(out); b.start();
    sources.push(n, b);
  }
  if (track === "tick") {
    const click = () => {
      const o = c.createOscillator(); const g = c.createGain(); o.type = "square"; o.frequency.value = 1800;
      const t = c.currentTime; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.04);
    };
    click(); timers.push(window.setInterval(click, 1000));
  }
  if (track === "pulse") {
    // ~55 BPM low-frequency thump with a soft off-beat for rhythmic urgency.
    const beat = () => {
      const t = c.currentTime;
      ([[0, 0.5, 55], [0.545, 0.15, 70]] as const).forEach(([d, level, f]) => {
        const o = c.createOscillator(); const g = c.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(32, t + d + 0.25);
        g.gain.setValueAtTime(level, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.3);
        o.connect(g).connect(out); o.start(t + d); o.stop(t + d + 0.32);
      });
    };
    beat(); timers.push(window.setInterval(beat, 60000 / 55));
  }
  if (track === "lofi") {
    const chords = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2]];
    let i = 0;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(out);
    const play = () => {
      const t = c.currentTime;
      (chords[i++ % 4] ?? []).forEach((f) => {
        const o = c.createOscillator(); const g = c.createGain(); o.type = "triangle"; o.frequency.value = f / 2;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
        o.connect(g).connect(lp); o.start(t); o.stop(t + 2.7);
      });
      [0, 0.6, 1.2, 1.8].forEach((d, k) => {
        const o = c.createOscillator(); const g = c.createGain(); o.frequency.setValueAtTime(k % 2 ? 180 : 90, t + d);
        o.frequency.exponentialRampToValueAtTime(40, t + d + 0.15);
        g.gain.setValueAtTime(k % 2 ? 0.05 : 0.18, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.2);
        o.connect(g).connect(out); o.start(t + d); o.stop(t + d + 0.25);
      });
    };
    play(); timers.push(window.setInterval(play, 2400));
    const crackle = noise(c, true); const g = c.createGain(); g.gain.value = 0.08; crackle.connect(g).connect(out); crackle.start(); sources.push(crackle);
  }
}

export function chime() {
  const c = getCtx(); void c.resume(); const t = c.currentTime;
  [1318.5, 1975.5].forEach((f, i) => {
    const o = c.createOscillator(); const g = c.createGain(); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.02 : 0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 2.3);
  });
}

export function beep() {
  const c = getCtx(); void c.resume(); const t = c.currentTime;
  [0, 0.25, 0.5].forEach((d) => {
    const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.2);
    o.connect(g).connect(c.destination); o.start(t + d); o.stop(t + d + 0.22);
  });
}

// ---- IndexedDB: CustomBinauralAudio [id, file_name, data_url_string]
export interface BinauralAudio { id: string; file_name: string; data_url_string: string }
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("omnifocus-matrix", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("CustomBinauralAudio", { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const transaction = d.transaction("CustomBinauralAudio", mode);
    const r = fn(transaction.objectStore("CustomBinauralAudio"));
    transaction.oncomplete = () => { res(r.result); d.close(); };
    transaction.onerror = () => { rej(transaction.error); d.close(); };
  });
}
function fallbackAudio(): BinauralAudio[] { return JSON.parse(localStorage.getItem("omni-audio-fallback") ?? "[]") as BinauralAudio[]; }
export const audioDb = {
  all: async () => { try { return [...await tx<BinauralAudio[]>("readonly", (s) => s.getAll()), ...fallbackAudio()]; } catch { return fallbackAudio(); } },
  get: async (id: string) => { try { return await tx<BinauralAudio | undefined>("readonly", (s) => s.get(id)) ?? fallbackAudio().find((a) => a.id === id); } catch { return fallbackAudio().find((a) => a.id === id); } },
  put: async (a: BinauralAudio) => { try { await tx("readwrite", (s) => s.put(a)); } catch { localStorage.setItem("omni-audio-fallback", JSON.stringify([...fallbackAudio().filter((f) => f.id !== a.id), a])); } },
  del: async (id: string) => { try { await tx("readwrite", (s) => s.delete(id)); } catch { /* remove fallback below */ } localStorage.setItem("omni-audio-fallback", JSON.stringify(fallbackAudio().filter((a) => a.id !== id))); },
};
export const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });
