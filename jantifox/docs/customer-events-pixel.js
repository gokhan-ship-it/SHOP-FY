// Shopify Admin > Ayarlar > Müşteri etkinlikleri > Özel piksel ekle
// Ad: "JantiFox kişiselleştirme → Meta"
// İzin: "Pazarlama" (Meta piksel'i için), Veri satışı: "Veri satışı olarak nitelendirilir" ayarını hukuki tercihinize göre seçin.
//
// Tema, kişiselleştirme olaylarını Shopify.analytics.publish ile yayınlar.
// Bu piksel onlara abone olur ve Meta'ya özel olay (trackCustom) olarak gönderir.
// META_PIXEL_ID yerine Meta Events Manager'daki piksel kimliğini yazın.

const META_PIXEL_ID = 'META_PIXEL_ID';

!(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = '2.0';
  n.queue = [];
  t = b.createElement(e);
  t.async = !0;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', META_PIXEL_ID);

const OLAYLAR = [
  'kisisellestirme_acildi',
  'isim_yazildi', // yalnızca harf_sayisi gönderilir, isim metni gönderilmez
  'ikon_eklendi',
  'tasarim_tamamlandi',
  'tasarimla_sepete_eklendi' // toplam ve para_birimi ile
];

OLAYLAR.forEach((ad) => {
  analytics.subscribe(ad, (olay) => {
    const veri = olay.customData || {};
    const meta = { ...veri };
    if (ad === 'tasarimla_sepete_eklendi') {
      meta.value = veri.toplam;
      meta.currency = veri.para_birimi || 'TRY';
    }
    fbq('trackCustom', ad, meta);
  });
});
