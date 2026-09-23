#!/usr/bin/env node
// AŞAMA 2 hazırlığı: Paraşüt'te bir müşteri kartının hangi alanlardan oluştuğunu gösterir.
// SADECE OKUR. Kişisel bilgiler (ad, adres, telefon, e-posta) maskelenir; ekranda sadece
// alan adları ve kişisel olmayan değerler görünür. Çıktı Claude'a gönderilebilir.
//
// Kullanım:
//   node musteri-kesif.js

const { hata, envOku, tokenAl, getir } = require('./ortak');

const ORNEK_FATURA_ID = '1097888536'; // NX02026000000177

// Değeri olduğu gibi gösterilebilecek (kişisel olmayan) alanlar.
const ACIK_ALANLAR = new Set([
  'contact_type', 'account_type', 'is_abroad', 'archived', 'invoicing_preferences',
  'balance', 'trl_balance', 'usd_balance', 'eur_balance', 'gbp_balance',
  'created_at', 'updated_at', 'e_invoice_type', 'country',
]);

function maskele(anahtar, deger) {
  if (deger === null || deger === undefined) return deger;
  if (ACIK_ALANLAR.has(anahtar)) return deger;
  if (anahtar === 'tax_number' && /^1{11}$/.test(String(deger))) return deger;
  if (typeof deger === 'boolean' || typeof deger === 'number') return deger;
  if (typeof deger === 'object') return Array.isArray(deger) ? `[liste, ${deger.length} öğe]` : '{nesne}';
  const s = String(deger);
  return s.length === 0 ? '' : `(dolu, ${s.length} karakter)`;
}

async function main() {
  const env = envOku();
  console.log('Paraşüt\'e giriş yapılıyor...');
  const token = await tokenAl(env);
  const firma = env.PARASUT_COMPANY_ID;

  const fatura = await getir(token, `https://api.parasut.com/v4/${firma}/sales_invoices/${ORNEK_FATURA_ID}?include=contact`);
  const ref = fatura.data.relationships.contact && fatura.data.relationships.contact.data;
  if (!ref) hata('Örnek faturanın müşteri bağlantısı okunamadı.');
  const musteri = (fatura.included || []).find((k) => k.type === ref.type && k.id === ref.id);
  if (!musteri) hata('Örnek faturanın müşteri kaydı okunamadı.');

  const ozet = {
    type: musteri.type,
    attributes: Object.fromEntries(Object.entries(musteri.attributes).map(([k, v]) => [k, maskele(k, v)])),
    relationships: Object.keys(musteri.relationships || {}),
  };
  console.log('\nÖrnek müşteri kartının yapısı (kişisel bilgiler gizlendi):\n');
  console.log(JSON.stringify(ozet, null, 2));
  console.log('\nBu çıktıyı Claude\'a gönderebilirsiniz.\n');
}

main().catch((e) => hata(e.message));
