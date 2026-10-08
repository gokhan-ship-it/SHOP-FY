"""Faz 1 kontrol sayfası: aksesuar PNG'leri ve dış ölçü önerisi, set içerikleri, kampanyalar (tek dosya HTML, görseller gömülü).

Kullanım: python3 -I faz1-kontrol.py   (jantifox/veri klasöründen)
"""
import base64
import html
import io
import json

from PIL import Image

E = html.escape

# Shopify'dan okunan aksesuar bilgileri (2026-10-08)
AKSESUAR_EK = {
    'kalem-kutusu-kirmizi': ('ACTIVE', 113, 'Kalem Kutusu Kırmızı', 'ACTIVE', 42, 1700),
    'kalem-kutusu-sari': ('ACTIVE', 130, 'Kalem Kutusu Sarı', 'ACTIVE', 32, 1700),
    'kalem-kutusu-turuncu': ('ACTIVE', 125, 'Kalem Kutusu Turuncu', 'ACTIVE', 33, 1700),
    'zarf-sari-kirmizi': ('DRAFT', 50, 'Zarf Kalemlik Sarı/Kırmızı', 'ACTIVE', 20, 1500),
    'zarf-kirmizi-pembe': ('ACTIVE', 50, 'Zarf Kalemlik Kırmızı/Pembe', 'ACTIVE', 20, 1500),
    'zarf-turuncu-kirmizi': ('ACTIVE', 50, 'Zarf Kalemlik Turuncu/Kırmızı', 'ACTIVE', 20, 1500),
    'zarf-sari-turuncu': ('ACTIVE', 50, 'Zarf Kalemlik Sarı/Turuncu', 'ACTIVE', 20, 1500),
    'mini-yuvarlak-sari': ('ACTIVE', 70, 'Mini Yuvarlak Çanta Sarı', 'ACTIVE', 30, 900),
    'mini-yuvarlak-mavi': ('ACTIVE', 68, 'Mini Yuvarlak Çanta Mavi', 'ACTIVE', 30, 900),
    'mini-yuvarlak-turuncu': ('ACTIVE', 70, 'Mini Yuvarlak Çanta Turuncu', 'ACTIVE', 30, 900),
    'mini-yuvarlak-pembe': ('ACTIVE', 67, 'Mini Yuvarlak Çanta Pembe', 'ACTIVE', 27, 900),
    'mini-yuvarlak-kirmizi': ('ACTIVE', 69, 'Mini Yuvarlak Çanta Kırmızı', 'ACTIVE', 30, 900),
}

KAMPANYALAR = [
    ("2li patche indirim", "Ürün indirimi", "En az 2 patch (44 ürün)", "−60 TL, siparişte bir kez", "Setler yok (Worm Family hariç). Donut Planet, Eggcellent gibi yeni patch'ler listede yok."),
    ("3'lü patche indirim", "Ürün indirimi", "En az 3 patch (57 ürün)", "−190 TL, siparişte bir kez", "School Rocks ve Keep Swimming listede yok."),
    ("4'lü patche indirim", "Ürün indirimi", "En az 4 patch (58 ürün)", "−370 TL, siparişte bir kez", "Worm Family listede yok."),
    ("Çanta Alana 1 Patch Hediye", "Al-kazan (BXGY)", "1 Çok Amaçlı Mini Çanta (6 renk)", "1 patch %100 indirimli, siparişte bir kez", "Kanvas Lacivert Tote bu kampanyada DEĞİL. Hediye listesinde yeni patch'ler (Donut Planet vb.) yok."),
    ("Ekstra %10 İndirim", "Sipariş indirimi", "Ara toplam ≥ 5.000 TL (ürün indirimlerinden sonra)", "Tüm siparişte %10", "Diğer indirimlerle birleşir."),
]


def gom(yol, boyut, bicim='WEBP'):
    im = Image.open(yol)
    im.thumbnail((boyut, boyut), Image.LANCZOS)
    t = io.BytesIO()
    if bicim == 'JPEG':
        im.convert('RGB').save(t, 'JPEG', quality=80)
        return 'data:image/jpeg;base64,' + base64.b64encode(t.getvalue()).decode()
    im.save(t, 'WEBP', quality=85)
    return 'data:image/webp;base64,' + base64.b64encode(t.getvalue()).decode()


def tl(n):
    return f'{n:,.0f}'.replace(',', '.') + ' TL'


