// Veri sağlığı uyarıları. Sarı: dikkat; kırmızı: kilit hatası ya da sonucu doğrudan bozan eksik.
import { getDb } from "./db";
import { env } from "./config";
import { getJsonSetting, getSetting } from "./settings";
import { getLockErrors, lastSync } from "./sync/log";
import { accountsToSync, metaConfigured, tokenDaysLeft } from "./sync/meta";
import { shopifyConfigured } from "./sync/shopify";
import { diffDays, todayIst, trDate, TZ } from "./time";

export interface Warning {
  level: "kirmizi" | "sari";
  key: string;
  title: string;
  detail?: string;
  href?: string;
}

export function healthWarnings(): Warning[] {
  const c = getDb().$client;
  const w: Warning[] = [];

  for (const l of getLockErrors())
    w.push({ level: "kirmizi", key: `kilit-${l.source}`, title: l.source === "shopify" ? "Shopify kilidi: yanlış mağaza" : "Meta kilidi: izinsiz hesap", detail: l.message, href: "/saglik" });

  if (!shopifyConfigured()) w.push({ level: "sari", key: "shopify-yok", title: "Shopify bağlantısı kurulmadı", detail: "Panel şimdilik TrueProfit verisiyle sınırlı. Kurulum ekranından Shopify anahtarlarını girin.", href: "/kurulum" });
  if (!env("META_ACCESS_TOKEN")) {
    // Meta API yoksa reklam verisi elle yüklenen Ads Manager raporundan (ya da TrueProfit yedeğinden) gelir
    const lastAd = c.prepare("select max(date) d from ad_insights_daily where level = 'account'").get() as { d: string | null };
    const tpEnd = c.prepare("select max(o.date) d from tp_orders o where substr(o.date,1,7) in (select month from tp_monthly where facebook_ad_spend > 0)").get() as { d: string | null };
    const last = [lastAd.d, tpEnd.d].filter((x): x is string => !!x).sort().pop() ?? null;
    const today = todayIst();
    if (!last || diffDays(last, today) > 7)
      w.push({
        level: "sari",
        key: "reklam-eski",
        title: `Reklam harcaması ${last ? trDate(last) + " tarihinden sonra" : "hiç"} girilmedi`,
        detail: "Bu günlerde reklam gideri 0 sayılıyor, kâr olduğundan yüksek görünür. Reklam Yöneticisi'nden gün kırılımlı raporu indirip Ayarlar → Meta raporu yükle'den yükleyin.",
        href: "/saglik#meta-rapor",
      });
  }

  const days = tokenDaysLeft();
  if (days !== null && days <= 7)
    w.push({ level: days <= 0 ? "kirmizi" : "sari", key: "meta-anahtar", title: days <= 0 ? "Meta anahtarının süresi doldu" : `Meta anahtarının süresi ${days} gün içinde doluyor`, detail: "Ayarlar ekranındaki “Anahtarı yenile” alanından yenileyin.", href: "/saglik#meta-anahtar" });

  const unmatched = c
    .prepare("select count(distinct o.order_id) n, coalesce(sum(o.unmatched_lines), 0) l from order_calc o where o.included = 1 and o.unmatched_lines > 0")
    .get() as { n: number; l: number };
  if (unmatched.n) w.push({ level: "sari", key: "eslesmeyen", title: `${unmatched.l} sipariş satırında eşleşmeyen ürün var`, detail: `${unmatched.n} sipariş etkileniyor; ürün maliyeti 0 sayıldı. Eşleşmeyenler kutusundan model seçin.`, href: "/maliyetler#eslesmeyenler" });

  const missing = c
    .prepare(
      `select l.model_code code, m.name, count(distinct l.order_id) n from line_calc l join models m on m.code = l.model_code
        where not exists (select 1 from cost_versions v where v.model_code = l.model_code and v.unit_cost is not null and v.valid_from <= l.date and (v.valid_to is null or v.valid_to >= l.date))
        group by l.model_code`,
    )
    .all() as { code: string; name: string; n: number }[];
  for (const m of missing)
    w.push({ level: "kirmizi", key: `maliyet-${m.code}`, title: `${m.name}: maliyet girilmemiş`, detail: `${m.n} siparişte 0 sayıldı. Maliyetler ekranından girin; geçmiş siparişler kendiliğinden yeniden hesaplanır.`, href: "/maliyetler" });

  const gw = c
    .prepare("select coalesce(gateway, '(boş)') g, count(*) n from order_calc where included = 1 and gateway_known = 0 group by 1 order by 2 desc")
    .all() as { g: string; n: number }[];
  if (gw.length)
    w.push({ level: "sari", key: "odeme", title: "Tanınmayan ödeme yöntemi", detail: gw.map((x) => `${x.g} (${x.n} sipariş)`).join(", ") + " — varsayılan komisyon uygulandı. Maliyetler → Kurallar'dan oran ekleyin.", href: "/maliyetler#kurallar" });

  if (metaConfigured()) {
    const gaps = c
      .prepare("select count(*) n, min(date) a, max(date) b from daily_pnl where meta_source = 'yok' and orders > 0 and date >= (select min(date) from ad_insights_daily)")
      .get() as { n: number; a: string | null; b: string | null };
    if (gaps.n) w.push({ level: "sari", key: "reklam-eksik", title: `${gaps.n} gün için reklam verisi eksik`, detail: `Satış olan ama Meta harcaması gelmeyen günler (${gaps.a} – ${gaps.b}).`, href: "/saglik" });
    for (const a of accountsToSync()) {
      const tz = getSetting(`meta_saat_dilimi_${a}`);
      if (tz) w.push({ level: "sari", key: `tz-${a}`, title: "Meta reklam hesabının saat dilimi İstanbul değil", detail: `${a} hesabı ${tz} saat dilimini kullanıyor; günlük harcamalar ${TZ} günleriyle birebir örtüşmeyebilir.`, href: "/saglik" });
    }
  }

  if (getJsonSetting<boolean>("shopify_60_gun", false))
    w.push({ level: "kirmizi", key: "60-gun", title: "Shopify yalnızca son 60 günün siparişlerini veriyor", detail: "Dev Dashboard'da uygulamaya read_all_orders iznini ekleyip yeni sürüm yayınlayın, sonra Ayarlar'dan “Tüm geçmişi yeniden çek” düğmesine basın.", href: "/saglik" });

  const mode = getSetting("shopify_alan_modu");
  if (mode && mode !== "tam")
    w.push({ level: "sari", key: "musteri", title: "Müşteri numarası okunamıyor", detail: "Shopify uygulamasında “korunan müşteri verisi” izni yok. Yeni müşteri CAC'si yaklaşık hesaplanıyor (her sipariş yeni müşteri sayılıyor).", href: "/saglik" });

  for (const src of ["shopify", "meta", "kur"] as const) {
    const l = lastSync(src);
    if (l?.status === "hata") w.push({ level: "sari", key: `hata-${src}`, title: `Son ${src === "kur" ? "kur" : src === "meta" ? "Meta" : "Shopify"} senkronu başarısız`, detail: l.message ?? undefined, href: "/saglik" });
  }

  const fxMissing = getJsonSetting<number>("kur_eksik_gun", 0);
  if (fxMissing) w.push({ level: "sari", key: "kur", title: `${fxMissing} gün için döviz kuru yok`, detail: "USD/EUR giderler bu günlerde hesaba girmedi. Kur senkronu tamamlanınca düzelir.", href: "/saglik" });

  const lastBackup = getSetting("son_yedek");
  if (!lastBackup || Date.now() - new Date(lastBackup).getTime() > 3 * 86400000)
    w.push({ level: "sari", key: "yedek", title: lastBackup ? "Son 3 gündür yedek alınmadı" : "Henüz yedek alınmadı", detail: "Ayarlar ekranından yedek klasörünü seçip “Şimdi yedekle”ye basın.", href: "/saglik#yedek" });

  return w;
}

export function connectionSummary() {
  return {
    shopifyDomain: env("SHOPIFY_STORE_DOMAIN"),
    shopName: getSetting("shopify_magaza_adi"),
    shopifyScopes: getSetting("shopify_izinler"),
    metaAccounts: getDb().$client.prepare("select id, name, timezone, currency, allowed, last_checked_at from ad_accounts order by allowed desc, id").all() as {
      id: string;
      name: string | null;
      timezone: string | null;
      currency: string | null;
      allowed: number;
      last_checked_at: string | null;
    }[],
    metaDaysLeft: tokenDaysLeft(),
  };
}
