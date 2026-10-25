// §9.1 Kilit testi + Shopify/Meta okuma akışının sahte ağ yanıtlarıyla denenmesi.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { writeEnv } from "@/lib/config";
import { ENV_PATH } from "@/lib/paths";
import { syncShopify, _test as shopifyTest } from "@/lib/sync/shopify";
import { accountsToSync, syncMeta } from "@/lib/sync/meta";
import { getLockErrors } from "@/lib/sync/log";
import { setSetting } from "@/lib/settings";
import { parseTcmb } from "@/lib/sync/fx";
import { freshDb } from "./db";
import type { DB } from "@/lib/db";

let db: DB;
type Call = { url: string; body: string; headers: Record<string, string> };
let calls: Call[] = [];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function mockFetch(handler: (url: string, body: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, body, headers: (init?.headers ?? {}) as Record<string, string> });
    return handler(url, body);
  });
}

beforeEach(() => {
  db = freshDb();
  calls = [];
  shopifyTest.resetToken();
  if (fs.existsSync(ENV_PATH)) fs.rmSync(ENV_PATH);
  db.$client.prepare("insert into brands (id, name) values (1, 'Text To Next')").run();
  db.$client.prepare("insert into stores (id, brand_id, domain) values (1, 1, '52ae29-e0.myshopify.com')").run();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const count = (t: string) => (db.$client.prepare(`select count(*) n from ${t}`).get() as { n: number }).n;

describe("§9.1 kilit — Shopify", () => {
  it("bağlanılan mağaza ayardaki mağaza değilse senkron durur ve hiçbir veri yazılmaz", async () => {
    writeEnv({ SHOPIFY_STORE_DOMAIN: "52ae29-e0.myshopify.com", SHOPIFY_CLIENT_ID: "cid", SHOPIFY_CLIENT_SECRET: "gizli-secret-123" });
    mockFetch((url, body) => {
      if (url.endsWith("/admin/oauth/access_token")) return json({ access_token: "tok-abc-123456", expires_in: 86399, scope: "read_orders" });
      if (body.includes("myshopifyDomain")) return json({ data: { shop: { myshopifyDomain: "jantifox.myshopify.com", name: "JantiFox", currencyCode: "TRY", ianaTimezone: "Europe/Istanbul" } } });
      return json({ data: {} });
    });
    const r = await syncShopify();
    expect(r.status).toBe("kilit");
    expect(r.message).toContain("jantifox.myshopify.com");
    expect(count("orders")).toBe(0);
    expect(count("products")).toBe(0);
    expect(calls.some((c) => c.body.includes("bulkOperationRunQuery") || c.body.includes("orders("))).toBe(false);
    expect(getLockErrors().map((x) => x.source)).toContain("shopify");
    // gizli değerler mesajlarda yok
    const logs = db.$client.prepare("select message from sync_log").all() as { message: string }[];
    expect(JSON.stringify(logs)).not.toContain("gizli-secret-123");
  });

  it("doğru mağazada toplu sorgu ile siparişler okunur, iade satırları ayrıca çekilir; hiçbir yazma mutation'ı yoktur", async () => {
    writeEnv({ SHOPIFY_STORE_DOMAIN: "52ae29-e0.myshopify.com", SHOPIFY_CLIENT_ID: "cid", SHOPIFY_CLIENT_SECRET: "sec" });
    const order = {
      id: "gid://shopify/Order/1",
      name: "#13885",
      createdAt: "2026-10-22T10:00:00Z",
      processedAt: "2026-10-22T10:00:00Z",
      updatedAt: "2026-10-23T10:00:00Z",
      cancelledAt: null,
      test: false,
      displayFinancialStatus: "PARTIALLY_REFUNDED",
      displayFulfillmentStatus: "FULFILLED",
      currencyCode: "TRY",
      taxesIncluded: true,
      totalPriceSet: { shopMoney: { amount: "2898.0", currencyCode: "TRY" } },
      currentTotalPriceSet: { shopMoney: { amount: "1449.0" } },
      subtotalPriceSet: { shopMoney: { amount: "2898.0" } },
      totalDiscountsSet: { shopMoney: { amount: "0.0" } },
      totalShippingPriceSet: { shopMoney: { amount: "0.0" } },
      totalTaxSet: { shopMoney: { amount: "483.0" } },
      paymentGatewayNames: ["Paytr"],
      discountCodes: [],
      tags: [],
      sourceName: "web",
      customer: { id: "gid://shopify/Customer/9" },
      customerJourneySummary: { customerOrderIndex: 1 },
      refunds: [{ id: "gid://shopify/Refund/5", createdAt: "2026-10-24T08:00:00Z", totalRefundedSet: { shopMoney: { amount: "1449.0" } } }],
      transactions: [],
      fulfillments: [{ createdAt: "2026-10-22T15:00:00Z" }],
    };
    const line = {
      id: "gid://shopify/LineItem/11",
      __parentId: order.id,
      title: "Astor + Chloe Couple Zaman Kapsülü",
      variantTitle: null,
      name: "Astor + Chloe Couple Zaman Kapsülü",
      sku: null,
      quantity: 1,
      originalUnitPriceSet: { shopMoney: { amount: "2898.0" } },
      discountedTotalSet: { shopMoney: { amount: "2898.0" } },
      discountAllocations: [],
      product: { id: "gid://shopify/Product/3" },
      variant: { id: "gid://shopify/ProductVariant/4" },
    };
    mockFetch((url, body) => {
      if (url.endsWith("/admin/oauth/access_token")) return json({ access_token: "tok", expires_in: 86399, scope: "read_orders,read_products,read_reports" });
      if (url.startsWith("https://bulk.example/")) return new Response(JSON.stringify(order) + "\n" + JSON.stringify(line) + "\n");
      if (body.includes("myshopifyDomain")) return json({ data: { shop: { myshopifyDomain: "52ae29-e0.myshopify.com", name: "Text To Next", currencyCode: "TRY", ianaTimezone: "Europe/Istanbul" } } });
      if (body.includes("orders(first: 5, reverse: true)")) return json({ data: { orders: { nodes: [] } } });
      if (body.includes("bulkOperationRunQuery")) return json({ data: { bulkOperationRunQuery: { bulkOperation: { id: "gid://shopify/BulkOperation/1", status: "CREATED" }, userErrors: [] } } });
      if (body.includes("bulkOperation(id")) return json({ data: { bulkOperation: { status: "COMPLETED", errorCode: null, objectCount: "2", url: "https://bulk.example/x.jsonl", partialDataUrl: null } } });
      if (body.includes("nodes(ids")) return json({ data: { nodes: [{ id: "gid://shopify/Refund/5", refundLineItems: { nodes: [{ id: "gid://shopify/RefundLineItem/1", quantity: 1, restockType: "RETURN", subtotalSet: { shopMoney: { amount: "1449.0" } }, lineItem: { id: line.id } }], pageInfo: { hasNextPage: false } } }] } });
      if (body.includes("products(")) return json({ data: { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } });
      return json({ errors: [{ message: "beklenmeyen sorgu" }] });
    });
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const p = syncShopify();
    await vi.runAllTimersAsync();
    const r = await p;
    vi.useRealTimers();
    expect(r.status).toBe("ok");
    expect(count("orders")).toBe(1);
    expect(count("order_lines")).toBe(1);
    expect(count("refund_lines")).toBe(1);
    const o = db.$client.prepare("select gateways, customer_id, shipping_charged from orders").get() as Record<string, string | number>;
    expect(o.customer_id).toBe("gid://shopify/Customer/9");
    expect(o.shipping_charged).toBe(0);
    // Hesap: set 2 bileklik → maliyet 2 × bileklik; iade 24 Ekim'e, set stoğa döndü
    const d22 = db.$client.prepare("select cogs, revenue, orders, couple_orders from daily_pnl where date = '2026-10-22'").get();
    expect(d22).toEqual({ cogs: 200, revenue: 2898, orders: 1, couple_orders: 1 });
    const d24 = db.$client.prepare("select refunds, cogs from daily_pnl where date = '2026-10-24'").get();
    expect(d24).toEqual({ refunds: 1449, cogs: -200 });
    // Yalnızca okuma: bulkOperationRunQuery dışında mutation yok
    const mutations = calls.filter((c) => /"query":"\s*mutation/.test(c.body));
    expect(mutations.every((c) => c.body.includes("bulkOperationRunQuery"))).toBe(true);
    // Ad ile eşleşen varyant kalıcı bağlandı
    expect(count("product_map where key_type = 'variant_id'")).toBe(1);
  });
});

describe("Shopify korunan müşteri verisi", () => {
  it("müşteri alanına izin yoksa alan çıkarılıp tekrar denenir; toplu sorgu ACCESS_DENIED ile düşse de senkron tamamlanır", async () => {
    writeEnv({ SHOPIFY_STORE_DOMAIN: "52ae29-e0.myshopify.com", SHOPIFY_CLIENT_ID: "cid", SHOPIFY_CLIENT_SECRET: "sec" });
    const order = {
      id: "gid://shopify/Order/7", name: "#7", createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z", test: false,
      totalPriceSet: { shopMoney: { amount: "1000" } }, currentTotalPriceSet: { shopMoney: { amount: "1000" } }, subtotalPriceSet: { shopMoney: { amount: "1000" } },
      totalDiscountsSet: null, totalShippingPriceSet: null, totalTaxSet: null, paymentGatewayNames: ["PayTR"], discountCodes: [], tags: [],
      refunds: [], transactions: [], fulfillments: [{ createdAt: "2026-10-21T10:00:00Z" }],
    };
    const line = { id: "gid://shopify/LineItem/71", __parentId: order.id, title: "Luna - 316L Çelik", quantity: 1, originalUnitPriceSet: { shopMoney: { amount: "1000" } }, discountedTotalSet: { shopMoney: { amount: "1000" } }, discountAllocations: [] };
    let bulkQueries: string[] = [];
    mockFetch((url, body) => {
      if (url.endsWith("/admin/oauth/access_token")) return json({ access_token: "tok", expires_in: 86399, scope: "read_orders" });
      if (url.startsWith("https://bulk.example/")) return new Response(JSON.stringify(order) + "\n" + JSON.stringify(line) + "\n");
      if (body.includes("myshopifyDomain")) return json({ data: { shop: { myshopifyDomain: "52ae29-e0.myshopify.com", name: "Text To Next", currencyCode: "TRY", ianaTimezone: "Europe/Istanbul" } } });
      // Ön deneme: müşteri alanı izinsiz
      if (body.includes("orders(first: 5, reverse: true)")) {
        if (body.includes("customer { id }")) return json({ errors: [{ message: "This app is not approved to access the Customer object." }] });
        return json({ data: { orders: { nodes: [] } } });
      }
      if (body.includes("bulkOperationRunQuery")) {
        bulkQueries.push(body);
        return json({ data: { bulkOperationRunQuery: { bulkOperation: { id: `gid://shopify/BulkOperation/${bulkQueries.length}`, status: "CREATED" }, userErrors: [] } } });
      }
      // İlk toplu sorgu (müşteri yolculuğu alanıyla) ayrıntısız düşer, ikincisi tamamlanır
      if (body.includes("bulkOperation(id")) {
        const failed = bulkQueries.length === 1;
        return json({ data: { bulkOperation: { status: failed ? "FAILED" : "COMPLETED", errorCode: failed ? "ACCESS_DENIED" : null, objectCount: "2", url: failed ? null : "https://bulk.example/x.jsonl", partialDataUrl: null } } });
      }
      if (body.includes("products(")) return json({ data: { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } });
      return json({ errors: [{ message: "beklenmeyen sorgu" }] });
    });
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const p = syncShopify();
    await vi.runAllTimersAsync();
    const r = await p;
    vi.useRealTimers();
    expect(r.status).toBe("ok");
    expect(bulkQueries).toHaveLength(2);
    expect(bulkQueries.every((q) => !q.includes("customer { id }"))).toBe(true);
    expect(bulkQueries[1]).not.toContain("customerJourneySummary");
    expect(count("orders")).toBe(1);
    expect((db.$client.prepare("select value from settings where key = 'shopify_alan_modu'").get() as { value: string }).value).toBe("yolculuksuz");
  });
});

describe("§9.1 kilit — Meta", () => {
  it("izin listesinde yalnızca JantiFox hesabı olsa bile o hesaptan hiçbir veri çekilmez", async () => {
    writeEnv({ META_ACCESS_TOKEN: "meta-token-xyz", META_ALLOWED_AD_ACCOUNTS: "act_1389905762203018" });
    mockFetch(() => json({}));
    expect(accountsToSync()).toEqual([]);
    const r = await syncMeta("artimli");
    expect(r.status).toBe("atlandi");
    expect(calls.length).toBe(0);
  });

  it("isimsiz hesaplar izin verilmedikçe istenmez; yalnızca izinli hesap okunur", async () => {
    writeEnv({ META_ACCESS_TOKEN: "meta-token-xyz", META_ALLOWED_AD_ACCOUNTS: "act_426980502817664" });
    db.$client.prepare("insert into ad_accounts (id, brand_id, allowed) values ('act_426980502817664', 1, 1)").run();
    setSetting("meta_arsiv_tamam_act_426980502817664", "1");
    mockFetch((url) => {
      if (/\/act_426980502817664\?/.test(url)) return json({ id: "act_426980502817664", name: "Text To Next", timezone_name: "Europe/Istanbul", currency: "TRY", account_status: 1 });
      if (url.includes("/insights")) {
        const level = new URL(url).searchParams.get("level");
        const data = level === "account" ? [{ date_start: "2026-10-20", account_id: "426980502817664", spend: "1000.50", impressions: "100", clicks: "5", inline_link_clicks: "4", actions: [{ action_type: "omni_purchase", value: "3" }] }] : [];
        return json({ data });
      }
      return json({ data: [] });
    });
    const r = await syncMeta("artimli");
    expect(r.status).toBe("ok");
    expect(calls.every((c) => c.url.includes("act_426980502817664"))).toBe(true);
    expect(calls.some((c) => /546353009221329|538589571783419|1389905762203018/.test(c.url))).toBe(false);
    // anahtar URL'de değil, başlıkta
    expect(calls.some((c) => c.url.includes("meta-token-xyz"))).toBe(false);
    const row = db.$client.prepare("select spend, purchases from ad_insights_daily where level = 'account'").get();
    expect(row).toEqual({ spend: 1000.5, purchases: 3 });
    expect(db.$client.prepare("select meta_spend from daily_pnl where date = '2026-10-20'").get()).toEqual({ meta_spend: 1000.5 });
  });

  it("Meta başka bir hesap döndürürse senkron durur ve veri yazılmaz", async () => {
    writeEnv({ META_ACCESS_TOKEN: "meta-token-xyz", META_ALLOWED_AD_ACCOUNTS: "act_426980502817664" });
    db.$client.prepare("insert into ad_accounts (id, brand_id, allowed) values ('act_426980502817664', 1, 1)").run();
    mockFetch((url) => {
      if (/\/act_426980502817664\?/.test(url)) return json({ id: "act_1389905762203018", name: "Jantifox", timezone_name: "Europe/Istanbul", currency: "TRY" });
      return json({ data: [{ date_start: "2026-10-20", spend: "999" }] });
    });
    const r = await syncMeta("artimli");
    expect(r.status).toBe("kilit");
    expect(count("ad_insights_daily")).toBe(0);
    expect(calls.some((c) => c.url.includes("/insights"))).toBe(false);
  });
});

describe("TCMB", () => {
  it("XML'den USD ve EUR satış kurunu okur", () => {
    const xml = `<Tarih_Date Tarih="23.10.2026" Date="10/23/2026"><Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>49.5647</ForexBuying><ForexSelling>49.6540</ForexSelling></Currency><Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexSelling>57.1234</ForexSelling></Currency></Tarih_Date>`;
    expect(parseTcmb(xml)).toEqual({ date: "2026-10-23", rates: { USD: 49.654, EUR: 57.1234 } });
  });
});
