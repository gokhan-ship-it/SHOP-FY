import ExcelJS from "exceljs";
import { PNL_ROWS, pnlMatrix } from "@/lib/pnlTable";
import { readParams } from "@/lib/pageparams";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { range, grain } = await readParams(Promise.resolve(params));
  const { cols, total, needRecon, recon } = pnlMatrix(range.from, range.to, grain);
  const header = ["Kalem", ...cols.map((c) => c.label), "Toplam"];
  const rows: (string | number)[][] = [];
  for (const r of PNL_ROWS) {
    const label = `${r.sign === "-" ? "− " : r.sign === "+" ? "+ " : r.kind === "total" ? "= " : ""}${r.label}`;
    rows.push([label, ...cols.map((c) => Math.round(c.values[r.field!] * 100) / 100), Math.round(total[r.field!] * 100) / 100]);
    if (r.field === "shipping_charged" && needRecon) rows.push(["± Diğer", ...cols.map((c) => Math.round(recon(c.values) * 100) / 100), Math.round(recon(total) * 100) / 100]);
  }
  const name = `ttn-kar-tablosu-${range.from}-${range.to}-${grain}`;

  if (url.searchParams.get("bicim") === "csv") {
    // Excel'in Türkçe karakterleri doğru açması için BOM
    return new Response("﻿" + toCsv([header, ...rows]), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kâr tablosu", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  ws.addRow(header).font = { bold: true };
  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    const def = PNL_ROWS.find((p) => r[0].toString().endsWith(p.label));
    if (def?.kind === "total") row.font = { bold: true };
    row.eachCell((cell, col) => {
      if (col > 1) cell.numFmt = def?.kind === "count" ? "#,##0" : '#,##0.00 "₺"';
    });
    void i;
  });
  ws.getColumn(1).width = 34;
  for (let i = 2; i <= header.length; i++) ws.getColumn(i).width = 16;
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
