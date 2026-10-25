// Shopify senkronu — yalnızca OKUMA. Hiçbir mutation (bulkOperationRunQuery hariç; o da yalnızca okuma sorgusu başlatır) yoktur.
import readline from "node:readline";
import { Readable } from "node:stream";
import { getDb } from "../db";
import { env, normalizeDomain, SECRET_KEYS, SHOPIFY_API_VERSION, readEnv } from "../config";
import { recalcAll } from "../calc/recalc";
import { addEvent } from "../services";
import { getJsonSetting, getSetting, setJsonSetting, setSetting } from "../settings";
import { todayIst, istDate } from "../time";
import { clearLockError, finishSync, lastSync, LockError, setLockError, startSync } from "./log";
import { fetchWithTimeout, HttpError, scrub, sleep } from "./http";

// ---------- Erişim anahtarı (client credentials, 24 saat; süresi dolmadan yenilenir) ----------

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

function secrets(): string[] {
  const e = readEnv();
  return SECRET_KEYS.map((k) => e[k] ?? "").concat(tokenCache?.token ?? "");
}

export function shopifyConfigured(): boolean {
  return !!(env("SHOPIFY_STORE_DOMAIN") && env("SHOPIFY_CLIENT_ID") && env("SHOPIFY_CLIENT_SECRET"));
}

async function getToken(force = false): Promise<string> {
  const domain = normalizeDomain(env("SHOPIFY_STORE_DOMAIN"));
  const id = env("SHOPIFY_CLIENT_ID");
  const secret = env("SHOPIFY_CLIENT_SECRET");
  if (!domain || !id || !secret) throw new Error("Shopify anahtarları girilmemiş. Kurulum ekranından girin.");
  const key = `${domain}|${id}`;
  if (!force && tokenCache && tokenCache.key === key && tokenCache.expiresAt - Date.now() > 60 * 60 * 1000) return tokenCache.token;
  const res = await fetchWithTimeout(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }).toString(),
  });
  if (!res.ok) {
    const hint =
      res.status === 400 || res.status === 401
        ? "Client ID / Secret hatalı ya da uygulama mağazaya yüklenmemiş."
        : res.status === 404
          ? "Mağaza adresi bulunamadı."
          : `Shopify ${res.status} döndü.`;
    throw new HttpError(`Shopify anahtarı alınamadı: ${hint}`, res.status);
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number; scope?: string };
  tokenCache = { token: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 86399) * 1000, key };
  setSetting("shopify_izinler", j.scope ?? "");
  setSetting("shopify_anahtar_bitis", new Date(tokenCache.expiresAt).toISOString());
  return tokenCache.token;
}

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
  extensions?: { cost?: { requestedQueryCost: number; throttleStatus: { currentlyAvailable: number; restoreRate: number; maximumAvailable: number } } };
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = normalizeDomain(env("SHOPIFY_STORE_DOMAIN"));
  for (let attempt = 0; attempt < 6; attempt++) {
    const token = await getToken(attempt > 0 && attempt % 2 === 1);
    const res = await fetchWithTimeout(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) {
      tokenCache = null;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new HttpError(`Shopify isteği başarısız (${res.status}).`, res.status);
    const j = (await res.json()) as GqlResponse<T>;
    const throttled = j.errors?.some((e) => e.extensions?.code === "THROTTLED");
    const cost = j.extensions?.cost;
    if (throttled) {
      const need = cost?.requestedQueryCost ?? 500;
      const avail = cost?.throttleStatus.currentlyAvailable ?? 0;
      const rate = cost?.throttleStatus.restoreRate ?? 50;
      await sleep(Math.max(1000, ((need - avail) / rate) * 1000 + 500));
      continue;
    }
    if (j.errors?.length) throw new HttpError("Shopify sorgu hatası: " + scrub(j.errors.map((e) => e.message).join("; "), secrets()), 200, j.errors);
    // Kotayı korumak için düşük kalan puanda kısa bekleme
    if (cost && cost.throttleStatus.currentlyAvailable < cost.requestedQueryCost * 2) await sleep(1000);
    return j.data as T;
  }
  throw new HttpError("Shopify isteği tekrar denemelere rağmen başarısız.", 0);
}

// ---------- Kilit: bağlı mağaza ayardaki mağaza mı? ----------

