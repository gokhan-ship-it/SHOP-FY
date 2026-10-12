"""Pembe Kırmızı Spor Çanta: Velcro dairenin üstündeki iki patch'i kaldırır (geçici rötuş).

Yalnızca iki patch'in kutusu içinde, doygun kırmızı Velcro olmayan pikseller (patch, kenarı ve gölgesi) değişir.
Dolgu iki katmandan oluşur:
- ışık (düşük frekans): çevredeki Velcro'nun bulanık hali boşluğa yumuşakça uzatılır;
- doku (yüksek frekans): aynı dairenin temiz bir köşesinden (120 × 120 px) aynalanarak döşenir.
Çantanın geri kalanına, fermuara ve fermuar çekeceğine dokunulmaz. Müşteriden patch'siz fotoğraf gelince bu
görsel değiştirilecek.
Kullanım (veri/urunler içinden): python3 -I rotus/rotus-pembe-spor.py rotus/pembe-kirmizi-cizgili-spor-canta.orijinal.png png/pembe-kirmizi-cizgili-spor-canta.png
"""
import sys
import numpy as np, cv2
from PIL import Image

kaynak, cikti = sys.argv[1], sys.argv[2]
rgba = np.array(Image.open(kaynak).convert('RGBA'))
img = rgba[..., :3].astype(np.float32)
r, g, b = img[..., 0], img[..., 1], img[..., 2]
velcro = (r - np.maximum(g, b) > 70) & (r > 110)

Y0 = 650  # inceleme kırpımının görseldeki y başlangıcı
koru = np.zeros(velcro.shape, bool)
koru[Y0 + 240:Y0 + 350, 416:446] = True   # fermuar çekeceği (ipi ve üst kısmı)
alt = np.zeros(velcro.shape, bool)
alt[Y0 + 350:Y0 + 383, 412:452] = True
koru |= alt & (r > 150) & (g > 40)          # çekecek ucu: açık renkli kısım; yanındaki koyu gölge korunmaz
# Çekecek ucu Velcro'dan açık renkli (somon): rengiyle korunur
uc = np.zeros(velcro.shape, bool)
uc[Y0 + 370:Y0 + 383, 412:452] = True   # uç y≈1031'de biter; altı çiçeğin pembe yaprağı
koru |= uc & (g > 45) & (r > 150) & (b < 130)
# Velcro dairenin içi (görselde ölçüldü: merkez 527, 1035; yarıçaplar 237 × 255 px), kenardan 8 px içerisi.
# Dairenin dışındaki kırmızı şeritlere dokunulmaz.
daire = np.zeros(velcro.shape, np.uint8)
cv2.ellipse(daire, (527, 1035), (229, 247), 0, 0, 360, 1, -1)
daire = daire > 0
koru[Y0 + 235:Y0 + 280, 360:700] = True   # fermuar
# Patch kutuları [x1, y1, x2, y2]: WHAT EVER, çiçek
isler = [(492, Y0 + 268, 718, Y0 + 440), (316, Y0 + 360, 542, Y0 + 578)]
DOKU = (560, 1110, 120)  # temiz Velcro parçası: sol üst x, y ve kenar (px)
toplam = np.zeros(velcro.shape, bool)
for (x1, y1, x2, y2) in isler:
    kutu = np.zeros(velcro.shape, bool)
    kutu[y1:y2, x1:x2] = True
    # Patch'in koyu kırmızı gölgesi de Velcro sayılmaz (kutunun içinde parlaklık eşiği)
    m = kutu & ~(velcro & (r > 125))
    m = cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19)))
    # Patch'in içindeki kırmızımsı bölgeler (kenar, gölge) de dahil: dış çizgisinin içi tamamen doldurulur
    cz, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    dolu = np.zeros_like(m)
    cv2.drawContours(dolu, [c for c in cz if cv2.contourArea(c) > 20], -1, 1, -1)
    toplam |= (dolu > 0) & kutu & ~koru & daire
m8 = toplam.astype(np.uint8) * 255

# Işık: yalnızca temiz Velcro piksellerinin bulanık hali (patch renkleri sızmasın), maskenin içine doğru uzatılır
temiz = (velcro & ~toplam & ~(cv2.dilate(koru.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0)).astype(np.float32)
pay = cv2.GaussianBlur(img * temiz[..., None], (0, 0), 6)
payda = cv2.GaussianBlur(temiz, (0, 0), 6)[..., None]
bulanik = np.where(payda > 0.05, pay / np.maximum(payda, 1e-3), img)
# Çekecek de doldurulacak bölge sayılır: rengi ışık katmanına kaynak olmasın (pikselleri sonra aynen geri gelir)
dolgu = ((toplam | (cv2.dilate(koru.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0)).astype(np.uint8) * 255)
isik = np.dstack([cv2.inpaint(np.clip(bulanik[..., i], 0, 255).astype(np.uint8), dolgu, 25, cv2.INPAINT_TELEA) for i in range(3)]).astype(np.float32)
# Doku: temiz parçanın ince ayrıntısı (kendi ışığından arındırılmış), aynalanarak döşenir; ek yeri görünmez
dx0, dy0, k = DOKU
parca = (img - bulanik)[dy0:dy0 + k, dx0:dx0 + k]
karo = np.concatenate([parca, parca[:, ::-1]], axis=1)
karo = np.concatenate([karo, karo[::-1]], axis=0)
ys, xs = np.nonzero(toplam)
sonuc = img.copy()
sonuc[ys, xs] = isik[ys, xs] + karo[ys % (2 * k), xs % (2 * k)]
# Kenarlarda yumuşak geçiş
alfa = cv2.GaussianBlur(m8.astype(np.float32) / 255, (0, 0), 1.5)[..., None]
alfa = np.where(toplam[..., None], 1.0, alfa)
son = img * (1 - alfa) + sonuc * alfa
cikis = np.dstack([np.clip(son, 0, 255).astype(np.uint8), rgba[..., 3]])
Image.fromarray(cikis).save(cikti, optimize=True)
if len(sys.argv) > 3:
    Image.fromarray(m8).save(sys.argv[3])
