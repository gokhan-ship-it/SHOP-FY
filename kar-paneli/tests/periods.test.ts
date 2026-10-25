import { describe, expect, it } from "vitest";
import { compareRange, resolvePeriod } from "@/lib/periods";
import { seasonLabel, seasonStartYear, weekStart } from "@/lib/time";

const today = "2026-10-25"; // pazar

describe("dönemler", () => {
  it("hafta pazartesi başlar", () => {
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(resolvePeriod("bu-hafta", null, null, today)).toMatchObject({ from: "2026-10-19", to: "2026-10-25" });
    expect(resolvePeriod("gecen-hafta", null, null, today)).toMatchObject({ from: "2026-10-12", to: "2026-10-18" });
  });
  it("sezon 15 Şubat – 14 Şubat", () => {
    expect(seasonStartYear("2026-02-14")).toBe(2025);
    expect(seasonStartYear("2026-02-15")).toBe(2026);
    expect(seasonLabel(2025)).toBe("Sezon 2025-26");
    expect(resolvePeriod("gecen-sezon", null, null, today)).toMatchObject({ from: "2025-02-15", to: "2026-02-14" });
  });
  it("geçen ay önceki ayın tamamıyla karşılaştırılır", () => {
    const r = resolvePeriod("gecen-ay", null, null, today);
    expect(r).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(compareRange(r, "onceki")).toMatchObject({ from: "2026-08-01", to: "2026-08-31" });
    expect(compareRange(r, "gecen-yil")).toMatchObject({ from: "2025-09-01", to: "2025-09-30" });
  });
  it("bu ay, önceki ayın aynı gününe kadar karşılaştırılır", () => {
    expect(compareRange(resolvePeriod("bu-ay", null, null, today), "onceki")).toMatchObject({ from: "2026-09-01", to: "2026-09-25" });
    expect(compareRange(resolvePeriod("bu-ay", null, null, "2026-03-31"), "onceki")).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("son 7 gün: bir önceki 7 gün", () => {
    expect(compareRange(resolvePeriod("son-7", null, null, today), "onceki")).toMatchObject({ from: "2026-10-12", to: "2026-10-18" });
  });
});
