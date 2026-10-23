# Prizma + Chloe sablonundan iki yeni setin productSet girdisini ve aciklama degisiklik listesini uretir.
import json
s=json.load(open('prizma-chloe-sablon.json'))
mf={(m['namespace'],m['key']):m for m in s['metafields']['nodes']}
SABLON=s['descriptionHtml']

def boyut(a,b):
    p=lambda ad,deger:{"type":"paragraph","children":[{"type":"text","value":ad+": ","bold":True},{"type":"text","value":deger}]}
    return json.dumps({"type":"root","children":[p(*a),p(*b)]},ensure_ascii=False,separators=(',',':'))

SETLER=[
 dict(ad='Rose Pink + Prizma', handle='rose-pink-prizma-couple-zaman-kapsulu', fiyat='3799.00', sku='ROSEPINK-PRIZMA-SET',
      boyut=boyut(('Rose Pink','Zincir uzunluğu 40+5 cm (ayarlanabilir)'),('Prizma','21 cm')),
      olcu=('<div>✔ Ölçüler</div>\n<div>Rose Pink kolye 40+5 cm ayarlanabilir ölçüde gönderilir. Prizma bileklik 21 cm\'dir; fasetli çubuk halkalı 316L cerrahi çelik zincirlidir, uzatma zinciri yoktur. Takması kolaydır, gün boyu konfor sağlar.</div>')),
 dict(ad='Gold + Nova', handle='gold-nova-couple-zaman-kapsulu', fiyat='3799.00', sku='GOLD-NOVA-SET',
      boyut=boyut(('Gold','Zincir uzunluğu 40+5 cm (ayarlanabilir)'),('Nova','17+5 cm (ayarlanabilir)')),
      olcu=('<div>✔ Ayarlanabilir tasarım</div>\n<div>Gold kolye 40+5 cm, Nova bileklik 17+5 cm ayarlanabilir ölçüde gönderilir. Takması kolaydır, gün boyu konfor sağlar.</div>')),
]
kayit=[]
for st in SETLER:
    ad=st['ad']; baslik=ad+' Couple Zaman Kapsülü'
    degis=[
     ('<div>Prizma + Chloe Couple Zaman Kapsülü Bileklik Seti</div>', f'<div>{baslik} Kolye ve Bileklik Seti</div>'),
     ('<div>Prizma + Chloe, çiftler için tasarlanmış özel bir zaman kapsülü bileklik setidir.</div>', f'<div>{ad}, çiftler için tasarlanmış özel bir zaman kapsülü kolye ve bileklik setidir.</div>'),
     ('<div>İki bileklik bir araya geldiğinde', '<div>Kolye ve bileklik bir araya geldiğinde'),
     ('<div>✔ Ayarlanabilir tasarım — her bileğe mükemmel uyum</div>\n<div>Kadın–erkek fark etmeksizin tüm bilek ölçülerine rahatça uyacak şekilde tasarlanmıştır. Takması kolaydır, gün boyu konfor sağlar.</div>', st['olcu']),
     ('<div>Bilekliklerdeki çip tamamen su geçirmezdir. Duşta, yağmurda, günlük aktivitelerde sorun yaşamadan kullanabilirsiniz.</div>', '<div>Bileklikteki çip tamamen su geçirmezdir. Duşta, yağmurda, günlük aktivitelerde sorun yaşamadan kullanabilirsiniz. Kolyedeki çipin suya dayanıklılığı: [BELİRLENECEK]</div>'),
     ('<div><span> • İkiniz de bilekliğinizi takıyorsunuz.</span></div>', '<div><span> • Biriniz kolyesini, diğeriniz bilekliğini takıyor.</span></div>'),
     ('<div><span> • Buluştuğunuzda iki bilekliği okutuyorsunuz ve kapsül açılıyor.</span></div>', '<div><span> • Buluştuğunuzda kolye ile bilekliği okutuyorsunuz ve kapsül açılıyor.</span></div>'),
     ('<div>Prizma + Chloe, sadece bir aksesuar değil;', f'<div>{ad}, sadece bir aksesuar değil;'),
    ]
    h=SABLON
    for eski,yeni in degis:
        assert h.count(eski)==1,(ad,eski)
        h=h.replace(eski,yeni)
    assert 'Prizma + Chloe' not in h and 'Chloe' not in h
    girdi={"input":{
      "title":baslik,"handle":st['handle'],"status":"DRAFT","templateSuffix":"zaman-kapsulu-couple","productType":"","vendor":"Text To Next","tags":[],
      "category":s['category']['id'],"descriptionHtml":h,
      "seo":{"title":baslik+" | Text To Next","description":mf[('global','description_tag')]['value']},
      "productOptions":[{"name":"Title","values":[{"name":"Default Title"}]}],
      "variants":[{"optionValues":[{"optionName":"Title","name":"Default Title"}],"price":st['fiyat'],"compareAtPrice":None,"sku":st['sku'],"taxable":False,"inventoryPolicy":"CONTINUE",
                   "inventoryItem":{"tracked":True,"requiresShipping":True,"measurement":{"weight":{"value":0,"unit":"KILOGRAMS"}}}}],
      "metafields":[
        {"namespace":"custom","key":"card_title","type":"single_line_text_field","value":ad},
        {"namespace":"custom","key":"boyutlar","type":"rich_text_field","value":st['boyut']},
        dict((k,mf[('delivery','category_setting')][k]) for k in ('namespace','key','type','value')),
        dict((k,mf[('shopify--discovery--product_recommendation','complementary_products')][k]) for k in ('namespace','key','type','value')),
        dict((k,mf[('shopify--discovery--product_recommendation','related_products_display')][k]) for k in ('namespace','key','type','value')),
      ]}}
    json.dump(girdi,open('set-'+st['handle']+'.json','w'),ensure_ascii=False,indent=1)
    kayit.append({'set':baslik,'degisiklikler':degis})
    print(baslik, len(h), 'BELİRLENECEK' in h)
json.dump(kayit,open('aciklama-degisiklikleri.json','w'),ensure_ascii=False,indent=1)
