/*
 * JantiFox Club e-posta pop-up'ı (snippets/jfclub-popup.liquid). Ziyaretçi e-postasını bırakınca hediye kutusu açılır,
 * indirim kodu görünür. Onaylı taslak: jfclub-remotion/public/referans/onayli-taslak-popup.html.
 *
 * - Sayfa açılışında yalnızca bu dosya (defer). CSS, posterler ve videolar pop-up ya da rozet gösterilmeden hemen önce.
 * - Otomatik açılma: 12 sn sonra ya da sayfanın yarısı kaydırılınca (hangisi önce). Sekme arka plandaysa, sepet
 *   çekmecesi / kişiselleştirme editörü / başka bir pencere açıksa beklenir; kapandıktan 3 sn sonra açılır.
 * - Kayıt olmadan kapatınca 7 gün otomatik açılmaz, rozet "?". Kayıttan sonra bir daha açılmaz, rozet "%15" 30 gün.
 *   Durum localStorage'da; erişilemezse pop-up oturumda bir kez. Test: ?jfclub=sifirla (durumu siler), ?jfclub=ac.
 * - Videolar üst üste: Klip1 (bekleme, döngü) → Klip2 (açılış) → Klip3 (açık, döngü). Klip1'in dinlenme anında
 *   geçilir (Klip2 kare 0 = Klip1 kare 0); Klip3 oynamaya başlamadan Klip2 son karesinde kalır. Video oynamazsa
 *   (düşük güç modu, hata, hareket azaltma) posterlerle çalışır.
 * - Form: Shopify müşteri formu, sayfa yenilenmeden gönderilir. /challenge (bot kontrolü) gelirse normal gönderilir;
 *   ?customer_posted=true#jfclub-form ile dönüşte pop-up kendiliğinden açılır ve açılış klibi oynar.
 * - Kayıt başarılı olunca Meta'ya standart Lead (tarayıcıda bir kez), CustomizeProduct ile aynı yoldan (trackSingle).
 * - E-posta adresi tarayıcıda saklanmaz.
 */
