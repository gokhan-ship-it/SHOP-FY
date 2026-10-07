// custom.genislik / custom.yukseklik / custom.cap metinlerini
// kisisellestirme.* sayısal alanlarına çevirir. Eski alanlara dokunmaz.
// Çıktı: olcu-metafields.json (metafieldsSet girdisi) ve olcu-kontrol-listesi.md
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const rows = JSON.parse(readFileSync(new URL('olcu-kaynak.json', dir), 'utf8'));

const SET = {
  '9722984005918': { tip: 'letter', set: 'cool' },
  '9722983907614': { tip: 'letter', set: 'piramit' },
  '9722985382174': { tip: 'number', set: 'rakam' },
};

// Yalnızca "6cm", "7,5 cm", "6.5 cm" biçimleri kesin kabul edilir.
function parse(text) {
  if (text == null) return { value: null, note: null };
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*cm\s*$/i.exec(text);
  if (m) return { value: m[1].replace(',', '.'), note: null };
  return { value: null, note: `"${text}" birimsiz/okunamadı` };
}

const fmt = (v) => (v == null ? '—' : v.replace('.', ',') + ' cm');
const metafields = [];
const lines = [];

for (const r of rows) {
  const owner = `gid://shopify/Product/${r.id}`;
  const notes = [];
  let g = parse(r.g), y = parse(r.y), c = parse(r.c), sekil = null;
  if (g.note) notes.push('Genişlik ' + g.note);
  if (y.note) notes.push('Yükseklik ' + y.note);
  if (c.note) notes.push('Çap ' + c.note);

  let gw = g.value, yh = y.value;
  if (c.value) {
    gw = yh = c.value;
    sekil = 'circle';
  } else if (gw && yh) {
    sekil = 'rect';
  }
  if (!c.value && (gw == null) !== (yh == null)) notes.push('Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz');
  if (!gw && !yh && !notes.length) notes.push('Ölçü yok');

  const type = SET[r.id] || { tip: 'icon', set: null };
  if (type.tip === 'letter') notes.push('Harf genişliği ürün başına boş; katalog ayarındaki 5,5 cm varsayımı kullanılır');
  if (r.not) notes.push(r.not);
  if (r.status !== 'ACTIVE') notes.push(`Durum: ${r.status}`);

  const push = (key, type, value) => value != null && metafields.push({ ownerId: owner, namespace: 'kisisellestirme', key, type, value });
  push('tip', 'single_line_text_field', type.tip);
  push('set', 'single_line_text_field', type.set);
  push('genislik_cm', 'number_decimal', gw);
  push('yukseklik_cm', 'number_decimal', yh);
  push('sekil', 'single_line_text_field', sekil);

  const eski = [r.g && `genişlik: ${r.g}`, r.y && `yükseklik: ${r.y}`, r.c && `çap: ${r.c}`].filter(Boolean).join(' · ') || '—';
  const flag = notes.some((n) => !n.startsWith('Durum') && !n.startsWith('Harf genişliği')) ? '⚠️ ' : '';
  lines.push(`| ${flag}${r.title.replace(/\|/g, '/')} | ${eski} | ${fmt(gw)} | ${fmt(yh)} | ${sekil ?? '—'} | ${type.tip} | ${notes.join('; ')} |`);
}

writeFileSync(new URL('olcu-metafields.json', dir), JSON.stringify(metafields, null, 1));
writeFileSync(
  new URL('olcu-kontrol-listesi.md', dir),
  `# Ölçü aktarımı kontrol listesi

Kaynak: \`custom.genislik\`, \`custom.yukseklik\`, \`custom.cap\` (değiştirilmedi).
Hedef: \`kisisellestirme.genislik_cm\`, \`kisisellestirme.yukseklik_cm\`, \`kisisellestirme.sekil\`, \`kisisellestirme.tip\`, \`kisisellestirme.set\`.

Kurallar:
- Yalnızca "6cm", "7,5cm", "6.5 cm" gibi birimi açık değerler aktarıldı. Birimsiz değerler ("6,5") boş bırakıldı.
- Çap verilen patch'lerde genişlik = yükseklik = çap ve şekil \`circle\`.
- Genişlik ve yükseklik verilenlerde şekil \`rect\` (dış sınır kutusu; çakışma hesabı bu kutuyla yapılır).
- Tek ölçü verilenlerde diğer ölçü ve şekil boş bırakıldı.

⚠️ = kontrol etmen gereken satır. Bu satırlardaki patch'ler ölçü tamamlanana kadar editörde listelenmez.

| Ürün | Eski metin | Yeni genişlik | Yeni yükseklik | Şekil | Tip | Not |
|---|---|---|---|---|---|---|
${lines.join('\n')}
`
);
console.log(metafields.length, 'metafield,', rows.length, 'ürün');
