"use server";
// Form işlemleri. Her işlem sonucu sayfaya ?mesaj= ya da ?hata= ile döner.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addCostVersion,
  addRuleVersion,
  closeFixedCost,
  createModel,
  deleteCostVersion,
  deleteFixedCost,
  deleteShipment,
  InputError,
  saveFixedCost,
  saveShipment,
  setMapping,
  updateModel,
} from "@/lib/services";
import { allowedAdAccounts, BLOCKED_AD_ACCOUNTS, normalizeAdAccount, normalizeDomain, writeEnv, env } from "@/lib/config";
import { ensureStructure } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { setSetting } from "@/lib/settings";
import { checkShopLock } from "@/lib/sync/shopify";
import { checkAccount, debugToken, exchangeToken, saveMetaToken } from "@/lib/sync/meta";
import { triggerNow } from "@/lib/scheduler";
import { runBackup } from "@/lib/backup";
import { recalcAll } from "@/lib/calc/recalc";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const numOrNull = (s: string) => (s === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));
/** "1.234,56" ya da "1234.56" → 1234.56 */
function money(s: string): number {
  const t = s.replace(/\s|₺/g, "");
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  return Number(t);
}

function back(path: string, kind: "mesaj" | "hata", text: string, hash = ""): never {
  revalidatePath("/", "layout");
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text)}${hash}`);
}

async function run(path: string, ok: string, fn: () => unknown | Promise<unknown>, hash = ""): Promise<never> {
  let err: string | null = null;
  try {
    await fn();
  } catch (e) {
    err = e instanceof InputError ? e.message : `İşlem yapılamadı: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (err) back(path, "hata", err, hash);
  back(path, "mesaj", ok, hash);
}

// ---------- Giderler ----------

export async function saveFixedCostAction(f: FormData) {
  const id = Number(str(f, "id")) || null;
  await run("/giderler", id ? "Gider güncellendi." : "Gider eklendi.", () =>
    saveFixedCost(id, {
      section: str(f, "section"),
      name: str(f, "name"),
      category: str(f, "category"),
      amount: money(str(f, "amount")),
      currency: str(f, "currency") || "TRY",
      frequency: str(f, "frequency"),
      spreadMonths: numOrNull(str(f, "spreadMonths")),
      startDate: str(f, "startDate"),
      endDate: str(f, "endDate") || null,
      note: str(f, "note"),
    }),
  );
}

export async function closeFixedCostAction(f: FormData) {
  await run("/giderler", "Gider kapatıldı (bitiş tarihi verildi).", () => closeFixedCost(Number(str(f, "id")), str(f, "endDate")));
}

export async function deleteFixedCostAction(f: FormData) {
  await run("/giderler", "Gider silindi.", () => deleteFixedCost(Number(str(f, "id"))));
}

export async function saveShipmentAction(f: FormData) {
  const id = Number(str(f, "id")) || null;
  await run(
    "/giderler",
    "Gönderim kaydedildi.",
    () => saveShipment(id, { date: str(f, "date"), modelCode: str(f, "modelCode"), qty: Number(str(f, "qty") || 1), personNote: str(f, "personNote"), withShipping: f.get("withShipping") === "on" }),
    "#gonderimler",
  );
}

export async function deleteShipmentAction(f: FormData) {
  await run("/giderler", "Gönderim silindi.", () => deleteShipment(Number(str(f, "id"))), "#gonderimler");
}

// ---------- Maliyetler ----------

export async function addCostVersionAction(f: FormData) {
  const cost = str(f, "unitCost");
  await run("/maliyetler", "Yeni maliyet sürümü eklendi; siparişler yeniden hesaplandı.", () =>
    addCostVersion({ modelCode: str(f, "modelCode"), unitCost: cost === "" ? null : money(cost), validFrom: str(f, "validFrom"), breakdown: str(f, "breakdown"), note: str(f, "note") }),
  );
}

