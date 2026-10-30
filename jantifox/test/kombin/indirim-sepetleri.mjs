// Sweatshirt kombini test indirimleri: gerçek mağazada Shopify'ın sepet hesabı (Storefront API cartCreate, sepet
// gerçekte oluşturulur ama ödemeye gidilmez) ile her kod ve sepet için toplam, indirimler ve tişört satırı.
// Sipariş verilmez, sepete gerçek ekleme yapılmaz (sitenin sepet çerezine dokunulmaz).
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node indirim-sepetleri.mjs [çıktı.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const V = {
  bejS: 49661755851038, maviS: 49661735993630, indigoS: 50171329544478,
  harfA: 49646792868126, harfD: 49646792966430, harfH: 49646793097502, harfL: 49646793228574, futbol: 49646794735902,
  bejT: 49661733175582, maviT: 49661728817438
};
const P = [V.harfA, V.harfD, V.harfH, V.harfL, V.futbol];
const satir = (v, q = 1) => ({ merchandiseId: 'gid://shopify/ProductVariant/' + v, quantity: q });
const SEPETLER = {
  'a) tek kombin (S + 2 patch + T)': [satir(V.bejS), satir(P[0]), satir(P[1]), satir(V.bejT)],
  'b) 3 patchli kombin (S + 3 patch + T)': [satir(V.bejS), satir(P[0]), satir(P[1]), satir(P[2]), satir(V.bejT)],
  'c) iki kombin (2 S + 4 patch + 2 T)': [satir(V.bejS), satir(V.maviS), satir(P[0]), satir(P[1]), satir(P[2]), satir(P[3]), satir(V.bejT), satir(V.maviT)],
  'S + T (patch yok)': [satir(V.bejS), satir(V.bejT)],
  'S + 1 patch + T': [satir(V.bejS), satir(P[0]), satir(V.bejT)],
  '3 patch + T (sweatshirt yok)': [satir(P[0]), satir(P[1]), satir(P[2]), satir(V.bejT)],
  '2 S + T (patch yok)': [satir(V.bejS), satir(V.maviS), satir(V.bejT)],
  '7 patch + T (sweatshirt yok)': [satir(P[0]), satir(P[1]), satir(P[2]), satir(P[3]), satir(P[4]), satir(V.harfA), satir(V.harfD), satir(V.bejT)].map((x, i) => x),
  'S + 2 patch + 2 T (bir kombin, iki tişört)': [satir(V.bejS), satir(P[0]), satir(P[1]), satir(V.bejT), satir(V.maviT)],
  'S + 4 patch + T': [satir(V.bejS), satir(P[0]), satir(P[1]), satir(P[2]), satir(P[3]), satir(V.bejT)]
};
const KODLAR = { 'tutar ≥3.500': 'KMB3500-3BFD8', 'tutar ≥3.400': 'KMB3400-LJGC9', 'adet ≥3': 'KMBADET3-4P5BE', 'yalnız 1 sweatshirt': 'KMBSWEAT1-9TQ4M' };
const EK = { 'a) + FIRSTORDER': ['a) tek kombin (S + 2 patch + T)', 'FIRSTORDER'], 'a) + DEARMOMS': ['a) tek kombin (S + 2 patch + T)', 'DEARMOMS'] };
const SORGU = `mutation S($lines: [CartLineInput!]!, $codes: [String!]) { cartCreate(input: { lines: $lines, discountCodes: $codes }) { cart { cost { subtotalAmount { amount } totalAmount { amount } } discountCodes { code applicable } discountAllocations { discountedAmount { amount } ... on CartCodeDiscountAllocation { code } ... on CartAutomaticDiscountAllocation { title } } lines(first: 30) { nodes { quantity merchandise { ... on ProductVariant { title product { title } } } cost { totalAmount { amount } subtotalAmount { amount } } discountAllocations { discountedAmount { amount } ... on CartCodeDiscountAllocation { code } ... on CartAutomaticDiscountAllocation { title } } } } } userErrors { message } } }`;
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext()).newPage();
await s.route(/facebook\.com\/tr|google-analytics|googletagmanager|monorail|produce_batch/, (r) => r.fulfill({ status: 204, body: '' }));
await s.goto('https://jantifox.com/pages/sikca-sorulan-sorular', { waitUntil: 'domcontentloaded' });
const hesapla = (lines, codes) => s.evaluate(async ({ q, lines, codes }) => {
  const r = await fetch('/api/2025-07/graphql.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { lines, codes } }) });
  const j = await r.json();
  const c = j.data && j.data.cartCreate && j.data.cartCreate.cart;
  if (!c) return { hata: JSON.stringify(j).slice(0, 300) };
  const ad = (a) => a.code || a.title || 'indirim';
  const tisort = c.lines.nodes.filter((l) => / Tshirt$/i.test(l.merchandise.product.title));
  return {
    ara: Number(c.cost.subtotalAmount.amount), toplam: Number(c.cost.totalAmount.amount),
    kodlar: c.discountCodes.map((d) => d.code + (d.applicable ? '' : ' (uygulanmadı)')),
    indirimler: [...c.lines.nodes.flatMap((l) => l.discountAllocations), ...c.discountAllocations].reduce((m, a) => { m[ad(a)] = (m[ad(a)] || 0) + Number(a.discountedAmount.amount); return m; }, {}),
    tisort: tisort.map((l) => Number(l.cost.totalAmount.amount))
  };
}, { q: SORGU, lines, codes });
const sonuc = { zaman: new Date().toISOString(), kodsuz: {}, kodlu: {}, ek: {} };
for (const [ad, lines] of Object.entries(SEPETLER)) sonuc.kodsuz[ad] = await hesapla(lines, []);
for (const [kad, kod] of Object.entries(KODLAR)) {
  sonuc.kodlu[kad] = {};
  for (const [ad, lines] of Object.entries(SEPETLER)) sonuc.kodlu[kad][ad] = await hesapla(lines, [kod]);
  for (const [ead, [sepet, ekKod]] of Object.entries(EK)) sonuc.ek[kad + ' · ' + ead] = await hesapla(SEPETLER[sepet], [kod, ekKod]);
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
