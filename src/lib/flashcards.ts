import type { Note } from "./store";

export interface Flashcard { id: string; noteId: string; noteTitle: string; question: string; answer: string }

const CARD = /^\s*(?:[-*]\s*)?Q:\s*(.+?)\s*\|\|\s*A:\s*(.+?)\s*$/gm;

export function parseFlashcards(raw: string): { question: string; answer: string }[] {
  return [...raw.matchAll(CARD)].map((m) => ({ question: m[1] ?? "", answer: m[2] ?? "" })).filter((c) => c.question && c.answer);
}

export function deckFor(notes: Note[], projectId: string): Flashcard[] {
  return notes.filter((n) => n.project_id === projectId).flatMap((n) =>
    parseFlashcards(n.raw_content).map((c, i) => ({ id: `${n.id}-${i}`, noteId: n.id, noteTitle: n.title, ...c })));
}

/** Replace card lines with a styled marker before markdown rendering. */
export function stripFlashcards(raw: string) {
  return raw.replace(CARD, (_m, q: string) => `> 🃏 **Flashcard:** ${q}`);
}
