/*
 * JantiFox kişiselleştirme: sepette tasarım gruplaması
 * - Aynı _tasarim_id'yi taşıyan kalemleri sepet çekmecesinde ve sepet sayfasında grup olarak gösterir.
 * - Çanta (baz kalem) silinirse onay sorar ve grubun tamamını siler.
 * - Tek bir patch silinirse uyarır, siler ve çanta kalemindeki tasarım özetini günceller.
 * - Çanta adedi değişirse patch adetlerini aynı oranda değiştirir.
 * Tasarım kalemi olmayan sepetlerde hiçbir şey yapmaz.
 */
(function () {
  'use strict';

  if (window.KisiselSepet) return;

  var rotalar = function () {
    var r = window.routes || {};
    return {
      sepet: r.cart_url || '/cart',
      guncelle: (r.cart_update_url || '/cart/update') + '.js',
      degistir: (r.cart_change_url || '/cart/change') + '.js'
    };
  };

  var sonSepet = null;
  var calisiyor = false;
  var tekrar = false;

  function sepetGetir() {
    return fetch(rotalar().sepet + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        sonSepet = s;
        return s;
      });
  }

  function satirlar() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.cart-item[id^="CartDrawer-Item-"], .cart-item[id^="CartItem-"]')
    );
  }

  function satirNo(satir) {
    return parseInt(satir.id.split('-').pop(), 10);
  }

  function sadeAd(baslik) {
    return String(baslik || '').replace(/\s*patch\s*$/i, '').trim();
  }

  // Grubun kalan kalemlerinden tasarım özetini yeniden üretir
  function ozetUret(kalemler) {
    var harfler = [];
    var digerleri = [];
    kalemler.forEach(function (k) {
      var o = k.properties || {};
      if (o._tasarim_rol !== 'patch') return;
      if (o['Harf sırası']) {
        String(o['Harf sırası']).split(',').forEach(function (s) {
          harfler.push({ sira: parseInt(s, 10), harf: k.variant_title || '' });
        });
      } else {
        var birim = parseInt(o._adet_birim, 10) || 1;
        var ad = k.variant_title && k.variant_title !== 'Default Title' ? k.variant_title : sadeAd(k.product_title);
        for (var i = 0; i < birim; i++) digerleri.push(ad);
      }
    });
    harfler.sort(function (a, b) { return a.sira - b.sira; });
    var isim = harfler.map(function (h) { return h.harf; }).join('');
    return { isim: isim, ozet: [isim].concat(digerleri).filter(Boolean).join(' + ') };
  }

  function gruplar(sepet) {
    var g = {};
    (sepet.items || []).forEach(function (k, i) {
      var o = k.properties || {};
      if (!o._tasarim_id) return;
      if (!g[o._tasarim_id]) g[o._tasarim_id] = { baz: null, patchler: [] };
      k._satir = i + 1;
      if (o._tasarim_rol === 'baz') g[o._tasarim_id].baz = k;
      else g[o._tasarim_id].patchler.push(k);
    });
    return g;
  }

  /* ---------------- Görünüm ---------------- */

  function isaretle() {
    if (calisiyor) {
      tekrar = true;
      return;
    }
    var mevcut = satirlar();
    if (!mevcut.length) return;
    calisiyor = true;
    sepetGetir()
      .then(function (sepet) {
        var kalemler = sepet.items || [];
        var tasarimVar = kalemler.some(function (k) { return k.properties && k.properties._tasarim_id; });
        if (!tasarimVar) return;
        var kapsayicilar = [];
        satirlar().forEach(function (satir) {
          var k = kalemler[satirNo(satir) - 1];
          var o = (k && k.properties) || {};
          if (!o._tasarim_id) {
            satir.classList.remove('kp-sepet-baz', 'kp-sepet-patch');
            satir.removeAttribute('data-kp-tasarim');
            return;
          }
          satir.setAttribute('data-kp-tasarim', o._tasarim_id);
          satir.setAttribute('data-kp-rol', o._tasarim_rol === 'baz' ? 'baz' : 'patch');
          satir.classList.toggle('kp-sepet-baz', o._tasarim_rol === 'baz');
          satir.classList.toggle('kp-sepet-patch', o._tasarim_rol !== 'baz');
          if (kapsayicilar.indexOf(satir.parentNode) === -1) kapsayicilar.push(satir.parentNode);
        });
        // Patch satırlarını kendi çantalarının hemen altına taşı (yalnızca sıra yanlışsa)
        kapsayicilar.forEach(function (kap) {
          var bazlar = kap.querySelectorAll(':scope > [data-kp-rol="baz"]');
          Array.prototype.forEach.call(bazlar, function (baz) {
            var id = baz.getAttribute('data-kp-tasarim');
            var onceki = baz;
            Array.prototype.forEach.call(kap.querySelectorAll(':scope > [data-kp-rol="patch"]'), function (p) {
              if (p.getAttribute('data-kp-tasarim') !== id) return;
              if (onceki.nextElementSibling !== p) onceki.after(p);
              onceki = p;
            });
            Array.prototype.forEach.call(kap.querySelectorAll(':scope > [data-kp-tasarim="' + id + '"]'), function (s) {
              s.classList.remove('kp-sepet-son');
            });
            onceki.classList.add('kp-sepet-son');
            if (!baz.querySelector('.kp-sepet-rozet')) {
              var ad = baz.querySelector('.cart-item__name');
              if (ad) {
                var rozet = document.createElement('span');
                rozet.className = 'kp-sepet-rozet';
                rozet.textContent = 'Kişiselleştirilmiş';
                ad.insertAdjacentElement('beforebegin', rozet);
              }
            }
          });
        });
      })
      .catch(function () {})
      .then(function () {
        calisiyor = false;
        if (tekrar) {
          tekrar = false;
          isaretle();
        }
      });
  }

  /* ---------------- Sepet güncelleme ---------------- */

  function yenidenCiz() {
    if (/\/cart\/?$/.test(window.location.pathname)) {
      window.location.reload();
      return;
    }
    try {
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-sepet' });
      }
    } catch (e) {
      /* yoksay */
    }
    fetch(window.location.pathname + '?sections=cart-icon-bubble')
      .then(function (r) { return r.json(); })
      .then(function (b) {
        var el = document.getElementById('cart-icon-bubble');
        if (el && b['cart-icon-bubble']) {
          var dom = new DOMParser().parseFromString(b['cart-icon-bubble'], 'text/html').querySelector('.shopify-section');
          if (dom) el.innerHTML = dom.innerHTML;
        }
      })
      .catch(function () {});
  }

  function postJson(url, govde) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(govde)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.status) throw new Error(j.description || j.message || 'Sepet güncellenemedi.');
        return j;
      });
    });
  }

  function hataBildir(mesaj) {
    window.alert(mesaj);
  }

  function grupSil(grup) {
    var guncelle = {};
    if (grup.baz) guncelle[grup.baz.key] = 0;
    grup.patchler.forEach(function (p) { guncelle[p.key] = 0; });
    return postJson(rotalar().guncelle, { updates: guncelle });
  }

  function patchSil(grup, patch) {
    return postJson(rotalar().guncelle, { updates: (function () { var u = {}; u[patch.key] = 0; return u; })() }).then(function () {
      if (!grup.baz) return;
      var kalan = grup.patchler.filter(function (p) { return p.key !== patch.key; });
      var yeni = ozetUret(kalan);
      var ozellik = {};
      Object.keys(grup.baz.properties || {}).forEach(function (a) { ozellik[a] = grup.baz.properties[a]; });
      if (!kalan.length) {
        // Tasarımda hiç patch kalmadı: çanta düz çanta olarak kalır
        delete ozellik['Tasarım'];
        delete ozellik['İsim'];
        delete ozellik._tasarim_konum;
        ozellik._tasarim_rol = 'baz';
      } else {
        ozellik['Tasarım'] = yeni.ozet;
        if (yeni.isim) ozellik['İsim'] = yeni.isim;
        else delete ozellik['İsim'];
        try {
          var konum = JSON.parse(ozellik._tasarim_konum || '{}');
          if (konum.p) {
            var silinecek = parseInt(patch.properties._adet_birim, 10) || 1;
            konum.p = konum.p.filter(function (x) {
              if (String(x.v) === String(patch.variant_id) && silinecek > 0) {
                silinecek--;
                return false;
              }
              return true;
            });
            ozellik._tasarim_konum = JSON.stringify(konum);
          }
        } catch (e) {
          /* konum bozuksa olduğu gibi kalsın */
        }
      }
      return sepetGetir().then(function (sepet) {
        var baz = (sepet.items || []).filter(function (k) { return k.key === grup.baz.key; })[0];
        if (!baz) return;
        return postJson(rotalar().degistir, { id: baz.key, quantity: baz.quantity, properties: ozellik });
      });
    });
  }

  function adetDegistir(grup, yeniAdet) {
    var guncelle = {};
    guncelle[grup.baz.key] = yeniAdet;
    grup.patchler.forEach(function (p) {
      var birim = parseInt(p.properties._adet_birim, 10) || Math.round(p.quantity / Math.max(1, grup.baz.quantity)) || 1;
      guncelle[p.key] = birim * yeniAdet;
    });
    return postJson(rotalar().guncelle, { updates: guncelle });
  }

  function grupBul(satir) {
    var id = satir.getAttribute('data-kp-tasarim');
    if (!id || !sonSepet) return null;
    var g = gruplar(sonSepet)[id];
    if (!g) return null;
    var kalem = sonSepet.items[satirNo(satir) - 1];
    return { grup: g, kalem: kalem };
  }

  function islem(soz) {
    document.documentElement.classList.add('kp-sepet-mesgul');
    return soz
      .catch(function (e) {
        hataBildir(e.message || 'Sepet güncellenemedi.');
      })
      .then(function () {
        document.documentElement.classList.remove('kp-sepet-mesgul');
        yenidenCiz();
      });
  }

  // Sil butonu (tema dinleyicisinden önce yakalanır)
  document.addEventListener(
    'click',
    function (e) {
      var buton = e.target.closest && e.target.closest('cart-remove-button, .cart-remove-button');
      if (!buton) return;
      var satir = buton.closest('[data-kp-tasarim]');
      if (!satir) return;
      var bilgi = grupBul(satir);
      if (!bilgi || !bilgi.kalem) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (satir.getAttribute('data-kp-rol') === 'baz') {
        if (!window.confirm('Çantayı silersen bu tasarıma ait tüm patch\'ler de sepetten çıkar. Devam edilsin mi?')) return;
        islem(grupSil(bilgi.grup));
      } else {
        if (!window.confirm('Bu patch\'i silersen tasarımın değişecek. Devam edilsin mi?')) return;
        islem(patchSil(bilgi.grup, bilgi.kalem));
      }
    },
    true
  );

  // Adet değişikliği (tema dinleyicisinden önce yakalanır)
  document.addEventListener(
    'change',
    function (e) {
      var girdi = e.target;
      if (!girdi.matches || !girdi.matches('input[name="updates[]"], .quantity__input')) return;
      var satir = girdi.closest('[data-kp-tasarim]');
      if (!satir) return;
      var bilgi = grupBul(satir);
      if (!bilgi || !bilgi.kalem) return;
      e.stopImmediatePropagation();
      var yeni = parseInt(girdi.value, 10);
      if (satir.getAttribute('data-kp-rol') !== 'baz') {
        // Patch adetleri çantaya bağlıdır; doğrudan değiştirilemez
        girdi.value = bilgi.kalem.quantity;
        return;
      }
      if (!(yeni >= 0) || yeni === bilgi.kalem.quantity) {
        girdi.value = bilgi.kalem.quantity;
        return;
      }
      if (yeni === 0) {
        if (!window.confirm('Çantayı silersen bu tasarıma ait tüm patch\'ler de sepetten çıkar. Devam edilsin mi?')) {
          girdi.value = bilgi.kalem.quantity;
          return;
        }
        islem(grupSil(bilgi.grup));
        return;
      }
      islem(adetDegistir(bilgi.grup, yeni));
    },
    true
  );

  // Sepet içeriği her yeniden çizildiğinde grupları işaretle
  var bekleyen = null;
  function planla() {
    if (bekleyen) return;
    bekleyen = setTimeout(function () {
      bekleyen = null;
      isaretle();
    }, 60);
  }
  function gozle() {
    var hedefler = [document.querySelector('cart-drawer'), document.querySelector('cart-items')].filter(Boolean);
    hedefler.forEach(function (h) {
      new MutationObserver(function (kayitlar) {
        var ilgili = kayitlar.some(function (k) {
          return Array.prototype.some.call(k.addedNodes, function (n) {
            return n.nodeType === 1 && (n.matches('.cart-item, cart-drawer-items, .drawer__inner, .js-contents') || n.querySelector('.cart-item'));
          });
        });
        if (ilgili) planla();
      }).observe(h, { childList: true, subtree: true });
    });
    planla();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gozle);
  else gozle();

  window.KisiselSepet = { ozetUret: ozetUret, yenile: isaretle };
})();
