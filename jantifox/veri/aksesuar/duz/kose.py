import cv2, numpy as np, sys, json
S=sys.argv[1]; out={}
def hat(pts):
    vx,vy,x0,y0=cv2.fitLine(np.array(pts,np.float32),cv2.DIST_HUBER,0,0.01,0.01).ravel()
    return np.array([x0,y0]),np.array([vx,vy])
def kes(a,b):
    p,d=a; q,e=b
    A=np.array([d,-e]).T; t=np.linalg.solve(A,q-p); return p+t[0]*d
for ad,f in [('k','ham/pembe-kalem-kutusu-v.png'),('t','ham/turuncu-kalem-kutusu-v.png')]:
    m=cv2.imread(f'{S}/{ad}-maske.png',0)>0
    ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max(); w=x1-x0; h=y1-y0
    ust=[];alt=[];sol=[];sag=[]
    for x in range(int(x0+.15*w),int(x0+.85*w),3):
        c=np.nonzero(m[:,x])[0]; ust.append((x,c.min())); alt.append((x,c.max()))
    for y in range(int(y0+.2*h),int(y0+.8*h),3):
        r=np.nonzero(m[y])[0]; sol.append((r.min(),y))
    for y in range(int(y0+.15*h),int(y0+.55*h),3):
        r=np.nonzero(m[y])[0]; sag.append((r.max(),y))
    U,A,L,R=hat(ust),hat(alt),hat(sol),hat(sag)
    q=[kes(U,L),kes(U,R),kes(A,R),kes(A,L)]
    out[ad]=[list(map(float,p)) for p in q]
    print(ad,[tuple(round(v) for v in p) for p in q])
json.dump(out,open(f'{S}/koseler.json','w'))
