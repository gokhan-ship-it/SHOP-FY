import cv2, numpy as np, sys, json
from scipy.optimize import minimize
S=sys.argv[1]; K=json.load(open(f'{S}/koseler.json')); out={}
KS=0.25
def yuvarlak(a,rho,n=60):
    r=rho*a; pts=[]
    for cx,cy,t0 in [(1-r,r,-90),(1-r,a-r,0),(r,a-r,90),(r,r,180)]:
        for t in np.linspace(t0,t0+90,n):
            pts.append((cx+r*np.cos(np.radians(t)),cy+r*np.sin(np.radians(t))))
    return np.array(pts,np.float32)
def hom(q,a):
    src=np.float32([[0,0],[1,0],[1,a],[0,a]]); return cv2.getPerspectiveTransform(src,np.float32(q))
for ad in ['k','t']:
    m=cv2.imread(f'{S}/{ad}-maske.png',0); ms=cv2.resize(m,None,fx=KS,fy=KS,interpolation=cv2.INTER_AREA)>127
    a=0.5
    def kayip(p):
        q=p[:8].reshape(4,2); rho=p[8]
        if not (0.01<rho<0.5): return 1
        pts=cv2.perspectiveTransform(yuvarlak(a,rho)[None],hom(q,a))[0]*KS
        img=np.zeros(ms.shape,np.uint8); cv2.fillPoly(img,[np.round(pts*8).astype(np.int32)],1,lineType=cv2.LINE_8,shift=3)
        img=img>0; return 1-(img&ms).sum()/(img|ms).sum()
    p0=np.r_[np.array(K[ad]).ravel(),0.12]
    r=minimize(kayip,p0,method='Powell',options={'xtol':0.05,'ftol':1e-6,'maxiter':20000})
    r=minimize(kayip,r.x,method='Nelder-Mead',options={'xatol':0.05,'fatol':1e-7,'maxiter':8000})
    print(ad,'IoU',1-r.fun,'köşeler',np.round(r.x[:8].reshape(4,2)).tolist(),'rho',r.x[8])
    out[ad]={'q':r.x[:8].reshape(4,2).tolist(),'rho':float(r.x[8]),'a':a}
json.dump(out,open(f'{S}/uyum.json','w'))
