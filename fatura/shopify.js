// Shopify'dan sipariş okuma. SADECE OKUR. Token ekrana basılmaz, dosyaya yazılmaz.
// Kimlik doğrulama: Dev Dashboard uygulaması + client credentials (token 24 saat geçerli).

const { hata } = require('./ortak');

const API_SURUMU = '2026-07';

async function shopifyTokenAl(env) {
  for (const k of ['SHOPIFY_STORE', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET']) {
    if (!env[k]) hata(`.env içinde ${k} boş.`);
  }
  const cevap = await fetch(`https://${env.SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
    }),
  });
  if (!cevap.ok) {
    hata(`Shopify girişi başarısız (durum kodu ${cevap.status}). SHOPIFY_CLIENT_ID ve SHOPIFY_CLIENT_SECRET'ı kontrol edin, uygulamanın mağazaya kurulu olduğundan emin olun.`);
  }
  return (await cevap.json()).access_token;
}

async function sorgu(env, token, metin, degiskenler) {
  const cevap = await fetch(`https://${env.SHOPIFY_STORE}/admin/api/${API_SURUMU}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: metin, variables: degiskenler }),
  });
  const govde = await cevap.text();
  if (!cevap.ok) hata(`Shopify isteği başarısız (durum kodu ${cevap.status}):\n${govde}`);
  const veri = JSON.parse(govde);
  if (veri.errors) {
    hata(`Shopify hata döndü:\n${JSON.stringify(veri.errors, null, 2)}\n\nEksik izin hatasıysa Dev Dashboard'da uygulamanın izinlerini kontrol edin.`);
  }
  return veri.data;
}

const TL = '{ shopMoney { amount } }';
const SIPARIS_ALANLARI = `
  legacyResourceId name createdAt cancelledAt test
  displayFinancialStatus currencyCode
  email phone
  totalPriceSet ${TL} currentTotalPriceSet ${TL} totalRefundedSet ${TL}
  billingAddress { firstName lastName company address1 address2 city province zip phone countryCodeV2 }
  shippingAddress { countryCodeV2 }
  shippingLines(first: 10) { nodes { title discountedPriceSet ${TL} } }
  lineItems(first: 100) {
    nodes {
      name quantity currentQuantity
      variant { legacyResourceId }
      originalTotalSet ${TL}
      discountAllocations { allocatedAmountSet ${TL} }
    }
  }`;

async function sonSiparisler(env, token, adet) {
  const veri = await sorgu(env, token,
    `query($n: Int!) { orders(first: $n, sortKey: CREATED_AT, reverse: true) { nodes { ${SIPARIS_ALANLARI} } } }`,
    { n: adet });
  return veri.orders.nodes;
}

// "#13575" → o sipariş (bulunamazsa null)
async function siparisGetir(env, token, ad) {
  const veri = await sorgu(env, token,
    `query($q: String!) { orders(first: 5, query: $q) { nodes { ${SIPARIS_ALANLARI} } } }`,
    { q: `name:${ad}` });
  return veri.orders.nodes.find((s) => s.name === ad) || null;
}

// "2026-09-24" → o gün (Türkiye saati, UTC+3) oluşturulan tüm siparişler, sayfa sayfa.
async function gunSiparisleri(env, token, tarih) {
  const ertesi = new Date(Date.parse(`${tarih}T12:00:00+03:00`) + 86400000).toISOString().slice(0, 10);
  const q = `created_at:>='${tarih}T00:00:00+03:00' AND created_at:<'${ertesi}T00:00:00+03:00'`;
  const hepsi = [];
  let imlec = null;
  for (;;) {
    const veri = await sorgu(env, token,
      `query($q: String!, $after: String) { orders(first: 50, query: $q, after: $after, sortKey: CREATED_AT) {
         pageInfo { hasNextPage endCursor } nodes { ${SIPARIS_ALANLARI} } } }`,
      { q, after: imlec });
    hepsi.push(...veri.orders.nodes);
    if (!veri.orders.pageInfo.hasNextPage) break;
    imlec = veri.orders.pageInfo.endCursor;
    process.stdout.write(`  ${hepsi.length} sipariş okundu...\r`);
  }
  return hepsi;
}

module.exports = { shopifyTokenAl, sonSiparisler, siparisGetir, gunSiparisleri };
