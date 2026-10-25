import { compareRange, resolvePeriod, type CompareKey } from "./periods";
import { diffDays, monthLabel, trDateShort, seasonLabel } from "./time";
import type { Grain } from "./metrics";

export type SP = Promise<Record<string, string | string[] | undefined>>;

export async function readParams(sp: SP) {
  const q = await sp;
  const s = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const range = resolvePeriod(s("p") ?? "bu-ay", s("bas"), s("bit"));
  const k = (["onceki", "gecen-yil", "yok"].includes(s("k") ?? "") ? s("k") : "onceki") as CompareKey;
  const cmp = compareRange(range, k);
  const len = diffDays(range.from, range.to) + 1;
  const g = (["gun", "hafta", "ay", "sezon"].includes(s("g") ?? "") ? s("g") : len <= 45 ? "gun" : len <= 190 ? "hafta" : "ay") as Grain;
  return { q, s, range, cmp, compareKey: k, grain: g };
}

export function bucketLabel(key: string, g: Grain): string {
  if (g === "gun") return trDateShort(key);
  if (g === "hafta") return `${trDateShort(key)} haftası`;
  if (g === "ay") return monthLabel(key, true);
  return seasonLabel(Number(key));
}

export const GRAIN_OPTIONS = [
  { key: "gun", label: "Gün" },
  { key: "hafta", label: "Hafta" },
  { key: "ay", label: "Ay" },
  { key: "sezon", label: "Sezon" },
];
