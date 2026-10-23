"""Her kucuk PNG icin: yatay komsu piksellerin birebir ayni olma orani (duz renk alanlari olcusu),
mod (RGB/RGBA/P), saydam piksel orani. Kullanim: python3 -I png-komsu.py <klasor> <cikis.json>"""
import sys, os, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
res = {}
for f in os.listdir(src):
    im = Image.open(os.path.join(src, f)); mod = im.mode
    rgba = im.convert('RGBA'); w, h = rgba.size; px = rgba.load()
    esit = top = saydam = 0
    for y in range(h):
        onceki = None
        for x in range(w):
            p = px[x, y]
            if p[3] < 250: saydam += 1
            if onceki is not None:
                top += 1
                if p == onceki: esit += 1
            onceki = p
    res[f.rsplit('.', 1)[0]] = {'mod': mod, 'komsu_esit': round(esit / max(top, 1), 3), 'saydam_oran': round(saydam / (w * h), 4)}
json.dump(res, open(out, 'w'))
