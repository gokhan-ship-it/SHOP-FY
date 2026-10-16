# Koleksiyon sayfaları: kart görselleri, Couple galerisi, "Sepete ekle (0/2)" çubuğu, Sohbet düğmesi

Tema: **Tasarim dili - 2026-10-16** (189140861248).
- İşe başlamadan önce temaları listeledim; bu tema **UNPUBLISHED** idi.
- Hiçbir tema yayına alınmadı. Başka temaya dokunulmadı.
- Ürün medyasına, alt metinlerine ve metafield'lara dokunulmadı.

## Özet

| # | Konu | Sonuç |
|---|---|---|
| 1 | Kartlarda bilgi karesi | Düzeltildi. Önce **52** satırda sorun vardı, şimdi **0**. Single ve Couple aynı görselleri gösteriyor. |
| 2 | Couple galerisi (2. ve 7. görsel) | Düzeltildi. 6 ürünün 6'sı doğru. |
| 3 | "Sepete ekle (0/2)" çubuğu | İstenen davranış uygulandı. Kadın, Erkek ve couple-urunler sayfalarında, 390 ve 360 genişlikte test edildi. |
| 4 | Sohbet düğmesi | Çubuk görünürken çubuğun 12 px üstüne çıkıyor, çubuk gizlenince yerine dönüyor. Ürün sayfasının yapışkan çubuğunda da aynı. |
| – | Mobil CLS | Değişmedi (aşağıda). |
| – | Yayındaki tema MD5 | 669 dosyanın 669'u aynı. |

## Ortak kök neden: toplu alt metin değişikliği

- **Ne zaman:** 2026-10-15, 19:03–19:06 UTC (Türkiye saatiyle 22:03–22:06). Zaman, ürünlerin `updatedAt` değerlerinden çıkarıldı.
- **Kapsam:** Yaklaşık 40 ürünün, Couple ikizleri dahil, tüm görsel alt metinleri "**<ad> - Text To Next**" yapıldı.
- **Sonuç:** Tema, görselin türünü ("ürün fotoğrafı", "Couple 4 adımda nasıl çalışır" vb.) alt metinden okuyordu.
  - Kart filtresi hiçbir görselin türünü tanıyamadı ve "ilk 3 görsel" yedeğine düştü. 2. görsel "4 adımda nasıl çalışır" bilgi karesi olduğu için kartlarda bilgi karesi göründü.
  - Couple galerisinin koşulu (`media[1].alt contains 'Couple 4 adımda nasıl çalışır'`) da tutmadığı için tekli galeri gösterildi.
- **"Calisma kopyasi - 2026-10-15":** Bu temanın galerisi de aynı nedenle şu an bozuk (tekli galeri gösteriyor). Talimat gereği ona dokunmadım.

### Aurora'nın medyası (alt metinlere dokunulmadı)

| # | Dosya | Alt metin |
|---|---|---|
| 1 | aurora-01-packshot.jpg | Aurora - Text To Next |
| 2 | aurora-02-dort-adim.jpg | Aurora - Text To Next |
| 3 | aurora-03-lifestyle-1.jpg | Aurora - Text To Next |
| 4 | aurora-04-garanti.jpg | Aurora - Text To Next |
| 5 | aurora-05-lifestyle-2.jpg | Aurora - Text To Next |
| 6 | aurora-06-single-couple.jpg | Aurora - Text To Next |
| 7 | aurora-07-uygulama.jpg | Aurora - Text To Next |
| 8 | aurora-08-hediyeler-biter.jpg | Aurora - Text To Next |
| 9 | aurora-09-kutu-teslimat.jpg | Aurora - Text To Next |

**Filtre neden kaçırdı:**
- Alt metinlerin hiçbirinde tür adı yok. Ayırıcıdan sonraki kısım her görselde "Text To Next".
- Bu yüzden hiçbir görsel "bilinen tür" sayılmadı ve eski "ilk 3 görsel" yedeği çalıştı. Sonuç: packshot + **dort-adim** + lifestyle-1.

## 1. Kart görselleri – `snippets/tt-uk-kart.liquid`

**Tür alt metinden okunuyor:**
- Ayırıcı olarak "–", "—" ve "-" kabul ediliyor; son ayırıcıdan sonraki kısım alınıyor.
- Boşluklar kırpılıyor.
- Karşılaştırma büyük/küçük harfe ve Türkçe karakterlere duyarsız: ı/i ve İ/I eşleşiyor.

