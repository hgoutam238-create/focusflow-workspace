export const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
export function hms(sec: number) { const s = Math.max(0, Math.floor(sec)); return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`; }
export function ms(sec: number) { const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600); return h ? `${h}:${pad((s % 3600) / 60)}:${pad(s % 60)}` : `${pad(s / 60)}:${pad(s % 60)}`; }
export const durMin = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;
export const fmtHours = (min: number) => (min / 60).toFixed(1) + "h";
