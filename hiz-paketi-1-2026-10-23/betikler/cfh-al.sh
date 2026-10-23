#!/bin/bash
# Kullanim: cfh-al.sh <klasor>  -> 7 sayfanin HTML'ini 2 kez indirir (cerezsiz, ayni tarayici kimligi), content_for_header bolumunu ayirir.
# Yalnizca HTML indirilir; sayfa calistirilmaz, takip istegi olusmaz.
K="$1"; mkdir -p "$K"
UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
while read ad yol; do
  for n in 1 2; do
    curl -sS -A "$UA" -H 'Accept-Language: tr-TR,tr;q=0.9' --compressed -o "$K/$ad-$n.html" "https://texttonext.com$yol"
    python3 -I -c "
import sys,re
s=open(sys.argv[1],encoding='utf-8').read()
a=s.find('content_for_header.start'); b=s.find('content_for_header.end')
a=s.rfind('<script',0,a); b=s.find('</script>',b)+len('</script>')
open(sys.argv[2],'w',encoding='utf-8').write(s[a:b] if a>=0 and b>a else '')
print(sys.argv[2], len(s[a:b]) if b>a else 'BULUNAMADI')
" "$K/$ad-$n.html" "$K/$ad-$n.cfh"
    sleep 2
  done
done <<'L'
anasayfa /
couple-landing /pages/couple-daha-fazla-bilgi-al
kunye /products/zaman-kapsulu-kunye
astor-chloe-couple /products/luna-aurora-couple-zaman-kapsulu-kopya
noir /products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya
kral-zincir /products/zaman-kapsulu-bileklik-kral
couple-urunler /collections/couple-urunler
L
