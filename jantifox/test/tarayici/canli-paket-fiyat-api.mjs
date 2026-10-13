// Paket fiyatlarının canlı doğrulaması (Storefront API, tokensız; editörün kampanya simülasyonuyla aynı yöntem):
// geçici sepet oluşturulur, uygulanan indirimler ve toplam okunur. Müşteri sepetine ve siparişe dokunmaz.
// Çalıştırma: node canli-paket-fiyat-api.mjs
import { execFileSync } from 'node:child_process';
const ADRES = 'https://jantifox.com/api/2025-07/graphql.json';
const v = (id) => 'gid://shopify/ProductVariant/' + id;
const sorgu = `mutation($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { cost { subtotalAmount { amount } totalAmount { amount } } discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } lines(first: 20) { nodes { quantity cost { totalAmount { amount } subtotalAmount { amount } } discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } } } } userErrors { message } } }`;
const denemeler = [
  ['tek patch', [[49646792868126, 1]]],
  ["2'li (Cool A + B)", [[49646792868126, 1], [49646792900894, 1]]],
  ["3'lü", [[49646792868126, 1], [49646792900894, 1], [49646792933662, 1]]],
  ["4'lü", [[49646792868126, 2], [49646792900894, 1], [49646792933662, 1]]],
  ["2'li yeni patchler (Keep Swimming + School Rocks)", [[59854488764702, 1], [59854481752350, 1]]],
  ['2 Worm Family seti (indirim olmamalı)', [[50410768040222, 2]]],
  ['Pembe Sweatshirt 3-5', [[50171761393950, 1]]]
];
for (const [ad, satirlar] of denemeler) {
  const govde = JSON.stringify({ query: sorgu, variables: { lines: satirlar.map(([id, q]) => ({ merchandiseId: v(id), quantity: q })) } });
  const cikti = execFileSync('curl', ['-s', '--cacert', '/root/.ccr/ca-bundle.crt', '-X', 'POST', ADRES, '-H', 'Content-Type: application/json', '-H', 'Accept: application/json', '--data-binary', govde]).toString();
  let j;
  try { j = JSON.parse(cikti); } catch (e) { console.log(ad, 'yanıt okunamadı:', cikti.slice(0, 150)); continue; }
  const c = j.data && j.data.cartCreate && j.data.cartCreate.cart;
  if (!c) { console.log(ad, JSON.stringify(j).slice(0, 300)); continue; }
  const indirimler = {};
  c.lines.nodes.forEach((l) => l.discountAllocations.forEach((d) => { const k = (d.title || 'indirim').trim(); indirimler[k] = (indirimler[k] || 0) + Number(d.discountedAmount.amount); }));
  c.discountAllocations.forEach((d) => { const k = (d.title || 'sepet indirimi').trim(); indirimler[k] = (indirimler[k] || 0) + Number(d.discountedAmount.amount); });
  console.log(ad.padEnd(50), 'ara toplam', Number(c.cost.subtotalAmount.amount), '· toplam', Number(c.cost.totalAmount.amount), '· indirimler', JSON.stringify(indirimler));
}
