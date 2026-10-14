"""Çok Amaçlı Mini Çanta ön yüzü: açılı fotoğraftan perspektif düzeltmesi (yalnız mevcut pikseller).

Kaynak: hazirla.py'nin arka planı temizlenmiş PNG'si (veri/urunler/png/<handle>.png).
1. Ön yüzün dört köşesi (elle, ızgaradan okunur) dikdörtgene eşlenir.
2. Ön yüzdeki 5 cm'lik Velcro dairesi çıktıda tam yuvarlak olacak şekilde en / boy oranı ayarlanır
   (dairenin yatay ve dikey çapı ölçülür).
3. Maske: kaynağın kendi saydamlığı ∩ yuvarlak köşeli ön yüz dikdörtgeni (yan yüz, sap ve fermuar dışarıda kalır).
Kullanım (jantifox/ klasöründen):
    python3 -I veri/urunler/duz/mini-canta-duzelt.py <handle> veri/urunler/png/<handle>-on.png [--olc]
"""
import json
import sys

import cv2
import numpy as np

AYAR = {
    # köşeler: sol üst, sağ üst, sağ alt, sol alt (kaynak PNG pikseli); daire: merkez (x, y) yaklaşık
    'cok-amacli-mini-canta-kirmizi-beyaz-zikzak': {
        'kose': [[176, 40], [960, 48], [938, 590], [126, 508]],
        'daire': [488, 255],
        'kose_yaricap_cm': 1.6,
    },
}
GEN = 1200          # çıktı genişliği (px)
PAY = 14            # çıktıda kenar payı (px), kenar yumuşaması için


def daire_olc(img, merkez):
    """Velcro dairesi (kırmızı keçe): desendeki kırmızı şeritten daha doygun ve daha sarımsı (HSV S > 212, Lab b > 171).
    Merkezi içeren bileşenin dış çizgisine elips uydurulur; dönüş: yatay çap, dikey çap, merkez (px)."""
    hsv = cv2.cvtColor(img[..., :3], cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(img[..., :3], cv2.COLOR_BGR2LAB)
    h, s = hsv[..., 0], hsv[..., 1]
    m = (((h < 10) | (h > 170)) & (s > 212) & (lab[..., 2] > 171)).astype(np.uint8) * 255
    m = cv2.medianBlur(m, 7)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, et = cv2.connectedComponents(m)
    x, y = int(merkez[0]), int(merkez[1])
    k = et[y, x]
    if k == 0:
        raise SystemExit('daire merkezi keçe bölgesinde değil')
    bil = (et == k).astype(np.uint8) * 255
    kont, _ = cv2.findContours(bil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    kont = max(kont, key=cv2.contourArea)
    hull = cv2.convexHull(kont)
    (cx, cy), (e1, e2), aci = cv2.fitEllipse(hull)
    # elipsin yatay / dikey çapı (eksen hizalı kutu)
    t = np.deg2rad(aci)
    a_, b_ = e1 / 2, e2 / 2
    yat = 2 * np.sqrt((a_ * np.cos(t)) ** 2 + (b_ * np.sin(t)) ** 2)
    dik = 2 * np.sqrt((a_ * np.sin(t)) ** 2 + (b_ * np.cos(t)) ** 2)
    return yat, dik, (cx, cy)


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    handle, cikti = argv[0], argv[1]
    a = AYAR[handle]
    src = cv2.imread('veri/urunler/png/%s.png' % handle, cv2.IMREAD_UNCHANGED)
    q = np.float32(a['kose'])
    # 1) ön kestirim: köşeleri 1000 × 600 dikdörtgene eşle, dairenin çapları oranı ölç
    W0, H0 = 1000, 600
    M0 = cv2.getPerspectiveTransform(q, np.float32([[0, 0], [W0, 0], [W0, H0], [0, H0]]))
    ara = cv2.warpPerspective(src, M0, (W0, H0), flags=cv2.INTER_LANCZOS4)
    cm = cv2.perspectiveTransform(np.float32([[a['daire']]]), M0)[0][0]
    bw, bh, _ = daire_olc(ara, cm)
    # dairenin yuvarlak olması için yüksekliği ölçekle: gerçek oran = (W0 / H0) * (bh / bw)
    oran = (W0 / H0) * (bh / bw)
    W = GEN
    H = int(round(W / oran))
    cap_px = bw * (W / W0)
    olcek = cap_px / 5.0          # px / cm (daire 5 cm)
    rapor = {'daire_cap_px_ara': [round(bw, 1), round(bh, 1)], 'en_boy_orani': round(oran, 3),
             'on_yuz_cm': [round(W / olcek, 1), round(H / olcek, 1)], 'cikti_px': [W + 2 * PAY, H + 2 * PAY]}
    if '--olc' in argv:
        print(json.dumps(rapor, ensure_ascii=False))
        return 0
    # 2) asıl dönüşüm (kenar payıyla)
    M = cv2.getPerspectiveTransform(q, np.float32([[PAY, PAY], [PAY + W, PAY], [PAY + W, PAY + H], [PAY, PAY + H]]))
    OW, OH = W + 2 * PAY, H + 2 * PAY
    out = cv2.warpPerspective(src, M, (OW, OH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    # 3) yuvarlak köşeli ön yüz maskesi (4x örnekleme), kaynağın saydamlığıyla kesişim
    SS = 4
    r = a['kose_yaricap_cm'] * olcek
    m = np.zeros((OH * SS, OW * SS), np.uint8)
    x0, y0, x1, y1 = PAY * SS, PAY * SS, (PAY + W) * SS, (PAY + H) * SS
    rr = int(r * SS)
    cv2.rectangle(m, (x0 + rr, y0), (x1 - rr, y1), 255, -1)
    cv2.rectangle(m, (x0, y0 + rr), (x1, y1 - rr), 255, -1)
    for cx, cy in [(x0 + rr, y0 + rr), (x1 - rr, y0 + rr), (x1 - rr, y1 - rr), (x0 + rr, y1 - rr)]:
        cv2.circle(m, (cx, cy), rr, 255, -1)
    maske = cv2.resize(m, (OW, OH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    alfa = out[..., 3].astype(np.float32) / 255 * maske
    out[..., 3] = np.clip(alfa * 255, 0, 255).astype(np.uint8)
    cv2.imwrite(cikti, out)
    # doğrulama: çıktıda dairenin çapları
    bw2, bh2, c2 = daire_olc(out, cv2.perspectiveTransform(np.float32([[a['daire']]]), M)[0][0])
    rapor['cikti_daire_px'] = [round(bw2, 1), round(bh2, 1)]
    rapor['cikti_daire_merkez_yuzde'] = [round(c2[0] / OW * 100, 1), round(c2[1] / OH * 100, 1)]
    print(json.dumps(rapor, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
