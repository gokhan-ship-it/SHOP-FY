"""BELGE 1-7 markdown -> HTML. Metne dokunulmaz; yalnizca isaretleme cevrilir.
Dogrulama: HTML'in duz metni ile markdown'in isaretsiz metni kelime kelime ayni olmali."""
import re, html, json, sys
src = open('belgeler/KAYNAK-belgeler.md').read()
parcalar = re.split(r'^## BELGE (\d) — (.+)$', src, flags=re.M)
belgeler = {}
for i in range(1, len(parcalar), 3):
    no, baslik, govde = int(parcalar[i]), parcalar[i+1].strip(), parcalar[i+2]
    govde = govde.strip()
    if govde.endswith('---'): govde = govde[:-3].strip()
    belgeler[no] = (baslik, govde)

def satir_ici(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'<em>\1</em>', t)
    return t

def cevir(md):
    out = []; satirlar = md.split('\n'); i = 0
    while i < len(satirlar):
        s = satirlar[i].rstrip()
        if not s.strip(): i += 1; continue
        if s.startswith('|'):
            tab = []
            while i < len(satirlar) and satirlar[i].startswith('|'):
                tab.append(satirlar[i].strip()); i += 1
            hucre = lambda r: [c.strip() for c in r.strip('|').split('|')]
            bas = hucre(tab[0]); govde = [hucre(r) for r in tab[2:]]
            h = '<div class="tt-yasal-tablo" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table>\n<thead><tr>' + ''.join('<th>%s</th>' % satir_ici(c) for c in bas) + '</tr></thead>\n<tbody>\n'
            for r in govde: h += '<tr>' + ''.join('<td>%s</td>' % satir_ici(c) for c in r) + '</tr>\n'
            out.append(h + '</tbody>\n</table></div>'); continue
        if re.match(r'^- ', s):
            li = []
            while i < len(satirlar) and re.match(r'^- ', satirlar[i]):
                li.append(satirlar[i][2:].strip()); i += 1
            out.append('<ul>\n' + ''.join('<li>%s</li>\n' % satir_ici(x) for x in li) + '</ul>'); continue
        if re.match(r'^\d+\. ', s):
            li = []
            while i < len(satirlar) and re.match(r'^\d+\. ', satirlar[i]):
                li.append(re.sub(r'^\d+\. ', '', satirlar[i]).strip()); i += 1
            out.append('<ol>\n' + ''.join('<li>%s</li>\n' % satir_ici(x) for x in li) + '</ol>'); continue
        out.append('<p>%s</p>' % satir_ici(s.strip())); i += 1
    return '\n'.join(out)

def kelimeler_md(md):
    t = md
    t = re.sub(r'^\|?\s*-{3,}.*$', ' ', t, flags=re.M)          # tablo ayirici
    t = t.replace('|', ' ')
    t = re.sub(r'^- ', ' ', t, flags=re.M)
    t = re.sub(r'^(\d+)\. ', r'\1. ', t, flags=re.M)               # numara metnin parcasi degil, asagida ayrica
    t = t.replace('**', '')
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'\1', t)
    return t.split()

def kelimeler_html(h, md):
    # <ol> numaralari tarayicida uretilir; karsilastirmada md'deki numaralari geri koy
    sayac = iter(re.findall(r'^(\d+)\. ', md, flags=re.M))
    h = re.sub(r'<li>', lambda m: m.group(0), h)
    t = h
    def ol_degistir(m):
        return re.sub(r'<li>', lambda _: '<li>' + next(sayac) + '. ', m.group(0))
    t = re.sub(r'<ol>.*?</ol>', ol_degistir, t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    return html.unescape(t).split()

sonuc = {}
for no, (baslik, md) in sorted(belgeler.items()):
    if no == 8: continue
    h = cevir(md)
    a, b = kelimeler_md(md), kelimeler_html(h, md)
    ok = a == b
    if not ok:
        for k,(x,y) in enumerate(zip(a,b)):
            if x!=y: print('FARK', no, k, a[k-3:k+3], b[k-3:k+3]); break
        print('uzunluk', len(a), len(b))
    open('belgeler/belge-%d.html' % no, 'w').write(h)
    sonuc[no] = {'baslik': baslik, 'kelime': len(a), 'birebir': ok, 'html_uzunluk': len(h)}
    print(no, baslik, '| kelime', len(a), '| birebir', ok)
json.dump(sonuc, open('belgeler/dogrulama.json', 'w'), ensure_ascii=False, indent=1)