**Alt metinde tür yoksa, tür dosya adından okunuyor:**
- `-packshot` → ürün fotoğrafı
- `-lifestyle-1` → model 1
- `-lifestyle-2` → model 2
- `-dort-adim`, `-garanti`, `-single-couple`, `-uygulama`, `-hediyeler-biter`, `-kutu-teslimat` → bilgi karesi (kartta hiç gösterilmiyor)
- Shopify'ın eklediği `_uuid` son eki yok sayılıyor.

**Kartta en çok 3 görsel**, şu sırayla: ürün fotoğrafı, model üzerinde 1, model üzerinde 2.
- Eski "ilk 3 görsel" yedeği **yalnızca hiçbir görselin türü bilinmiyorsa** çalışıyor. Bu durumdaki ürünler Klasik Zaman Kapsülü ve Nora; ikisinin de eski galerisi var, bilgi karesi yok.

**Couple modu aynı görselleri gösteriyor (kodda doğrulandı):**
- Kart markup'ı (`tt-sc-karo` → `tt-uk-kart`, `product`) iki modda da aynı.
- Mod değişince `assets/tt-secim-kartlari.js` içindeki `baglantilariYaz()` yalnızca bağlantılara `mod=couple&view=couple` ekliyor.
- Ayrı bir Couple şeridi yok, ikiz ürünün medyası kartta kullanılmıyor.
- Ölçümle de doğrulandı: her sayfada Single ve Couple görsel listesi birebir aynı (Kadın 23/23, Erkek 12/12, couple-urunler 23/23).

### Tablo – SONRA (Tasarim dili, telefon 390)

**Kadın**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Aurora | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Infinity Glow | ürün fotoğrafı | ürün fotoğrafı | Yok |
| Eight Stars White | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Santorin | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Santorin Gold | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Chloe Gold | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Chloe | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Ocean Blue | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Rose Pink | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Gold | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| White | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Klasik Zaman Kapsülü | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |
| Vantablack | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Lumin | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Noir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Kral Zincir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Nova | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Luna | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Auron | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Astor | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Gemici Zincir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Gourmet Zincir | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Nora | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |

**Erkek**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Vantablack | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Lumin | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Noir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Kral Zincir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Nova | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Luna | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Auron | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Astor | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Gemici Zincir | ürün fotoğrafı, model 1, model 2 | ürün fotoğrafı, model 1, model 2 | Yok |
| Gourmet Zincir | ürün fotoğrafı, model 1 | ürün fotoğrafı, model 1 | Yok |
| Nora | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |
| Klasik Zaman Kapsülü | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |

**couple-urunler**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Aurora | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Infinity Glow | (sayfa Couple kilitli) | ürün fotoğrafı | Yok |
| Eight Stars White | (sayfa Couple kilitli) | ürün fotoğrafı, model 1 | Yok |
| Santorin | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Santorin Gold | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Chloe Gold | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Chloe | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Ocean Blue | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Rose Pink | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Gold | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| White | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Klasik Zaman Kapsülü | (sayfa Couple kilitli) | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |
| Vantablack | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Lumin | (sayfa Couple kilitli) | ürün fotoğrafı, model 1 | Yok |
| Noir | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Kral Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Nova | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Luna | (sayfa Couple kilitli) | ürün fotoğrafı, model 1 | Yok |
| Auron | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Astor | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Gemici Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, model 2 | Yok |
| Gourmet Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, model 1 | Yok |
| Nora | (sayfa Couple kilitli) | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |

<details><summary>Tablo – ÖNCE (karşılaştırma için)</summary>


**Kadın**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Aurora | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Infinity Glow | ürün fotoğrafı, BİLGİ: S/C karşılaştırma, BİLGİ: uygulama | ürün fotoğrafı, BİLGİ: S/C karşılaştırma, BİLGİ: uygulama | **VAR** – bilgi karesi: BİLGİ: S/C karşılaştırma, BİLGİ: uygulama |
| Eight Stars White | ürün fotoğrafı, model 1, BİLGİ: S/C karşılaştırma | ürün fotoğrafı, model 1, BİLGİ: S/C karşılaştırma | **VAR** – bilgi karesi: BİLGİ: S/C karşılaştırma |
| Santorin | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Santorin Gold | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Chloe Gold | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Chloe | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Ocean Blue | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Rose Pink | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gold | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| White | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Klasik Zaman Kapsülü | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |
| Vantablack | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Lumin | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Noir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Kral Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nova | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Luna | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Auron | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Astor | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gemici Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gourmet Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nora | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |

**Erkek**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Vantablack | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Lumin | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Noir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Kral Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nova | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Luna | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Auron | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Astor | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gemici Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gourmet Zincir | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nora | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |
| Klasik Zaman Kapsülü | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |

