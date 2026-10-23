# Kullanim: python3 -I sepet-test.py <cikis.json>
# Her set icin ayri, cerezsiz yeni bir sepet: /cart/add.js -> /cart/update.js {discount: kod} -> /cart.js
# Yalnizca sepet; odeme sayfasina gidilmez, siparis olusmaz. Sayfa calistirilmadigi icin takip istegi olusmaz.
import json,subprocess,sys,tempfile,os
KOD='K7QX4M9TR'
SETLER=[('couple1','Prizma + Chloe',67804332491072),('couple2','Nova + Chloe',51518173872448),('couple3','Rose Pink + Prizma',67852489228608),('couple4','Gold + Nova',67852495978816),('couple5','Luna + Aurora (Celik)',67663049392448)]
def istek(jar,yol,veri=None):
    k=['curl','-sS','-b',jar,'-c',jar,'-A','Mozilla/5.0','-H','Accept: application/json','-w','\n%{http_code}']
    if veri is not None: k+=['-H','Content-Type: application/json','-X','POST','--data',json.dumps(veri)]
    r=subprocess.run(k+['https://texttonext.com'+yol],capture_output=True,text=True)
    govde,kod=r.stdout.rsplit('\n',1)
    try: return int(kod),json.loads(govde)
    except Exception: return int(kod),govde[:200]
sonuc=[]
for rk,ad,vid in SETLER:
    jar=tempfile.mktemp(dir=os.path.dirname(os.path.abspath(sys.argv[1])))
    k1,ekle=istek(jar,'/cart/add.js',{'items':[{'id':vid,'quantity':1}]})
    r={'reklam':rk,'set':ad,'varyant':vid,'sepete_ekle_http':k1}
    if k1!=200:
        r['hata']=ekle if isinstance(ekle,str) else ekle.get('description') or ekle.get('message')
        sonuc.append(r); print(rk,ad,'sepete eklenemedi',k1,r['hata']); continue
    k0,c0=istek(jar,'/cart.js')
    k2,c2=istek(jar,'/cart/update.js',{'discount':KOD})
    k3,c=istek(jar,'/cart.js')
    r.update({'kod_oncesi_toplam':c0['total_price']/100,'kod_oncesi_indirimler':[(d.get('title'),d.get('type')) for d in c0.get('cart_level_discount_applications',[])+[a for i in c0['items'] for a in i.get('line_level_discount_allocations',[])]],
              'fiyat':c['items'][0]['final_line_price']/100 if c['items'] else None,'ara_toplam':c['items_subtotal_price']/100,'toplam':c['total_price']/100,'toplam_indirim':c['total_discount']/100,
              'kodlar':c.get('discount_codes'),'sepet_indirimleri':[(d['title'],d['type'],d['total_allocated_amount']/100) for d in c.get('cart_level_discount_applications',[])],
              'satir_indirimleri':[(a['discount_application']['title'],a['amount']/100) for i in c['items'] for a in i.get('line_level_discount_allocations',[])]})
    sonuc.append(r); os.remove(jar)
    print(rk,ad,'| kod oncesi',r['kod_oncesi_toplam'],r['kod_oncesi_indirimler'],'| kod sonrasi toplam',r['toplam'],'| kodlar',r['kodlar'],'| sepet ind.',r['sepet_indirimleri'],'| satir ind.',r['satir_indirimleri'])
json.dump(sonuc,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
