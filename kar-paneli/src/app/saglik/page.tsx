import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, Label, Note, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { connectionSummary, healthWarnings } from "@/lib/health";
import { lastSync, recentSyncs, type SyncSource } from "@/lib/sync/log";
import { getShopifyProgress, shopifyConfigured, shopifyRunning } from "@/lib/sync/shopify";
import { metaRunning } from "@/lib/sync/meta";
import { getSetting, getJsonSetting } from "@/lib/settings";
import { backupDir, cloudCandidates } from "@/lib/backup";
import { validationReport, METRIC_LABELS, TOLERANCES, type Metric } from "@/lib/validation";
import { BLOCKED_AD_ACCOUNTS, env } from "@/lib/config";
import { dec, num, tl } from "@/lib/format";
import { monthLabel, trDateTime } from "@/lib/time";
import type { RecalcSummary } from "@/lib/calc/recalc";
import { backupNowAction, resetShopifyHistoryAction, saveMetaAction, setAdAccountAction, setBackupDirAction, syncNowAction } from "../actions";

export const dynamic = "force-dynamic";

const SOURCES: { key: SyncSource; label: string; plan: string }[] = [
  { key: "shopify", label: "Shopify siparişleri", plan: "15 dakikada bir" },
  { key: "meta", label: "Meta reklam", plan: "saatte bir; her gece 03:00'te son 30 gün" },
  { key: "kur", label: "TCMB döviz kuru", plan: "günde bir" },
  { key: "yedek", label: "Yedek", plan: "her gün 04:00" },
];

function statusText(s: string) {
  return s === "ok" ? "başarılı" : s === "hata" ? "hata" : s === "kilit" ? "KİLİT" : "çalışıyor…";
}

