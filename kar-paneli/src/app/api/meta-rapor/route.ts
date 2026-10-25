// Ads Manager raporu yükleme. Yalnızca bu Mac'teki panelden gelen istekler kabul edilir.
import { revalidatePath } from "next/cache";
import { importReport, parseReport, readReportFile } from "@/lib/metaCsv";
import { InputError } from "@/lib/services";
import { setJsonSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function back(kind: "mesaj" | "hata", text: string) {
  return new Response(null, { status: 303, headers: { Location: `/saglik?${kind}=${encodeURIComponent(text)}#meta-rapor` } });
}

export async function POST(req: Request) {
  // Başka bir web sitesinin bu adrese dosya göndermesini engelle
  const origin = req.headers.get("origin");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return new Response("Yasak", { status: 403 });

  let text: string;
  try {
    const form = await req.formData();
    const file = form.get("dosya");
    if (!(file instanceof File) || file.size === 0) return back("hata", "Dosya seçilmedi.");
    if (file.size > 50 * 1024 * 1024) return back("hata", "Dosya çok büyük (50 MB üstü). Daha kısa bir tarih aralığı seçin.");
    const table = await readReportFile(file.name, await file.arrayBuffer());
    const parsed = parseReport(table, file.name);
    const s = importReport(parsed);
    setJsonSetting("meta_rapor_son", { ...s, at: new Date().toISOString(), file: file.name });
    revalidatePath("/", "layout");
    const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);
    const d = (x: string) => `${x.slice(8, 10)}.${x.slice(5, 7)}.${x.slice(0, 4)}`;
    text = `Rapor yüklendi: ${d(s.from)} – ${d(s.to)}, ${s.days} gün, toplam ${fmt(s.total)} ${s.currency === "TRY" ? "₺" : s.currency}.`;
    if (!s.accountVerified) text += " Not: dosyada hesap bilgisi yoktu; Text To Next hesabından indirdiğinizden emin olun.";
  } catch (e) {
    return back("hata", e instanceof InputError ? e.message : `Rapor okunamadı: ${e instanceof Error ? e.message : String(e)}`);
  }
  return back("mesaj", text);
}