export async function checkShopLock(): Promise<{ domain: string; name: string; currency: string; timezone: string }> {
  const want = normalizeDomain(env("SHOPIFY_STORE_DOMAIN"));
  const d = await gql<{ shop: { myshopifyDomain: string; name: string; currencyCode: string; ianaTimezone: string } }>(
    "{ shop { myshopifyDomain name currencyCode ianaTimezone } }",
  );
  const got = normalizeDomain(d.shop.myshopifyDomain);
  if (!want || got !== want) {
    const msg = `Bağlanılan mağaza (${got}) ayardaki mağaza (${want || "boş"}) değil. Senkron durduruldu, hiçbir veri yazılmadı.`;
    setLockError("shopify", msg);
    throw new LockError(msg);
  }
  clearLockError("shopify");
  getDb()
    .$client.prepare("update stores set name = ?, currency = ?, timezone = ? where domain = ?")
    .run(d.shop.name, d.shop.currencyCode, d.shop.ianaTimezone, got);
  setSetting("shopify_magaza_adi", d.shop.name);
  return { domain: got, name: d.shop.name, currency: d.shop.currencyCode, timezone: d.shop.ianaTimezone };
}

// ---------- Sorgu alanları ----------

const MONEY = "shopMoney { amount currencyCode }";
const VISIT = "source sourceType landingPage referrerUrl occurredAt utmParameters { campaign content medium source term }";
const LINE_FIELDS = `id title variantTitle name sku quantity currentQuantity isGiftCard requiresShipping
  originalUnitPriceSet { ${MONEY} } discountedTotalSet { ${MONEY} }
  discountAllocations { allocatedAmountSet { ${MONEY} } }
  product { id } variant { id }`;

/** Müşteri alanları "korunan müşteri verisi" izni ister; izin yoksa alanlar çıkarılarak tekrar denenir. */
type FieldMode = "tam" | "musterisiz" | "yolculuksuz";

function orderFields(mode: FieldMode): string {
  const customer = mode === "tam" ? "customer { id }" : "";
  const journey = mode === "yolculuksuz" ? "" : `customerJourneySummary { customerOrderIndex daysToConversion ready firstVisit { ${VISIT} } lastVisit { ${VISIT} } }`;
  return `id name createdAt processedAt updatedAt cancelledAt test
    displayFinancialStatus displayFulfillmentStatus currencyCode taxesIncluded
    totalPriceSet { ${MONEY} } currentTotalPriceSet { ${MONEY} } subtotalPriceSet { ${MONEY} }
    totalDiscountsSet { ${MONEY} } totalShippingPriceSet { ${MONEY} } totalTaxSet { ${MONEY} }
    paymentGatewayNames discountCodes tags sourceName
    ${customer}
    ${journey}
    refunds { id createdAt totalRefundedSet { ${MONEY} } }
    transactions(first: 25) { id kind status gateway processedAt amountSet { ${MONEY} } }
    fulfillments(first: 10) { createdAt }`;
}

function currentMode(): FieldMode {
  return (getSetting("shopify_alan_modu") as FieldMode) || "tam";
}

function isProtectedDataError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /customer|protected|not approved|access denied/i.test(m);
}

function downgrade(mode: FieldMode): FieldMode | null {
  return mode === "tam" ? "musterisiz" : mode === "musterisiz" ? "yolculuksuz" : null;
}

// ---------- Kayıt ----------

type Money = { shopMoney: { amount: string; currencyCode?: string } } | null | undefined;
const amt = (m: Money) => (m ? Number(m.shopMoney.amount) : 0);

interface OrderNode {
  id: string;
  name: string;
  createdAt: string;
  processedAt?: string;
  updatedAt: string;
  cancelledAt?: string | null;
  test: boolean;
  displayFinancialStatus?: string;
  displayFulfillmentStatus?: string;
  currencyCode?: string;
  taxesIncluded?: boolean;
  totalPriceSet: Money;
  currentTotalPriceSet: Money;
  subtotalPriceSet: Money;
  totalDiscountsSet: Money;
  totalShippingPriceSet: Money;
  totalTaxSet: Money;
  paymentGatewayNames: string[];
  discountCodes: string[];
  tags: string[];
  sourceName?: string;
  customer?: { id: string } | null;
  customerJourneySummary?: { customerOrderIndex?: number | null } | null;
  refunds: { id: string; createdAt: string; totalRefundedSet: Money }[];
  transactions: { id: string; kind: string; status: string; gateway: string; processedAt: string; amountSet: Money }[];
  fulfillments: { createdAt: string }[];
}

