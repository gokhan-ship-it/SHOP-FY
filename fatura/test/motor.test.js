// Motor testleri: sahte Paraşüt + sahte Shopify ile. Gerçek hiçbir servise bağlanmaz.
// Çalıştırma: node --test fatura/test/
//
// Her test fatura klasörünün bir kopyasında (geçici klasör) çalışır, gerçek kayıt
// dosyalarına (invoices.json, musteriler.json) dokunmaz.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KAYNAK = path.join(__dirname, '..');

function ortamKur() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatura-test-'));
  for (const f of fs.readdirSync(KAYNAK)) if (/\.(js|json)$/.test(f) && !/^(invoices|musteriler|ayarlar|deneme-cikti)\.json$/.test(f)) fs.copyFileSync(path.join(KAYNAK, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, '.env'), 'PARASUT_CLIENT_ID=a\nPARASUT_CLIENT_SECRET=b\nPARASUT_USERNAME=c\nPARASUT_PASSWORD=d\nPARASUT_COMPANY_ID=598490\nSHOPIFY_STORE=x.myshopify.com\nSHOPIFY_CLIENT_ID=e\nSHOPIFY_CLIENT_SECRET=f\n');
  for (const k of Object.keys(require.cache)) if (k.startsWith(dir)) delete require.cache[k];
  return dir;
}

const P = (a) => ({ shopMoney: { amount: a } });
const kalem = (name, vid, orig, indirim = []) => ({ name, quantity: 1, currentQuantity: 1, variant: { legacyResourceId: vid }, originalTotalSet: P(orig), discountAllocations: indirim.map((x) => ({ allocatedAmountSet: P(x) })) });
const siparis = (name, tarih, toplam, kargo, kalemler, adres = {}, ek = {}) => ({
  name, createdAt: tarih, cancelledAt: null, test: false, displayFinancialStatus: 'PAID', currencyCode: 'TRY',
  email: `${name.slice(1)}@ornek.test`, phone: null, totalPriceSet: P(toplam), currentTotalPriceSet: P(toplam), totalRefundedSet: P('0.0'),
  billingAddress: { firstName: 'Deneme', lastName: 'Müşteri', address1: 'Örnek Mah.', city: 'Adana', province: 'Gaziantep', countryCodeV2: 'TR', ...adres },
  shippingAddress: { countryCodeV2: 'TR' }, shippingLines: { nodes: [{ title: 'Kargo', discountedPriceSet: P(kargo) }] }, lineItems: { nodes: kalemler }, ...ek,
});

// Gerçek siparişlerden alınmış tutarlar (#13572, #13569, #13820), adlar uydurma.
const SIPARISLER = [
  siparis('#13572', '2026-09-23T14:50:48Z', '1898.0', '99.0', [kalem('Astor', '52718845329728', '2299.0', ['500.0'])], { city: 'KOCAELİ', province: 'Istanbul', address1: 'Sepetlipınar 41275 Başiskele/Kocaeli' }),
  siparis('#13569', '2026-09-23T12:27:32Z', '3348.5', '0.0', [kalem('Luna', '52718585610560', '2299.0', ['1149.5', '149.35']), kalem('Aurora', '52718870888768', '2699.0', ['0.0', '350.65'])], { city: 'İstanbul', province: '', address1: 'Güzeltepe mah Eyüpsulyan apt' }),
  siparis('#13820', '2026-09-23T12:27:40Z', '5898.5', '0.0', [kalem('Infinity Glow 925', '52719080243520', '3199.0', ['1599.5', '125.0']), kalem('Vantablack 925', '52718561231168', '4799.0', ['0.0', '375.0'])]),
  siparis('#13700', '2026-09-23T10:00:00Z', '2898.0', '0.0', [kalem('Astor + Chloe Couple', '51270168052032', '2898.0')]),
  siparis('#13601', '2026-09-23T09:00:00Z', '1999.0', '0.0', [kalem('Klasik', '47986362155328', '1999.0')], { city: 'Ankara', address1: 'Ankara' }),
  siparis('#13602', '2026-09-23T08:00:00Z', '2399.0', '0.0', [kalem('Noir', '52718833467712', '2399.0')], {}, { displayFinancialStatus: 'PARTIALLY_REFUNDED' }),
  siparis('#13539', '2026-09-19T08:00:00Z', '2399.0', '0.0', [kalem('Noir', '52718833467712', '2399.0')]),
];

