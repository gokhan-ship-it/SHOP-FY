/* Alan paneli: serbest çokgen ve sihirli değnek hesapları (arayüzden bağımsız; Node'da da test edilir).
   Koordinatlar görsel pikseli; çokgen [[x, y], ...] kapalı kabul edilir (son nokta ilkine bağlanır). */
(function (kok) {
  'use strict';

  function kutu(p) {
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    p.forEach(function (q) {
      if (q[0] < x1) x1 = q[0];
      if (q[0] > x2) x2 = q[0];
      if (q[1] < y1) y1 = q[1];
      if (q[1] > y2) y2 = q[1];
    });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function icinde(x, y, p) {
    var ic = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) ic = !ic;
    }
    return ic;
  }

  function vektorel(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
  function kesisir(a, b, c, d) {
    var d1 = vektorel(c, d, a), d2 = vektorel(c, d, b), d3 = vektorel(a, b, c), d4 = vektorel(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function alan(p) {
    var a = 0;
    for (var i = 0; i < p.length; i++) {
      var j = (i + 1) % p.length;
      a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return a / 2;
  }

  // Kendini kesen çokgen mi (komşu olmayan kenarlar kesişiyor)
  function kendiniKeser(p) {
    var n = p.length;
    for (var i = 0; i < n; i++) {
      for (var j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        if (kesisir(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
      }
    }
    return false;
  }

  // Noktaya en yakın kenar: { i: kenarın ilk noktası, t: kenar üzerindeki oran, d: uzaklık }
  function enYakinKenar(p, x, y) {
    var en = null;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var u = dx * dx + dy * dy;
      var t = u ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / u)) : 0;
      var d = Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
      if (!en || d < en.d) en = { i: i, t: t, d: d };
    }
    return en;
  }

  // Kenarları yumuşatır: her köşe, komşu kenarlarının a/2'si kadar içinden geçen bir eğriyle (ikinci derece Bezier,
  // kontrol noktası köşe) değiştirilir. a = 1'de eğriler kenar ortalarında birleşir: az noktayla düzgün kavis.
  function yumusat(p, a, adim) {
    if (!(a > 0) || p.length < 3) return p.map(function (q) { return [q[0], q[1]]; });
    a = Math.min(1, a);
    adim = adim || 8;
    var n = p.length;
    var sonuc = [];
    for (var i = 0; i < n; i++) {
      var P = p[(i - 1 + n) % n], V = p[i], N = p[(i + 1) % n];
      var A = [V[0] + (P[0] - V[0]) * a / 2, V[1] + (P[1] - V[1]) * a / 2];
      var B = [V[0] + (N[0] - V[0]) * a / 2, V[1] + (N[1] - V[1]) * a / 2];
      for (var k = 0; k <= adim; k++) {
        if (k === 0 && a === 1 && i > 0) continue; // kenar ortası önceki eğrinin sonu
        var t = k / adim, u = 1 - t;
        sonuc.push([u * u * A[0] + 2 * u * t * V[0] + t * t * B[0], u * u * A[1] + 2 * u * t * V[1] + t * t * B[1]]);
      }
    }
    if (a === 1) sonuc.pop();
    return sonuc;
  }

  // Douglas–Peucker (açık yol)
  function dp(yol, eps, a, b, tut) {
    var en = -1, ei = -1;
    var A = yol[a], B = yol[b];
    var dx = B[0] - A[0], dy = B[1] - A[1], u = Math.hypot(dx, dy);
    for (var i = a + 1; i < b; i++) {
      var d = u ? Math.abs(dy * yol[i][0] - dx * yol[i][1] + B[0] * A[1] - B[1] * A[0]) / u : Math.hypot(yol[i][0] - A[0], yol[i][1] - A[1]);
      if (d > en) { en = d; ei = i; }
    }
    if (en > eps) {
      tut[ei] = 1;
      dp(yol, eps, a, ei, tut);
      dp(yol, eps, ei, b, tut);
    }
  }
  // Kapalı yolu sadeleştirir: ilk noktaya en uzak nokta ikinci sabit olur
  function sadelestirEps(yol, eps) {
    var n = yol.length;
    if (n <= 4) return yol.slice();
    var uz = 0, ui = 0;
    for (var i = 1; i < n; i++) {
      var d = Math.hypot(yol[i][0] - yol[0][0], yol[i][1] - yol[0][1]);
      if (d > uz) { uz = d; ui = i; }
    }
    var tut = new Uint8Array(n + 1);
    tut[0] = tut[ui] = tut[n] = 1;
    var kapali = yol.concat([yol[0]]);
    dp(kapali, eps, 0, ui, tut);
    dp(kapali, eps, ui, n, tut);
    var s = [];
    for (var j = 0; j < n; j++) if (tut[j]) s.push(yol[j]);
    return s;
  }
  // En fazla `enFazla` nokta kalana kadar eşiği büyütür
  function sadelestir(yol, enFazla, eps) {
    eps = eps || 0.75;
    var s = sadelestirEps(yol, eps);
    while (s.length > enFazla) {
      eps *= 1.25;
      s = sadelestirEps(yol, eps);
    }
    return s;
  }

  // Dikdörtgen (sol üst x, y; w × h) çokgenin içinde mi: köşeler içeride, hiçbir kenar kesmiyor, hiçbir köşe içine girmiyor
  function dikdortgenIcinde(p, x, y, w, h) {
    var r = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    for (var i = 0; i < 4; i++) if (!icinde(r[i][0], r[i][1], p)) return false;
    for (var j = 0; j < p.length; j++) {
      var a = p[j], b = p[(j + 1) % p.length];
      if (a[0] > x && a[0] < x + w && a[1] > y && a[1] < y + h) return false;
      for (i = 0; i < 4; i++) if (kesisir(a, b, r[i], r[(i + 1) % 4])) return false;
    }
    return true;
  }
  // w × h dikdörtgenin sığdığı bir merkez (kutunun ortasına en yakın) ya da null
  function dikdortgenYeri(p, w, h) {
    var k = kutu(p);
    var adim = Math.max(1, Math.min(w, h) / 4);
    var cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    var adaylar = [];
    for (var x = k.x + w / 2; x <= k.x + k.w - w / 2 + 1e-6; x += adim) {
      for (var y = k.y + h / 2; y <= k.y + k.h - h / 2 + 1e-6; y += adim) adaylar.push([x, y]);
    }
    adaylar.sort(function (a, b) { return Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy); });
    for (var i = 0; i < adaylar.length; i++) {
      if (dikdortgenIcinde(p, adaylar[i][0] - w / 2, adaylar[i][1] - h / 2, w, h)) return adaylar[i];
    }
    return null;
  }

  /* ---------------- Sihirli değnek ---------------- */

  // Görselin 5 × 5 kutu bulanıklaştırılmış rengi (kumaş dokusunu yumuşatır); bir kez hesaplanır
  function bulanik(img) {
    if (img.bulanik) return img.bulanik;
    var W = img.W, H = img.H, v = img.data, R = 2;
    var ara = new Float32Array(W * H * 3);
    var son = new Uint8ClampedArray(W * H * 3);
    var x, y, c;
    for (y = 0; y < H; y++) {
      for (c = 0; c < 3; c++) {
        var top = 0, say = 0;
        for (x = -R; x <= R; x++) if (x >= 0 && x < W) { top += v[(y * W + x) * 4 + c]; say++; }
        for (x = 0; x < W; x++) {
          ara[(y * W + x) * 3 + c] = top / say;
          var cik = x - R, gir = x + R + 1;
          if (cik >= 0) { top -= v[(y * W + cik) * 4 + c]; say--; }
          if (gir < W) { top += v[(y * W + gir) * 4 + c]; say++; }
        }
      }
    }
    for (x = 0; x < W; x++) {
      for (c = 0; c < 3; c++) {
        var t2 = 0, s2 = 0;
        for (y = -R; y <= R; y++) if (y >= 0 && y < H) { t2 += ara[(y * W + x) * 3 + c]; s2++; }
        for (y = 0; y < H; y++) {
          son[(y * W + x) * 3 + c] = t2 / s2;
          var c1 = y - R, g1 = y + R + 1;
          if (c1 >= 0) { t2 -= ara[(c1 * W + x) * 3 + c]; s2--; }
          if (g1 < H) { t2 += ara[(g1 * W + x) * 3 + c]; s2++; }
        }
      }
    }
    img.bulanik = son;
    return son;
  }

  // Uzaklık dönüşümü (3-4 chamfer; sonuç piksel × 3): hedef değerdeki en yakın piksele uzaklık; kırpının dışı arka plan
  function mesafe(m, w, h, hedef) {
    var n = w * h, d = new Int32Array(n), B = 1 << 29, o = hedef === 0 ? 0 : B;
    var x, y, i, v, q;
    for (i = 0; i < n; i++) d[i] = m[i] === hedef ? 0 : B;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        v = d[i];
        if (!v) continue;
        q = (x > 0 ? d[i - 1] : o) + 3; if (q < v) v = q;
        q = (y > 0 ? d[i - w] : o) + 3; if (q < v) v = q;
        q = (x > 0 && y > 0 ? d[i - w - 1] : o) + 4; if (q < v) v = q;
        q = (x < w - 1 && y > 0 ? d[i - w + 1] : o) + 4; if (q < v) v = q;
        d[i] = v;
      }
    }
    for (y = h - 1; y >= 0; y--) {
      for (x = w - 1; x >= 0; x--) {
        i = y * w + x;
        v = d[i];
        if (!v) continue;
        q = (x < w - 1 ? d[i + 1] : o) + 3; if (q < v) v = q;
        q = (y < h - 1 ? d[i + w] : o) + 3; if (q < v) v = q;
        q = (x < w - 1 && y < h - 1 ? d[i + w + 1] : o) + 4; if (q < v) v = q;
        q = (x > 0 && y < h - 1 ? d[i + w - 1] : o) + 4; if (q < v) v = q;
        d[i] = v;
      }
    }
    return d;
  }
  function genislet(m, w, h, r) {
    if (!(r > 0)) return m;
    var d = mesafe(m, w, h, 1), o = new Uint8Array(w * h);
    for (var i = 0, s3 = r * 3; i < o.length; i++) o[i] = d[i] <= s3 ? 1 : 0;
    return o;
  }
  function daralt(m, w, h, r) {
    if (!(r > 0)) return m;
    var d = mesafe(m, w, h, 0), o = new Uint8Array(w * h);
    for (var i = 0, s3 = r * 3; i < o.length; i++) o[i] = d[i] > s3 ? 1 : 0;
    return o;
  }
  // Bitişik bölge (4 komşu): başlangıç pikselinden koşulu sağlayanlar
  function doldur(w, h, bas, kosul) {
    var m = new Uint8Array(w * h), yigin = new Int32Array(w * h), n = 0;
    if (!kosul(bas)) return m;
    m[bas] = 1; yigin[n++] = bas;
    while (n) {
      var i = yigin[--n], x = i % w;
      var k = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
      for (var j = 0; j < 4; j++) {
        var q = k[j];
        if (q >= 0 && !m[q] && kosul(q)) { m[q] = 1; yigin[n++] = q; }
      }
    }
    return m;
  }
  // Delikleri doldur: kırpının kenarından ulaşılamayan arka plan pikselleri bölgeye katılır
  function delikleriDoldur(m, w, h) {
    var dis = new Uint8Array(w * h), yigin = new Int32Array(w * h), n = 0, i;
    var ekle = function (q) { if (!m[q] && !dis[q]) { dis[q] = 1; yigin[n++] = q; } };
    for (i = 0; i < w; i++) { ekle(i); ekle((h - 1) * w + i); }
    for (i = 0; i < h; i++) { ekle(i * w); ekle(i * w + w - 1); }
    while (n) {
      var p = yigin[--n], x = p % w;
      if (x > 0) ekle(p - 1);
      if (x < w - 1) ekle(p + 1);
      if (p >= w) ekle(p - w);
      if (p < w * (h - 1)) ekle(p + w);
    }
    var o = new Uint8Array(w * h);
    for (i = 0; i < o.length; i++) o[i] = dis[i] ? 0 : 1;
    return o;
  }
  // Moore komşuluk izleme: bölgenin dış kenarı (saat yönünde), piksel merkezleri
  var YON = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function yonBul(dx, dy) { for (var i = 0; i < 8; i++) if (YON[i][0] === dx && YON[i][1] === dy) return i; return 4; }
  function kenarIzle(m, w, h) {
    var bas = -1;
    for (var i = 0; i < m.length; i++) if (m[i]) { bas = i; break; }
    if (bas < 0) return [];
    var on = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    var sx = bas % w, sy = (bas - sx) / w;
    var yol = [[sx, sy]];
    var cx = sx, cy = sy, b = 4, ikinci = null, sinir = 4 * m.length + 8;
    while (sinir--) {
      var bulundu = false;
      for (var k = 1; k <= 8; k++) {
        var d = (b + k) % 8;
        var nx = cx + YON[d][0], ny = cy + YON[d][1];
        if (on(nx, ny)) {
          var o = (b + k - 1) % 8;
          var qx = cx + YON[o][0], qy = cy + YON[o][1];
          b = yonBul(qx - nx, qy - ny);
          if (cx === sx && cy === sy && ikinci && nx === ikinci[0] && ny === ikinci[1]) return yol;
          if (!ikinci) ikinci = [nx, ny];
          cx = nx; cy = ny;
          if (!(cx === sx && cy === sy)) yol.push([cx, cy]);
          bulundu = true;
          break;
        }
      }
      if (!bulundu) return yol;
    }
    return yol;
  }

  // Tıklanan noktadan benzer renkli bitişik bölge → sadeleştirilmiş çokgen (görsel pikseli).
  // ayar: hassasiyet 1–100 (renk farkı eşiği), pay: kenarın içeri çekileceği piksel, enFazla: nokta sınırı.
  function degnek(img, px, py, ayar) {
    var W = img.W, H = img.H, v = img.data;
    var sx = Math.round(px), sy = Math.round(py);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H || v[(sy * W + sx) * 4 + 3] < 128) return null;
    var b = bulanik(img);
    var s = (sy * W + sx) * 3;
    var r0 = b[s], g0 = b[s + 1], b0 = b[s + 2];
    var esik = 4 + (ayar.hassasiyet || 30) * 1.6;
    var esik2 = esik * esik;
    var x1 = sx, y1 = sy, x2 = sx, y2 = sy;
    var bolge = doldur(W, H, sy * W + sx, function (i) {
      if (v[i * 4 + 3] < 128) return false;
      var dr = b[i * 3] - r0, dg = b[i * 3 + 1] - g0, db = b[i * 3 + 2] - b0;
      if (dr * dr + dg * dg + db * db > esik2) return false;
      var x = i % W, y = (i - x) / W;
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
      return true;
    });
    var kapat = Math.max(3, Math.round(Math.min(W, H) / 300));
    var pay = Math.max(0, ayar.pay || 0);
    var kenar = Math.ceil(Math.max(kapat, pay)) + 3;
    var ox = x1 - kenar, oy = y1 - kenar, w = x2 - x1 + 1 + 2 * kenar, h = y2 - y1 + 1 + 2 * kenar;
    var m = new Uint8Array(w * h);
    for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) if (bolge[y * W + x]) m[(y - oy) * w + (x - ox)] = 1;
    // Doku ve gölge boşluklarını kapat, delikleri doldur, ince çıkıntıları at
    m = daralt(genislet(m, w, h, kapat), w, h, kapat);
    m = delikleriDoldur(m, w, h);
    var ac = Math.max(4, Math.round(Math.min(W, H) / 200));
    m = genislet(daralt(m, w, h, ac), w, h, ac);
    // Tıklanan noktanın bölgesi (yoksa en büyük parça)
    var bas = (sy - oy) * w + (sx - ox);
    var parca = m[bas] ? doldur(w, h, bas, function (i) { return m[i] === 1; }) : enBuyukParca(m, w, h);
    // Kenarı içeri çek (biye, dikiş alana girmesin)
    parca = daralt(parca, w, h, pay);
    var yol = kenarIzle(parca, w, h);
    if (yol.length < 3) return null;
    yol = yol.map(function (q) { return [q[0] + ox + 0.5, q[1] + oy + 0.5]; });
    var enFazla = ayar.enFazla || 60;
    var p = sadelestir(yol, enFazla, 1);
    // Sadeleştirme dar girintilerde kenarları kesiştirebilir: nokta sınırını artırarak yeniden dene
    while (kendiniKeser(p) && enFazla < 200) {
      enFazla += 20;
      p = sadelestir(yol, enFazla, 1);
    }
    if (p.length < 3 || Math.abs(alan(p)) < 20) return null;
    return p;
  }
  function enBuyukParca(m, w, h) {
    var gorulen = new Uint8Array(w * h), en = null, enN = 0;
    for (var i = 0; i < m.length; i++) {
      if (!m[i] || gorulen[i]) continue;
      var p = doldur(w, h, i, function (q) { return m[q] === 1; });
      var n = 0;
      for (var j = 0; j < p.length; j++) if (p[j]) { gorulen[j] = 1; n++; }
      if (n > enN) { enN = n; en = p; }
    }
    return en || new Uint8Array(w * h);
  }

  kok.PanelCokgen = {
    kutu: kutu, icinde: icinde, alan: alan, kendiniKeser: kendiniKeser, enYakinKenar: enYakinKenar, yumusat: yumusat,
    sadelestir: sadelestir, sadelestirEps: sadelestirEps, dikdortgenIcinde: dikdortgenIcinde, dikdortgenYeri: dikdortgenYeri, degnek: degnek
  };
})(typeof window !== 'undefined' ? window : globalThis);