export async function deleteCostVersionAction(f: FormData) {
  await run("/maliyetler", "Maliyet sürümü silindi.", () => deleteCostVersion(Number(str(f, "id"))));
}

export async function createModelAction(f: FormData) {
  const cost = str(f, "unitCost");
  const back_ = str(f, "back") || "/maliyetler";
  await run(back_, "Yeni model açıldı.", () =>
    createModel({ name: str(f, "name"), category: str(f, "category"), material: str(f, "material"), unitCost: cost === "" ? null : money(cost), validFrom: str(f, "validFrom"), breakdown: str(f, "breakdown"), note: str(f, "note") }),
  );
}

export async function updateModelAction(f: FormData) {
  await run("/maliyetler", "Model güncellendi.", () => updateModel(str(f, "code"), { name: str(f, "name"), category: str(f, "category"), material: str(f, "material"), active: f.get("active") === "on" }));
}

export async function addRuleAction(f: FormData) {
  await run(
    "/maliyetler",
    "Kural kaydedildi; siparişler yeniden hesaplandı.",
    () => addRuleVersion({ type: str(f, "type"), unit: str(f, "unit"), scope: str(f, "scope") || null, value: money(str(f, "value")), validFrom: str(f, "validFrom"), note: str(f, "note") }),
    "#kurallar",
  );
}

export async function setMappingAction(f: FormData) {
  const models = f.getAll("model").map(String);
  const qtys = f.getAll("qty").map((x) => Number(x) || 1);
  const components = models.map((m, i) => ({ model: m, qty: qtys[i] ?? 1 })).filter((c) => c.model);
  const keyType = str(f, "keyType") as "variant_id" | "product_id" | "sku" | "title";
  await run(
    str(f, "back") || "/maliyetler",
    "Eşleştirme kaydedildi; geçmiş ve gelecek siparişlere uygulandı.",
    () => {
      if (!components.length) throw new InputError("En az bir model seçin.");
      setMapping({ keyType, keyValue: str(f, "keyValue"), label: str(f, "label"), components });
    },
    "#eslesmeyenler",
  );
}

// ---------- Senkron ve yedek ----------

export async function syncNowAction(f: FormData) {
  const what = str(f, "what") as "shopify" | "meta" | "kur" | "hepsi";
  triggerNow(what);
  back("/saglik", "mesaj", "Senkron arka planda başladı. Bu sayfa kendiliğinden yenilenecek.");
}

export async function resetShopifyHistoryAction() {
  setSetting("shopify_ilk_yukleme", "");
  triggerNow("shopify");
  back("/saglik", "mesaj", "Tüm sipariş geçmişi yeniden çekiliyor. Bu birkaç dakika sürebilir.");
}

export async function backupNowAction() {
  const r = await runBackup();
  back("/saglik", r.status === "ok" ? "mesaj" : "hata", r.message, "#yedek");
}

export async function setBackupDirAction(f: FormData) {
  const custom = str(f, "custom");
  const choice = str(f, "dir");
  const dir = choice === "ozel" ? custom : choice;
  if (!dir) back("/saglik", "hata", "Bir klasör seçin.", "#yedek");
  if (!dir.startsWith("/")) back("/saglik", "hata", "Klasör yolu / ile başlamalı (ör. /Users/ad/Library/...).", "#yedek");
  setSetting("yedek_klasoru", dir);
  back("/saglik", "mesaj", "Yedek klasörü kaydedildi. “Şimdi yedekle” ile deneyebilirsiniz.", "#yedek");
}

// ---------- Kurulum ----------