function sahteFetch(kayit) {
  return async (url, opt = {}) => {
    const cevap = (d, st = 200) => ({ ok: st < 400, status: st, json: async () => d, text: async () => JSON.stringify(d) });
    if (url.includes('api.parasut.com/oauth')) return cevap({ access_token: 'p' });
    if (url.includes('/admin/oauth/access_token')) return cevap({ access_token: 's' });
    if (url.includes('graphql.json')) {
      const v = JSON.parse(opt.body).variables;
      if (v.q && v.q.startsWith('name:')) return cevap({ data: { orders: { nodes: SIPARISLER.filter((s) => s.name === v.q.slice(5)) } } });
      const m = v.q.match(/>='(.{25})' AND created_at:<'(.{25})'/);
      const a = Date.parse(m[1]), b = Date.parse(m[2]);
      return cevap({ data: { orders: { pageInfo: { hasNextPage: false }, nodes: SIPARISLER.filter((s) => Date.parse(s.createdAt) >= a && Date.parse(s.createdAt) < b) } } });
    }
    if (url.includes('/products?')) { const c = decodeURIComponent(url.split('filter[code]=')[1]); return cevap({ data: [{ id: 'P-' + c, attributes: { code: c } }] }); }
    if (url.includes('/sales_invoices?')) return cevap({ meta: { total_pages: 1 }, data: [] });
    if (opt.method === 'POST' && url.endsWith('/contacts')) { kayit.musteri.push(JSON.parse(opt.body).data.attributes); return cevap({ data: { id: 'C' + kayit.musteri.length } }, 201); }
    if (opt.method === 'POST' && url.endsWith('/sales_invoices')) {
      const b = JSON.parse(opt.body);
      kayit.fatura.push(b);
      if (kayit.reddet === b.data.attributes.description) return cevap({ errors: [{ detail: 'geçersiz' }] }, 422);
      if (kayit.kopar === b.data.attributes.description) throw new Error('socket hang up');
      // Paraşüt gibi hesapla: ara toplam yuvarlanmadan toplanır, KDV satır satır.
      let net = 0, kdv = 0;
      for (const d of b.data.relationships.details.data) { const u = Number(d.attributes.unit_price); net += u; kdv += Math.round(u * d.attributes.vat_rate) / 100; }
      return cevap({ data: { id: 'F' + kayit.fatura.length, attributes: { net_total: (Math.round(net * 100) / 100 + kdv).toFixed(2) } } }, 201);
    }
    throw new Error('beklenmeyen istek: ' + (opt.method || 'GET') + ' ' + url);
  };
}

async function hazirla(dir, kayit) {
  global.fetch = sahteFetch(kayit);
  global.setTimeout = ((asil) => (f, ms) => asil(f, 0))(global.setTimeout);
  const M = require(path.join(dir, 'motor.js'));
  const { envOku } = require(path.join(dir, 'ortak.js'));
  const b = await M.baglan(envOku());
  return { M, b };
}

test('plan: tutarlar, atlamalar, il/ilçe', async () => {
  const dir = ortamKur();
  const kayit = { musteri: [], fatura: [] };
  const { M, b } = await hazirla(dir, kayit);
  const plan = await M.planla(b, await M.siparisleriGetir(b, { bas: '2026-09-19', bit: '2026-09-23' }), 500);
  const hazir = Object.fromEntries(plan.hazir.map((p) => [p.no, p]));
  const atlanan = Object.fromEntries(plan.atlanan.map((a) => [a.no, a]));

  assert.deepStrictEqual(Object.keys(hazir).sort(), ['#13569', '#13572', '#13601']);
  assert.deepStrictEqual(hazir['#13572'].satirlar.map((x) => x.birim), ['79.0833', '1803.1000']); // 177 no'lu faturayla aynı
  assert.strictEqual(hazir['#13572'].musteri.il, 'Kocaeli');
  assert.strictEqual(hazir['#13572'].musteri.ilce, 'Başiskele');
  assert.strictEqual(hazir['#13569'].musteri.ilce, 'Eyüpsultan');
  assert.deepStrictEqual(hazir['#13601'].musteri.eksik, ['ilçe']);
  assert.match(atlanan['#13820'].sebep, /1 kuruş/);
  assert.strictEqual(atlanan['#13700'].tur, 'yeni-urun');
  assert.match(atlanan['#13602'].sebep, /iade/);
  assert.strictEqual(atlanan['#13539'].tur, 'once');
  assert.strictEqual(kayit.fatura.length, 0, 'plan hiçbir şey yazmamalı');
});