export default async function Saglik({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const warnings = healthWarnings();
  const conn = connectionSummary();
  const running = shopifyRunning() || metaRunning() || recentSyncs(5).some((s) => s.status === "calisiyor");
  const progress = [getShopifyProgress(), getSetting("meta_ilerleme") ?? ""].filter(Boolean);
  const report = validationReport();
  const metrics = Object.keys(TOLERANCES) as Metric[];
  const lastCalc = getJsonSetting<RecalcSummary | null>("son_hesap", null);
  const bdir = backupDir();
  const cands = cloudCandidates();
  const known = conn.metaAccounts;

  return (
    <div className="space-y-5">
      {running && <AutoRefresh seconds={8} />}
      <PageHeader title="Veri sağlığı ve Ayarlar" sub={lastCalc ? `Son hesaplama: ${trDateTime(lastCalc.at)} · ${num(lastCalc.included)} sipariş · ${lastCalc.ms} ms` : undefined} />
      <Flash q={q} />

      <Card title="Uyarılar">
        {warnings.length === 0 ? (
          <Note tone="ok">Her şey yolunda; uyarı yok.</Note>
        ) : (
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.key}>
                <Note tone={w.level === "kirmizi" ? "crit" : "warn"}>
                  <span className="font-medium">{w.title}</span>
                  {w.detail && <span className="block text-xs opacity-90">{w.detail}</span>}
                </Note>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Senkron"
        action={
          <form action={syncNowAction}>
            <input type="hidden" name="what" value="hepsi" />
            <button className="btn-primary" disabled={running}>
              {running ? "Senkron sürüyor…" : "Şimdi senkronize et"}
            </button>
          </form>
        }
      >
        {progress.length > 0 && (
          <div className="mb-3">
            <Note>{progress.join(" · ")}</Note>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Plan</th>
                <th>Son başarılı</th>
                <th>Son deneme</th>
                <th>Sonuç</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => {
                const ok = lastSync(s.key, { status: "ok" });
                const last = lastSync(s.key);
                return (
                  <tr key={s.key}>
                    <td className="font-medium">{s.label}</td>
                    <td className="text-xs text-muted">{s.plan}</td>
                    <td className="whitespace-nowrap">{trDateTime(ok?.finished_at)}</td>
                    <td className="whitespace-nowrap">{trDateTime(last?.started_at)}</td>
                    <td className={`text-xs ${last?.status === "hata" || last?.status === "kilit" ? "text-neg" : ""}`}>
                      {last ? `${statusText(last.status)}${last.message ? ` — ${last.message}` : ""}` : "henüz yok"}
                    </td>
                    <td>
                      {s.key !== "yedek" && (
                        <form action={syncNowAction}>
                          <input type="hidden" name="what" value={s.key} />
                          <button className="btn !py-1 text-xs" disabled={running}>
                            Şimdi
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="hesaplar" title="Kilit durumu">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted">Bağlı mağaza adresi (ayar)</dt>
              <dd className="font-medium">{conn.shopifyDomain || "girilmemiş"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Shopify'ın bildirdiği mağaza</dt>
              <dd>{conn.shopName ?? "henüz bağlanmadı"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Shopify uygulama izinleri</dt>
              <dd className="text-xs">{conn.shopifyScopes || "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 text-xs font-medium text-ink-2">Meta reklam hesapları</div>
          <table className="tbl mt-1">
            <tbody>
              {known.map((a) => {
                const blocked = BLOCKED_AD_ACCOUNTS.includes(a.id);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="font-medium">{a.name ?? (blocked ? "Jantifox" : a.allowed ? "Text To Next (adı ilk senkronda okunacak)" : "isimsiz")}</div>
                      <div className="text-xs text-muted">
                        {a.id}
                        {a.timezone ? ` · ${a.timezone}` : ""}
                        {a.currency ? ` · ${a.currency}` : ""}
                      </div>
                    </td>
                    <td className="text-xs">{blocked ? "⛔ asla çekilmez" : a.allowed ? "✓ izinli" : "izinsiz (veri çekilmez)"}</td>
                    <td>
                      {!blocked && (
                        <form action={setAdAccountAction}>
                          <input type="hidden" name="account" value={a.id} />
                          <input type="hidden" name="allow" value={a.allowed ? "0" : "1"} />
                          <button className="btn !py-1 text-xs">{a.allowed ? "İzni kaldır" : "İzin ver"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <form action={setAdAccountAction} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="allow" value="1" />
            <label className="flex-1">
              <Label>Başka bir Text To Next reklam hesabı ekle</Label>
              <input name="account" className="field" placeholder="act_… ya da yalnızca rakamlar" />
            </label>
            <button className="btn">Ekle</button>
          </form>
          <p className="mt-2 text-xs text-muted">Yalnızca Text To Next&apos;e ait hesapları ekleyin. JantiFox mağazası ve reklam hesabı hiçbir koşulda çekilmez.</p>
        </Card>

        <Card id="meta-anahtar" title="Meta anahtarı">
          <p className="text-sm">
            {conn.metaDaysLeft === null ? (
              env("META_ACCESS_TOKEN") ? "Süresi bilinmiyor." : "Henüz girilmedi."
            ) : conn.metaDaysLeft <= 0 ? (
              <span className="font-medium text-neg">Süresi doldu.</span>
            ) : (
              <>
                Kalan süre: <span className={`font-medium ${conn.metaDaysLeft <= 7 ? "text-neg" : ""}`}>{conn.metaDaysLeft} gün</span>
              </>
            )}
          </p>
          <details className="mt-3">
            <summary className="btn cursor-pointer list-none">Anahtarı yenile</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-2">
              <li>developers.facebook.com → Araçlar → Graph API Gezgini&apos;ni açın.</li>
              <li>Sağda uygulama olarak “TTN Kâr Paneli”ni seçin; izin olarak yalnızca ads_read işaretli olsun.</li>
              <li>“Generate Access Token”a basıp onaylayın, çıkan anahtarı aşağıya yapıştırın.</li>
            </ol>
            <form action={saveMetaAction} className="mt-3 space-y-2">
              <input type="hidden" name="back" value="/saglik" />
              <label className="block">
                <Label>Kısa ömürlü anahtar</Label>
                <input name="token" required className="field" autoComplete="off" />
              </label>
              {!env("META_APP_SECRET") && (
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <Label>Uygulama Kimliği</Label>
                    <input name="appId" className="field" defaultValue={env("META_APP_ID")} />
                  </label>
                  <label>
                    <Label>Uygulama Gizli Anahtarı</Label>
                    <input name="appSecret" type="password" className="field" autoComplete="off" />
                  </label>
                </div>
              )}
              <button className="btn-primary">60 günlük anahtara çevir ve kaydet</button>
            </form>
          </details>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="yedek" title="Yedek">
          <p className="text-sm">
            Son yedek: <span className="font-medium">{trDateTime(getSetting("son_yedek"))}</span>
          </p>
          <p className="mt-1 text-xs text-muted">Her gün 04:00&apos;te (Mac kapalıysa açılınca) alınır; yerel ~/TTN-Kar/yedek klasöründe ve aşağıdaki bulut klasöründe son 30 kopya tutulur.</p>
          <form action={setBackupDirAction} className="mt-3 space-y-2 text-sm">
            {cands.map((cd) => (
              <label key={cd.path} className={`flex items-start gap-2 ${cd.exists ? "" : "opacity-60"}`}>
                <input type="radio" name="dir" value={cd.path} defaultChecked={bdir === cd.path} disabled={!cd.exists} className="mt-1" />
                <span>
                  {cd.label}
                  {!cd.exists && " (bu Mac'te bulunamadı)"}
                  <span className="block text-xs break-all text-muted">{cd.path}</span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-2">
              <input type="radio" name="dir" value="ozel" defaultChecked={!!bdir && !cands.some((c) => c.path === bdir)} className="mt-1" />
              <span className="flex-1">
                Başka klasör
                <input name="custom" className="field mt-1" defaultValue={bdir && !cands.some((c) => c.path === bdir) ? bdir : ""} placeholder="/Users/…" />
              </span>
            </label>
            <div className="flex gap-2">
              <button className="btn">Klasörü kaydet</button>
            </div>
          </form>
          <form action={backupNowAction} className="mt-3">
            <button className="btn-primary">Şimdi yedekle</button>
          </form>
        </Card>

        <Card title="Shopify geçmişi">
          <p className="text-sm text-ink-2">
            İlk yükleme: <span className="font-medium">{getSetting("shopify_ilk_yukleme") === "tamam" ? "tamamlandı" : shopifyConfigured() ? "bekliyor / sürüyor" : "Shopify bağlanmadı"}</span>
          </p>
          <p className="mt-2 text-xs text-muted">Shopify izinleri değiştiyse (ör. read_all_orders eklendiyse) tüm geçmişi baştan çekebilirsiniz. Elle girdiğiniz maliyet ve giderler etkilenmez.</p>
          <form action={resetShopifyHistoryAction} className="mt-3">
            <button className="btn" disabled={!shopifyConfigured() || running}>
              Tüm geçmişi yeniden çek
            </button>
          </form>
        </Card>
      </div>

      <Card id="dogrulama" title="Doğrulama raporu (TrueProfit referansı ile aylık karşılaştırma)">
        <p className="mb-3 text-xs text-muted">
          Kabul toleransları: sipariş ±%2 · net ciro ±%2 · Meta reklam ±%0,5 · ürün maliyeti ±%3 · reklam sonrası kâr ±%5. Referans, TrueProfit dışa aktarımı ve kullanıcının maliyetleriyle hesaplandı (Premium
          Hediye Kutusu ₺0 kabul edilerek). Shopify ham verisiyle küçük farklar normaldir. Tolerans dışı aylarda düzeltme yapılmadan önce size sorulur.
        </p>
        <div className="overflow-x-auto">
          <table className="tbl num">
            <thead>
              <tr>
                <th>Ay</th>
                {metrics.map((m) => (
                  <th key={m} className="text-right">
                    {METRIC_LABELS[m]}
                  </th>
                ))}
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.month}>
                  <td className="whitespace-nowrap">{monthLabel(r.month, true)}</td>
                  {metrics.map((m) => {
                    const v = r.values[m];
                    return (
                      <td key={m} className="text-right whitespace-nowrap" title={`Panel: ${m === "orders" ? num(v.ours) : tl(v.ours)} · Referans: ${m === "orders" ? num(v.ref) : tl(v.ref)}`}>
                        <div>{m === "orders" ? num(v.ours) : tl(v.ours)}</div>
                        <div className={`text-xs ${!r.hasData ? "text-muted" : v.ok ? "text-pos" : "text-neg"}`}>
                          {v.diff === null ? "—" : `${v.diff > 0.0005 ? "+" : v.diff < -0.0005 ? "−" : ""}%${dec(Math.abs(v.diff) * 100, 1)}`} {r.hasData ? (v.ok ? "✓" : "✗") : ""}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-xs">{!r.hasData ? <span className="text-muted">veri yok</span> : r.allOk ? <span className="text-pos">✓ tolerans içinde</span> : <span className="text-neg">✗ fark var</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.some((r) => r.hasData && !r.allOk) && (
          <details className="mt-4">
            <summary className="btn cursor-pointer list-none">Farkların olası sebepleri</summary>
            <ul className="mt-3 space-y-2 text-sm">
              {report
                .filter((r) => r.hasData && !r.allOk)
                .map((r) => (
                  <li key={r.month}>
                    <span className="font-medium">{monthLabel(r.month)}:</span>
                    <ul className="list-disc pl-5 text-ink-2">
                      {r.reasons.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title="Son işlemler">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kaynak</th>
                <th>Tür</th>
                <th>Sonuç</th>
                <th>Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {recentSyncs(30).map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{trDateTime(s.started_at)}</td>
                  <td>{s.source}</td>
                  <td>{s.kind}</td>
                  <td className={s.status === "hata" || s.status === "kilit" ? "text-neg" : ""}>{statusText(s.status)}</td>
                  <td className="text-xs">{s.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