def aksesuar_bolumu():
    rapor = json.load(open('aksesuar/png/rapor.json', encoding='utf-8'))
    kartlar = []
    for r in rapor:
        durum, stok, es_ad, es_durum, es_stok, fiyat = AKSESUAR_EK[r['anahtar']]
        o = r['dis_oneri']
        W, H = r['en'], r['boy']
        sekil = (f'<ellipse cx="{o["x"] + o["w"] / 2}" cy="{o["y"] + o["h"] / 2}" rx="{o["w"] / 2}" ry="{o["h"] / 2}"/>'
                 if o['shape'] == 'circle' else f'<rect x="{o["x"]}" y="{o["y"]}" width="{o["w"]}" height="{o["h"]}"/>')
        olcu = r['olcu']
        if 'cap_cm' in olcu:
            site = f'Çap {olcu["cap_cm"]} cm'
            oran_not = 'Gövde dairesi bulundu; kanca ve fermuar ipi dışarıda kalır.'
        else:
            site = f'{olcu["en_cm"]} × {olcu["boy_cm"]} cm' + (f' (derinlik {olcu["derinlik_cm"]} cm)' if 'derinlik_cm' in olcu else '')
            beklenen = olcu['en_cm'] / olcu['boy_cm']
            gercek = o['w'] / o['h']
            fark = abs(gercek - beklenen) / beklenen
            oran_not = (f'Görsel oranı {gercek:.2f}, sitedeki {beklenen:.2f}: %{fark * 100:.0f} fark.'
                        + (' Görsel 3/4 açılı, yan yüz de kutuya giriyor.' if fark > 0.05 else ' Uyumlu.'))
        uyarilar = []
        if r['velcro']:
            velcro = '<span class="rozet yesil">Önünde Velcro yüzey var</span>'
        else:
            velcro = '<span class="rozet gri">Önünde Velcro yüzey yok (açıklamaya göre)</span>'
        if durum != 'ACTIVE':
            uyarilar.append('Yapıştırılabilir ürün taslakta (DRAFT): editörde görünmez.')
        if r['gorsel'] == 'sari-vardir-1.png':
            uyarilar.append('Sarı/Kırmızı ve Sarı/Turuncu zarfın ana görseli aynı dosya (ön yüz sarı).')
        if r['anahtar'] == 'kalem-kutusu-kirmizi':
            uyarilar.append('Ürün adı "Kırmızı", görsel dosyası "pembe-kalem-kutusu": kırmızı gövde, pembe fermuar.')
        kartlar.append(f'''
<article class="kart">
  <div class="gorsel-kap"><div class="dama"><img src="{gom('aksesuar/png/' + r['png'], 520)}" alt="">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none">{sekil}</svg></div></div>
  <h3>{E(r['ad'])}</h3>
  <p>{velcro}</p>
  <dl>
    <dt>Sitedeki ölçü</dt><dd>{E(site)}</dd>
    <dt>Dış ölçü önerisi</dt><dd>{E(oran_not)}</dd>
    <dt>Eşi (Velcro'suz)</dt><dd>{E(es_ad)} · {tl(fiyat)} · stok {es_stok} {'' if es_durum == 'ACTIVE' else '· ' + es_durum}</dd>
    <dt>Fiyat / stok</dt><dd>{tl(fiyat)} (eşiyle aynı) · stok {stok} · {durum}</dd>
  </dl>
  {''.join(f'<p class="uyari">{E(u)}</p>' for u in uyarilar)}
</article>''')
    return '\n'.join(kartlar)


def set_bolumu():
    setler = json.load(open('setler/eslestirme.json', encoding='utf-8'))
    tekil = json.load(open('setler/tekil-png.json', encoding='utf-8'))
    kontrol_et = {'Boncuklu Gülen Yüz', 'Pullu Gülen Yüz', 'Leopar Gülen Yüz', 'Lacivert Kalp'}
    kartlar = []
    for s in setler:
        ham = 'setler/ham/' + s['gorsel']
        patchler = []
        for p in s['patchler']:
            dosya = 'setler/tekil-png/' + tekil[p]['png'].split('/')[-1]
            isaret = ' <span class="rozet turuncu">görselden ayırt edildi</span>' if p in kontrol_et else ''
            patchler.append(f'<li><span class="dama kucuk"><img src="{gom(dosya, 120)}" alt=""></span><span>{E(p)}{isaret}</span></li>')
        n = len(s['patchler'])
        if n:
            ozet = f'{n} patch · {tl(s["fiyat"])} <s>{tl(n * 330)}</s>'
        else:
            ozet = f'<span class="rozet kirmizi">Eşleşmedi</span> {tl(s["fiyat"])}'
        eksik = ''.join(f'<li class="eksik">✕ {E(x)}: tek tek satılan ürünü yok</li>' for x in s.get('eslesmeyen', []))
        kartlar.append(f'''
<article class="kart set">
  <div class="set-ust"><img class="set-gorsel" src="{gom(ham, 360, 'JPEG')}" alt="">
  <div><h3>{E(s['set'])}</h3><p class="ozet">{ozet}</p></div></div>
  <ul class="patchler">{''.join(patchler)}{eksik}</ul>
</article>''')
    return '\n'.join(kartlar)