**couple-urunler**

| Ürün | Single türleri | Couple türleri | Sorun var mı |
|---|---|---|---|
| Aurora | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Infinity Glow | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: S/C karşılaştırma, BİLGİ: uygulama | **VAR** – bilgi karesi: BİLGİ: S/C karşılaştırma, BİLGİ: uygulama |
| Eight Stars White | (sayfa Couple kilitli) | ürün fotoğrafı, model 1, BİLGİ: S/C karşılaştırma | **VAR** – bilgi karesi: BİLGİ: S/C karşılaştırma |
| Santorin | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Santorin Gold | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Chloe Gold | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Chloe | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Ocean Blue | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Rose Pink | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gold | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| White | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Klasik Zaman Kapsülü | (sayfa Couple kilitli) | eski galeri: klasikzk_1, eski galeri: 2_15bdc444-dd19-43d2-9ec5-9d, eski galeri: 3_d6a39a66-c30c-4aed-96b6-17 | Yok |
| Vantablack | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Lumin | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Noir | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Kral Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nova | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Luna | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Auron | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Astor | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gemici Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Gourmet Zincir | (sayfa Couple kilitli) | ürün fotoğrafı, BİLGİ: 4 adım, model 1 | **VAR** – bilgi karesi: BİLGİ: 4 adım |
| Nora | (sayfa Couple kilitli) | eski galeri: photoroom_20251223_105647, eski galeri: 2f, eski galeri: 1f | Yok |

</details>

## 2. Couple galerisi – `snippets/product-media-gallery.liquid`

- **Eski koşul:** İkiz ürünün 2. görselinin alt metni "Couple 4 adımda nasıl çalışır" içeriyorsa Couple galerisi gösteriliyordu.
- **Yeni koşul:** Aynı alt metin kontrolü normalize edilerek (Türkçe harf ve tire farkları yok sayılarak) yapılıyor **ya da** 2. görselin dosya adında `couple-dort-adim` aranıyor.
  - Böylece "Calisma kopyasi - 2026-10-15"teki davranışla aynı sonuç alınıyor.
  - Gelecekte alt metinler yeniden düzeltilirse de çalışmaya devam eder.
- Görsellerin alt metni olarak tekli ürünün adı gösteriliyor (ör. "Auron").

| Ürün | Karttan açılan bağlantı | 2. görsel | 7. görsel |
|---|---|---|---|
| Auron | https://texttonext.com/collections/zaman-kapsulu-bileklik/products/auron-zaman-kapsulu-bileklik?mod=couple&view=couple&preview_theme_id=189140861248 | auron-couple-02-couple-dort-adim ✔ | auron-couple-07-couple-uygulama ✔ |
| Noir | https://texttonext.com/collections/zaman-kapsulu-bileklik/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya?mod=couple&view=couple&preview_theme_id=189140861248 | noir-couple-02-couple-dort-adim ✔ | noir-couple-07-couple-uygulama ✔ |
| Aurora | https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/full-tasli-kapsul-zaman-kapsulu-kolye?mod=couple&view=couple&preview_theme_id=189140861248 | aurora-couple-02-couple-dort-adim ✔ | aurora-couple-07-couple-uygulama ✔ |
| Rose Pink | https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/klasik-zaman-kapsulu-kolye-pembe?mod=couple&view=couple&preview_theme_id=189140861248 | rose-pink-couple-02-couple-dort-adim ✔ | rose-pink-couple-07-couple-uygulama ✔ |
| Chloe | https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/vera-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya?mod=couple&view=couple&preview_theme_id=189140861248 | chloe-couple-02-couple-dort-adim ✔ | chloe-couple-07-couple-uygulama ✔ |
| Santorin | https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya?mod=couple&view=couple&preview_theme_id=189140861248 | santorin-couple-02-couple-dort-adim ✔ | santorin-couple-07-couple-uygulama ✔ |

Düzeltmeden önce (Calisma kopyasında da şu an) 2. görsel tekli ürünün `-02-dort-adim`, 7. görsel `-07-uygulama` görseliydi. Bu, tekli galeri demek. Görüntüler: `galeri/`.

## 3. "Sepete ekle (0/2)" çubuğu – `assets/tt-secim-kartlari.js` ve `.css`

**Görünürlük kuralı:**
- Couple modunda sayfa açıldığında çubuk gizli.
- "Kendi setini oluştur" kutusunun üst kenarı ekranın alt kenarına geldiğinde çubuk alttan kayarak çıkıyor ve ızgaraya inildikçe görünür kalıyor.
- Kutunun üstüne çıkılınca çubuk tekrar gizleniyor. Sette en az 1 ürün varsa her yerde görünür kalıyor.

