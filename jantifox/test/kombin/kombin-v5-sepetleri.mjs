// Sweatshirt kombini v5 (1 sweatshirt + 4 patch ya da 4'lü hazır set = 4.000 TL, Tshirt hediye): gerçek mağazada
// Shopify'ın sepet hesabı (Storefront API cartCreate; geçici sepet, ödemeye gidilmez, sipariş yok, sitenin sepet
// çerezine dokunulmaz). Test kodu temanın sepete yazdığı gibi her sepette (KMBSWEAT1); (g)'de FIRSTORDER da.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kombin-v5-sepetleri.mjs [çıktı.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const V = {
  bejS: 49661755851038, maviS: 49661735993630,
  football: 59857935335710, hearts: 59857973641502,
  futbol: 49646794735902, harfA: 49646792868126, harfD: 49646792966430, harfH: 49646793097502, harfL: 49646793228574,
  bejT: 49661733175582, maviT: 49661728817438
};
const KOD = 'KMBSWEAT1-9TQ4M';
const P = [V.futbol, V.harfA, V.harfD, V.harfH, V.harfL];
const satir = (v, q = 1) => ({ merchandiseId: 'gid://shopify/ProductVariant/' + v, quantity: q });
const tekli = (n) => P.slice(0, n).map((v) => satir(v));
const SEPETLER = {
  'a) sweatshirt + 4\'lü hazır set + Tshirt': { lines: [satir(V.bejS), satir(V.football), satir(V.bejT)], beklenen: 4000 },
  'b) sweatshirt + 4 tekli patch + Tshirt': { lines: [satir(V.bejS), ...tekli(4), satir(V.bejT)], beklenen: 4000 },
  'c) sweatshirt + 4\'lü set + 1 tekli patch + Tshirt': { lines: [satir(V.bejS), satir(V.football), satir(V.futbol), satir(V.bejT)], beklenen: 4500 },
  'd) sweatshirt + 5 tekli patch + Tshirt': { lines: [satir(V.bejS), ...tekli(5), satir(V.bejT)], beklenen: 4500 },
  'e) iki kombin, ikisi de hazır setli': { lines: [satir(V.bejS), satir(V.football), satir(V.bejT), satir(V.maviS), satir(V.hearts), satir(V.maviT)], beklenen: 8000 },
  'f) iki kombin, ikisi de 4 tekli patch\'li': { lines: [satir(V.bejS), ...tekli(4), satir(V.bejT), satir(V.maviS), satir(V.futbol), satir(V.harfA), satir(V.harfD), satir(V.harfH), satir(V.maviT)], beklenen: 8500 },
  'g) a) + FIRSTORDER': { lines: [satir(V.bejS), satir(V.football), satir(V.bejT)], kodlar: [KOD, 'FIRSTORDER'], beklenen: 4000 }
};
const SORGU = `mutation S($lines: [CartLineInput!]!, $codes: [String!]) { cartCreate(input: { lines: $lines, discountCodes: $codes }) { cart { cost { subtotalAmount { amount } totalAmount { amount } } discountCodes { code applicable } discountAllocations { discountedAmount { amount } ... on CartCodeDiscountAllocation { code } ... on CartAutomaticDiscountAllocation { title } } lines(first: 30) { nodes { quantity merchandise { ... on ProductVariant { title price { amount } product { title } } } cost { totalAmount { amount } subtotalAmount { amount } } discountAllocations { discountedAmount { amount } ... on CartCodeDiscountAllocation { code } ... on CartAutomaticDiscountAllocation { title } } } } } userErrors { message } } }`;
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
  return {
    ara: Number(c.cost.subtotalAmount.amount), toplam: Number(c.cost.totalAmount.amount),
    kodlar: c.discountCodes.map((d) => d.code + (d.applicable ? '' : ' (uygulanmadı)')),
    indirimler: [...c.lines.nodes.flatMap((l) => l.discountAllocations), ...c.discountAllocations].reduce((m, a) => { m[ad(a)] = (m[ad(a)] || 0) + Number(a.discountedAmount.amount); return m; }, {}),
    satirlar: c.lines.nodes.map((l) => l.merchandise.product.title + ' ×' + l.quantity + ': ' + Number(l.merchandise.price.amount) + ' → ' + Number(l.cost.totalAmount.amount))
  };
}, { q: SORGU, lines, codes });
const sonuc = { zaman: new Date().toISOString(), sepetler: {} };
for (const [ad, x] of Object.entries(SEPETLER)) {
  const r = await hesapla(x.lines, x.kodlar || [KOD]);
  sonuc.sepetler[ad] = { beklenen: x.beklenen, ...r, uyuyor: r.toplam === x.beklenen };
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
