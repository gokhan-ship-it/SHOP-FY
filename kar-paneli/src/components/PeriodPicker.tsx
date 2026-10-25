"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { COMPARE_OPTIONS, PERIOD_OPTIONS } from "@/lib/periods";

export function PeriodPicker({ showCompare = true, extra }: { showCompare?: boolean; extra?: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const p = sp.get("p") ?? "bu-ay";
  const k = sp.get("k") ?? "onceki";
  const [from, setFrom] = useState(sp.get("bas") ?? "");
  const [to, setTo] = useState(sp.get("bit") ?? "");

  const go = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [key, v] of Object.entries(patch)) {
      if (v === null || v === "") n.delete(key);
      else n.set(key, v);
    }
    router.push(`${path}?${n.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted">
        <span className="mb-1 block">Dönem</span>
        <select className="field !w-auto" value={p} onChange={(e) => go({ p: e.target.value, ...(e.target.value !== "ozel" ? { bas: null, bit: null } : {}) })}>
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {p === "ozel" && (
        <>
          <label className="text-xs text-muted">
            <span className="mb-1 block">Başlangıç</span>
            <input type="date" className="field !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            <span className="mb-1 block">Bitiş</span>
            <input type="date" className="field !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn" onClick={() => go({ bas: from, bit: to })}>
            Uygula
          </button>
        </>
      )}
      {showCompare && (
        <label className="text-xs text-muted">
          <span className="mb-1 block">Karşılaştır</span>
          <select className="field !w-auto" value={k} onChange={(e) => go({ k: e.target.value })}>
            {COMPARE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {extra}
    </div>
  );
}

export function ParamSelect({ name, value, options, label }: { name: string; value: string; options: { key: string; label: string }[]; label: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <select
        className="field !w-auto"
        value={value}
        onChange={(e) => {
          const n = new URLSearchParams(sp.toString());
          if (e.target.value) n.set(name, e.target.value);
          else n.delete(name);
          router.push(`${path}?${n.toString()}`);
        }}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
