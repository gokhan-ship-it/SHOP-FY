// Veritabanı şeması. Para tutarları mağaza para biriminde (TRY) REAL olarak tutulur.
// Tarih alanları: *_at = ISO UTC zaman damgası, date / valid_* = İstanbul günü (YYYY-AA-GG).
import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------- Yapı: marka → mağaza → reklam hesabı ----------

export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandId: integer("brand_id").notNull(),
  domain: text("domain").notNull().unique(),
  name: text("name"),
  currency: text("currency").notNull().default("TRY"),
  timezone: text("timezone").notNull().default("Europe/Istanbul"),
});

export const adAccounts = sqliteTable("ad_accounts", {
  id: text("id").primaryKey(), // act_...
  brandId: integer("brand_id").notNull(),
  storeId: integer("store_id"),
  name: text("name"),
  currency: text("currency"),
  timezone: text("timezone"),
  allowed: integer("allowed").notNull().default(0),
  lastCheckedAt: text("last_checked_at"),
});

// ---------- Shopify ham verisi ----------

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    storeId: integer("store_id").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
    updatedAt: text("updated_at").notNull(),
    cancelledAt: text("cancelled_at"),
    test: integer("test").notNull().default(0),
    financialStatus: text("financial_status"),
    fulfillmentStatus: text("fulfillment_status"),
    currency: text("currency"),
    totalPrice: real("total_price").notNull().default(0),
    currentTotalPrice: real("current_total_price"),
    subtotalPrice: real("subtotal_price"),
    totalDiscounts: real("total_discounts"),
    totalShipping: real("total_shipping"),
    shippingCharged: real("shipping_charged"),
    totalTax: real("total_tax"), // yalnızca kayıt; hiçbir hesapta kullanılmaz
    gateways: text("gateways"), // JSON dizi
    discountCodes: text("discount_codes"),
    tags: text("tags"),
    sourceName: text("source_name"),
    customerId: text("customer_id"),
    customerOrderIndex: integer("customer_order_index"),
    fulfillmentCount: integer("fulfillment_count").notNull().default(0),
    firstFulfilledAt: text("first_fulfilled_at"),
    refundsComplete: integer("refunds_complete").notNull().default(1),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("orders_created_idx").on(t.createdAt), index("orders_customer_idx").on(t.customerId)],
);

export const orderLines = sqliteTable(
  "order_lines",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    title: text("title").notNull(),
    variantTitle: text("variant_title"),
    name: text("name"),
    sku: text("sku"),
    quantity: integer("quantity").notNull(),
    originalUnitPrice: real("original_unit_price").notNull(),
    discountedTotal: real("discounted_total").notNull(),
    discountAllocated: real("discount_allocated").notNull().default(0),
    productId: text("product_id"),
    variantId: text("variant_id"),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("order_lines_order_idx").on(t.orderId)],
);

export const refunds = sqliteTable(
  "refunds",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    createdAt: text("created_at").notNull(),
    totalRefunded: real("total_refunded").notNull(),
    shippingRefunded: real("shipping_refunded").notNull().default(0),
    linesLoaded: integer("lines_loaded").notNull().default(0),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("refunds_order_idx").on(t.orderId)],
);

export const refundLines = sqliteTable(
  "refund_lines",
  {
    id: text("id").primaryKey(),
    refundId: text("refund_id").notNull(),
    orderId: text("order_id").notNull(),
    lineItemId: text("line_item_id").notNull(),
    quantity: integer("quantity").notNull(),
    restockType: text("restock_type"),
    subtotal: real("subtotal").notNull().default(0),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("refund_lines_refund_idx").on(t.refundId)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    kind: text("kind"),
    status: text("status"),
    gateway: text("gateway"),
    amount: real("amount"),
    currency: text("currency"),
    processedAt: text("processed_at"),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("transactions_order_idx").on(t.orderId)],
);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  handle: text("handle"),
  status: text("status"),
  productType: text("product_type"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
  rawJson: text("raw_json").notNull(),
});

