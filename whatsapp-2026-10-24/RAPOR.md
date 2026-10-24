# Shopify Inbox "Sohbet" yerine WhatsApp "Bize ulaşın" (24.10.2026)

## Özet

- Değişiklikler yayında olmayan kopya temada yapıldı.
- Hiçbir tema yayına alınmadı.
- Yayındaki temanın MD5 listesi başta ve sonda aynı: 703 dosya, 0 fark.
- Shopify Inbox uygulaması kaldırılmadı; yalnızca kopya temada eklentisi kapatıldı.
- Takip kodlarına (Meta, Google, TikTok, çerez izni) dokunulmadı; buton yalnızca sayfada zaten yüklü olanları çağırıyor.

## Temalar

- 19 tema var.
- **Yayında:** "Hiz paketi 1 - 2026-10-23" (189388095808).
- **Yayına alınmamış iş içeren kopya:** "Icerik uretici - 2026-10-24" (189413589312).
  - İçinde bekleyen iş: İçerik üreticisi sayfası, yeni başlık, footer'ın en altındaki link.
  - Bu iş de değişiklikler tek temada toplansın diye bu kopyada yapıldı.
- "Reklam setleri" adlı bir kopya yok. O iş "Hiz paketi 1"e uygulanıp yayına alınmıştı.

## Önizleme linkleri (kopya tema)

| Sayfa | Link |
|---|---|
| Ana sayfa | https://texttonext.com/?preview_theme_id=189413589312 |
| Ürün sayfası | https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=189413589312 |
| Ürün, Couple görünümü | https://texttonext.com/products/auron-zaman-kapsulu-bileklik?view=couple&preview_theme_id=189413589312 |
| Couple modu (set kutusu ve "Sepete ekle" çubuğu) | https://texttonext.com/collections/couple-urunler?preview_theme_id=189413589312 |
| Kullanım kılavuzu | https://texttonext.com/pages/kullanim-kilavuzu?preview_theme_id=189413589312 |
| İletişim | https://texttonext.com/pages/iletisim?preview_theme_id=189413589312 |

## 1. Inbox nasıl yükleniyor ve neye bağlı

**Yükleme**
- Inbox, tema ayarlarında bir uygulama eklentisi (app embed) olarak açık: `config/settings_data.json` satır 199–201, "Shopify Inbox – chat".
- Eklentinin ayarı: sağ alt, en alçak konum.
- Bu temada başka uygulama eklentisi yok.
- Sayfada şunları ekliyor:
  - iki veri betiği: `shopify-chat-app-embed-data`, `shopify-chat-page-data`
  - `<shopify-chat>` öğesi
  - `cdn.shopify.com/storefront/web-components/chat.js`
- "Sohbet" butonu sağ altta duruyordu. Temanın alt düzeni onu alttaki çubukların 12px üstüne kaydırıyordu.

**Inbox'ı açan buton ve linkler**

Tek bir yer var: iletişim sayfasındaki "Sohbet" kartı.

| Yer | Dosya ve satır |
|---|---|
| Kartın kodu ve Inbox'ı açan betik | `sections/tt-iletisim.liquid` 11–13, 164–168, 206–221 |
| Kartın metni ("Sohbet" / "Sitede yaz") | `templates/page.iletisim.json` 40–41 ve `templates/page.contact.json` 40–41 |

Şu yerlerde Inbox'ı açan bir buton ya da link yok:
- kullanım kılavuzu (`tt-kilavuz`)
- SSS (`tt-sss`)
- ürün sayfası
- footer (`tt-footer`; orada zaten WhatsApp, Ara ve E-posta butonları var)
- hamburger menü (`tt-menu`; orada telefon satırı var)

**Müşterinin gördüğü "Sohbet" / "canlı destek" metinleri**
- İletişim kartındaki "Sohbet" metni (yukarıdaki iki şablon dosyası).
- Inbox'ın kendi buton yazısı.
- `sections/tmp-bilek-tpl.liquid` 1429 ve 1496'da "Canlı Destek" metni geçiyor. Ama bu dosya hiçbir şablonda kullanılmıyor ve sitede görünmüyor, bu yüzden dokunulmadı.

**Yalnızca butonun yerini ayarlayan kodlar** (müşteri görmez)

| Dosya ve satır | Durum |
|---|---|
| `snippets/tt-alt-yigin.liquid` 12, 22, 40–41, 69–71 | güncellendi (bkz. 3) |
| `assets/custom-tt.css` 233–244 ve 276–282 | dokunulmadı |
| `assets/custom-tt.js` 242–275 | dokunulmadı |
| `assets/tt-secim-kartlari.css` 630–638 | dokunulmadı |
| `assets/tt-secim-kartlari.js` 764–765 | dokunulmadı |
| `assets/tt-tekli-secim.js` 669–672 ve 726–790 | dokunulmadı |
| `assets/tt-tekli-secim.css` 837–862 | dokunulmadı |
| `snippets/tt-yapilandirma.liquid` 182–209 | dokunulmadı |