def kampanya_bolumu():
    satirlar = ''.join(
        f'<tr><td><b>{E(a)}</b><br><small>{E(t)}</small></td><td>{E(k)}</td><td>{E(i)}</td><td><small>{E(n)}</small></td></tr>'
        for a, t, k, i, n in KAMPANYALAR)
    return f'<div class="tablo-kap"><table><thead><tr><th>Kampanya (Shopify adı)</th><th>Koşul</th><th>İndirim</th><th>Not</th></tr></thead><tbody>{satirlar}</tbody></table></div>'


sayfa = f'''<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Faz 1 kontrol</title>
<style>
:root {{ --murekkep:#111; --ikincil:#5c5c5c; --cizgi:#e2e2e2; --marka:#b3141b; --turuncu:#e8742b; --yesil:#2f8f4e; }}
* {{ box-sizing:border-box }}
body {{ margin:0; font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; color:var(--murekkep); background:#f6f6f4; }}
main {{ max-width:1100px; margin:0 auto; padding:16px; }}
h1 {{ font-size:22px; margin:8px 0 4px }} h2 {{ font-size:18px; margin:28px 0 6px }} h3 {{ font-size:16px; margin:10px 0 4px }}
.aciklama {{ color:var(--ikincil); margin:0 0 12px }}
.izgara {{ display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }}
.kart {{ background:#fff; border:1px solid var(--cizgi); border-radius:12px; padding:12px; }}
.dama {{ position:relative; display:block; background:repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50%/16px 16px; border-radius:8px; }}
.dama img {{ display:block; width:100%; height:auto }}
.dama svg {{ position:absolute; inset:0; width:100%; height:100%; fill:none; stroke:var(--turuncu); stroke-width:6; stroke-dasharray:18 10; }}
dl {{ display:grid; grid-template-columns:auto 1fr; gap:4px 10px; margin:8px 0 0; font-size:14px }}
dt {{ color:var(--ikincil) }} dd {{ margin:0 }}
.rozet {{ display:inline-block; font-size:12px; padding:2px 8px; border-radius:999px; font-weight:600 }}
.yesil {{ background:#e3f3e8; color:#1e6a37 }} .gri {{ background:#eee; color:#555 }}
.turuncu {{ background:#fdeadd; color:#9a4512 }} .kirmizi {{ background:#fbe3e4; color:var(--marka) }}
.uyari {{ margin:8px 0 0; padding:6px 10px; border-radius:8px; background:#fff6e5; color:#7a4a00; font-size:13px }}
.set-ust {{ display:flex; gap:12px; align-items:center }}
.set-gorsel {{ width:120px; height:120px; object-fit:contain; border-radius:8px; background:#fff; border:1px solid var(--cizgi) }}
.ozet s {{ color:var(--ikincil) }}
.patchler {{ list-style:none; padding:0; margin:10px 0 0; display:grid; gap:6px }}
.patchler li {{ display:flex; align-items:center; gap:10px; font-size:14px }}
.dama.kucuk {{ width:44px; height:44px; flex:none; display:flex; align-items:center; justify-content:center }}
.dama.kucuk img {{ max-width:40px; max-height:40px; width:auto }}
.eksik {{ color:var(--marka) }}
.tablo-kap {{ overflow-x:auto; background:#fff; border:1px solid var(--cizgi); border-radius:12px }}
table {{ border-collapse:collapse; width:100%; min-width:640px; font-size:14px }}
th, td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--cizgi); vertical-align:top }}
small {{ color:var(--ikincil) }}
</style></head><body><main>
<h1>Faz 1 kontrol sayfası</h1>
<p class="aciklama">Mağazaya henüz hiçbir şey yazılmadı. Onayından sonra metafield olarak yazılacak.</p>

<h2>1a. Yapıştırılabilir aksesuarlar ve eşleri</h2>
<p class="aciklama">Şeffaf PNG (arka plan temizlendi, köşedeki "PATCH ALANI / CIRT ALANI" rozetleri atıldı, en dış kenardan kırpıldı). Turuncu kesikli çizgi: dış ölçü önerisi; kesin hali alan çizicide ayarlanacak.</p>
<div class="izgara">{aksesuar_bolumu()}</div>

<h2>1b. Hazır patch setleri</h2>
<p class="aciklama">İçerik ürün görselinden çıkarıldı (açıklamalarda patch listesi yok). Turuncu etiketli patch'ler benzerleri arasından görselle ayırt edildi, bir göz at. Üstü çizili fiyat: patch başına 330 TL.</p>
<div class="izgara">{set_bolumu()}</div>

<h2>1c. Aktif otomatik kampanyalar</h2>
{kampanya_bolumu()}
</main></body></html>'''

open('faz1-kontrol.html', 'w', encoding='utf-8').write(sayfa)
print('faz1-kontrol.html', len(sayfa) // 1024, 'KB')