export const variants = sqliteTable(
  "variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    title: text("title"),
    sku: text("sku"),
    price: real("price"),
    compareAtPrice: real("compare_at_price"),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

// source: 'gunluk' (günlük kayıt) | 'siparis' (siparişlerdeki liste fiyatından geriye doğru)
export const priceHistory = sqliteTable(
  "price_history",
  {
    variantId: text("variant_id").notNull(),
    productId: text("product_id"),
    date: text("date").notNull(),
    source: text("source").notNull(),
    price: real("price"),
    compareAtPrice: real("compare_at_price"),
  },
  (t) => [primaryKey({ columns: [t.variantId, t.date, t.source] })],
);

// ---------- Model, eşleştirme, maliyet, kural ----------

export const models = sqliteTable("models", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // bileklik | kolye | charm | künye | klasik | ek_ürün | event
  material: text("material"), // çelik | gümüş | -
  active: integer("active").notNull().default(1),
  note: text("note"),
});

// key_type: variant_id | product_id | sku | title
export const productMap = sqliteTable(
  "product_map",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keyType: text("key_type").notNull(),
    keyValue: text("key_value").notNull(),
    label: text("label"),
    source: text("source").notNull(), // seed | otomatik | kullanici
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("product_map_key_idx").on(t.keyType, t.keyValue)],
);

export const productMapComponents = sqliteTable(
  "product_map_components",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mapId: integer("map_id").notNull(),
    modelCode: text("model_code").notNull(),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [index("pmc_map_idx").on(t.mapId)],
);

export const costVersions = sqliteTable(
  "cost_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelCode: text("model_code").notNull(),
    unitCost: real("unit_cost"), // null = bilinmiyor
    validFrom: text("valid_from").notNull(),
    validTo: text("valid_to"),
    breakdown: text("breakdown"),
    note: text("note"),
  },
  (t) => [index("cost_versions_model_idx").on(t.modelCode)],
);

// type: kargo | komisyon | kdv | iade ; unit: siparis_basi_tl | yuzde | komisyon_iade | iade_kargo_tl
export const rules = sqliteTable("rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  unit: text("unit").notNull(),
  value: real("value").notNull(),
  scope: text("scope"),
  note: text("note"),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to"),
});

// ---------- Elle girilenler ----------

export const fixedCosts = sqliteTable("fixed_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section").notNull(), // sirket | kisisel
  name: text("name").notNull(),
  category: text("category"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("TRY"), // TRY | USD | EUR
  frequency: text("frequency").notNull(), // aylik | yillik | haftalik | tek
  spreadMonths: integer("spread_months"), // tek seferlik: kaç aya yayılacağı (boş/1 = o güne)
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  note: text("note"),
});

export const marketingShipments = sqliteTable("marketing_shipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  modelCode: text("model_code").notNull(),
  qty: integer("qty").notNull().default(1),
  personNote: text("person_note"),
  withShipping: integer("with_shipping").notNull().default(1),
});

// ---------- Meta ----------

export const adInsightsDaily = sqliteTable(
  "ad_insights_daily",
  {
    level: text("level").notNull(), // account | campaign | adset | ad
    entityId: text("entity_id").notNull(),
    accountId: text("account_id").notNull(),
    name: text("name"),
    campaignId: text("campaign_id"),
    adsetId: text("adset_id"),
    date: text("date").notNull(),
    spend: real("spend").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    inlineLinkClicks: integer("inline_link_clicks").notNull().default(0),
    cpm: real("cpm"),
    ctr: real("ctr"),
    purchases: real("purchases"),
    purchaseValue: real("purchase_value"),
    addToCart: real("add_to_cart"),
    initiateCheckout: real("initiate_checkout"),
    actionsJson: text("actions_json"),
    actionValuesJson: text("action_values_json"),
    currency: text("currency"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.level, t.entityId, t.date] }),
    index("adi_date_idx").on(t.date),
    index("adi_account_level_idx").on(t.accountId, t.level),
  ],
);

