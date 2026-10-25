"use client";
// Grafikler: tek eksen, ince işaretler, 4px yuvarlatılmış çubuk uçları, 2px çizgiler, üzerine gelince ipucu.
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const short = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`;
  if (a >= 1000) return `${(v / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B`;
  return v.toLocaleString("tr-TR");
};

const axis = { stroke: "var(--line-strong)", tick: { fill: "var(--muted)", fontSize: 11 }, tickLine: false };
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" },
  labelStyle: { color: "var(--ink-2)", marginBottom: 4 },
  itemStyle: { color: "var(--ink)" },
  cursor: { fill: "var(--surface-2)", stroke: "var(--line-strong)" },
};

export function RevenueChart({ data }: { data: { label: string; ciro: number; reklam: number; kar: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" {...axis} minTickGap={16} />
          <YAxis {...axis} axisLine={false} tickFormatter={short} width={56} />
          <Tooltip {...tooltipStyle} formatter={(v) => tl.format(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} iconSize={10} />
          <Bar dataKey="ciro" name="Net ciro" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line dataKey="reklam" name="Meta reklam" stroke="var(--s2)" strokeWidth={2} dot={data.length <= 31 ? { r: 3 } : false} activeDot={{ r: 5 }} />
          <Line dataKey="kar" name="Reklam sonrası kâr" stroke="var(--s3)" strokeWidth={2} dot={data.length <= 31 ? { r: 3 } : false} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UnitsChart({ data }: { data: { label: string; adet: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" {...axis} minTickGap={8} />
          <YAxis {...axis} axisLine={false} allowDecimals={false} width={40} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString("tr-TR")} adet`, "Satış"]} />
          <Bar dataKey="adet" name="Adet" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceChart({ data }: { data: { label: string; fiyat: number | null; satis: number | null }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" {...axis} minTickGap={8} />
          <YAxis {...axis} axisLine={false} tickFormatter={short} width={56} />
          <Tooltip {...tooltipStyle} formatter={(v) => (v === null ? "—" : tl.format(Number(v)))} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} iconSize={10} />
          <Line dataKey="fiyat" name="Liste fiyatı" stroke="var(--s1)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line dataKey="satis" name="Ort. satış fiyatı" stroke="var(--s2)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
