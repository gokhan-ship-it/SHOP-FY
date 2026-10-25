import type { ReactNode } from "react";

export function Card({ children, className = "", title, action, id }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section id={id} className={`rounded-xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "crit" | "ok" }) {
  const cls =
    tone === "warn"
      ? "border-warn-line/50 bg-warn-bg text-warn-ink"
      : tone === "crit"
        ? "border-crit-line/50 bg-crit-bg text-crit-ink"
        : tone === "ok"
          ? "border-line bg-surface-2 text-ink"
          : "border-line bg-surface-2 text-ink-2";
  const icon = tone === "warn" ? "⚠" : tone === "crit" ? "⛔" : tone === "ok" ? "✓" : "ℹ";
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      <span aria-hidden>{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium text-ink-2">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </span>
  );
}

export function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-muted">—</span>;
  const up = value > 0;
  const good = value === 0 ? null : up === goodWhenUp;
  const cls = good === null ? "text-muted" : good ? "text-pos" : "text-neg";
  const pct = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(value) * 100);
  return (
    <span className={`text-xs font-medium ${cls}`}>
      {up ? "▲" : value < 0 ? "▼" : "•"} %{pct}
    </span>
  );
}