**Kutu nasıl izleniyor:**
- IntersectionObserver kullanılıyor; kaydırma dinleyicisi yok.
- Observer'ın kök alanı yukarı doğru genişletildi (`rootMargin`). Böylece "başa dön" gibi tek seferlik sıçramalarda da durum güncelleniyor. Testte bu durumu yakalayıp düzelttim.

**Animasyon:**
- Yalnızca `transform` ile, 220 ms. Yerleşim kaymıyor (CLS yok).
- `prefers-reduced-motion` açıkken geçiş yok (ölçülen süre: 0 s).

**Gizliyken erişilebilirlik:** Çubuk `inert` ve `aria-hidden="true"`, `visibility:hidden` durumunda. Testte düğmeye odaklanılamadığı doğrulandı.

**Kural ne zaman yeniden uygulanıyor:**
- Mod değişince ve filtre çipi değişince (`ciz()` → `cubukGorunurluk()`).
- Single moduna geçince çubuk tamamen kalkıyor (eskisi gibi `hidden`).

**Bülten ve footer'ı örtmemek için:** Çubuk görünürken `body`'ye çubuk yüksekliği + 12 px kadar alt boşluk ekleniyor (130/149/172 px). Gizliyken boşluk 0. En alta inildiğinde footer'ın alt kenarı çubuğun 12 px üstünde kalıyor.

### Test sonuçları

Sayfalar ve genişlikler:
- Erkek: `?mod=couple`
- Kadın: `?mod=couple`
- couple-urunler: kilitli Couple
- Genişlikler: 390×844 ve 360×740

| Adım | Erkek 390 | Erkek 360 | Kadın 390 | Kadın 360 | couple-urunler 390 | couple-urunler 360 |
|---|---|---|---|---|---|---|
| Açılışta gizli, odaklanamaz | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Set kutusundan önce gizli | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Kutu ekrana girince görünür | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Izgarada görünür | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Yukarı dönünce gizli (0 ürün) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 1 ürünle yukarıda görünür | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Footer örtülmüyor | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 2 ürün → sepete ekle, "İkinci Üründe %50 İndirim" | ✔ Lumin + Vantablack: 5.398,00 → 4.048,50 TL | ✔ aynı | ✔ Infinity Glow + Aurora: 4.998,00 → 3.848,50 TL | ✔ aynı | ✔ aynı | ✔ aynı |
| Mod değişimi (Couple → Single → ızgarada Couple → başa) | ✔ | ✔ | ✔ | ✔ | (kilitli) | (kilitli) |
| Filtre çipleri (Tümü/Kadın/Erkek): üstte gizli, ızgarada görünür | ✔ | ✔ | ✔ | ✔ | – | – |
| prefers-reduced-motion → geçiş 0 s | ✔ | ✔ | ✔ | ✔ | – | – |
| Sohbet ile çakışma yok | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Sepet testleri için:
- Sipariş oluşturulmadı. Her test ayrı bir tarayıcı oturumunda yapıldı ve sepette yalnızca /cart.js okundu.
- İndirim, kalem düzeyinde "İkinci Üründe %50 İndirim" olarak `/cart.js` içinde görünüyor.

**(d) Single modu:**
- Erkek ve Kadın'da `?mod=single` ile 0 / 1500 / 3000 px'te kontrol edildi.
- Çubuk `hidden` (display:none), alt boşluk 0, Sohbet varsayılan yerinde (alttan 20 px). Önceki davranışla aynı.

## 4. Sohbet düğmesi

**Kaynak:** Shopify **Inbox** uygulamasının app embed'i (`shopify://apps/inbox/blocks/chat`). Sayfada `<shopify-chat>` öğesi olarak, gölge DOM içinde çiziliyor.

**Uygulamanın kendi ayarları:**
- Yalnızca sabit bir dikey konum seçeneği var (`button_vertical_position: lowest`).
- Çubuğa göre dinamik bir ofset ayarı **yok**.

**Çözüm:**
- Uygulamanın kendi CSS değişkeni `--shopify-chat-activator-offset`, tema CSS'inden ayarlanıyor. Uygulamanın koduna dokunulmadı.
- Koleksiyon sayfasında, çubuk görünürken (`body.tt-sc-cubuk-acik`) değer çubuk yüksekliği + 12 px oluyor. JS bu yüksekliği `--tt-sc-cubuk-yuk` olarak ölçüyor.
- Ürün sayfasında `assets/custom-tt.js`, temanın yapışkan "Sepete ekle" çubuğunu (`product-sticky-form`) izliyor. Çubuk görünürken `body.tt-urun-cubuk-acik` ve `--tt-urun-cubuk-yuk` ayarlanıyor, `assets/custom-tt.css` de ofseti uyguluyor.