export const adEntities = sqliteTable(
  "ad_entities",
  {
    level: text("level").notNull(), // campaign | adset | ad
    id: text("id").notNull(),
    accountId: text("account_id").notNull(),
    parentId: text("parent_id"),
    name: text("name"),
    status: text("status"),
    effectiveStatus: text("effective_status"),
    createdTime: text("created_time"),
    rawJson: text("raw_json").notNull(),
  },
  (t) => [primaryKey({ columns: [t.level, t.id] })],
);

// ---------- Diğer ----------

export const fxRates = sqliteTable(
  "fx_rates",
  {
    date: text("date").notNull(),
    currency: text("currency").notNull(), // USD | EUR
    selling: real("selling").notNull(),
    sourceDate: text("source_date").notNull(), // kurun alındığı iş günü
  },
  (t) => [primaryKey({ columns: [t.date, t.currency] })],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    type: text("type").notNull(), // fiyat | indirimsiz_fiyat | urun | not
    title: text("title").notNull(),
    detail: text("detail"),
    modelCode: text("model_code"),
    productId: text("product_id"),
    variantId: text("variant_id"),
    source: text("source").notNull(), // otomatik | manuel
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("events_date_idx").on(t.date)],
);

export const syncLog = sqliteTable(
  "sync_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(), // shopify | meta | kur | yedek | hesap
    kind: text("kind").notNull(), // ilk | artimli | gece | urun | ...
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status").notNull(), // calisiyor | ok | hata | kilit
    message: text("message"),
    rows: integer("rows"),
    cursor: text("cursor"), // artımlı senkron için bir sonraki başlangıç noktası
  },
  (t) => [index("sync_log_source_idx").on(t.source, t.startedAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// ---------- TrueProfit ve doğrulama ----------

export const tpMonthly = sqliteTable("tp_monthly", {
  month: text("month").primaryKey(), // YYYY-AA
  grossSales: real("gross_sales"),
  discounts: real("discounts"),
  refunds: real("refunds"),
  revenue: real("revenue"),
  cogs: real("cogs"),
  shippingCosts: real("shipping_costs"),
  shippingCharged: real("shipping_charged"),
  transactionFees: real("transaction_fees"),
  taxesCollected: real("taxes_collected"),
  adSpend: real("ad_spend"),
  facebookAdSpend: real("facebook_ad_spend"),
  netProfit: real("net_profit"),
});

export const tpOrders = sqliteTable(
  "tp_orders",
  {
    orderCode: text("order_code").primaryKey(),
    date: text("date").notNull(),
    items: text("items"),
    revenue: real("revenue"),
    shippingCost: real("shipping_cost"),
    totalCogs: real("total_cogs"),
    transactionFee: real("transaction_fee"),
    grossProfit: real("gross_profit"),
  },
  (t) => [index("tp_orders_date_idx").on(t.date)],
);

export const validationReference = sqliteTable("validation_reference", {
  month: text("month").primaryKey(),
  orders: real("orders"),
  capsules: real("capsules"),
  netRevenue: real("net_revenue"),
  cogs: real("cogs"),
  shipping: real("shipping"),
  commission: real("commission"),
  kdv: real("kdv"),
  metaSpend: real("meta_spend"),
  postAdProfit: real("post_ad_profit"),
});

// ---------- Hesaplanmış tablolar (otomatik yeniden üretilir) ----------

export const orderCalc = sqliteTable(
  "order_calc",
  {
    orderId: text("order_id").primaryKey(),
    name: text("name"),
    date: text("date").notNull(),
    included: integer("included").notNull(), // 0 = test / gönderilmeden iptal
    excludeReason: text("exclude_reason"),
    dtc: integer("dtc").notNull(),
    gross: real("gross").notNull(),
    discount: real("discount").notNull(),
    shippingCharged: real("shipping_charged").notNull(),
    revenue: real("revenue").notNull(),
    cogs: real("cogs").notNull(),
    shippingCost: real("shipping_cost").notNull(),
    commission: real("commission").notNull(),
    commissionRate: real("commission_rate").notNull(),
    gateway: text("gateway"),
    gatewayKnown: integer("gateway_known").notNull(),
    kdv: real("kdv").notNull(),
    capsules: integer("capsules").notNull(),
    couple: integer("couple").notNull(),
    physical: integer("physical").notNull(),
    newCustomer: integer("new_customer").notNull(),
    unmatchedLines: integer("unmatched_lines").notNull(),
    missingCostUnits: integer("missing_cost_units").notNull(),
  },
  (t) => [index("order_calc_date_idx").on(t.date)],
);

// Ürün ekranı için sipariş satırı × model bileşeni kırılımı (iade sipariş tarihine bağlı)
export const lineCalc = sqliteTable(
  "line_calc",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lineId: text("line_id").notNull(),
    orderId: text("order_id").notNull(),
    date: text("date").notNull(),
    modelCode: text("model_code"), // null = eşleşmedi
    units: real("units").notNull(),
    listAmount: real("list_amount").notNull(),
    discount: real("discount").notNull(),
    revenue: real("revenue").notNull(),
    cogs: real("cogs").notNull(),
    shippingCost: real("shipping_cost").notNull(),
    commission: real("commission").notNull(),
    kdv: real("kdv").notNull(),
    refundedUnits: real("refunded_units").notNull(),
    refundAmount: real("refund_amount").notNull(),
    refundCogsBack: real("refund_cogs_back").notNull(),
    refundKdvBack: real("refund_kdv_back").notNull(),
    refundCommissionBack: real("refund_commission_back").notNull(),
  },
  (t) => [index("line_calc_date_idx").on(t.date), index("line_calc_model_idx").on(t.modelCode)],
);

export const refundCalc = sqliteTable(
  "refund_calc",
  {
    refundId: text("refund_id").primaryKey(),
    orderId: text("order_id").notNull(),
    date: text("date").notNull(),
    amount: real("amount").notNull(),
    cogsBack: real("cogs_back").notNull(),
    kdvBack: real("kdv_back").notNull(),
    commissionBack: real("commission_back").notNull(),
    returnShipping: real("return_shipping").notNull(),
  },
  (t) => [index("refund_calc_date_idx").on(t.date)],
);

export const dailyPnl = sqliteTable("daily_pnl", {
  date: text("date").primaryKey(),
  gross: real("gross").notNull(),
  discount: real("discount").notNull(),
  shippingCharged: real("shipping_charged").notNull(),
  revenue: real("revenue").notNull(),
  refunds: real("refunds").notNull(),
  netRevenue: real("net_revenue").notNull(),
  cogs: real("cogs").notNull(),
  shippingCost: real("shipping_cost").notNull(),
  commission: real("commission").notNull(),
  kdv: real("kdv").notNull(),
  preAdProfit: real("pre_ad_profit").notNull(),
  metaSpend: real("meta_spend").notNull(),
  metaSource: text("meta_source").notNull(), // meta | trueprofit | yok
  otherMarketing: real("other_marketing").notNull(),
  postAdProfit: real("post_ad_profit").notNull(),
  fixedCompany: real("fixed_company").notNull(),
  companyNet: real("company_net").notNull(),
  fixedPersonal: real("fixed_personal").notNull(),
  takeHome: real("take_home").notNull(),
  orders: integer("orders").notNull(),
  capsules: integer("capsules").notNull(),
  coupleOrders: integer("couple_orders").notNull(),
  newCustomerOrders: integer("new_customer_orders").notNull(),
});
