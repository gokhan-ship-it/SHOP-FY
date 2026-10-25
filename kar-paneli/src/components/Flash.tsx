import { Note } from "./ui";

export function Flash({ q }: { q: Record<string, string | string[] | undefined> }) {
  const m = typeof q.mesaj === "string" ? q.mesaj : null;
  const h = typeof q.hata === "string" ? q.hata : null;
  if (!m && !h) return null;
  return <div className="mb-4">{h ? <Note tone="crit">{h}</Note> : <Note tone="ok">{m}</Note>}</div>;
}