Dokunulmayan dosyalardaki kurallar Inbox kalkınca boşa düşüyor ve zararsız. Başka dosyalara dokunmamak için yerinde bırakıldı; istenirse sonra temizlenebilir.

Yalnızca tema editöründe görünen not ve etiketler de olduğu gibi kaldı:
- `sections/tt-nasil-calisir.liquid` 43, 294, 311
- `sections/hediye-secim-cubugu.liquid` 836
- `sections/ttn-cark-genel.liquid` 120
- `snippets/tt-kupon-cubugu.liquid` 38
- `snippets/tt-sepet-cekmece.liquid` 19

## 2. "Bize ulaşın" butonu

**Görünüş** (telefonda ve masaüstünde aynı)
- Sağ altta, #0A0A0A zemin, beyaz yazı, tam yuvarlak.
- 48px yükseklik; iç boşluk solda 16px, sağda 20px.
- Solda 22px beyaz WhatsApp logosu; logo ile yazı arası 9px.
- "Bize ulaşın": Poppins 600, 15px. Çok hafif gölge.
- aria-label "WhatsApp ile bize ulaşın".

**Link**
- Ürün sayfasında: "Merhaba, {ürün adı} hakkında bilgi almak istiyorum."
  - Ürün adı sayfada görünen ad. Örnek: "Merhaba, Auron hakkında bilgi almak istiyorum."
  - Couple görünümünde de ana ürünün adı kullanılıyor.
- Diğer bütün sayfalarda (kullanım kılavuzu dahil): "Merhaba, bilgi almak istiyorum."
- Yeni sekmede açılıyor (`target="_blank"`, `rel="noopener"`).

**Konum**
- Butonu yerleştiren mevcut alt düzen kullanılıyor.
- Çubuk yokken alttan 20px, sağdan 16px. Soldaki "Nasıl çalışır?" butonuyla aynı hizada.
- Yapışkan sepete ekle, Couple "Sepete ekle" ya da çark sayacı çubuğu çıkınca buton onların 12px üstüne kayıyor.
- Sepet çekmecesi, menüler, hamburger menü ya da "Nasıl çalışır?" paneli açıkken gizleniyor.

**Tıklama ölçümü**
- Meta'ya `fbq('track','Contact')` gönderiliyor.
- Google'a `gtag('event','whatsapp_click')` gönderiliyor.
- Shopify Customer Events'e `Shopify.analytics.publish('whatsapp_click')` gönderiliyor.
- Her biri yalnızca sayfada varsa çağrılıyor; yoksa hata vermiyor.
- Aynı ölçüm iletişim sayfasındaki yeni "Bize ulaşın" kartında da çalışıyor.
- Not: Customer Events'teki özel olayı başka bir yere aktarmak için orada bu olayı dinleyen bir özel piksel gerekir. Bunu sonra kurabiliriz.

## 3. Yapılan değişiklikler

Hepsi yalnızca kopya temada.

| Yer | Eski | Yeni |
|---|---|---|
| Inbox app embed (`config/settings_data.json`) | açık | **kapalı** |
| Sağ alttaki buton | Inbox "Sohbet" balonu | WhatsApp "Bize ulaşın" (`snippets/tt-whatsapp.liquid`, yeni) |
| İletişim kartı (`tt-iletisim.liquid`) | "Sohbet / Sitede yaz": Inbox penceresini açan buton | "Bize ulaşın / WhatsApp'tan yaz": WhatsApp linki, yeni sekme, genel mesaj |
| İletişim kartı ikonu | düz konuşma balonu | ince çizgili WhatsApp ikonu (sayfanın üstündeki WhatsApp butonundaki ikonun aynısı) |
| Kartın editör etiketi | "Sohbet (sitedeki sohbet penceresini açar)" | "Bize ulaşın (WhatsApp adresine gider)" |
| Alt düzen (`tt-alt-yigin.liquid`) | Inbox butonunu kaydıran kural | "Bize ulaşın" butonunu kaydıran kural |

- `settings_data.json`'da başka hiçbir ayar değişmedi. Bu, Shopify'dan geri okunan dosyayla kontrol edildi.
- İletişim ve kullanım kılavuzu sayfalarının adreslerine ve şablon atamalarına dokunulmadı. İletişim şablonlarında yalnızca bu kartın iki metni değişti.
- Footer'daki "WhatsApp" ve iletişim sayfasının üstündeki "WhatsApp ile yaz" butonları zaten vardı ve olduğu gibi kaldı. Bunlar tıklama ölçümüne dahil değil; istersen eklerim.

