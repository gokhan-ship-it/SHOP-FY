# Güven bandı + hazır set kartları (27.10.2026)

## Hangi temada
- Temalar listelendi: yayında **"Prizma kampanya - 2026-10-25"** (189440328000). Ona dokunulmadı.
- Çalışılan kopya: **"Cark hatirlatma - 2026-10-26"** (189466968384). Fox işi de bu temada
  yapıldı ve yayına alınmamış önceki işler de burada toplu. Hiçbir tema yayına alınmadı.

## Değişen / eklenen dosyalar (kopya tema)
| Dosya | Durum | Ne |
|---|---|---|
| snippets/tt-guven-bandi.liquid | yeni | Bandın kendisi: biçim, üç madde, kayan şerit betiği |
| layout/theme.liquid | değişti | `#PageContainer`'ın ilk satırına `render 'tt-guven-bandi'`, yani bütün sayfalar |
| config/settings_schema.json | değişti | Tema ayarlarına "Güven bandı" grubu eklendi |
| sections/tt-secim-kartlari.liquid | değişti | Hazır set kartları sıkıştırıldı; "Kendi setini oluştur" düğmesi şeridin altına alındı |
| assets/tt-secim-kartlari.js | değişti | Yalnızca bir açıklama satırı (düğmenin yeni yeri). Çalışan kod aynı |

- MD5'ler `veri/kopya-md5.json` dosyasında.
- `config/settings_data.json` değişmedi: ayarların varsayılan değerleri şemadan geliyor.
- Çark dosyaları değişmedi: `tt-cark-durum`, `tt-cark-hatir` ve `tt-cark-hatir.js`.
- İndirim kuralları ve reklam takip kodları da değişmedi.

## Metinleri nereden değiştireceksiniz
**Özelleştir → Tema ayarları (dişli simgesi) → "Güven bandı"**, listenin en altında.
- "Güven bandını göster": bandı açar ya da kapatır.
- 1., 2. ve 3. madde metinleri: kamyon, damla ve telefon ikonları sabit kalır.
- Boş bırakılan madde gösterilmez. Üçü de boşsa bant hiç çıkmaz.

<!-- SONUCLAR -->
