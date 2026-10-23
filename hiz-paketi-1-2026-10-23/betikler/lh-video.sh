#!/bin/bash
# Kullanim: lh-video.sh <etiket> <tema_id>
# Lighthouse varsayilan mobil (tam sayfa goruntusu dahil, cunku PSI'da da acik), durulana kadar bekleme; 7 sayfa x 1.
# Takip istekleri engelli. JSON'daki tam sayfa goruntusu kaydedilmeden once silinir.
cd "$(dirname "$0")"
ET=$1; TID=$2
export CHROME_PATH=/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome
LH=../hiz/lh/node_modules/.bin/lighthouse
mkdir -p "lhv-$ET"
ENGEL=""; while read -r p; do [ -n "$p" ] && ENGEL="$ENGEL --blocked-url-patterns=$p"; done < engel.txt
SAYFALAR="anasayfa|https://texttonext.com/
couple-landing|https://texttonext.com/pages/couple-daha-fazla-bilgi-al
kunye|https://texttonext.com/products/zaman-kapsulu-kunye
astor-chloe-couple|https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya
noir|https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya
kral-zincir|https://texttonext.com/products/zaman-kapsulu-bileklik-kral
couple-urunler|https://texttonext.com/collections/couple-urunler"
while IFS='|' read -r ad url; do
  $LH "$url?preview_theme_id=$TID" --config-path=./lh-durul.config.js --output=json --output-path="lhv-$ET/$ad.json" \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet $ENGEL || echo "HATA $ad"
  python3 -I - "lhv-$ET/$ad.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
d.get('fullPageScreenshot') and d.pop('fullPageScreenshot')
for k in ('screenshot-thumbnails','final-screenshot'):
    d['audits'].pop(k,None)
json.dump(d,open(p,'w'))
it=d['audits']['network-requests']['details']['items']
v=[i for i in it if '.mp4' in i['url']]
print(sys.argv[1], 'video govde MB', round(sum(i.get('resourceSize',0) for i in v)/1048576,2), 'aktarim MB', round(sum(i.get('transferSize',0) for i in v)/1048576,2), 'istek', len(v))
PY
done <<< "$SAYFALAR"