**Değişen dosyalar** (kopya tema)

| Dosya | Durum |
|---|---|
| `snippets/tt-whatsapp.liquid` | yeni |
| `snippets/tt-alt-yigin.liquid` | değişti |
| `layout/theme.liquid` | değişti: butonu çağıran tek satır ve not |
| `sections/tt-iletisim.liquid` | değişti |
| `templates/page.iletisim.json` | değişti: kartın iki metni |
| `templates/page.contact.json` | değişti: kartın iki metni |
| `config/settings_data.json` | değişti: yalnızca Inbox kapalı |

Yüklenen dosyaların MD5'leri kontrol edildi. `settings_data.json`'u Shopify yeniden biçimlendiriyor; o dosya içerik olarak karşılaştırıldı.

## 4. Kontrol sonuçları

390, 360 ve 1440 genişlikte; takip istekleri iptal edildi, gerçek veri gitmedi.

| Kontrol | Sonuç |
|---|---|
| Buton görünüyor, "Bize ulaşın" tek satırda | 14 senaryonun hepsinde, üç genişlikte |
| "Nasıl çalışır?" ile yan yana boşluk | 390'da 49px, 360'ta 19px, masaüstünde çok geniş |
| Couple modu, set kutusuna gelince | "Sepete ekle" çubuğuyla arada 12px |
| Ürün sayfası, aşağı kayınca | yapışkan sepete ekle çubuğuyla arada 12px |
| Çark çevrilmişken | sayaç çubuğuyla 12px; sayaç ve sepet çubuğu birlikteyken de üstteki çubukla 12px |
| Butonun üstüne binen öğe | yok |
| Footer'ın en altındaki "İçerik üreticisi ol" linki | sayfa sonunda butonla örtüşmüyor |
| Ürün sayfası mesajı | "Merhaba, Auron hakkında bilgi almak istiyorum." (Couple görünümünde de aynı) |
| Diğer sayfalar | "Merhaba, bilgi almak istiyorum." |
| WhatsApp yönlendirmesi | mesaj metni korunuyor |
| Meta "Contact" | tıklamadan 0,2 sn sonra ağda POST `ev=Contact`, piksel 721212069523126 (`veri/meta-contact.txt`) |
| Google | `whatsapp_click` istekleri gidiyor |
| Shopify | `whatsapp_click` yayınlandı |
| Inbox | kopya temada yüklenmiyor: sayfa kaynağında eklenti, `<shopify-chat>` ve `chat.js` yok; ağda da `chat.js` isteği yok |
| Yayındaki tema | Inbox hâlâ yüklü (beklenen) |
| Açılır katmanlar | sepet çekmecesi, modal, hamburger menü ve "Nasıl çalışır?" paneli açıkken buton gizleniyor, kapanınca geri geliyor |
| Konsol | yeni hata yok |

Veriler `veri/`, betikler `betikler/` klasöründe.

## 5. Sıralı adımlar

**1. Temayı yayına al**
- Shopify yönetici → Online Mağaza → Temalar → "Icerik uretici - 2026-10-24" → **Yayınla**.
- Bu kopyada İçerik üreticisi sayfası ve footer linki de var; hepsi birlikte yayına girer.
- Yayından önce isterseniz önizleme linklerine telefondan bir kez bakın.

**2. Shopify Inbox'ı kaldır**
- Önce Inbox'ta yanıtlanmamış mesaj var mı bakın.
- Sonra Ayarlar → Uygulamalar → Shopify Inbox → **Kaldır**.
- Tema tarafında yapılacak bir şey yok; eklenti yeni temada zaten kapalı.

**3. Kontrol**
- Telefonda texttonext.com'u açın.
  - Sağ altta "Bize ulaşın" görünmeli; sohbet balonu görünmemeli.
  - Butona dokunun: WhatsApp "Merhaba, bilgi almak istiyorum." mesajıyla açılmalı.
  - Bir ürün sayfasında mesaj ürün adıyla gelmeli.
- İletişim sayfasında "Bize ulaşın" kartı WhatsApp'ı açmalı.
- Meta Olay Yöneticisi → Olayları Test Et'te butona tıklayınca "Contact" olayı görünmeli.
- Sorun olursa önceki tema "Hiz paketi 1 - 2026-10-23" yerinde duruyor. Onu tekrar yayınlamak eski hâle döndürür, ama Inbox'ı kaldırdıysanız o temadaki sohbet balonu artık görünmez.
