# Goruntulerin ustune tema etiketi seridi ekler (orijinali bozmadan yeni dosya: *-etiketli.png)
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
K = sys.argv[1]
G = json.load(open(K + '/goruntuler.json'))
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception: F = F2 = ImageFont.load_default()
for g in G:
    src = os.path.join(K, g['dosya'])
    if not os.path.exists(src): continue
    im = Image.open(src).convert('RGB')
    ser = Image.new('RGB', (im.width, 84), (255, 236, 179) if 'main' not in g['tema'] else (200, 240, 200))
    d = ImageDraw.Draw(ser)
    d.text((14, 8), 'TEMA: ' + g['tema'] + ('  | onizleme cubugu VAR' if g['cubuk'] else '  | onizleme cubugu yok'), fill=(0, 0, 0), font=F)
    d.text((14, 46), g['url'][:150] + '  | ' + g['cihaz'] + ' | ' + g['zaman'][:16].replace('T', ' ') + ' UTC', fill=(40, 40, 40), font=F2)
    out = Image.new('RGB', (im.width, im.height + 84)); out.paste(ser, (0, 0)); out.paste(im, (0, 84))
    out.save(src.replace('.png', '-etiketli.png'))
print('ok', len(G))
