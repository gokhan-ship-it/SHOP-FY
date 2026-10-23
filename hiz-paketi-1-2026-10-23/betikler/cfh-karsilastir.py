# Kullanim: python3 -I cfh-karsilastir.py <klasorA> <klasorB>
# content_for_header bolumlerini, her istekte zaten degisen alanlari ve tema adi/kimligini sabitleyerek karsilastirir.
# Icerik incelenmez; yalnizca birebir ayni mi diye bakilir, fark varsa yeri gosterilir.
import sys, re, glob, os, difflib
SAYFALAR = ['anasayfa', 'couple-landing', 'kunye', 'astor-chloe-couple', 'noir', 'kral-zincir', 'couple-urunler']
def norm(s):
    s = re.sub(r'"reqid":"[^"]*"', '"reqid":"<ISTEK>"', s)
    s = re.sub(r'"u":"[0-9a-f]{12}"', '"u":"<ISTEK>"', s)
    s = re.sub(r'(\?|\\u0026)_su_rec(?:_id)?=[^"\\&]*', '', s)
    s = re.sub(r'(Shopify\.theme\s*=\s*\{"name":)"[^"]*","id":\d+', r'\1"<TEMA>","id":<TEMA_ID>', s)
    return s
A, B = sys.argv[1], sys.argv[2]
hepsi = True
for s in SAYFALAR:
    a = [norm(open(p, encoding='utf-8').read()) for p in sorted(glob.glob(os.path.join(A, s + '-*.cfh')))]
    b = [norm(open(p, encoding='utf-8').read()) for p in sorted(glob.glob(os.path.join(B, s + '-*.cfh')))]
    bos = any(not x for x in a + b)
    ayni = (not bos) and len(set(a + b)) == 1
    hepsi &= ayni
    print('%-20s %s (%d+%d indirme, %d karakter)' % (s, 'AYNI' if ayni else ('BOLUM BULUNAMADI' if bos else 'FARKLI'), len(a), len(b), len(a[0]) if a else 0))
    if not ayni and not bos:
        x = re.split(r'([,;{}\[\]"<> ])', a[0]); y = re.split(r'([,;{}\[\]"<> ])', b[0])
        for t, i1, i2, j1, j2 in [o for o in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes() if o[0] != 'equal'][:8]:
            print('    ', t, repr(''.join(x[i1:i2])[:100]), '->', repr(''.join(y[j1:j2])[:100]))
print('SONUC:', 'hepsi ayni' if hepsi else 'fark var')