(function () {
  'use strict';
  var ayarEl = document.getElementById('jfclub-ayar');
  var sablon = document.getElementById('jfclub-sablon');
  if (!ayarEl || !sablon || !('content' in sablon) || !window.Promise) return;
  var A;
  try { A = JSON.parse(ayarEl.textContent); } catch (e) { return; }

  var DURUM = 'jfclub_durum';
  var LEAD = 'jfclub_lead';
  var OTURUM = 'jfclub_oturum';
  var GONDERIM = 'jfclub_gonderim';
  var GUN = 864e5;
  var META_PIKSEL = '3419060311599240';
  var HATA_EPOSTA = 'Geçerli bir e-posta adresi yaz.';
  var HATA_AG = 'Bir sorun oldu, tekrar dener misin?';
  var azHareket = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var q = location.search;
  var html = document.documentElement;

  /* ---------- Durum (localStorage; erişilemezse oturum) ---------- */

  var depo = (function () {
    try {
      localStorage.setItem('jfclub_t', '1');
      localStorage.removeItem('jfclub_t');
      return localStorage;
    } catch (e) { return null; }
  })();
  var bellek = {};
  function oku(k) {
    try { return (depo || sessionStorage).getItem(k); } catch (e) { return bellek[k] || null; }
  }
  function yaz(k, v) {
    try { (depo || sessionStorage).setItem(k, v); } catch (e) { bellek[k] = v; }
  }
  function sil(k) {
    delete bellek[k];
    try { localStorage.removeItem(k); } catch (e) { /* yok say */ }
    try { sessionStorage.removeItem(k); } catch (e) { /* yok say */ }
  }
  function oturumOku(k) {
    try { return sessionStorage.getItem(k); } catch (e) { return null; }
  }
  function oturumYaz(k, v) {
    try { sessionStorage.setItem(k, v); } catch (e) { /* yok say */ }
  }
  // Lead işareti silinmez: aynı tarayıcıda tek Lead kuralı test sıfırlamasında da korunur
  if (/[?&]jfclub=sifirla(&|$)/.test(q)) [DURUM, OTURUM].forEach(sil);

  // null: hiç kapatılmadı / süresi doldu · 'kapatildi' (7 gün) · 'kayitli' (rozet 30 gün) · 'bitti' (kayıt > 30 gün)
  function durum() {
    var d = null;
    try { d = JSON.parse(oku(DURUM) || 'null'); } catch (e) { /* bozuk kayıt */ }
    if (!d || !d.t) return null;
    var gecen = Date.now() - d.t;
    if (d.d === 'kayitli') return gecen < 30 * GUN ? 'kayitli' : 'bitti';
    if (d.d === 'kapatildi') return gecen < 7 * GUN ? 'kapatildi' : null;
    return null;
  }
  function durumYaz(d) {
    yaz(DURUM, JSON.stringify({ d: d, t: Date.now() }));
  }

  /* ---------- Engeller: editör, sepet çekmecesi, başka pencere ---------- */

  function editorAcik() {
    return html.classList.contains('kp-kilit') || html.classList.contains('kp-acilis-bekle');
  }
  // Temanın çekmece ve pencereleri gövdeyi kilitler (overflow-hidden, overflow-hidden-mobile …); kargo pop-up'ı jf-popup-open
  function govdeKilitli() {
    return !!document.body && /(^|\s)(overflow-hidden(-[\w-]+)?|jf-popup-open)(\s|$)/.test(document.body.className);
  }
  function ekranda(el) {
    if (!el || el.getAttribute('aria-hidden') === 'true') return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false;
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  }
  function baskaPencere() {
    if (!document.body || govdeKilitli()) return true;
    var adaylar = document.querySelectorAll('cart-drawer.active, #popupOverlay:not(.hidden), #discountPopupOverlay:not(.hidden), [aria-modal="true"], details[open] > .menu-drawer, .modal.active, .is-open[role="dialog"]');
    for (var i = 0; i < adaylar.length; i++) {
      if (!adaylar[i].closest('[data-jfclub]') && ekranda(adaylar[i])) return true;
    }
    return false;
  }
  function engelVar() {
    return editorAcik() || baskaPencere();
  }

  /* ---------- Otomatik açılma ---------- */

  var durumSimdi = durum();
  // Bot kontrolünden dönüş: Shopify adresi ?customer_posted=true#jfclub-form ile getirir (karma kaybolursa oturum işareti)
  var donus = /[?&]customer_posted=true(&|$)/.test(q) && (location.hash === '#jfclub-form' || oturumOku(GONDERIM) === '1');
  var hemen = /[?&]jfclub=ac(&|$)/.test(q);
  var otomatik = !durumSimdi && !donus && !hemen && (depo || !oku(OTURUM));
  var acildi = false;

  function uygunsaAc() {
    if (acildi) return;
    if (document.hidden) {
      document.addEventListener('visibilitychange', function bekle() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', bekle);
        uygunsaAc();
      });
      return;
    }
    if (engelVar()) return engelBitinceAc();
    acildi = true;
    if (!depo) yaz(OTURUM, '1');
    ac('posta');
  }
  // Engel kalkınca 3 sn sonra (o an yine engel varsa beklemeye devam)
  var izleyici = null;
  function engelBitinceAc() {
    if (izleyici) return;
    izleyici = setInterval(function () {
      if (engelVar()) return;
      clearInterval(izleyici);
      setTimeout(function () {
        izleyici = null;
        uygunsaAc();
      }, 3000);
    }, 600);
  }
  if (otomatik) {
    var tetiklendi = false;
    var tetikle = function () {
      if (tetiklendi) return;
      tetiklendi = true;
      removeEventListener('scroll', kaydirma);
      uygunsaAc();
    };
    var kaydirma = function () {
      var h = html.scrollHeight - innerHeight;
      if (h > 0 && scrollY / h >= 0.5) tetikle();
    };
    setTimeout(tetikle, 12000);
    addEventListener('scroll', kaydirma, { passive: true });
  }

  /* ---------- Hazırlık: CSS ve pencere (ilk gösterimde) ---------- */

  var kok, kart, rozet, etiket, v1, v2, v3, eposta, hataEl, form, gonderBtn, panelKap, panelPosta, panelOdul;
  var cssSozu = null;
  // CSS gelmeden pencere gösterilmez (yüklenemezse pop-up hiç açılmaz, sayfada çıplak işaretleme görünmez)
  function cssYukle() {
    if (cssSozu) return cssSozu;
    cssSozu = new Promise(function (tamam, olmadi) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = A.css;
      l.onload = function () { tamam(); };
      l.onerror = function () {
        cssSozu = null;
        l.remove();
        olmadi();
      };
      document.head.appendChild(l);
    });
    return cssSozu;
  }
  // Poster CSS ile birlikte istenir; pencere açılınca kapalı kutu hemen görünür
  var posterIstendi = {};
  function posterOnYukle(url) {
    if (!url || posterIstendi[url]) return;
    posterIstendi[url] = true;
    var i = new Image();
    i.decoding = 'async';
    i.src = url;
  }
  function kur() {
    if (kok) return;
    var p = sablon.content.cloneNode(true);
    document.body.appendChild(p);
    kok = document.querySelector('[data-jfclub]');
    kart = kok.querySelector('[data-jfclub-kart]');
    rozet = document.querySelector('[data-jfclub-rozet]');
    etiket = rozet.querySelector('[data-jfclub-etiket]');
    v1 = kok.querySelector('[data-jfclub-klip="1"]');
    v2 = kok.querySelector('[data-jfclub-klip="2"]');
    v3 = kok.querySelector('[data-jfclub-klip="3"]');
    eposta = kok.querySelector('[data-jfclub-eposta]');
    hataEl = kok.querySelector('[data-jfclub-hata]');
    form = eposta.form;
    gonderBtn = kok.querySelector('[data-jfclub-gonder]');
    panelKap = kok.querySelector('[data-jfclub-paneller]');
    panelPosta = kok.querySelector('[data-jfclub-panel="posta"]');
    panelOdul = kok.querySelector('[data-jfclub-panel="odul"]');
    olaylariBagla();
    // Editör açılırsa pop-up ve rozet sessizce gizlenir; tema çekmecesi açıkken rozet görünmez
    new MutationObserver(editorDegisti).observe(html, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(rozetEngeli).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Video ---------- */

  var posterModu = azHareket;
  var asama = 'posta'; // posta · aciliyor · odul
  function kaynak(v, url) {
    if (posterModu || v.getAttribute('src')) return;
    v.preload = 'auto';
    v.src = url;
    v.load();
  }
  function goster(v) {
    [v1, v2, v3].forEach(function (x) { x.classList.toggle('jfclub__video--on', x === v); });
  }
  function oynat(v) {
    if (posterModu) return Promise.reject();
    var p;
    try { p = v.play(); } catch (e) { p = Promise.reject(e); }
    return p && p.then ? p : Promise.resolve();
  }
  function videolariDurdur() {
    [v1, v2, v3].forEach(function (v) { if (v && !v.paused) v.pause(); });
  }
  function posterlereGec() {
    posterModu = true;
    kok.classList.add('jfclub--poster');
    videolariDurdur();
  }
  var onYukleme = null;
  function onYukle() {
    if (onYukleme === true || posterModu) return;
    clearTimeout(onYukleme);
    onYukleme = true;
    kaynak(v2, A.v2);
    kaynak(v3, A.v3);
  }
  function bekleyenKlip() {
    goster(v1);
    if (posterModu) return;
    kaynak(v1, A.v1);
    oynat(v1).catch(posterlereGec);
    if (onYukleme !== true) onYukleme = setTimeout(onYukle, 3000);
  }
  function acikKlip() {
    goster(v3);
    if (posterModu) return;
    kaynak(v3, A.v3);
    oynat(v3).catch(posterlereGec);
  }
  // Kayıt başarılı: Klip1'in dinlenme anında (0–1,05 sn ya da 1,80–2,40 sn) Klip2'ye geçilir; sallanma anındaysa
  // 1,80 sn beklenir. Klip1 o karede durdurulur (Klip2 kare 0 ile aynı poz), Klip2 oynamaya başlayınca öne gelir.
  // Pencere bu arada kapatılırsa video oynatılmaz; rozetten açılınca açık kutu gösterilir.
  function acilisiOynat() {
    asama = 'aciliyor';
    if (!acik) return odulGoster();
    if (posterModu) return posterGecisi();
    onYukle();
    var t = v1.currentTime;
    if (!v1.paused && t >= 1.05 && t < 1.8) {
      return setTimeout(acilisiOynat, Math.max(30, (1.8 - t) * 1000 + 20));
    }
    v1.pause();
    var bitti = false;
    var hazir = function () {
      if (bitti) return;
      bitti = true;
      if (!acik) return odulGoster();
      if (posterModu) return posterGecisi();
      v2.addEventListener('playing', function () {
        goster(v2);
        setTimeout(odulGoster, 900);
      }, { once: true });
      v2.addEventListener('ended', klip3eGec, { once: true });
      oynat(v2).catch(posterGecisi);
    };
    if (v2.readyState >= 3) return hazir();
    v2.addEventListener('canplay', hazir, { once: true });
    setTimeout(function () {
      if (bitti) return;
      bitti = true;
      posterGecisi();
    }, 5000);
  }
  // Klip2 son karesinde kalır; Klip3 'playing' verince öne gelir (siyah ya da boş kare görünmez)
  function klip3eGec() {
    if (!acik || posterModu) return;
    v3.currentTime = 0;
    v3.addEventListener('playing', function () {
      goster(v3);
      v2.pause();
    }, { once: true });
    oynat(v3).catch(function () { /* Klip2'nin son karesi = açık poz; öyle kalır */ });
  }
  // Video yok: kapalı poster açık postere yumuşak geçer, metinler hemen
  function posterGecisi() {
    if (asama === 'odul' && posterModu) return;
    posterlereGec();
    goster(v3);
    odulGoster();
  }

  /* ---------- Paneller ---------- */

  // Panel yüksekliği zıplamadan değişir
  function yukseklikle(degistir) {
    var once = panelKap.offsetHeight;
    panelKap.style.height = once + 'px';
    panelKap.style.overflow = 'hidden';
    degistir();
    var sonra = panelKap.scrollHeight;
    var bitir_ = function () {
      panelKap.style.height = '';
      panelKap.style.overflow = '';
    };
    if (azHareket || !acik || Math.abs(sonra - once) < 2) return bitir_();
    requestAnimationFrame(function () {
      panelKap.style.height = sonra + 'px';
      setTimeout(bitir_, 450);
    });
  }
  function panelSec(ad, animasyon) {
    yukseklikle(function () {
      panelPosta.hidden = ad !== 'posta';
      panelOdul.hidden = ad !== 'odul';
      panelPosta.classList.remove('jfclub__panel--gizle');
      panelOdul.classList.toggle('jfclub__panel--belir', !!animasyon);
    });
  }
  function odulGoster() {
    if (asama === 'odul') return;
    asama = 'odul';
    panelSec('odul', acik);
    rozetEtiketi();
    // Gönder düğmesi gizlendi: odak pencerede kalsın
    if (acik && !kart.contains(document.activeElement)) {
      try { kart.focus({ preventScroll: true }); } catch (e) { /* yok say */ }
    }
  }
  function adresYaz(adres) {
    kok.querySelector('[data-jfclub-adres]').textContent = adres || 'e-posta';
  }

  /* ---------- Açma / kapatma ---------- */

  var acik = false;
  var donusOdagi = null;
  function ac(gorunum, sonra) {
    var kayitli = gorunum === 'odul';
    posterOnYukle(kayitli ? A.p3 : A.p1);
    cssYukle().then(function () {
      kur();
      if (acik) return;
      if (editorAcik()) {
        // Otomatik açılış editörle çakıştı: editör kapanınca yeniden denenir
        if (otomatik && !donus && !hemen) {
          acildi = false;
          engelBitinceAc();
        }
        return;
      }
      if (!kayitli && !v1.poster) v1.poster = A.p1;
      if (!v3.poster) v3.poster = A.p3;
      asama = kayitli ? 'odul' : 'posta';
      panelPosta.hidden = kayitli;
      panelOdul.hidden = !kayitli;
      panelPosta.classList.remove('jfclub__panel--gizle');
      panelOdul.classList.remove('jfclub__panel--belir');
      hataGoster('');
      if (kayitli) adresYaz('');
      var kb = kok.querySelector('[data-jfclub-kopyala]');
      kb.textContent = 'Kopyala';
      kb.classList.remove('jfclub__kopyala--tamam');
      kok.classList.toggle('jfclub--poster', posterModu);
      donusOdagi = document.activeElement;
      kok.hidden = false;
      rozetGizle();
      html.classList.add('jfclub-kilit');
      void kok.offsetWidth;
      kok.classList.add('jfclub--acik');
      acik = true;
      klavyeIzle(true);
      try { kart.focus({ preventScroll: true }); } catch (e) { kart.focus(); }
      if (kayitli) acikKlip();
      else bekleyenKlip();
      if (sonra) sonra();
    }).catch(function () { /* CSS yüklenemedi: pencere gösterilmez */ });
  }
  function kapat(sessiz) {
    if (!acik) return;
    acik = false;
    kok.classList.remove('jfclub--acik');
    html.classList.remove('jfclub-kilit');
    klavyeIzle(false);
    videolariDurdur();
    if (onYukleme !== true) clearTimeout(onYukleme);
    setTimeout(function () { if (!acik) kok.hidden = true; }, azHareket ? 0 : 450);
    if (sessiz) return;
    if (!durum()) durumYaz('kapatildi');
    rozetGoster();
    var hedef = donusOdagi && donusOdagi !== document.body && document.contains(donusOdagi) ? donusOdagi : rozet;
    try { hedef.focus({ preventScroll: true }); } catch (e) { /* yok say */ }
  }
  var editorOnce = false;
  function editorDegisti() {
    var e = editorAcik();
    if (e === editorOnce) return;
    editorOnce = e;
    if (e) {
      if (acik) kapat(true);
      rozetGizle();
    } else {
      rozetGoster();
    }
  }

  /* ---------- Rozet ---------- */

  function rozetEtiketi() {
    if (etiket) etiket.textContent = durum() === 'kayitli' || asama === 'odul' ? '%15' : '?';
  }
  function rozetGizle() {
    if (!rozet) return;
    rozet.hidden = true;
    rozet.classList.remove('jfclub-rozet--on');
  }
  // Rozet yalnızca kayıt olmadan kapatıldıysa (7 gün, "?") ya da kayıt olunduysa (30 gün, "%15") görünür
  function rozetGoster() {
    if (!rozet || acik) return;
    var d = durum();
    if (editorAcik() || (d !== 'kapatildi' && d !== 'kayitli')) return rozetGizle();
    rozetEtiketi();
    rozetEngeli();
    if (!rozet.hidden) return rozetKonumla();
    rozet.hidden = false;
    rozetKonumla();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (!rozet.hidden) rozet.classList.add('jfclub-rozet--on'); });
    });
  }
  // Tema çekmecesi ya da başka bir pencere gövdeyi kilitlediyse rozet geçici olarak saklanır
  function rozetEngeli() {
    if (rozet) rozet.classList.toggle('jfclub-rozet--engel', govdeKilitli());
  }
  // Sağ alttaki düğmeler ve ürün sayfasındaki yapışkan "Sepete ekle" çubuğuyla çakışmasın: rozetin yerindeki sabit
  // öğelerin üstüne çıkar. Ölçü dönüşümsüz kutudan (offset*) alınır; rozet büyüme animasyonundayken de doğru.
  var konumBekliyor = false;
  function rozetKonumla() {
    if (!rozet || rozet.hidden) return;
    rozet.style.removeProperty('--jfclub-rozet-alt');
    var x = rozet.offsetLeft;
    var y = rozet.offsetTop;
    var g = rozet.offsetWidth;
    var y_ = rozet.offsetHeight;
    var en = innerHeight;
    var noktalar = [[x + 4, y + 4], [x + g - 4, y + 4], [x + 4, y + y_ - 4], [x + g - 4, y + y_ - 4], [x + g / 2, y + y_ / 2]];
    noktalar.forEach(function (n) {
      (document.elementsFromPoint(n[0], n[1]) || []).forEach(function (el) {
        if (rozet.contains(el) || el === document.body || el === html) return;
        for (var e = el; e && e !== document.body; e = e.parentElement) {
          var s = getComputedStyle(e);
          if (s.position === 'fixed' || s.position === 'sticky') {
            var t = e.getBoundingClientRect().top;
            if (t < en && t > innerHeight * 0.4) en = t;
            break;
          }
        }
      });
    });
    if (en < innerHeight) rozet.style.setProperty('--jfclub-rozet-alt', Math.round(innerHeight - en + 12) + 'px');
  }
  function konumIzle() {
    if (!rozet || rozet.hidden || konumBekliyor) return;
    konumBekliyor = true;
    setTimeout(function () {
      konumBekliyor = false;
      rozetKonumla();
    }, 250);
  }
  addEventListener('scroll', konumIzle, { passive: true });
  addEventListener('resize', konumIzle);

  /* ---------- Klavye (visualViewport): buton görünür kalsın ---------- */

  function klavyeAyarla() {
    var vv = window.visualViewport;
    if (!vv || !kart) return;
    var alt = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    var var_ = alt > 80;
    kok.classList.toggle('jfclub--klavye', var_);
    kok.style.setProperty('--jfclub-klavye', (var_ ? alt : 0) + 'px');
    kok.style.setProperty('--jfclub-gorunur', Math.round(vv.height) + 'px');
    if (var_ && document.activeElement === eposta) {
      setTimeout(function () {
        var r = gonderBtn.getBoundingClientRect();
        var fazla = r.bottom + 10 - (vv.offsetTop + vv.height);
        if (fazla > 0) kart.scrollTop += fazla;
      }, 280);
    }
  }
  function klavyeIzle(ac_) {
    var vv = window.visualViewport;
    if (!vv) return;
    if (ac_) {
      vv.addEventListener('resize', klavyeAyarla);
      vv.addEventListener('scroll', klavyeAyarla);
      klavyeAyarla();
    } else {
      vv.removeEventListener('resize', klavyeAyarla);
      vv.removeEventListener('scroll', klavyeAyarla);
      kok.classList.remove('jfclub--klavye');
    }
  }

  /* ---------- Form ---------- */

  function hataGoster(m) {
    hataEl.textContent = m;
    eposta.classList.toggle('jfclub__eposta--hata', !!m);
    if (m) eposta.setAttribute('aria-invalid', 'true');
    else eposta.removeAttribute('aria-invalid');
  }
  var gonderiliyor = false;
  function gonder(e) {
    if (e) e.preventDefault();
    if (gonderiliyor || asama !== 'posta') return;
    var v = eposta.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      hataGoster(HATA_EPOSTA);
      eposta.focus();
      return;
    }
    hataGoster('');
    eposta.value = v;
    gonderiliyor = true;
    gonderBtn.disabled = true;
    kok.setAttribute('aria-busy', 'true');
    onYukle();
    fetch(form.action, { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) {
        // Yalnızca son adres gerekir; sayfanın gövdesi indirilmez
        try { if (r.body && r.body.cancel) r.body.cancel(); } catch (x) { /* yok say */ }
        var son = r.url || '';
        if (/\/challenge(\/|\?|#|$)/.test(son)) {
          // Bot kontrolü: normal gönderim (sayfa gidip gelir; dönüşte ?customer_posted=true#jfclub-form)
          oturumYaz(GONDERIM, '1');
          HTMLFormElement.prototype.submit.call(form);
          return;
        }
        bitir();
        if (/[?&]customer_posted=true(&|#|$)/.test(son)) return basarili(v);
        hataGoster(r.ok ? HATA_EPOSTA : HATA_AG);
      })
      .catch(function () {
        bitir();
        hataGoster(HATA_AG);
      });
  }
  function bitir() {
    gonderiliyor = false;
    gonderBtn.disabled = false;
    kok.removeAttribute('aria-busy');
  }
  function basarili(adres) {
    durumYaz('kayitli');
    adresYaz(adres);
    if (kart.contains(document.activeElement)) {
      if (document.activeElement === eposta) eposta.blur();
      try { kart.focus({ preventScroll: true }); } catch (e) { /* yok say */ }
    }
    panelPosta.classList.add('jfclub__panel--gizle');
    leadGonder();
    acilisiOynat();
  }

  /* ---------- Meta: Lead (tarayıcıda bir kez) ---------- */

  function pazarlamaIzni() {
    try {
      var cp = window.Shopify && Shopify.customerPrivacy;
      if (cp && typeof cp.marketingAllowed === 'function') return !!cp.marketingAllowed();
    } catch (e) { /* yok say */ }
    return true;
  }
  function metaPikseli() {
    try {
      var p = window.fbq && typeof window.fbq.getState === 'function' ? window.fbq.getState().pixels || [] : [];
      var kimlikler = p.map(function (x) { return String(x.id); });
      if (kimlikler.length && kimlikler.indexOf(META_PIKSEL) < 0) return kimlikler[0];
    } catch (e) { /* yok say */ }
    return META_PIKSEL;
  }
  function olcumKaydi(k) {
    try { if (window.kpOlcum && typeof window.kpOlcum.olay === 'function') window.kpOlcum.olay(k); } catch (e) { /* yok say */ }
  }
  // fbq uygulama tarafından geç kurulabilir: 12 sn'ye kadar beklenir
  function leadGonder() {
    if (oku(LEAD)) return;
    var deneme = 0;
    (function dene() {
      if (typeof window.fbq === 'function') {
        var kimlik = 'jfclub-lead-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        if (!pazarlamaIzni()) return olcumKaydi({ kanal: 'Meta', ad: 'Lead', kimlik: kimlik, not: 'gönderilmedi (pazarlama izni yok)' });
        try {
          window.fbq('trackSingle', metaPikseli(), 'Lead', { content_name: 'JantiFox Club' }, { eventID: kimlik });
          yaz(LEAD, '1');
        } catch (e) { /* yok say */ }
        return;
      }
      if (++deneme < 24) return setTimeout(dene, 500);
      olcumKaydi({ kanal: 'Meta', ad: 'Lead', not: 'gönderilmedi (fbq yok)' });
    })();
  }

  /* ---------- Kod: kopyala, sepete uygula ---------- */

  function kopyala(btn) {
    var kodEl = kok.querySelector('[data-jfclub-kod]');
    var tamam = function () {
      btn.textContent = 'Kopyalandı ✓';
      btn.classList.add('jfclub__kopyala--tamam');
    };
    // Pano yoksa: kod seçilir, eski yolla kopyalanmayı dener; olmazsa seçili kalır ve "Kodu seç" yazar
    var olmadi = function () {
      var s = null;
      try {
        var r = document.createRange();
        r.selectNodeContents(kodEl);
        s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
        if (document.execCommand && document.execCommand('copy')) {
          s.removeAllRanges();
          return tamam();
        }
      } catch (e) { /* yok say */ }
      btn.textContent = 'Kodu seç';
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(kodEl.textContent.trim()).then(tamam, olmadi);
      else olmadi();
    } catch (e) { olmadi(); }
  }
  var bildirimZaman;
  function uygula(btn) {
    var kod = encodeURIComponent(A.kod);
    btn.disabled = true;
    // Arka planda: indirim çerezi ve sepet kodu ayarlanır, sayfadan çıkılmaz
    fetch('/discount/' + kod + '?redirect=%2Fcart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        btn.disabled = false;
        var b = kok.querySelector('[data-jfclub-bildirim]');
        b.classList.add('jfclub__bildirim--on');
        clearTimeout(bildirimZaman);
        bildirimZaman = setTimeout(function () { b.classList.remove('jfclub__bildirim--on'); }, 2200);
      })
      .catch(function () { location.href = '/discount/' + kod + '?redirect=%2Fcart'; });
  }

  /* ---------- Olaylar ---------- */

  function odaklanabilir() {
    return Array.prototype.filter.call(kart.querySelectorAll('button, input:not([type="hidden"]), [href], [tabindex]:not([tabindex="-1"])'), function (x) {
      return !x.disabled && x.getClientRects().length > 0 && !x.closest('[hidden]');
    });
  }
  function olaylariBagla() {
    form.addEventListener('submit', gonder);
    eposta.addEventListener('focus', onYukle);
    eposta.addEventListener('input', function () { if (hataEl.textContent) hataGoster(''); });
    kok.querySelector('[data-jfclub-kapat]').addEventListener('click', function () { kapat(); });
    kok.querySelector('[data-jfclub-karartma]').addEventListener('click', function () { kapat(); });
    kok.querySelector('[data-jfclub-kopyala]').addEventListener('click', function (e) { kopyala(e.currentTarget); });
    kok.querySelector('[data-jfclub-uygula]').addEventListener('click', function (e) { uygula(e.currentTarget); });
    rozet.addEventListener('click', function () {
      ac(durum() === 'kayitli' ? 'odul' : 'posta');
    });
    // Esc kapatır; odak pencerenin içinde kalır
    document.addEventListener('keydown', function (e) {
      if (!acik) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        return kapat();
      }
      if (e.key !== 'Tab') return;
      var odak = odaklanabilir();
      if (!odak.length) return;
      var ilk = odak[0];
      var son = odak[odak.length - 1];
      var simdi = document.activeElement;
      if (!kart.contains(simdi)) {
        e.preventDefault();
        (e.shiftKey ? son : ilk).focus();
      } else if (e.shiftKey && (simdi === ilk || simdi === kart)) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && simdi === son) {
        e.preventDefault();
        ilk.focus();
      }
    });
    // Odak dışarı kaçarsa (ör. ekran okuyucu) pencereye geri döner
    document.addEventListener('focusin', function (e) {
      if (acik && !kok.contains(e.target)) {
        try { kart.focus({ preventScroll: true }); } catch (x) { /* yok say */ }
      }
    });
    // Klip3 kare 0'da bekler (ön yüklemede ilk kare)
    v3.addEventListener('loadeddata', function () { if (asama !== 'odul' && v3.paused) v3.currentTime = 0; });
    [v1, v2, v3].forEach(function (v) {
      v.addEventListener('error', function () {
        if (!v.getAttribute('src')) return;
        if (asama === 'aciliyor') posterGecisi();
        else posterlereGec();
      });
    });
  }

  /* ---------- Başlangıç ---------- */

  function baslat() {
    if (donus) {
      // Bot kontrolünden dönüş: adres temizlenir, pop-up açılır ve açılış klibi oynar
      try { sessionStorage.removeItem(GONDERIM); } catch (e) { /* yok say */ }
      try {
        var temiz = q.replace(/([?&])customer_posted=true(&|$)/, '$1').replace(/[?&]$/, '');
        history.replaceState(history.state, '', location.pathname + temiz);
      } catch (e) { /* yok say */ }
      durumYaz('kayitli');
      leadGonder();
      acildi = true;
      ac('posta', function () {
        panelPosta.classList.add('jfclub__panel--gizle');
        // Klip1 ilk karesi gelince (ya da hemen, poster modunda)
        var basladi = false;
        var basla = function () {
          if (basladi) return;
          basladi = true;
          acilisiOynat();
        };
        if (posterModu || v1.readyState >= 2) return basla();
        v1.addEventListener('loadeddata', basla, { once: true });
        setTimeout(basla, 2500);
      });
      return;
    }
    if (hemen) {
      acildi = true;
      return ac(durumSimdi === 'kayitli' ? 'odul' : 'posta');
    }
    // Daha önce kapatıldıysa ya da kayıt olunduysa rozet (sayfa yüklendikten sonra; editör açıksa beklenir)
    if (durumSimdi === 'kapatildi' || durumSimdi === 'kayitli') {
      var rozetKur = function () {
        if (editorAcik()) return setTimeout(rozetKur, 1500);
        cssYukle().then(function () {
          kur();
          rozetGoster();
        }).catch(function () { /* yok say */ });
      };
      if (document.readyState === 'complete') setTimeout(rozetKur, 600);
      else addEventListener('load', function () { setTimeout(rozetKur, 600); });
    }
  }
  baslat();
})();
