/* Kategori / koleksiyon sayfası: kişiselleştirilebilen ürün kartlarına etiket, "Kişiselleştir" ve sepet butonu,
   sıralamanın yanına (mobilde "Filtreler ve sıralama"nın altına) "Sadece kişiselleştirilebilenler" filtresi. Temanın kart dosyasına dokunmaz; kartlar sayfa
   geldikten (ve tema filtre / sıralama / sayfa değişiminde ızgarayı yeniden çizdikten) sonra işaretlenir.
   Veri: snippets/kisisel-koleksiyon.liquid (#KisiselKoleksiyon) ve kartı kullanan başka bölümler
   (script[data-kp-kk-veri], ör. ana sayfa "Çok satanlar"). Kartlar için ek istek atılmaz.
   Diğer bölümler için: window.KisiselKartlar.isle(kapsayıcı, { sade: true }) kapsayıcıdaki kartları işaretler;
   sade kartta görselin üstünde yalnızca etiket, fiyatın altında tam genişlikte "Kişiselleştir" (tema butonu) olur. */
(function () {
  'use strict';

  if (window.KisiselKartlar) return;
  var URUNLER = {};
  function veriOku() {
    document.querySelectorAll('#KisiselKoleksiyon, script[data-kp-kk-veri]').forEach(function (el) {
      if (el.hasAttribute('data-kp-kk-okundu')) return;
      el.setAttribute('data-kp-kk-okundu', '');
      try {
        var u = JSON.parse(el.textContent).urunler || {};
        Object.keys(u).forEach(function (k) { URUNLER[k] = u[k]; });
      } catch (e) {
        /* bozuk veri: o bölüm kart işaretlemez */
      }
    });
  }
  veriOku();
  var FILTRE_ANAHTARI = 'kp-kk-filtre:' + window.location.pathname;
  var SEPET_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 7h12l-1.2 12.1a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9L6 7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function kacis(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function urunKimligi(a) {
    var m = (a.pathname || '').match(/\/products\/([^/?#]+)/);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch (e) {
      return m[1];
    }
  }

  function editorAdresi(u) {
    return u + (u.indexOf('?') === -1 ? '?' : '&') + 'kisisellestir=1';
  }

  function depo(yaz) {
    try {
      if (yaz === undefined) return window.sessionStorage.getItem(FILTRE_ANAHTARI) === '1';
      if (yaz) window.sessionStorage.setItem(FILTRE_ANAHTARI, '1');
      else window.sessionStorage.removeItem(FILTRE_ANAHTARI);
    } catch (e) {
      /* gizli pencere */
    }
    return false;
  }

  var filtreAcik = depo() || /[?&]kisisel=1(&|$)/.test(window.location.search);

  /* ---------------- Kartlar ---------------- */

  function kartiSusle(sarici, kimlik, u, secenek) {
    var medya = sarici.querySelector('.card-product__media');
    if (!medya) return;
    var adres = editorAdresi(u.u);
    if (secenek && secenek.sade) return sadeKart(sarici, medya, adres, secenek);
    // Sol üst etiket: temanın kendi etiketi (indirim, NEW IN) varsa onun altına iner
    var temaEtiketi = medya.querySelector('.card-new-in-badge, .card__badge .badge');
    var rozet = document.createElement('span');
    rozet.className = 'kp-kk-rozet' + (temaEtiketi ? ' kp-kk-rozet--alt' : '');
    rozet.innerHTML = '<span class="kp-kk-rozet__ikon" aria-hidden="true">✎</span>' +
      '<span class="kp-kk-masaustu"> Kişiselleştirilebilir</span><span class="kp-kk-mobil-metin"> Kişiselleştir</span>';
    medya.appendChild(rozet);

    // Masaüstü: görselin alt kısmında, her zaman görünür
    var eylem = document.createElement('div');
    eylem.className = 'kp-kk-eylem';
    eylem.innerHTML =
      '<a class="kp-kk-kisisel" href="' + kacis(adres) + '">Kişiselleştir</a>' +
      '<button type="button" class="kp-kk-sepet" data-kp-kk-sepet="' + kacis(kimlik) + '" aria-label="' + kacis(u.b) + ' sepete ekle" title="Sepete ekle">' + SEPET_SVG + '</button>';
    medya.appendChild(eylem);

    // Mobil: görselin hemen altında, ürün adının üstünde, kart genişliğinde
    var mobil = document.createElement('a');
    mobil.className = 'kp-kk-mobil';
    mobil.href = adres;
    mobil.textContent = 'Kişiselleştir';
    medya.insertAdjacentElement('afterend', mobil);
  }

  // Sade kart (ana sayfa bölümleri): küçük etiket + fiyatın altında temanın butonu
  // Etiket görsel kutusunun (card-product__media-inner) sol üst köşesinde, her kartta aynı yerde
  function sadeKart(sarici, medya, adres, secenek) {
    var rozet = document.createElement('span');
    rozet.className = 'kp-kk-rozet kp-kk-rozet--sade';
    rozet.innerHTML = '<span class="kp-kk-rozet__ikon" aria-hidden="true">✎</span> Kişiselleştirilebilir';
    (medya.querySelector('.card-product__media-inner') || medya).appendChild(rozet);
    var bilgi = sarici.querySelector('.card__information') || sarici.querySelector('.card__content');
    if (!bilgi) return;
    var b = document.createElement('a');
    b.className = 'btn btn-primary kp-kk-kart-buton' + (secenek.renk === 'tema' ? '' : ' kp-kk-kart-buton--kirmizi');
    b.href = adres;
    b.textContent = 'Kişiselleştir';
    bilgi.appendChild(b);
  }

  function bosluk(sarici) {
    var medya = sarici.querySelector('.card-product__media');
    if (!medya) return;
    var b = document.createElement('div');
    b.className = 'kp-kk-bosluk';
    b.setAttribute('aria-hidden', 'true');
    medya.insertAdjacentElement('afterend', b);
  }

  function izgara() {
    return document.getElementById('product-grid');
  }

  function kartlariIsle(kok, secenek) {
    var g = kok || izgara();
    if (!g) return;
    veriOku();
    var herhangi = false;
    Array.prototype.forEach.call(g.children, function (li) {
      var sarici = li.querySelector('.card-wrapper');
      if (!sarici) return;
      var durum = sarici.getAttribute('data-kp-kk');
      if (durum === null) {
        var a = sarici.querySelector('a.product-link[href], a[href*="/products/"]');
        var kimlik = a && urunKimligi(a);
        var u = kimlik && URUNLER[kimlik];
        durum = u ? kimlik : '';
        sarici.setAttribute('data-kp-kk', durum);
        if (u) kartiSusle(sarici, kimlik, u, secenek);
        else if (!(secenek && secenek.sade)) bosluk(sarici);
      }
      li.classList.toggle('kp-kk-acik', !!durum);
      li.setAttribute('data-kp-kk-urun', durum);
      if (durum) herhangi = true;
    });
    g.classList.toggle('kp-kk-izgara', herhangi);
  }

  /* ---------------- Filtre ---------------- */

  // Temanın kendi buton sınıfları: kapalıyken çizgili (btn-outline), açıkken dolu (btn-primary); solunda küçük ✎
  function filtreDugmesi(ek) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline kp-kk-filtre' + (ek ? ' ' + ek : '');
    b.setAttribute('data-kp-kk-filtre', '');
    b.innerHTML = '<span class="kp-kk-filtre__ikon" aria-hidden="true">✎</span><span class="kp-kk-filtre__yazi">Sadece kişiselleştirilebilenler</span>';
    dugmeDurumu(b);
    return b;
  }

  function dugmeDurumu(b) {
    b.setAttribute('aria-pressed', filtreAcik ? 'true' : 'false');
    b.classList.toggle('btn-outline', !filtreAcik);
    b.classList.toggle('btn-primary', filtreAcik);
  }

  // Metin tek satıra sığmazsa (dar ekran) yalnızca o düğmede yan boşluk ve harf aralığı azalır; metin kısalmaz
  function sigdir(b) {
    if (!b.offsetWidth) return;
    b.classList.remove('kp-kk-filtre--sik');
    if (b.scrollWidth > b.clientWidth + 1) b.classList.add('kp-kk-filtre--sik');
  }

  function dugmeleriYerlestir() {
    // Masaüstü (dikey filtre düzeni): sıralama seçiminin yanında, yüksekliği sıralama kutusuyla aynı.
    // Tema ızgarayı yeniden çizince yeniden eklenir.
    document.querySelectorAll('#ProductGridContainer .facet-filters.sorting').forEach(function (s) {
      var alan = s.querySelector('.facet-filters__field');
      var b = s.querySelector('[data-kp-kk-filtre]');
      if (!b) {
        b = filtreDugmesi('kp-kk-filtre--masaustu');
        if (alan) alan.insertAdjacentElement('beforebegin', b);
        else s.appendChild(b);
      }
      var secim = alan && alan.querySelector('select');
      if (secim && secim.offsetHeight) b.style.height = secim.offsetHeight + 'px';
    });
    // Mobil: "Filtreler ve sıralama" satırının altında, kendi satırında, tam genişlikte
    document.querySelectorAll('drawer-button.drawer-filter').forEach(function (d) {
      var satir = d.parentElement;
      if (!satir) return;
      var sonraki = satir.nextElementSibling;
      if (sonraki && sonraki.hasAttribute('data-kp-kk-filtre-satir')) return;
      var kutu = document.createElement('div');
      kutu.className = 'kp-kk-filtre-satir';
      kutu.setAttribute('data-kp-kk-filtre-satir', '');
      kutu.appendChild(filtreDugmesi('kp-kk-filtre--mobil'));
      satir.insertAdjacentElement('afterend', kutu);
    });
    document.querySelectorAll('[data-kp-kk-filtre]').forEach(function (b) {
      dugmeDurumu(b);
      sigdir(b);
    });
  }

  function filtreyiUygula() {
    var g = izgara();
    var kap = document.getElementById('ProductGridContainer');
    if (!g) return;
    var sablon = document.getElementById('KisiselKoleksiyonKartlar');
    if (filtreAcik) {
      // Başka sayfadaki kişiselleştirilebilir ürünler de listelenir (sayfayla gelen kart şablonlarından)
      var mevcut = {};
      Array.prototype.forEach.call(g.children, function (li) {
        var k = li.getAttribute('data-kp-kk-urun') || li.getAttribute('data-kp-kk-ek');
        if (k) mevcut[k] = true;
      });
      if (sablon && sablon.content) {
        Array.prototype.forEach.call(sablon.content.children, function (li) {
          var k = li.getAttribute('data-kp-kk-ek');
          if (!k || mevcut[k]) return;
          g.appendChild(li.cloneNode(true));
          mevcut[k] = true;
        });
      }
      kartlariIsle();
      Array.prototype.forEach.call(g.children, function (li) {
        li.classList.toggle('kp-kk-gizli', !li.classList.contains('kp-kk-acik'));
      });
      var bos = g.parentElement.querySelector('.kp-kk-bos');
      var sayi = g.querySelectorAll(':scope > .kp-kk-acik').length;
      if (!sayi && !bos) {
        bos = document.createElement('p');
        bos.className = 'kp-kk-bos';
        bos.textContent = 'Bu kategoride kişiselleştirilebilen ürün yok.';
        g.insertAdjacentElement('afterend', bos);
      } else if (sayi && bos) {
        bos.remove();
      }
    } else {
      g.querySelectorAll(':scope > [data-kp-kk-ek]').forEach(function (li) { li.remove(); });
      g.querySelectorAll(':scope > .kp-kk-gizli').forEach(function (li) { li.classList.remove('kp-kk-gizli'); });
      var b2 = g.parentElement.querySelector('.kp-kk-bos');
      if (b2) b2.remove();
    }
    if (kap) kap.classList.toggle('kp-kk-filtreli', filtreAcik);
    dugmeleriYerlestir();
  }

  function filtreDegistir() {
    filtreAcik = !filtreAcik;
    depo(filtreAcik);
    try {
      var adres = new URL(window.location.href);
      if (filtreAcik) adres.searchParams.set('kisisel', '1');
      else adres.searchParams.delete('kisisel');
      history.replaceState(history.state, '', adres.pathname + adres.search + adres.hash);
    } catch (e) {
      /* yoksay */
    }
    filtreyiUygula();
  }

  /* ---------------- Sepete ekle ---------------- */

  var bildirimZamani = null;

  function bildirim(html, hata) {
    var el = document.querySelector('.kp-kk-bildirim');
    if (!el) {
      el = document.createElement('div');
      el.className = 'kp-kk-bildirim';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.classList.toggle('kp-kk-bildirim--hata', !!hata);
    el.innerHTML = html;
    el.classList.add('kp-kk-bildirim--acik');
    clearTimeout(bildirimZamani);
    bildirimZamani = setTimeout(function () { el.classList.remove('kp-kk-bildirim--acik'); }, 6000);
  }

  function sepetiYenile() {
    try {
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-koleksiyon' });
    } catch (e) {
      /* tema pubsub yoksa */
    }
    var cizim = document.querySelector('cart-drawer');
    var bolumler = ['cart-icon-bubble'];
    if (cizim && typeof cizim.getSectionsToRender === 'function') {
      cizim.getSectionsToRender().forEach(function (b) { if (bolumler.indexOf(b.id) === -1) bolumler.push(b.id); });
    }
    return fetch(window.location.pathname + '?sections=' + bolumler.join(','))
      .then(function (r) { return r.json(); })
      .then(function (b) {
        // Çekmece açılmadan güncellenir (temanın renderContents yerleştirmesiyle aynı)
        if (cizim && typeof cizim.getSectionsToRender === 'function' && typeof cizim.getSectionInnerHTML === 'function') {
          cizim.getSectionsToRender().forEach(function (s) {
            var el = s.selector ? document.querySelector(s.selector) : document.getElementById(s.id);
            if (el && b[s.id]) el.innerHTML = cizim.getSectionInnerHTML(b[s.id], s.selector);
          });
          if (cizim.classList.contains('is-empty')) cizim.classList.remove('is-empty');
          return;
        }
        var kabarcik = document.getElementById('cart-icon-bubble');
        if (kabarcik && b['cart-icon-bubble']) {
          var dom = new DOMParser().parseFromString(b['cart-icon-bubble'], 'text/html').querySelector('.shopify-section');
          if (dom) kabarcik.innerHTML = dom.innerHTML;
        }
      })
      .catch(function () {});
  }

  function sepeteEkle(kimlik, varyantId, dugme) {
    var u = URUNLER[kimlik];
    var rotalar = window.routes || {};
    if (dugme) dugme.setAttribute('aria-busy', 'true');
    return fetch((rotalar.cart_add_url || '/cart/add') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: varyantId, quantity: 1 }] })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok || j.status) throw new Error(j.description || j.message || 'Sepete eklenemedi');
          return j;
        });
      })
      .then(function () {
        bildirim('<span>Sepete eklendi</span> <span class="kp-kk-bildirim__ayrac">·</span> ' +
          '<span>Kişiselleştirmek ister misin? <a class="kp-kk-bildirim__baglanti" href="' + kacis(editorAdresi(u.u)) + '">Tasarla →</a></span>');
        sepetiYenile();
      })
      .catch(function (e) {
        bildirim(kacis(e.message || 'Sepete eklenemedi'), true);
      })
      .then(function () {
        if (dugme) dugme.removeAttribute('aria-busy');
      });
  }

  function secimiKapat() {
    document.querySelectorAll('.kp-kk-secim').forEach(function (el) { el.remove(); });
  }

  // Birden çok seçenekli ürün (beden): küçük seçim kutusu; tek seçenekliyse doğrudan eklenir
  function sepetDugmesi(dugme) {
    var kimlik = dugme.getAttribute('data-kp-kk-sepet');
    var u = URUNLER[kimlik];
    if (!u) return;
    var satilir = u.v.filter(function (v) { return v.a; });
    if (!satilir.length) {
      bildirim('Bu ürün şu an stokta yok.', true);
      return;
    }
    if (u.v.length === 1) return sepeteEkle(kimlik, satilir[0].id, dugme);
    var acik = dugme.parentElement.querySelector('.kp-kk-secim');
    secimiKapat();
    if (acik) return;
    var kutu = document.createElement('div');
    kutu.className = 'kp-kk-secim';
    kutu.setAttribute('role', 'group');
    kutu.setAttribute('aria-label', 'Seçenek seç');
    kutu.innerHTML = u.v.map(function (v) {
      return '<button type="button" data-kp-kk-varyant="' + v.id + '"' + (v.a ? '' : ' disabled') + '>' + kacis(v.t) + '</button>';
    }).join('');
    dugme.insertAdjacentElement('beforebegin', kutu);
    var ilk = kutu.querySelector('button:not([disabled])');
    if (ilk) ilk.focus();
  }

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-kp-kk-filtre]');
    if (f) {
      e.preventDefault();
      return filtreDegistir();
    }
    var s = e.target.closest('[data-kp-kk-sepet]');
    if (s) {
      e.preventDefault();
      return sepetDugmesi(s);
    }
    var v = e.target.closest('[data-kp-kk-varyant]');
    if (v) {
      e.preventDefault();
      var d = v.closest('.kp-kk-eylem').querySelector('[data-kp-kk-sepet]');
      secimiKapat();
      return sepeteEkle(d.getAttribute('data-kp-kk-sepet'), parseInt(v.getAttribute('data-kp-kk-varyant'), 10), d);
    }
    if (!e.target.closest('.kp-kk-secim')) secimiKapat();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') secimiKapat();
  });

  /* ---------------- "Kişiselleştir" basışı: anında tepki ve önceden yükleme ---------------- */

  // Basınca buton hemen "yükleniyor" olur (ürün sayfası ve editör gelene kadar); geri tuşuyla dönülünce eski haline döner
  function editorLinki(e) {
    var a = e.target.closest && e.target.closest('a[href*="kisisellestir=1"]');
    return a && !a.closest('.kp-editor') ? a : null;
  }
  document.addEventListener('click', function (e) {
    var a = editorLinki(e);
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    a.classList.add('kp-kk-yukleniyor');
    a.setAttribute('aria-busy', 'true');
  });
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('.kp-kk-yukleniyor').forEach(function (a) {
      a.classList.remove('kp-kk-yukleniyor');
      a.removeAttribute('aria-busy');
    });
  });

  // Editörün kodu ve stili: kişiselleştirilebilir kart ilk kez ekrana gelince boşta önceden indirilir (tarayıcı
  // önbelleğine). Ürün sayfası: parmak / fare butona değince (Safari belge önceden yüklemeyi desteklemez; orada yalnızca
  // editör dosyaları kazanılır).
  var onYuklenen = {};
  function onYukle(url, tur) {
    if (!url || onYuklenen[url]) return;
    onYuklenen[url] = true;
    var l = document.createElement('link');
    if (l.relList && l.relList.supports && l.relList.supports('prefetch')) {
      l.rel = 'prefetch';
      l.href = url;
      if (tur) l.as = tur;
      document.head.appendChild(l);
    } else if (tur && window.fetch) {
      fetch(url, { credentials: 'same-origin' }).catch(function () {});
    }
  }
  function editorDosyalari() {
    var k = document.querySelector('[data-kp-editor-js]');
    if (!k) return;
    var bos = window.requestIdleCallback || function (f) { return setTimeout(f, 1); };
    bos(function () {
      onYukle(k.getAttribute('data-kp-editor-css'), 'style');
      onYukle(k.getAttribute('data-kp-editor-js'), 'script');
    });
  }
  function onYuklemeIzle() {
    var ilk = document.querySelector('.kp-kk-kart-buton, .kp-kk-kisisel, .kp-kk-mobil');
    if (!ilk) return;
    if (!('IntersectionObserver' in window)) return editorDosyalari();
    var g = new IntersectionObserver(function (x) {
      if (!x.some(function (y) { return y.isIntersecting; })) return;
      g.disconnect();
      editorDosyalari();
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('.kp-kk-kart-buton, .kp-kk-kisisel, .kp-kk-mobil').forEach(function (b) { g.observe(b); });
  }
  ['touchstart', 'mouseover'].forEach(function (olay) {
    document.addEventListener(olay, function (e) {
      var a = editorLinki(e);
      if (a) onYukle(a.href, 'document');
    }, { passive: true });
  });

  /* ---------------- Başlat ---------------- */

  var bekleyen = false;
  function hepsi() {
    bekleyen = false;
    kartlariIsle();
    filtreyiUygula();
  }
  function planla() {
    if (bekleyen) return;
    bekleyen = true;
    (window.requestAnimationFrame || setTimeout)(hepsi);
  }

  function izle() {
    // Tema filtre / sıralama / sayfa değişiminde #ProductGridContainer'ın içini yeniden çizer; "Daha fazla" ve
    // sonsuz kaydırma ızgaraya kart ekler
    var kap = document.getElementById('ProductGridContainer');
    if (!kap || !window.MutationObserver) return;
    var izGrid = null;
    var gozlemci = new MutationObserver(function () {
      var g = izgara();
      if (g && g !== izGrid) {
        izGrid = g;
        gridGozlemci.disconnect();
        gridGozlemci.observe(g, { childList: true });
      }
      planla();
    });
    var gridGozlemci = new MutationObserver(planla);
    gozlemci.observe(kap, { childList: true });
    izGrid = izgara();
    if (izGrid) gridGozlemci.observe(izGrid, { childList: true });
  }

  function baslat() {
    hepsi();
    izle();
    onYuklemeIzle();
    // Ekran genişliği değişince düğmenin sığması yeniden ölçülür
    var bekle = null;
    window.addEventListener('resize', function () {
      clearTimeout(bekle);
      bekle = setTimeout(dugmeleriYerlestir, 150);
    });
  }

  window.KisiselKartlar = { isle: kartlariIsle, urunler: URUNLER, editorAdresi: editorAdresi, onYuklemeIzle: onYuklemeIzle };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat);
  else baslat();
})();