test('uygula: yazar, kaydeder, tekrar kesmez; e-posta yer tutucu', async () => {
  const dir = ortamKur();
  const kayit = { musteri: [], fatura: [] };
  const { M, b } = await hazirla(dir, kayit);
  const siparisler = await M.siparisleriGetir(b, { siparisler: ['#13572', '#13569'] });
  const sonuc = await M.uygula(b, await M.planla(b, siparisler, 500));
  assert.strictEqual(sonuc.tamam.length, 2);
  assert.ok(sonuc.tamam.every((x) => !x.uyari), 'Paraşüt toplamı Shopify ile aynı olmalı');
  assert.strictEqual(kayit.musteri[0].email, 'siparis-13572@example.com');
  assert.strictEqual(kayit.musteri[0].city, 'Kocaeli');
  const k = M.kayitOku();
  assert.strictEqual(k['#13572'].durum, 'tamam');
  assert.strictEqual(k['#13572'].siparis_tarihi, '2026-09-23');
  const ikinci = await M.planla(b, siparisler, 500);
  assert.strictEqual(ikinci.hazir.length, 0, 'kesilen sipariş tekrar planlanmamalı');
});

test('uygula: red kaydı siler, kopma "isleniyor" bırakır ve sonrakini engeller', async () => {
  const dir = ortamKur();
  const kayit = { musteri: [], fatura: [], reddet: 'Shopify #13572', kopar: 'Shopify #13569' };
  const { M, b } = await hazirla(dir, kayit);
  const sonuc = await M.uygula(b, await M.planla(b, await M.siparisleriGetir(b, { siparisler: ['#13572', '#13569'] }), 500));
  assert.strictEqual(sonuc.hata.length, 1);
  assert.strictEqual(sonuc.belirsiz.length, 1);
  const k = M.kayitOku();
  assert.strictEqual(k['#13572'], undefined);
  assert.strictEqual(k['#13569'].durum, 'isleniyor');
  await assert.rejects(M.uygula(b, await M.planla(b, await M.siparisleriGetir(b, { siparisler: ['#13601'] }), 500)), /Yarıda kalmış/);
});

test('eşleme: ELLE kategorisi siparişi elle kesilecek diye atlar', async () => {
  const dir = ortamKur();
  const e = JSON.parse(fs.readFileSync(path.join(dir, 'urun-kodlari.json'), 'utf8'));
  e['51270168052032'] = 'ELLE';
  fs.writeFileSync(path.join(dir, 'urun-kodlari.json'), JSON.stringify(e));
  const { M, b } = await hazirla(dir, { musteri: [], fatura: [] });
  const plan = await M.planla(b, await M.siparisleriGetir(b, { siparisler: ['#13700'] }), 500);
  assert.match(plan.atlanan[0].sebep, /elle kesilecek/);
});

test('güvenlik: resmileştirme ve güncelleme engelli', async () => {
  const dir = ortamKur();
  const { gonder } = require(path.join(dir, 'ortak.js'));
  global.fetch = () => { throw new Error('istek gitmemeliydi'); };
  for (const u of ['e_archives', 'e_invoices', 'sales_invoices/1', 'sales_invoices/1/pay']) {
    await assert.rejects(gonder('t', `https://api.parasut.com/v4/598490/${u}`, { data: {} }), /GÜVENLİK/);
  }
  await assert.rejects(gonder('t', 'https://api.parasut.com/v4/598490/sales_invoices', { data: { id: '5' } }), /GÜVENLİK/);
});