interface LineNode {
  id: string;
  title: string;
  variantTitle?: string | null;
  name?: string;
  sku?: string | null;
  quantity: number;
  originalUnitPriceSet: Money;
  discountedTotalSet: Money;
  discountAllocations: { allocatedAmountSet: Money }[];
  product?: { id: string } | null;
  variant?: { id: string } | null;
}

/** Siparişi ve satırlarını yazar. Değişen iadeler için satır ayrıntısı daha sonra ayrıca çekilir. */
export function saveOrder(o: OrderNode, lines: LineNode[], storeId = 1) {
  const c = getDb().$client;
  const total = amt(o.totalPriceSet);
  const subtotal = amt(o.subtotalPriceSet);
  const tax = amt(o.totalTaxSet);
  // Müşteriden alınan kargo: toplam − (indirimli ürün tutarı) [vergi fiyatlara dahilse ayrıca düşülmez]
  const shippingCharged = Math.max(0, Math.round((total - subtotal - (o.taxesIncluded === false ? tax : 0)) * 100) / 100);
  const fulfilled = o.fulfillments ?? [];
  const firstFul = fulfilled.map((f) => f.createdAt).sort()[0] ?? null;
  const tx = c.transaction(() => {
    const prevRefunds = new Map(
      (c.prepare("select id, total_refunded t from refunds where order_id = ?").all(o.id) as { id: string; t: number }[]).map((r) => [r.id, r.t]),
    );
    c.prepare(
      `insert into orders (id, store_id, name, created_at, processed_at, updated_at, cancelled_at, test, financial_status, fulfillment_status,
         currency, total_price, current_total_price, subtotal_price, total_discounts, total_shipping, shipping_charged, total_tax, gateways,
         discount_codes, tags, source_name, customer_id, customer_order_index, fulfillment_count, first_fulfilled_at, refunds_complete, raw_json)
       values (@id, @storeId, @name, @createdAt, @processedAt, @updatedAt, @cancelledAt, @test, @fs, @ffs, @currency, @total, @current, @subtotal,
         @discounts, @shipping, @shippingCharged, @tax, @gateways, @codes, @tags, @source, @customerId, @coi, @fc, @firstFul, @rc, @raw)
       on conflict(id) do update set name=excluded.name, processed_at=excluded.processed_at, updated_at=excluded.updated_at,
         cancelled_at=excluded.cancelled_at, test=excluded.test, financial_status=excluded.financial_status,
         fulfillment_status=excluded.fulfillment_status, currency=excluded.currency, total_price=excluded.total_price,
         current_total_price=excluded.current_total_price, subtotal_price=excluded.subtotal_price, total_discounts=excluded.total_discounts,
         total_shipping=excluded.total_shipping, shipping_charged=excluded.shipping_charged, total_tax=excluded.total_tax,
         gateways=excluded.gateways, discount_codes=excluded.discount_codes, tags=excluded.tags, source_name=excluded.source_name,
         customer_id=coalesce(excluded.customer_id, orders.customer_id), customer_order_index=coalesce(excluded.customer_order_index, orders.customer_order_index),
         fulfillment_count=excluded.fulfillment_count, first_fulfilled_at=excluded.first_fulfilled_at,
         refunds_complete=excluded.refunds_complete, raw_json=excluded.raw_json`,
    ).run({
      id: o.id,
      storeId,
      name: o.name,
      createdAt: o.createdAt,
      processedAt: o.processedAt ?? null,
      updatedAt: o.updatedAt,
      cancelledAt: o.cancelledAt ?? null,
      test: o.test ? 1 : 0,
      fs: o.displayFinancialStatus ?? null,
      ffs: o.displayFulfillmentStatus ?? null,
      currency: o.currencyCode ?? o.totalPriceSet?.shopMoney.currencyCode ?? null,
      total,
      current: amt(o.currentTotalPriceSet),
      subtotal,
      discounts: amt(o.totalDiscountsSet),
      shipping: amt(o.totalShippingPriceSet),
      shippingCharged,
      tax,
      gateways: JSON.stringify(o.paymentGatewayNames ?? []),
      codes: JSON.stringify(o.discountCodes ?? []),
      tags: JSON.stringify(o.tags ?? []),
      source: o.sourceName ?? null,
      customerId: o.customer?.id ?? null,
      coi: o.customerJourneySummary?.customerOrderIndex ?? null,
      fc: fulfilled.length,
      firstFul,
      rc: o.refunds?.every((r) => prevRefunds.get(r.id) === amt(r.totalRefundedSet)) ? 1 : 0,
      raw: JSON.stringify(o),
    });

    c.prepare("delete from order_lines where order_id = ?").run(o.id);
    const insL = c.prepare(
      `insert into order_lines (id, order_id, title, variant_title, name, sku, quantity, original_unit_price, discounted_total, discount_allocated, product_id, variant_id, raw_json)
       values (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const l of lines) {
      const alloc = (l.discountAllocations ?? []).reduce((s, d) => s + amt(d.allocatedAmountSet), 0);
      insL.run(l.id, o.id, l.title, l.variantTitle ?? null, l.name ?? null, l.sku ?? null, l.quantity, amt(l.originalUnitPriceSet), amt(l.discountedTotalSet), alloc, l.product?.id ?? null, l.variant?.id ?? null, JSON.stringify(l));
    }

    // İadeler: yeni ya da tutarı değişen iade → satır ayrıntısı yeniden çekilecek (lines_loaded = 0)
    const keep = new Set<string>();
    for (const r of o.refunds ?? []) {
      keep.add(r.id);
      const t = amt(r.totalRefundedSet);
      if (prevRefunds.get(r.id) === t) continue;
      c.prepare(
        `insert into refunds (id, order_id, created_at, total_refunded, lines_loaded, raw_json) values (?,?,?,?,0,?)
         on conflict(id) do update set created_at=excluded.created_at, total_refunded=excluded.total_refunded, lines_loaded=0, raw_json=excluded.raw_json`,
      ).run(r.id, o.id, r.createdAt, t, JSON.stringify(r));
    }
    for (const id of prevRefunds.keys())
      if (!keep.has(id)) {
        c.prepare("delete from refund_lines where refund_id = ?").run(id);
        c.prepare("delete from refunds where id = ?").run(id);
      }

    const insT = c.prepare(
      `insert or replace into transactions (id, order_id, kind, status, gateway, amount, currency, processed_at, raw_json) values (?,?,?,?,?,?,?,?,?)`,
    );
    for (const t of o.transactions ?? []) insT.run(t.id, o.id, t.kind, t.status, t.gateway, amt(t.amountSet), t.amountSet?.shopMoney.currencyCode ?? null, t.processedAt, JSON.stringify(t));
  });
  tx();
}

/** İade satırlarını (adet, stoğa dönüş türü, tutar) çeker. Toplu sorgu liste içindeki bağlantıları desteklemediği için ayrıdır. */
async function loadRefundLines(): Promise<number> {
  const c = getDb().$client;
  const pending = c.prepare("select id, order_id orderId from refunds where lines_loaded = 0").all() as { id: string; orderId: string }[];
  let n = 0;
  for (let i = 0; i < pending.length; i += 4) {
    const batch = pending.slice(i, i + 4);
    const d = await gql<{ nodes: ({ id: string; refundLineItems: { nodes: { id?: string; quantity: number; restockType: string; subtotalSet: Money; lineItem: { id: string } }[]; pageInfo: { hasNextPage: boolean } } } | null)[] }>(
      `query($ids: [ID!]!) { nodes(ids: $ids) { ... on Refund { id
          refundLineItems(first: 30) { nodes { id quantity restockType subtotalSet { ${MONEY} } lineItem { id } } pageInfo { hasNextPage } } } } }`,
      { ids: batch.map((b) => b.id) },
    );
    c.transaction(() => {
      for (const node of d.nodes) {
        if (!node) continue;
        const orderId = batch.find((b) => b.id === node.id)!.orderId;
        c.prepare("delete from refund_lines where refund_id = ?").run(node.id);
        node.refundLineItems.nodes.forEach((rl, k) =>
          c
            .prepare("insert into refund_lines (id, refund_id, order_id, line_item_id, quantity, restock_type, subtotal, raw_json) values (?,?,?,?,?,?,?,?)")
            .run(rl.id ?? `${node.id}/${k}`, node.id, orderId, rl.lineItem.id, rl.quantity, rl.restockType, amt(rl.subtotalSet), JSON.stringify(rl)),
        );
        c.prepare("update refunds set lines_loaded = 1 where id = ?").run(node.id);
        n++;
      }
    })();
  }
  return n;
}

// ---------- İlk yükleme: toplu sorgu (bulk operation) ----------

async function runBulk(mode: FieldMode, onProgress: (msg: string) => void): Promise<number> {
  const q = `{ orders(sortKey: CREATED_AT) { edges { node { ${orderFields(mode)} lineItems { edges { node { ${LINE_FIELDS} } } } } } } }`;
  const start = await gql<{ bulkOperationRunQuery: { bulkOperation: { id: string; status: string } | null; userErrors: { message: string }[] } }>(
    `mutation($q: String!) { bulkOperationRunQuery(query: $q) { bulkOperation { id status } userErrors { field message } } }`,
    { q },
  );
  const errs = start.bulkOperationRunQuery.userErrors;
  if (errs.length || !start.bulkOperationRunQuery.bulkOperation) throw new HttpError("Toplu sorgu başlatılamadı: " + errs.map((e) => e.message).join("; "), 200, errs);
  const id = start.bulkOperationRunQuery.bulkOperation.id;
  setSetting("shopify_toplu_islem", id);

  let url: string | null = null;
  for (;;) {
    await sleep(5000);
    const s = await gql<{ bulkOperation: { status: string; errorCode: string | null; objectCount: string; url: string | null; partialDataUrl: string | null } }>(
      `query($id: ID!) { bulkOperation(id: $id) { status errorCode objectCount url partialDataUrl } }`,
      { id },
    );
    const op = s.bulkOperation;
    onProgress(`Shopify geçmiş siparişleri hazırlıyor: ${op.objectCount} kayıt`);
    if (op.status === "COMPLETED") {
      url = op.url;
      break;
    }
    if (op.status === "FAILED" || op.status === "CANCELED" || op.status === "EXPIRED")
      throw new HttpError(`Toplu sorgu ${op.status === "FAILED" ? "başarısız" : "iptal edildi"} (${op.errorCode ?? "?"}).`, 200);
  }
  if (!url) return 0; // hiç sipariş yok

  const res = await fetchWithTimeout(url, {}, 30 * 60 * 1000);
  if (!res.ok || !res.body) throw new HttpError("Toplu sorgu dosyası indirilemedi.", res.status);
  const rl = readline.createInterface({ input: Readable.fromWeb(res.body as never), crlfDelay: Infinity });
  let cur: OrderNode | null = null;
  let lines: LineNode[] = [];
  let count = 0;
  for await (const raw of rl) {
    if (!raw.trim()) continue;
    const obj = JSON.parse(raw) as { id?: string; __parentId?: string };
    if (obj.__parentId) {
      if (obj.id?.includes("/LineItem/")) lines.push(obj as unknown as LineNode);
      continue;
    }
    if (cur) {
      saveOrder(cur, lines);
      count++;
      if (count % 500 === 0) onProgress(`Shopify: ${count} sipariş kaydedildi`);
    }
    cur = obj as unknown as OrderNode;
    lines = [];
  }
  if (cur) {
    saveOrder(cur, lines);
    count++;
  }
  return count;
}

// ---------- Artımlı senkron ----------

function isCostError(e: unknown): boolean {
  return /max(imum)? cost|exceeds the single query|MAX_COST_EXCEEDED/i.test(e instanceof Error ? e.message : String(e));
}

async function runIncremental(mode: FieldMode, sinceIso: string): Promise<{ count: number; maxUpdated: string | null }> {
  let after: string | null = null;
  let count = 0;
  let maxUpdated: string | null = null;
  let pageSize = 5;
  for (;;) {
    let d: {
      orders: { nodes: (OrderNode & { lineItems: { nodes: LineNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } })[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
    };
    try {
      d = await gql(
        `query($q: String!, $after: String, $n: Int!) { orders(first: $n, after: $after, query: $q, sortKey: UPDATED_AT) {
            nodes { ${orderFields(mode)} lineItems(first: 20) { nodes { ${LINE_FIELDS} } pageInfo { hasNextPage endCursor } } }
            pageInfo { hasNextPage endCursor } } }`,
        { q: `updated_at:>='${sinceIso}'`, after, n: pageSize },
      );
    } catch (e) {
      // Tek sorgu maliyet sınırı (1000) aşılırsa sayfa küçültülür
      if (isCostError(e) && pageSize > 1) {
        pageSize = Math.max(1, Math.floor(pageSize / 2));
        continue;
      }
      throw e;
    }
    for (const o of d.orders.nodes) {
      const lines = [...o.lineItems.nodes];
      let lp = o.lineItems.pageInfo;
      while (lp.hasNextPage) {
        const more: { order: { lineItems: { nodes: LineNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } } = await gql(
          `query($id: ID!, $after: String) { order(id: $id) { lineItems(first: 30, after: $after) { nodes { ${LINE_FIELDS} } pageInfo { hasNextPage endCursor } } } }`,
          { id: o.id, after: lp.endCursor },
        );
        lines.push(...more.order.lineItems.nodes);
        lp = more.order.lineItems.pageInfo;
      }
      saveOrder(o, lines);
      count++;
      if (!maxUpdated || o.updatedAt > maxUpdated) maxUpdated = o.updatedAt;
    }
    if (!d.orders.pageInfo.hasNextPage) break;
    after = d.orders.pageInfo.endCursor;
  }
  return { count, maxUpdated };
}

// ---------- Ürünler ve fiyat geçmişi ----------

export async function syncProducts(): Promise<number> {
  const c = getDb().$client;
  const today = todayIst();
  let after: string | null = null;
  let n = 0;
  const prev = new Map(
    (c.prepare("select id, product_id, price, compare_at_price cap, title from variants").all() as { id: string; product_id: string; price: number | null; cap: number | null; title: string | null }[]).map((v) => [v.id, v]),
  );
  for (;;) {
    const d: {
      products: {
        nodes: { id: string; title: string; handle: string; status: string; productType: string; createdAt: string; updatedAt: string; variants: { nodes: { id: string; title: string; sku: string | null; price: string; compareAtPrice: string | null }[] } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await gql(
      `query($after: String) { products(first: 10, after: $after) { nodes { id title handle status productType createdAt updatedAt
          variants(first: 50) { nodes { id title sku price compareAtPrice } } } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    c.transaction(() => {
      for (const p of d.products.nodes) {
        c.prepare(
          `insert into products (id, title, handle, status, product_type, created_at, updated_at, raw_json) values (?,?,?,?,?,?,?,?)
           on conflict(id) do update set title=excluded.title, handle=excluded.handle, status=excluded.status, product_type=excluded.product_type,
             updated_at=excluded.updated_at, raw_json=excluded.raw_json`,
        ).run(p.id, p.title, p.handle, p.status, p.productType, p.createdAt, p.updatedAt, JSON.stringify({ ...p, variants: undefined }));
        for (const v of p.variants.nodes) {
          const price = v.price === null ? null : Number(v.price);
          const cap = v.compareAtPrice === null ? null : Number(v.compareAtPrice);
          const old = prev.get(v.id);
          if (old) {
            const label = `${p.title}${v.title && v.title !== "Default Title" ? " / " + v.title : ""}`;
            if (old.price !== price)
              addEvent({ date: today, type: "fiyat", title: `Fiyat değişti: ${label}`, detail: `${old.price ?? "—"} → ${price ?? "—"}`, productId: p.id, variantId: v.id, source: "otomatik" });
            if (old.cap !== cap)
              addEvent({ date: today, type: "indirimsiz_fiyat", title: `İndirimsiz fiyat değişti: ${label}`, detail: `${old.cap ?? "—"} → ${cap ?? "—"}`, productId: p.id, variantId: v.id, source: "otomatik" });
          }
          c.prepare(
            `insert into variants (id, product_id, title, sku, price, compare_at_price, raw_json) values (?,?,?,?,?,?,?)
             on conflict(id) do update set product_id=excluded.product_id, title=excluded.title, sku=excluded.sku, price=excluded.price,
               compare_at_price=excluded.compare_at_price, raw_json=excluded.raw_json`,
          ).run(v.id, p.id, v.title, v.sku, price, cap, JSON.stringify(v));
          c.prepare("insert or replace into price_history (variant_id, product_id, date, source, price, compare_at_price) values (?,?,?,'gunluk',?,?)").run(v.id, p.id, today, price, cap);
          n++;
        }
      }
    })();
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  return n;
}

// ---------- Ana giriş noktası ----------

let running = false;

export function shopifyRunning() {
  return running;
}

/**
 * Shopify senkronu. İlk çalıştırmada tüm geçmişi toplu sorguyla, sonra son başarılı senkrondan 15 dk geriye kadar değişenleri çeker.
 * Mac kapalı kaldıysa açılışta aradaki boşluk aynı yolla kendiliğinden dolar.
 */
export async function syncShopify(opts: { products?: boolean; onProgress?: (m: string) => void } = {}): Promise<{ status: "ok" | "hata" | "kilit" | "atlandi"; message: string }> {
  if (running) return { status: "atlandi", message: "Shopify senkronu zaten çalışıyor." };
  if (!shopifyConfigured()) return { status: "atlandi", message: "Shopify anahtarları henüz girilmedi." };
  running = true;
  const progress = opts.onProgress ?? ((m: string) => setSetting("shopify_ilerleme", m));
  const initialDone = getSetting("shopify_ilk_yukleme") === "tamam";
  const logId = startSync("shopify", initialDone ? "artimli" : "ilk");
  const startedAt = new Date();
  try {
    // 1) Kilit: her senkronun başında, hiçbir şey yazılmadan önce
    await checkShopLock();

    let count = 0;
    let cursor: string | null = null;
    let mode = currentMode();
    for (;;) {
      try {
        if (!initialDone) {
          count = await runBulk(mode, progress);
          cursor = new Date(startedAt.getTime() - 15 * 60 * 1000).toISOString();
          setSetting("shopify_ilk_yukleme", "tamam");
        } else {
          const prev = lastSync("shopify", { status: "ok" });
          const since = new Date(new Date(prev?.cursor ?? prev?.started_at ?? startedAt.toISOString()).getTime() - 15 * 60 * 1000).toISOString();
          const r = await runIncremental(mode, since);
          count = r.count;
          cursor = startedAt.toISOString();
        }
        break;
      } catch (e) {
        const next = downgrade(mode);
        if (next && isProtectedDataError(e)) {
          mode = next;
          setSetting("shopify_alan_modu", mode);
          continue;
        }
        throw e;
      }
    }
    progress("Shopify: iade ayrıntıları çekiliyor");
    const refundLines = await loadRefundLines();

    const lastProducts = getSetting("shopify_urun_tarihi");
    let productCount = 0;
    if (opts.products || lastProducts !== todayIst()) {
      productCount = await syncProducts();
      setSetting("shopify_urun_tarihi", todayIst());
    }

    detectHistoryLimit();
    if (count || refundLines || productCount || !initialDone) recalcAll();
    const msg = `${count} sipariş, ${refundLines} iade ayrıntısı${productCount ? `, ${productCount} varyant` : ""}`;
    finishSync(logId, "ok", msg, count, cursor);
    progress("");
    return { status: "ok", message: msg };
  } catch (e) {
    const isLock = e instanceof LockError;
    const msg = scrub(e instanceof Error ? e.message : String(e), secrets());
    finishSync(logId, isLock ? "kilit" : "hata", msg);
    progress("");
    return { status: isLock ? "kilit" : "hata", message: msg };
  } finally {
    running = false;
  }
}

/** 60 gün sınırı: Shopify'dan gelen en eski sipariş TrueProfit'teki en eski siparişten çok yeniyse uyarı bırakır. */
function detectHistoryLimit() {
  const c = getDb().$client;
  const oldest = (c.prepare("select min(created_at) d from orders").get() as { d: string | null }).d;
  const tpOldest = (c.prepare("select min(date) d from tp_orders").get() as { d: string | null }).d;
  const limited = !!oldest && !!tpOldest && istDate(oldest) > tpOldest && Date.now() - new Date(oldest).getTime() < 75 * 86400000;
  setJsonSetting("shopify_60_gun", limited);
}

export function shopifyFieldMode(): FieldMode {
  return currentMode();
}

export function getShopifyProgress(): string {
  return getSetting("shopify_ilerleme") ?? "";
}

export const _test = { resetToken: () => (tokenCache = null), getJsonSetting };
