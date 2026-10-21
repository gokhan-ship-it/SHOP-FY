# Gümüş varyantlara "25 Kasım'da yeniden stokta" notu (21.10.2026)

Onaylanan tasarım C'dir:
- Gümüş seçeneği temanın kendi tükendi görünümünde kalır (üstü çizili, "Ürün Tükendi!").
- Gümüş seçilince seçeneklerin altında gri bir kutu açılır: "25 Kasım'da yeniden stokta." ve "925 Ayar Gümüş şu an tükendi."
- Tasarım tuvali: https://claude.ai/artifact/9cX1wsqoJfmrGYFAk1BoT3

## Yapılanlar
- **Kopya tema:** "Gumus stok notu - 2026-10-21" (`gid://shopify/OnlineStoreTheme/189316038976`, UNPUBLISHED). Prizma'dan kopyalandı.
- **Tarih alanı:** Varyant meta alanı tanımı "Yeniden stok tarihi" (`custom.stok_tarihi`, tür: tarih, `gid://shopify/MetafieldDefinition/317182607680`).
- **Değer:** 12 gümüş varyantının hepsine `2026-11-25` girildi:
  - Aurora, Infinity Glow, Eight Stars White, Ocean Blue, Rose Pink, Gold, White
  - Taşlıkilit Rose / Gold / White
  - Vantablack, Lumin
- **Tema dosyaları (yalnızca kopyada):**
  - `snippets/tt-stok-notu.liquid` (yeni, md5 `4c69cfa0…`)
  - `layout/theme.liquid`: ürün sayfasında tek `render` satırı eklendi (md5 `4f22c7da…`)

## Kural
- **Kutunun görünmesi için üç koşul:** Varyant satılamıyor, tarih alanı dolu ve tarih bugün ya da ileride.
- **Kendiliğinden kalkar:** Stok girilince ya da tarih geçince.
- **Tarihi değiştirmek:** Ürün > varyant > "Yeniden stok tarihi" alanından yapılır; kod değişmez.

## Test (önizleme, telefon 390 ve masaüstü 1440)
| Durum | Sonuç |
|---|---|
| Ocean Blue ilk açılış (çelik) | kutu gizli |
| Gümüş seçilince | kutu görünür, 2 satır metin; buton "Ürün Tükendi!" |
| Tekrar çelik | kutu gizli |
| `?variant=` gümüş ile açılış | kutu görünür |
| Lumin, Taşlıkilit White (gümüş) | kutu görünür |
| Kral Zincir (gümüş, satışta), Prizma (gümüş yok) | kutu ve veri yok |
| JS hatası | yok |

Yayındaki tema (Prizma, `updatedAt` 2026-10-19T15:02:38Z) değişmedi.
