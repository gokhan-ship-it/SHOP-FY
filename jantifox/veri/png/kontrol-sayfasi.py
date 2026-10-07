"""Patch PNG kontrol sayfasını üretir (tek dosya HTML, görseller gömülü).

Kullanım: python3 -I kontrol-sayfasi.py <sonuclar.json> <cikti.html> [elle-isaretler.json]
"""
import base64
import html
import io
import json
import sys

from PIL import Image


def gom(yol, boyut, bicim):
    im = Image.open(yol)
    im.thumbnail((boyut, boyut), Image.LANCZOS)
    tampon = io.BytesIO()
    if bicim == 'JPEG':
        im.convert('RGB').save(tampon, 'JPEG', quality=78)
        tur = 'jpeg'
    else:
        im.save(tampon, 'PNG', optimize=True)
        tur = 'png'
    return f'data:image/{tur};base64,' + base64.b64encode(tampon.getvalue()).decode()


def main():
    sonuclar = json.load(open(sys.argv[1]))
    elle = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
    TUR_AD = {'harf': 'Harf', 'rakam': 'Rakam', 'ikon': 'İkon'}
    kartlar = []
    for n, r in enumerate(sonuclar, 1):
        s, o = r['sonuc'], r['olcu']
        isaret = list(r['isaretler']) + elle.get(r['anahtar'], [])
        if r.get('not_'):
            isaret.append(r['not_'])
        orj = gom(r['orijinal'], 260, 'JPEG')
        png = gom(s['png'], 260, 'PNG') if s.get('png') else ''
        olcu = (f"{o['genislik']:.1f} × {o['yukseklik']:.1f} cm".replace('.', ',') if o['genislik'] else '—')
        eski = r.get('bilinen') or {}
        eski_yazi = ' · '.join(f"{'en' if k == 'genislik' else 'boy'} {v:g}" for k, v in eski.items()) or 'yok'
        kartlar.append(f"""
<article class="kart{' isaretli' if isaret else ''}" data-no="{n}" data-tur="{r['tur']}" data-isaretli="{1 if isaret else 0}">
  <header><span class="no">{n}</span> <strong>{html.escape(r['ad'])}</strong> <span class="rozet">{TUR_AD[r['tur']]}</span></header>
  <div class="gorseller">
    <figure><img src="{orj}" alt=""><figcaption>Orijinal</figcaption></figure>
    <figure class="koyu"><img src="{png}" alt=""><figcaption>Yeni PNG ({s.get('cikti_px', ['?', '?'])[0]}×{s.get('cikti_px', ['?', '?'])[1]})</figcaption></figure>
  </div>
  <dl>
    <dt>Hesaplanan</dt><dd><b>{olcu}</b> <span class="ince">({html.escape(o['dayanak'])})</span></dd>
    <dt>Eski kayıt</dt><dd>{html.escape(eski_yazi)}</dd>
  </dl>
  {''.join(f'<p class="uyari">⚠️ {html.escape(i)}</p>' for i in isaret)}
  <label class="onay"><input type="checkbox" {'' if isaret else 'checked'} data-onay> Onaylıyorum</label>
</article>""")
    sayac = {'tum': len(sonuclar), 'isaretli': sum(1 for r in sonuclar if r['isaretler'] or elle.get(r['anahtar']) or r.get('not_'))}
    sayfa = f"""<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Patch PNG Kontrolü</title>
<style>
:root {{ --zemin:#f4f4f2; --kart:#fff; --cizgi:#ddd; --ikincil:#666; --uyari:#8a1710; --uyari-zemin:#fdeceb; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; background:var(--zemin); color:#111; }}
.ust {{ position:sticky; top:0; z-index:5; background:#fff; border-bottom:1px solid var(--cizgi); padding:12px 16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }}
.ust h1 {{ font-size:17px; margin:0 12px 0 0; }}
button {{ font:inherit; padding:7px 12px; border:1px solid #bbb; border-radius:8px; background:#fff; cursor:pointer; }}
button[aria-pressed="true"] {{ background:#111; color:#fff; border-color:#111; }}
#ozet {{ color:var(--ikincil); }}
.aciklama {{ padding:12px 16px 0; color:var(--ikincil); max-width:1100px; }}
.izgara {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:14px; padding:16px; }}
.kart {{ background:var(--kart); border:1px solid var(--cizgi); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px; }}
.kart.isaretli {{ border:2px solid #e8a19b; }}
.kart.reddedildi {{ opacity:.55; }}
header {{ display:flex; gap:6px; align-items:baseline; flex-wrap:wrap; }}
.no {{ font-weight:700; color:var(--ikincil); }}
.rozet {{ font-size:11px; background:#eee; border-radius:999px; padding:1px 7px; }}
.gorseller {{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }}
figure {{ margin:0; text-align:center; }}
figure img {{ width:100%; aspect-ratio:1; object-fit:contain; border-radius:8px; background:#fff; border:1px solid #eee; }}
figure.koyu img {{ background: repeating-conic-gradient(#2a2d34 0% 25%, #1b1d22 0% 50%) 50%/16px 16px; border-color:#1b1d22; }}
figcaption {{ font-size:12px; color:var(--ikincil); margin-top:2px; }}
dl {{ display:grid; grid-template-columns:auto 1fr; gap:2px 8px; margin:0; }}
dt {{ color:var(--ikincil); }} dd {{ margin:0; }}
.ince {{ color:var(--ikincil); font-size:12px; }}
.uyari {{ margin:0; padding:6px 8px; border-radius:6px; background:var(--uyari-zemin); color:var(--uyari); font-size:12.5px; }}
.onay {{ display:flex; gap:6px; align-items:center; font-weight:600; margin-top:auto; padding-top:4px; cursor:pointer; }}
.onay input {{ width:18px; height:18px; }}
[hidden] {{ display:none !important; }}
textarea {{ width:100%; font:12px ui-monospace,Menlo,monospace; }}
</style></head><body>
<div class="ust">
  <h1>Patch PNG kontrolü</h1>
  <button type="button" data-filtre="tum" aria-pressed="true">Tümü ({sayac['tum']})</button>
  <button type="button" data-filtre="isaretli" aria-pressed="false">İşaretliler ({sayac['isaretli']})</button>
  <button type="button" data-filtre="harf" aria-pressed="false">Harfler</button>
  <button type="button" data-filtre="rakam" aria-pressed="false">Rakamlar</button>
  <button type="button" data-filtre="ikon" aria-pressed="false">İkonlar</button>
  <span id="ozet"></span>
  <button type="button" id="kopyala">Kararımı kopyala</button>
</div>
<p class="aciklama">Yeni PNG'ler koyu, damalı zemin üzerinde gösteriliyor: arka plan kalıntısı açık renkli leke, eksik kesim ise patch kenarında boşluk olarak görünür. İşaretli kartların onay kutusu kapalı başlar. Bitirince <b>Kararımı kopyala</b>'ya basıp sonucu sohbete yapıştır.</p>
<div class="izgara">{''.join(kartlar)}</div>
<textarea id="karar" rows="3" hidden readonly></textarea>
<script>
(function () {{
  var kartlar = Array.prototype.slice.call(document.querySelectorAll('.kart'));
  function guncelle() {{
    var red = kartlar.filter(function (k) {{ return !k.querySelector('[data-onay]').checked; }});
    kartlar.forEach(function (k) {{ k.classList.toggle('reddedildi', !k.querySelector('[data-onay]').checked); }});
    document.getElementById('ozet').textContent = (kartlar.length - red.length) + ' onaylı · ' + red.length + ' onaysız';
  }}
  document.addEventListener('change', guncelle);
  document.querySelectorAll('[data-filtre]').forEach(function (b) {{
    b.addEventListener('click', function () {{
      var f = b.getAttribute('data-filtre');
      document.querySelectorAll('[data-filtre]').forEach(function (x) {{ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }});
      kartlar.forEach(function (k) {{
        k.hidden = !(f === 'tum' || (f === 'isaretli' ? k.dataset.isaretli === '1' : k.dataset.tur === f));
      }});
    }});
  }});
  document.getElementById('kopyala').addEventListener('click', function () {{
    var red = kartlar.filter(function (k) {{ return !k.querySelector('[data-onay]').checked; }}).map(function (k) {{ return k.dataset.no; }});
    var metin = 'Onaylamadıklarım: ' + (red.length ? red.join(', ') : 'yok') + ' (diğer ' + (kartlar.length - red.length) + ' onaylı)';
    var t = document.getElementById('karar'); t.hidden = false; t.value = metin; t.select();
    try {{ navigator.clipboard.writeText(metin); }} catch (e) {{ document.execCommand('copy'); }}
    this.textContent = 'Kopyalandı';
  }});
  guncelle();
}})();
</script>
</body></html>"""
    open(sys.argv[2], 'w').write(sayfa)
    print('yazıldı', sys.argv[2], len(sayfa) // 1024, 'KB')


if __name__ == '__main__':
    main()
