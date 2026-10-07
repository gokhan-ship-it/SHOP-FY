# Ölçü aktarımı kontrol listesi

Kaynak: `custom.genislik`, `custom.yukseklik`, `custom.cap` (değiştirilmedi).
Hedef: `kisisellestirme.genislik_cm`, `kisisellestirme.yukseklik_cm`, `kisisellestirme.sekil`, `kisisellestirme.tip`, `kisisellestirme.set`.

Kurallar:
- Yalnızca "6cm", "7,5cm", "6.5 cm" gibi birimi açık değerler aktarıldı. Birimsiz değerler ("6,5") boş bırakıldı.
- Çap verilen patch'lerde genişlik = yükseklik = çap ve şekil `circle`.
- Genişlik ve yükseklik verilenlerde şekil `rect` (dış sınır kutusu; çakışma hesabı bu kutuyla yapılır).
- Tek ölçü verilenlerde diğer ölçü ve şekil boş bırakıldı.

⚠️ = kontrol etmen gereken satır. Bu satırlardaki patch'ler ölçü tamamlanana kadar editörde listelenmez.

| Ürün | Eski metin | Yeni genişlik | Yeni yükseklik | Şekil | Tip | Not |
|---|---|---|---|---|---|---|
| ⚠️ Piramit Alfabe Patch | yükseklik: 6cm | — | 6 cm | — | letter | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz; Harf genişliği ürün başına boş; katalog ayarındaki 5,5 cm varsayımı kullanılır |
| ⚠️ Cool Alfabe Patch | yükseklik: 6cm | — | 6 cm | — | letter | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz; Harf genişliği ürün başına boş; katalog ayarındaki 5,5 cm varsayımı kullanılır |
| Janti Rakam Patch | genişlik: 7,5cm · yükseklik: 6cm | 7,5 cm | 6 cm | rect | number |  |
| Futbol Sahası Patch | genişlik: 7,5cm · yükseklik: 6cm | 7,5 cm | 6 cm | rect | icon |  |
| Futbol Topu Patch | çap: 5,5cm | 5,5 cm | 5,5 cm | circle | icon |  |
| Basketbol Potası Patch | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
| Basketbol Topu Patch | çap: 5cm | 5 cm | 5 cm | circle | icon |  |
| Voleybol Patch: Dream Big Play Hard | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
| Tenis Patch | çap: 7 cm | 7 cm | 7 cm | circle | icon |  |
| Jimnastik Patch | çap: 8cm | 8 cm | 8 cm | circle | icon |  |
| I love swimming Patch | genişlik: 8,5cm · yükseklik: 5cm | 8,5 cm | 5 cm | rect | icon |  |
| ⚠️ Sarı Kalp Patch | genişlik: 5cm | 5 cm | — | — | icon | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| ⚠️ Kırmızı Kalp Patch | genişlik: 5cm | 5 cm | — | — | icon | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| ⚠️ Lacivert Kalp Patch | genişlik: 5cm | 5 cm | — | — | icon | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| ⚠️ Beyaz Kalp Patch | genişlik: 5cm | 5 cm | — | — | icon | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| ⚠️ Siyah Kalp Patch | genişlik: 5cm | 5 cm | — | — | icon | Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| GOAT Patch | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| Taç Patch | genişlik: 5cm · yükseklik: 3cm | 5 cm | 3 cm | rect | icon | Durum: DRAFT |
| Oyun Sembolleri Patch | genişlik: 8cm · yükseklik: 3,5cm | 8 cm | 3,5 cm | rect | icon |  |
| Game Over / "Try Again" Patch | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| Değişken Pullu Kalp Patch | genişlik: 7,5cm · yükseklik: 7,5cm | 7,5 cm | 7,5 cm | rect | icon | Durum: DRAFT |
| Sevimli Köpek Patch | genişlik: 7,5cm · yükseklik: 8cm | 7,5 cm | 8 cm | rect | icon |  |
| Havalı Kedi Patch | genişlik: 7,5cm · yükseklik: 7,5cm | 7,5 cm | 7,5 cm | rect | icon |  |
| Dog Person Patch | genişlik: 8cm · yükseklik: 4cm | 8 cm | 4 cm | rect | icon |  |
| Be Awesome Patch | genişlik: 7cm · yükseklik: 7cm | 7 cm | 7 cm | rect | icon |  |
| Pullu Gülen Yüz Patch | çap: 6.5 cm | 6,5 cm | 6,5 cm | circle | icon |  |
| Boncuklu Gülen Yüz Patch | çap: 6.5 cm | 6,5 cm | 6,5 cm | circle | icon |  |
| Cool Patch | genişlik: 8cm · yükseklik: 4cm | 8 cm | 4 cm | rect | icon |  |
| Whatever Patch | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| SIGMA  Patch | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| GIRLGANG Patch | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| Leopar Gülen Yüz Patch | çap: 6.5 cm | 6,5 cm | 6,5 cm | circle | icon |  |
| ⚠️ Kapibara | genişlik: 7,5cm · yükseklik: 6,5 | 7,5 cm | — | — | icon | Yükseklik "6,5" birimsiz/okunamadı; Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| Yıldız Patch | çap: 6 cm | 6 cm | 6 cm | circle | icon |  |
| Tilki | çap: 6 cm | 6 cm | 6 cm | circle | icon | Durum: DRAFT |
| Dinozor Dino | genişlik: 6cm · yükseklik: 9cm | 6 cm | 9 cm | rect | icon |  |
| Uzay Gemisi | genişlik: 7.5cm · yükseklik: 10cm | 7,5 cm | 10 cm | rect | icon |  |
| ⚠️ Worm Family Patch Seti | genişlik: 7.5cm · yükseklik: 10cm | 7,5 cm | 10 cm | rect | icon | Set ürünü (600 TL, birden fazla parça olabilir) |
| ⚠️ Meteor | genişlik: 8,5cm · yükseklik: 3,5 | 8,5 cm | — | — | icon | Yükseklik "3,5" birimsiz/okunamadı; Tek ölçü var, diğeri boş bırakıldı; şekil belirsiz |
| Cool Flower | genişlik: 7cm · yükseklik: 7cm | 7 cm | 7 cm | rect | icon |  |
| Yılbaşı Şapka | genişlik: 5.5cm · yükseklik: 7cm | 5,5 cm | 7 cm | rect | icon | Durum: DRAFT |
| Kaykay | genişlik: 9cm · yükseklik: 3.5cm | 9 cm | 3,5 cm | rect | icon |  |
| Octopus | genişlik: 8cm · yükseklik: 7cm | 8 cm | 7 cm | rect | icon |  |
| Aksolotl | genişlik: 5cm · yükseklik: 8cm | 5 cm | 8 cm | rect | icon |  |
| Kurbağa | genişlik: 8.5cm · yükseklik: 7cm | 8,5 cm | 7 cm | rect | icon |  |
| Donut Planet | genişlik: 8,5cm · yükseklik: 4,5cm | 8,5 cm | 4,5 cm | rect | icon |  |
| Doing My Best | genişlik: 8,5cm · yükseklik: 8,5cm | 8,5 cm | 8,5 cm | rect | icon |  |
| Good Luck | genişlik: 5cm · yükseklik: 8cm | 5 cm | 8 cm | rect | icon |  |
| Volleyball Love | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
| Musical Note | genişlik: 6cm · yükseklik: 5cm | 6 cm | 5 cm | rect | icon |  |
| Retro Casette Player | genişlik: 8cm · yükseklik: 5cm | 8 cm | 5 cm | rect | icon |  |
| Manifest It:Pink | genişlik: 7,5cm · yükseklik: 7,5cm | 7,5 cm | 7,5 cm | rect | icon |  |
| Eggcellent | genişlik: 7cm · yükseklik: 7,5cm | 7 cm | 7,5 cm | rect | icon |  |
| Always Curious | genişlik: 8cm · yükseklik: 6cm | 8 cm | 6 cm | rect | icon |  |
| Too Cool for School | genişlik: 8cm · yükseklik: 6cm | 8 cm | 6 cm | rect | icon |  |
| Drama and Theatre | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
| Roller Skate | genişlik: 8cm · yükseklik: 6cm | 8 cm | 6 cm | rect | icon |  |
| School Rocks | genişlik: 8cm · yükseklik: 6cm | 8 cm | 6 cm | rect | icon |  |
| Adventurer | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
| Keep Swimming | çap: 6cm | 6 cm | 6 cm | circle | icon |  |
