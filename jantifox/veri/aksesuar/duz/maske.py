import cv2, numpy as np, sys
S=sys.argv[1]
for ad,f in [('k','ham/pembe-kalem-kutusu-v.png'),('t','ham/turuncu-kalem-kutusu-v.png')]:
    im=cv2.imread(f); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    h,s,v=cv2.split(hsv)
    b,g,r=cv2.split(im.astype(int))
    if ad=='k': m=((r>150)&(g<90)&(b<90)&(s>150))
    else: m=((h>=5)&(h<=16)&(s>170)&(v>180))
    m=m.astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((21,21),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    c=lab[1050,900]; print(ad,'merkez etiketi',c,st[c])
    mm=(lab==c).astype(np.uint8)*255
    # içteki deliği (logo) doldur
    cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    mm=np.zeros_like(mm); cv2.drawContours(mm,cs,-1,255,-1)
    cv2.imwrite(f'{S}/{ad}-maske.png',mm)
    np.save(f'{S}/{ad}-kontur.npy',max(cs,key=cv2.contourArea)[:,0,:])
    o=im.copy(); cv2.drawContours(o,cs,-1,(0,255,0),3)
    cv2.imwrite(f'{S}/{ad}-kontur.jpg',cv2.resize(o,(1024,1024)))