export async function saveShopifyAction(f: FormData) {
  const domain = normalizeDomain(str(f, "domain"));
  const clientId = str(f, "clientId");
  const secret = str(f, "clientSecret");
  if (!domain.endsWith(".myshopify.com")) back("/kurulum", "hata", "Mağaza adresi .myshopify.com ile bitmeli.", "#shopify");
  if (!clientId) back("/kurulum", "hata", "Client ID boş olamaz.", "#shopify");
  writeEnv({ SHOPIFY_STORE_DOMAIN: domain, SHOPIFY_CLIENT_ID: clientId, ...(secret ? { SHOPIFY_CLIENT_SECRET: secret } : {}) });
  if (!env("SHOPIFY_CLIENT_SECRET")) back("/kurulum", "hata", "Client secret boş olamaz.", "#shopify");
  ensureStructure(getDb());
  let err: string | null = null;
  let shopName = "";
  try {
    const s = await checkShopLock();
    shopName = s.name;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  if (err) back("/kurulum", "hata", err, "#shopify");
  triggerNow("shopify");
  back("/kurulum", "mesaj", `Shopify bağlandı: ${shopName}. Tüm sipariş geçmişi arka planda çekiliyor.`, "#meta");
}

export async function saveMetaAction(f: FormData) {
  const appId = str(f, "appId") || env("META_APP_ID");
  const appSecret = str(f, "appSecret") || env("META_APP_SECRET");
  const shortToken = str(f, "token");
  const backTo = str(f, "back") || "/kurulum";
  if (!appId || !appSecret || !shortToken) back(backTo, "hata", "Uygulama Kimliği, Uygulama Gizli Anahtarı ve anahtar alanları dolu olmalı.", "#meta");
  let err: string | null = null;
  let summary = "";
  try {
    const { token, expiresAt } = await exchangeToken(appId, appSecret, shortToken);
    const info = await debugToken(appId, appSecret, token).catch(() => null);
    const extra = info?.scopes.filter((s) => s !== "ads_read" && s !== "public_profile") ?? [];
    saveMetaToken(token, expiresAt, appId, appSecret);
    if (!env("META_ALLOWED_AD_ACCOUNTS")) writeEnv({ META_ALLOWED_AD_ACCOUNTS: "act_426980502817664" });
    ensureStructure(getDb());
    const names: string[] = [];
    for (const a of allowedAdAccounts().filter((x) => !BLOCKED_AD_ACCOUNTS.includes(x))) {
      const acc = await checkAccount(a);
      names.push(`${acc.name} (${acc.timezone_name})`);
    }
    summary = `Meta bağlandı: ${names.join(", ")}. Anahtar ${expiresAt ? new Date(expiresAt).toLocaleDateString("tr-TR") : "süresiz"} tarihine kadar geçerli.`;
    if (extra.length) summary += ` Not: anahtarda ads_read dışında izinler de var (${extra.join(", ")}); panel yalnızca okuma yapar.`;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  if (err) back(backTo, "hata", err, "#meta");
  triggerNow("meta");
  back(backTo, "mesaj", summary + " Geçmiş reklam verisi arka planda arşivleniyor.", "#meta");
}

export async function setAdAccountAction(f: FormData) {
  const id = normalizeAdAccount(str(f, "account"));
  const allow = str(f, "allow") === "1";
  if (BLOCKED_AD_ACCOUNTS.includes(id)) back("/saglik", "hata", "Bu hesap (Jantifox) hiçbir koşulda izin listesine eklenemez.", "#hesaplar");
  if (!/^act_\d+$/.test(id)) back("/saglik", "hata", "Hesap numarası yalnızca rakamlardan oluşmalı.", "#hesaplar");
  const cur = new Set(allowedAdAccounts());
  if (allow) cur.add(id);
  else cur.delete(id);
  writeEnv({ META_ALLOWED_AD_ACCOUNTS: [...cur].join(",") });
  ensureStructure(getDb());
  if (allow) setSetting(`meta_arsiv_${id}`, "");
  recalcAll();
  back("/saglik", "mesaj", allow ? `${id} izin listesine eklendi; geçmiş verisi bir sonraki senkronda çekilecek.` : `${id} izin listesinden çıkarıldı; bu hesabın harcaması artık hesaba girmiyor.`, "#hesaplar");
}