**Ölçümler** (Sohbet'in alt kenarı → çubuğun üst kenarı):

| Sayfa | Durum | Sonuç |
|---|---|---|
| Koleksiyon, 390 | Çubuk görünür | Sohbet 714, çubuk 726 → 12 px boşluk |
| Koleksiyon, 390 | Çubuk gizli | Sohbet varsayılan yerinde (alttan 20 px) |
| Ürün, 390 | Yapışkan çubuk görünür | Sohbet 731, çubuk 743 → 12 px |
| Ürün, 390 | Yapışkan çubuk gizli | Sohbet 824 (alttan 20 px) |
| Ürün, 360 | Yapışkan çubuk görünür | Sohbet 627, çubuk 639 → 12 px |
| Ürün, 360 | Yapışkan çubuk gizli | Sohbet 720 (alttan 20 px) |

Not: Önizlemede Shopify'ın önizleme çubuğu Sohbet'i 68 px daha yukarı itiyor. Testlerde bunu, yalnızca test tarayıcısında eklenen bir stille sıfırladım. Bu stil temada yok.

## Mobil CLS ve LCP

Ölçüm koşulları: 390×844, 4× CPU yavaşlatma, hızlı 4G, 3 ölçümün medyanı.

| Sayfa | CLS önce | CLS sonra | LCP önce | LCP sonra |
|---|---|---|---|---|
| Kadın, Couple | 0.0473 | 0.0473 | 1756 ms | 1116 ms |
| Erkek, Couple | 0.0473 | 0.0473 | 1504 ms | 1332 ms |
| couple-urunler | 0.0475 | 0.0474 | 2088 ms | 1584 ms |

- Çubuk artık açılışta gizli olduğu için sayfa açılışında ek bir yerleşim kayması yok.
- LCP farkı ağ dalgalanması kaynaklı; LCP öğesi değişmedi.

## Yayındaki tema MD5

- Tema: "Calisma taslagi - 2026-10-05" (188825207104, MAIN).
- İşe başlamadan önce ve iş bitince 669 dosyanın MD5'i alındı; **fark yok**.

## Değişen dosyalar (yalnızca Tasarim dili teması)

| Dosya | MD5 |
|---|---|
| snippets/tt-uk-kart.liquid | 8f0bcd4b76c8df498c1e934803a6be27 |
| snippets/product-media-gallery.liquid | 0340d8ff9a1c81a5e05844d9050dbe05 |
| assets/tt-secim-kartlari.js | 6190f0bbe0eec94a30f96fee6447721c |
| assets/tt-secim-kartlari.css | e0eec4932e477a29a581656bd06e7360 |
| assets/custom-tt.js | 36ecc6d23bac6243ba0bac521f886d11 |
| assets/custom-tt.css | bcbb5a89b0e38ad12301522d7ad2cce8 |

Her dosyayı yükledikten sonra temadaki MD5'i yeniden okudum; hepsi eşleşiyor.

## Önizleme bağlantıları

- Erkek, Couple: https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=couple&preview_theme_id=189140861248
- Kadın, Couple: https://texttonext.com/collections/zaman-kapsulu-kolyeler?mod=couple&preview_theme_id=189140861248
- couple-urunler: https://texttonext.com/collections/couple-urunler?preview_theme_id=189140861248
- Erkek, Single: https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=single&preview_theme_id=189140861248
- Ürün sayfası (yapışkan çubuk + Sohbet): https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Couple galerisi örneği: https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/full-tasli-kapsul-zaman-kapsulu-kolye?mod=couple&view=couple&preview_theme_id=189140861248

## Zip içeriği

- `ekran-once/`: düzeltmeden önceki çubuk ve Sohbet görüntüleri.
- `test/`:
  - Her sayfa ve genişlik için 10 adımlık görüntüler ve ham ölçümler (JSON).
  - Single görüntüleri.
  - Ürün sayfası görüntüleri.
- `galeri/`:
  - `sonra-*`: Tasarim dili, düzeltmeden sonra.
  - `calisma-*`: Calisma kopyası, şu anki bozuk hali.
- `video/`:
  - `erkek-couple-390.mp4`: açılış → kutu → ızgara → başa dön → 1 ürün → en alt → 2 ürün → sepete ekle.
  - `erkek-mod-filtre-390.mp4`: mod ve filtre değişimi.
  - `couple-urunler-390.mp4`
