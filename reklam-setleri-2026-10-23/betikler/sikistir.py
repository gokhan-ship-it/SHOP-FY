# 400 KB ustunu: benzerligi (1 - ortalama mutlak piksel farki/255) >= 0.985 kalan en kucuk JPEG; ad ayni
import sys,os,io,shutil
from PIL import Image
import numpy as np
kaynak,hedef=sys.argv[1],sys.argv[2]
for kok,_,dosyalar in os.walk(kaynak):
    for f in sorted(dosyalar):
        if not f.lower().endswith('.jpg'): continue
        p=os.path.join(kok,f); boy=os.path.getsize(p); h=os.path.join(hedef,f)
        if boy<=400*1024:
            shutil.copy(p,h); print(f'{f}\t{boy//1024}KB\tolduğu gibi'); continue
        im=Image.open(p); im.load(); icc=im.info.get('icc_profile'); a=np.asarray(im.convert('RGB'),dtype=np.int16)
        en=None
        for q in range(95,49,-1):
            b=io.BytesIO(); im.convert('RGB').save(b,'JPEG',quality=q,optimize=True,progressive=True,subsampling=0 if q>=90 else 2,icc_profile=icc)
            c=np.asarray(Image.open(io.BytesIO(b.getvalue())).convert('RGB'),dtype=np.int16)
            s=1-np.abs(a-c).mean()/255
            if s<0.985: break
            en=(q,b.getvalue(),s)
            if len(b.getvalue())<=400*1024: break
        q,v,s=en
        open(h,'wb').write(v); print(f'{f}\t{boy//1024}KB -> {len(v)//1024}KB\tq{q}\t%{s*100:.2f}')
