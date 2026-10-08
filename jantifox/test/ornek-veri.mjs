// Pilot ürün için Liquid çıktısının benzeri (testler için)
const harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const stok = { E: 129, C: 153, Y: 30 };
export function ornekVeri(degisiklik = {}) {
  return {
    surum: 1,
    para: '{{amount_no_decimals_with_comma_separator}} TL',
    urun: { id: 10087205437726, baslik: 'Kanvas Lacivert Tote Çanta', varyant: 51795696943390, fiyat: 300000, satilabilir: true },
    gorsel: { en: 1920, boy: 1920, kucuk: 'k.jpg', buyuk: 'b.jpg' },
    harita: { surum: 1, kalibre: false, real_width_cm: 40, urun_kutusu: { x: 15, y: 12, w: 70, h: 76 },
      zones: [{ id: 'on-daire', shape: 'circle', x: 28.125, y: 30, w: 43.75, h: 43.75, allowed_types: ['letter', 'number', 'icon'] }], forbidden: [] },
    ayarlar: { varsayilan_harf_genislik_cm: 5.5, patch_arasi_bosluk_cm: 0.3, satir_arasi_bosluk_cm: 0.5, kenar_payi_cm: 0.3, en_fazla_satir: 2 },
    kategoriler: [{ etiket: 'janti kalpler', ad: 'Kalpler' }, { etiket: 'janti sporlar', ad: 'Spor' }, { etiket: 'janti hayvanlar', ad: 'Hayvanlar' }, { etiket: null, ad: 'Diğer' }],
    setler: [{ id: 9722984005918, baslik: 'Cool Alfabe Patch', tip: 'letter', set: 'cool', en: null, boy: '6.0', sekil: 'rect', etiketler: [], gorsel: 'a.jpg', png: false,
      varyantlar: harfler.map((h, i) => ({ id: 1000 + i, baslik: h, karakter: h, renk: null, fiyat: 33000, satilabilir: true, stok: stok[h] ?? 80, gorsel: h + '.jpg', png: false })) }],
    rakamlar: [{ id: 9722985382174, baslik: 'Janti Rakam Patch', tip: 'number', set: 'rakam', en: '7.5', boy: '6.0', sekil: 'rect', etiketler: [], gorsel: 'r.jpg', png: false,
      varyantlar: '0123456789'.split('').map((h, i) => ({ id: 2000 + i, baslik: h, karakter: h, fiyat: 33000, satilabilir: true, stok: 150, gorsel: h + '.jpg', png: false })) }],
    ikonlar: [
      { id: 1, baslik: 'Kırmızı Kalp Patch', tip: 'icon', en: '5', boy: null, sekil: 'rect', etiketler: ['janti kalpler', 'janti sporlar'], gorsel: 'k.jpg', varyantlar: [{ id: 3001, fiyat: 33000, satilabilir: true, stok: 96 }] },
      { id: 2, baslik: 'Futbol Topu Patch', tip: 'icon', en: '5.5', boy: '5.5', sekil: 'circle', etiketler: ['janti sporlar'], gorsel: 'f.jpg', varyantlar: [{ id: 3002, fiyat: 33000, satilabilir: true, stok: 142 }] },
      { id: 3, baslik: 'Sevimli Köpek Patch', tip: 'icon', en: '7.5', boy: '8', sekil: 'rect', etiketler: ['janti hayvanlar'], gorsel: 'd.jpg', varyantlar: [{ id: 3003, fiyat: 33000, satilabilir: true, stok: 0 }] },
      { id: 4, baslik: 'Musical Note', tip: 'icon', en: '6', boy: '5', sekil: 'rect', etiketler: ['aksesuar', 'gift'], gorsel: 'm.jpg', varyantlar: [{ id: 3004, fiyat: 33000, satilabilir: true, stok: 69 }] },
      { id: 5, baslik: 'Sarı Kalp Patch', tip: 'icon', en: '5', boy: '5', sekil: 'rect', etiketler: ['janti kalpler', 'janti sporlar'], gorsel: 'k.jpg', varyantlar: [{ id: 3005, fiyat: 33000, satilabilir: true, stok: 1 }] }
    ],
    ...degisiklik
  };
}

const piramitRenkler = {
  A: [['Mavi', '#abcdd1', 97], ['Pembe', '#fd5f76', 50], ['Turuncu', '#e26900', 44]],
  B: [['Antrasit', '#657889', 39]], C: [['Beyaz', null, 126]], D: [['Mavi', '#7bc4f0', 83]],
  E: [['Yeşil', '#268180', 102], ['Turkuaz', '#8eddc1', 1], ['Turuncu', '#df6800', 50]],
  K: [['Beyaz', '#f6f6f8', 0]], L: [['Pembe', '#fd5e98', 126], ['Haki', '#64894d', 46]],
  O: [['Antrasit', '#5f7286', 135]], R: [['Kırmızı', '#fe4943', 113], ['Saks', '#004089', 50]], S: [['Mavi', '#7ac5f2', 129]]
};
export function piramitSeti() {
  let id = 5000;
  const varyantlar = [];
  for (const [h, renkler] of Object.entries(piramitRenkler)) {
    for (const [renk, kod, stok] of renkler) {
      varyantlar.push({ id: id++, baslik: renk + ' ' + h, karakter: null, renk: null, renk_kodu: kod, png_en: h === 'O' ? 5.4 : 4.2, png_boy: 6, fiyat: 33000, satilabilir: stok > 0, stok, gorsel: renk + h + '.png', png: true });
    }
  }
  return { id: 9722983907614, baslik: 'Piramit Alfabe Patch', tip: 'letter', set: 'piramit', en: null, boy: '6.0', sekil: 'rect', etiketler: [], gorsel: 'p.jpg', png: true, varyantlar };
}

export function ornekVeriPiramitli(degisiklik = {}) {
  const v = ornekVeri(degisiklik);
  v.setler = v.setler.concat([piramitSeti()]);
  return v;
}
