/*
 * Kişiselleştirme gizli ölçüm modu. Yalnızca adreste ?kp_olcum=1 varken (ya da ölçüm modunda "Kişiselleştir"e
 * basılıp gelindiyse) layout/theme.liquid tarafından yüklenir; normal ziyaretçide hiç indirilmez.
 *
 * Sıfır noktası: "Kişiselleştir"e basış (kisisel-koleksiyon.js dokunma olayının zamanını sessionStorage'a yazar).
 * Sayfa ve dosya süreleri tarayıcının Navigation / Resource Timing kayıtlarından; editörün iç adımları
 * kisisel-editor.js'teki kpOlcum('...') işaretlerinden. Ekranın köşesinde küçük kutu; "Kopyala" metni panoya alır.
 */
(function () {
  'use strict';

  var on = window.kpOlcum || {};
  var editorSayfasi = !!on.editor;
  var koken = performance.timeOrigin || (performance.timing && performance.timing.navigationStart) || Date.now() - performance.now();
  var isaretler = {};

  function isle(ad, t) {
    if (!(ad in isaretler)) isaretler[ad] = t;
    if (ad === 'kullanilabilir') ilkKare();
    planla();
  }
  window.kpOlcum = function (ad) { isle(ad, performance.now()); };
  window.kpOlcum.editor = editorSayfasi;
  (on.kuyruk || []).forEach(function (x) { isle(x[0], x[1]); });

  // Basış kaydı: yalnızca editör sayfasında ve son 2 dakika içindeyse; bir kez okunur (yenileyince yeniden sayılmaz)
  var tik = null;
  if (editorSayfasi) {
    try {
      tik = JSON.parse(sessionStorage.getItem('kp_olcum_tik') || 'null');
      sessionStorage.removeItem('kp_olcum_tik');
    } catch (e) {
      tik = null;
    }
    if (tik && !(tik.tik > koken - 120000 && tik.tik <= koken + 1000)) tik = null;
  }
  var sifir = tik ? tik.tik : koken;

  // "Kullanılabilir" işaretinden sonraki ilk boyanmış kare ve ilk boş görev (dokunmaya cevap verebildiği an)
  function ilkKare() {
    requestAnimationFrame(function () {
      setTimeout(function () { isle('ilk_kare', performance.now()); }, 0);
    });
  }

  /* ---------------- Ölçümleri topla ---------------- */

  function sn(epoch) {
    if (epoch == null || !isFinite(epoch)) return null;
    return (epoch - sifir) / 1000;
  }
  function yaz(s) {
    return s == null ? '—' : s.toFixed(2).replace('.', ',') + ' s';
  }
  function kb(b) {
    if (b == null) return '?';
    return b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(2).replace('.', ',') + ' MB' : Math.round(b / 1024) + ' KB';
  }
  function kaynaklar() {
    return performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
  }
  function bul(desen) {
    return kaynaklar().filter(function (r) { return desen.test(r.name); });
  }
  function onbellekMi(r) {
    return r.transferSize === 0 && r.decodedBodySize > 0;
  }
  function bitis(r) {
    return r ? koken + r.responseEnd : null;
  }
  function isaret(ad) {
    return ad in isaretler ? koken + isaretler[ad] : null;
  }
  function dosyaNotu(r) {
    if (!r) return '';
    if (onbellekMi(r)) return ' (önbellekten)';
    return r.transferSize ? ' (' + kb(r.transferSize) + ')' : '';
  }

  // Bir ana kadar (ya da şu ana kadar) indirilen veri ve istek sayısı; ölçüm dosyasının kendisi sayılmaz
  function toplam(sinir) {
    var n = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var liste = kaynaklar().filter(function (r) {
      return !/kisisel-olcum\.js/.test(r.name) && (sinir == null || r.startTime <= sinir);
    });
    if (n) liste = [n].concat(liste);
    var t = { istek: liste.length, bayt: 0, onbellek: 0, bilinmeyen: 0 };
    liste.forEach(function (r) {
      if (r.transferSize > 0) t.bayt += r.transferSize;
      else if (onbellekMi(r)) t.onbellek++;
      else t.bilinmeyen++;
    });
    return t;
  }
  function toplamYaz(t) {
    var ek = [];
    if (t.onbellek) ek.push(t.onbellek + ' önbellekten');
    if (t.bilinmeyen) ek.push(t.bilinmeyen + ' boyutu okunamayan');
    return kb(t.bayt) + ', ' + t.istek + ' istek' + (ek.length ? ' (' + ek.join(', ') + ')' : '');
  }

  function satirlar() {
    var n = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var s = [];
    var ekle = function (ad, epoch, not) { s.push([ad, sn(epoch), not || '']); };

    if (tik && tik.tepki) ekle('Buton tepkisi (ilk kare)', tik.tepki);
    if (tik) ekle('Sayfa isteği başladı', koken);
    if (n) {
      var yon = n.redirectCount ? n.redirectCount + ' adet' : 'yok';
      ekle('Yönlendirmeler bitti (' + yon + ')', koken + n.fetchStart);
      ekle('HTML ilk bayt', koken + n.responseStart);
      ekle('HTML indi' + (n.transferSize ? ' (' + kb(n.transferSize) + ', açık ' + kb(n.decodedBodySize) + ')' : ''), koken + n.responseEnd);
      ekle('HTML ayrıştırıldı', n.domInteractive ? koken + n.domInteractive : null);
      ekle('DOMContentLoaded', n.domContentLoadedEventEnd ? koken + n.domContentLoadedEventEnd : null);
    }
    if (editorSayfasi) {
      var css = bul(/\/kisisel-editor\.css/)[0];
      var js = bul(/\/kisisel-editor\.js/)[0];
      ekle('Editör CSS indi' + dosyaNotu(css), bitis(css));
      ekle('Editör JS indi' + dosyaNotu(js), bitis(js));
      ekle('Editör kodu çalıştı', isaret('editor_kodu'));
      var vb = isaret('veri_basladi');
      var vh = isaret('veri_hazir');
      ekle('Editör verisi hazır' + (vb && vh ? ' (okuma ' + yaz((vh - vb) / 1000) + ')' : ''), vh);
      ekle('Editör ekranı çizildi', isaret('editor_cizildi'));
      var img = document.querySelector('.kp-sahne__urun');
      var src = img && (img.currentSrc || img.src);
      var gr = src ? kaynaklar().filter(function (r) { return r.name === src; })[0] : null;
      ekle('Önizleme görseli indi' + dosyaNotu(gr), bitis(gr));
      ekle('Önizleme görseli hazır (çözüldü)', isaret('onizleme_gorseli'));
      var patch = bul(/\/kisisel-(harf|rakam|ikon|piramit)[^/]*\.(png|webp)/).map(bitis).sort(function (a, b) { return a - b; });
      ekle('İlk patch görseli', patch[0]);
      ekle('İlk 10 patch görseli (' + patch.length + ' indi)', patch.length >= 10 ? patch[9] : null);
      ekle('Editör kullanılabilir', isaret('kullanilabilir'));
      ekle('İlk kare boyandı / dokunmaya hazır', isaret('ilk_kare'));
      ekle('Kampanya hesabı başladı', isaret('kampanya_basladi'));
      ekle('Kampanya hesabı bitti', isaret('kampanya_bitti'));
    }
    if (n && n.loadEventEnd) ekle('Sayfa tamamen yüklendi (load)', koken + n.loadEventEnd);
    return s;
  }

  function metin() {
    var ust = [];
    ust.push('JantiFox editör açılış ölçümü');
    ust.push(new Date().toLocaleString('tr-TR'));
    ust.push(navigator.userAgent);
    ust.push('Ekran ' + screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1) +
      (navigator.connection && navigator.connection.effectiveType ? ' · ağ ' + navigator.connection.effectiveType : ''));
    if (!editorSayfasi) {
      ust.push('Ölçüm modu açık. "Kişiselleştir"e bas; sonuçlar editör açılınca görünür.');
      ust.push('Bu sayfa: ' + location.pathname);
      return ust.join('\n');
    }
    ust.push(tik ? 'Kaynak: ' + tik.kaynak + ' → ' + location.pathname : 'Basış kaydı yok (doğrudan açıldı); sıfır = sayfa isteği');
    if (tik) ust.push('Sıfır: "Kişiselleştir"e basış');
    var g = satirlar();
    var genis = g.reduce(function (m, x) { return Math.max(m, x[0].length); }, 0);
    g.forEach(function (x) {
      var ad = x[0];
      while (ad.length < genis) ad += ' ';
      ust.push(ad + '  ' + yaz(x[1]));
    });
    var k = isaretler.kullanilabilir;
    ust.push('');
    if (k != null) ust.push('Kullanılabilir ana kadar: ' + toplamYaz(toplam(k)));
    ust.push('Şu ana kadar: ' + toplamYaz(toplam(null)));
    var buyuk = kaynaklar().filter(function (r) { return r.transferSize > 0 && !/kisisel-olcum\.js/.test(r.name); })
      .sort(function (a, b) { return b.transferSize - a.transferSize; }).slice(0, 6);
    if (buyuk.length) {
      ust.push('En büyük indirmeler:');
      buyuk.forEach(function (r) {
        var ad = r.name.split('?')[0].split('/').pop() || r.name;
        ust.push('  ' + kb(r.transferSize) + '  ' + ad.slice(0, 48) + '  (bitiş ' + yaz(sn(koken + r.responseEnd)) + ')');
      });
    }
    return ust.filter(function (x) { return x !== null; }).join('\n');
  }

  /* ---------------- Kutu ---------------- */

  var kutu = null;
  var pre = null;
  function kutuKur() {
    if (kutu || !document.body) return;
    kutu = document.createElement('div');
    kutu.setAttribute('data-kp-olcum', '');
    kutu.style.cssText = 'position:fixed;z-index:2147483647;left:6px;bottom:calc(6px + env(safe-area-inset-bottom));' +
      'max-width:calc(100vw - 12px);max-height:55vh;overflow:auto;padding:6px 8px;border-radius:8px;' +
      'background:rgba(0,0,0,.72);color:#fff;font:10px/1.35 ui-monospace,Menlo,monospace;visibility:visible;' +
      '-webkit-text-size-adjust:100%;pointer-events:auto';
    var ust = document.createElement('div');
    ust.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    var baslik = document.createElement('strong');
    baslik.textContent = '⏱ Ölçüm';
    baslik.style.cssText = 'flex:1;font-size:11px';
    var kopyala = dugme('Kopyala');
    var kucult = dugme('–');
    ust.appendChild(baslik);
    ust.appendChild(kopyala);
    ust.appendChild(kucult);
    pre = document.createElement('pre');
    pre.style.cssText = 'margin:0;white-space:pre;font:inherit;color:inherit;background:none;border:0;padding:0';
    kutu.appendChild(ust);
    kutu.appendChild(pre);
    document.body.appendChild(kutu);

    kopyala.addEventListener('click', function () {
      var t = metin();
      var bitti = function () {
        kopyala.textContent = 'Kopyalandı';
        setTimeout(function () { kopyala.textContent = 'Kopyala'; }, 1500);
      };
      var yedek = function () {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, t.length);
        try { document.execCommand('copy'); bitti(); } catch (e) { /* yoksay */ }
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(bitti, yedek);
      else yedek();
    });
    kucult.addEventListener('click', function () {
      var gizli = pre.style.display === 'none';
      pre.style.display = gizli ? '' : 'none';
      kucult.textContent = gizli ? '–' : '+';
    });
    ciz();
  }
  function dugme(yazi) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = yazi;
    b.style.cssText = 'font:600 11px/1 -apple-system,sans-serif;padding:5px 8px;border:1px solid rgba(255,255,255,.6);' +
      'border-radius:6px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer';
    return b;
  }

  function ciz() {
    if (!kutu) return;
    pre.textContent = metin();
  }
  var bekliyor = false;
  function planla() {
    if (bekliyor) return;
    bekliyor = true;
    setTimeout(function () {
      bekliyor = false;
      ciz();
    }, 250);
  }

  if (document.body) kutuKur();
  else document.addEventListener('DOMContentLoaded', kutuKur);
  window.addEventListener('load', function () { setTimeout(planla, 0); });
  // Görseller ve kampanya sonradan biter: 30 saniye boyunca saniyede bir yenilenir
  var sayac = 0;
  var tekrar = setInterval(function () {
    planla();
    if (++sayac >= 30) clearInterval(tekrar);
  }, 1000);
})();
