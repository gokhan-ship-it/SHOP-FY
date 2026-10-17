# Hesap Silme Talebi: sayfa metni taslağı (K11)

**Durum:** Onay bekliyor. Sayfaya henüz konmadı.

| | |
|---|---|
| Sayfa | `https://texttonext.com/pages/hesap-silme-talebi` |
| Sayfa ID | 135022412096 |
| Başlık | "Hesap Silme Talebi" (değişmiyor) |

**Hazırlık (yapıldı):**
- Sayfa zaten `hesap-silme-talebi` şablonunu istiyor ama bu şablon hiçbir temada yoktu.
- Taslak temaya `templates/page.hesap-silme-talebi.json` eklendi. Yasal sayfalarla aynı görünüm: dar sütun ve sayfa gövdesi.
- Taslak tema yayına alınınca sayfa gövdesi görünür hale gelir. Şablon değişikliği gerekmez.

**Onaydan sonra yapılacak tek iş:** Aşağıdaki metin sayfanın gövdesine yazılacak. Yayındaki temada bu sayfa bugün de boş görünüyor; gövde ancak taslak tema yayına alınınca görünür.

**Metnin kaynağı:**
- Gizlilik Politikası: madde 6 (saklama süreleri) ve madde 10 (başvuru).
- Uygulama Kullanım Koşulları: madde 2.3 ve madde 5.

Rakamlar ve süreler bu metinlerle birebir aynı.

> **Teyit etmeniz gereken yerler [köşeli parantez]** içinde. Bunlar uygulamadaki menü ve düğme adları. Uygulamayı görmediğim için tahmin etmedim. Doğru adları yazarsanız metne işlerim.
> Bir de şunu teyit edin: Couple kapsülde bir taraf hesabını silerse, öbür tarafın kapsüle erişimi devam ediyor mu? Metin şimdilik yalnızca "sizin hesabınıza bağlı" kapsüllerden söz ediyor.

---

## Önerilen metin

Text To Next uygulamasındaki hesabınızı ve kapsüllerinizi dilediğiniz zaman silebilirsiniz. Silme işlemini uygulama içinden kendiniz yapabilir ya da bize e-postayla talep iletebilirsiniz.

### Uygulama içinden silme

**Bir kapsülü silmek için**

1. Text To Next uygulamasını açın ve hesabınıza giriş yapın.
2. Silmek istediğiniz kapsülü açın.
3. [Kapsül ayarları] bölümünde [Kapsülü sil] seçeneğine dokunun ve ekrandaki onayı verin.

**Hesabınızı silmek için**

1. Uygulamada [Profil] sekmesine gidin.
2. [Ayarlar] bölümünde [Hesabı sil] seçeneğine dokunun.
3. Ekrandaki uyarıyı okuyun ve silme işlemini onaylayın.

### E-postayla silme talebi

Uygulamaya erişemiyorsanız, hesabınızda kayıtlı e-posta adresinden **info@texttonext.com** adresine "Hesap silme talebi" konulu bir e-posta gönderin.
- E-postada hesabınıza kayıtlı ad, soyad ve e-posta adresinizi belirtin.
- Kimliğinizi doğrulamak için sizinle iletişime geçebiliriz.
- Talebiniz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.

### Silme işleminden sonra

- Silme işlemi geri alınamaz. Saklamak istediğiniz fotoğraf, video, ses kaydı ve notları silmeden önce indirin.
- Hesabınızı silerseniz, hesabınıza bağlı kapsüller ve içerikleri de silinir.
- Silinen içerikler 30 gün içinde bütün sistemlerimizden kaldırılır. Yedeklerdeki kopyalar yedekleme döngüsünün sonunda silinir.
- Bazı kayıtları yasal yükümlülük gereği hesabınız silinse de belirli süre saklarız:
  - sipariş, fatura ve muhasebe kayıtları: 10 yıl;
  - onay kayıtları: zamanaşımı süresince.

  Ayrıntılar Gizlilik Politikası'nda.

Ayrıntılı bilgi için [Gizlilik Politikası (KVKK)](/policies/privacy-policy) ve [Uygulama Kullanım Koşulları](/pages/uygulama-kullanim-kosullari) sayfalarına bakabilirsiniz.

---

## Sayfaya yazılacak HTML (onaydan sonra; köşeli parantezler teyitle değişecek)

```html
<p>Text To Next uygulamasındaki hesabınızı ve kapsüllerinizi dilediğiniz zaman silebilirsiniz. Silme işlemini uygulama içinden kendiniz yapabilir ya da bize e-postayla talep iletebilirsiniz.</p>
<h2>Uygulama içinden silme</h2>
<p><strong>Bir kapsülü silmek için</strong></p>
<ol>
<li>Text To Next uygulamasını açın ve hesabınıza giriş yapın.</li>
<li>Silmek istediğiniz kapsülü açın.</li>
<li>[Kapsül ayarları] bölümünde [Kapsülü sil] seçeneğine dokunun ve ekrandaki onayı verin.</li>
</ol>
<p><strong>Hesabınızı silmek için</strong></p>
<ol>
<li>Uygulamada [Profil] sekmesine gidin.</li>
<li>[Ayarlar] bölümünde [Hesabı sil] seçeneğine dokunun.</li>
<li>Ekrandaki uyarıyı okuyun ve silme işlemini onaylayın.</li>
</ol>
<h2>E-postayla silme talebi</h2>
<p>Uygulamaya erişemiyorsanız, hesabınızda kayıtlı e-posta adresinden <a href="mailto:info@texttonext.com?subject=Hesap%20silme%20talebi">info@texttonext.com</a> adresine "Hesap silme talebi" konulu bir e-posta gönderin. E-postada hesabınıza kayıtlı ad, soyad ve e-posta adresinizi belirtin. Kimliğinizi doğrulamak için sizinle iletişime geçebiliriz. Talebiniz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.</p>
<h2>Silme işleminden sonra</h2>
<ul>
<li>Silme işlemi geri alınamaz. Saklamak istediğiniz fotoğraf, video, ses kaydı ve notları silmeden önce indirin.</li>
<li>Hesabınızı silerseniz, hesabınıza bağlı kapsüller ve içerikleri de silinir.</li>
<li>Silinen içerikler 30 gün içinde tüm sistemlerimizden kaldırılır; yedeklerdeki kopyalar yedekleme döngüsünün sonunda silinir.</li>
<li>Yasal yükümlülükler nedeniyle sipariş, fatura ve muhasebe kayıtları 10 yıl, onay kayıtları ise zamanaşımı süresince, hesabınız silinse de saklanır. Ayrıntılar Gizlilik Politikası'nda yer alır.</li>
</ul>
<p>Ayrıntılı bilgi için <a href="/policies/privacy-policy">Gizlilik Politikası (KVKK)</a> ve <a href="/pages/uygulama-kullanim-kosullari">Uygulama Kullanım Koşulları</a> sayfalarına bakabilirsiniz.</p>
```
