# Kalem kutusu ön yüzü: 3/4 açılı fotoğraftan perspektif düzeltmesi (yalnız mevcut pikseller).
# Kullanım: python3 duzelt.py <ara-klasör: uyum.json, *-maske.png> <çıktı klasörü>  (çalışma dizini: veri/aksesuar)
import cv2, numpy as np, sys, json
S=sys.argv[1]; U=json.load(open(f'{S}/uyum.json')); rapor={}
W,H=1000,500; EE={'k':19,'t':18}                     # iç panel düzlemi; biye payı (px, W=1000 ölçeğinde)
OW,OH=1200,655                        # 22 × 12 cm oranı
SS=4
for ad,f in [('k','ham/pembe-kalem-kutusu-v.png'),('t','ham/turuncu-kalem-kutusu-v.png')]:
    E=EE[ad]; src=cv2.imread(f); q=np.float32(U[ad]['q']); rho=U[ad]['rho']
    M=cv2.getPerspectiveTransform(q,np.float32([[0,0],[W,0],[W,H],[0,H]]))
    sx,sy=OW/(W+2*E),OH/(H+2*E)
    T=np.array([[sx,0,E*sx],[0,sy,E*sy],[0,0,1]])
    out=cv2.warpPerspective(src,T@M,(OW,OH),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE)
    # yuvarlak köşeli maske (iç yarıçap + biye), 4x örnekleme ile yumuşak kenar
    ri=rho*0.5*W; ro=ri+E
    m=np.zeros((OH*SS,OW*SS),np.uint8)
    def rr(img,x0,y0,x1,y1,rx,ry,val):
        cv2.rectangle(img,(int(x0+rx),int(y0)),(int(x1-rx),int(y1)),val,-1)
        cv2.rectangle(img,(int(x0),int(y0+ry)),(int(x1),int(y1-ry)),val,-1)
        for cx,cy in [(x0+rx,y0+ry),(x1-rx,y0+ry),(x1-rx,y1-ry),(x0+rx,y1-ry)]:
            cv2.ellipse(img,(int(cx),int(cy)),(int(rx),int(ry)),0,0,360,val,-1)
    rr(m,0,0,OW*SS-1,OH*SS-1,ro*sx*SS,ro*sy*SS,255)
    alfa=cv2.resize(m,(OW,OH),interpolation=cv2.INTER_AREA)
    # iç panel maskesi (gölge dengeleme ölçümü için), logo hariç
    pm=np.zeros((OH,OW),np.uint8); rr(pm,(E+15)*sx,(E+15)*sy,(E+W-15)*sx,(E+H-15)*sy,ri*sx,ri*sy,255)
    hsv=cv2.cvtColor(out,cv2.COLOR_BGR2HSV); pm[(hsv[...,1]<90)]=0
    pm=cv2.erode(pm,np.ones((25,25),np.uint8))
    lab=cv2.cvtColor(out,cv2.COLOR_BGR2LAB).astype(np.float32)
    once=lab[pm>0].mean(axis=0)
    # gölge: L'nin düşük frekanslı değişimine 2. derece yüzey uydur, farkın yarısını dengele
    yy,xx=np.mgrid[0:OH,0:OW].astype(np.float32); xn=xx/OW-.5; yn=yy/OH-.5
    A=np.stack([np.ones_like(xn),xn,yn,xn*xn,yn*yn,xn*yn],-1)
    L=lab[...,0]; sel=pm>0
    c,*_=np.linalg.lstsq(A[sel],L[sel],rcond=None)
    yuzey=A@c; ort=L[sel].mean()
    lab[...,0]=np.clip(L-0.5*(yuzey-ort),0,255)
    # netleştirme: yalnız L kanalı, hafif unsharp mask (renk tonu değişmez)
    L=lab[...,0]; bl=cv2.GaussianBlur(L,(0,0),1.4)
    lab[...,0]=np.clip(L+0.7*(L-bl),0,255)
    sonra=lab[pm>0].mean(axis=0)
    rgb=cv2.cvtColor(np.round(lab).astype(np.uint8),cv2.COLOR_LAB2BGR)
    rapor[ad]={'L_aralik_once':float(np.ptp(yuzey[sel])),'lab_once':once.round(2).tolist(),'lab_sonra':sonra.round(2).tolist(),'kose_cm':round(ro*sx/OW*22,2)}
    bgra=cv2.merge([*cv2.split(rgb),alfa]); cv2.imwrite(sys.argv[2]+'/'+{'k':'kalem-kutusu-kirmizi','t':'kalem-kutusu-turuncu'}[ad]+'-on.png',bgra)
    print(ad,rapor[ad])
json.dump(rapor,open(sys.argv[2]+'/rapor.json','w'),indent=1)
