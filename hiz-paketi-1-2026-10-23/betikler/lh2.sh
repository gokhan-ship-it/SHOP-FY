#!/bin/bash
# Kullanim: lh2.sh <etiket> <tema_id>
# Lighthouse 13.5.0, yalnizca telefon, 7 sayfa x 3 tur, takip istekleri engelli, ekran goruntusu denetimleri kapali.
cd "$(dirname "$0")"
ET=$1; TID=$2
export CHROME_PATH=/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome
LH=../hiz/lh/node_modules/.bin/lighthouse
mkdir -p "lh-$ET"
ENGEL=""; while read -r p; do [ -n "$p" ] && ENGEL="$ENGEL --blocked-url-patterns=$p"; done < engel.txt
SAYFALAR="anasayfa|https://texttonext.com/
couple-landing|https://texttonext.com/pages/couple-daha-fazla-bilgi-al
kunye|https://texttonext.com/products/zaman-kapsulu-kunye
astor-chloe-couple|https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya
noir|https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya
kral-zincir|https://texttonext.com/products/zaman-kapsulu-bileklik-kral
couple-urunler|https://texttonext.com/collections/couple-urunler"
for tur in 1 2 3; do
  while IFS='|' read -r ad url; do
    # Tamamlanmis tur varsa atla (yarida kalan zinciri kaldigi yerden surdurmek icin).
    [ -s "lh-$ET/$ad-mobil-$tur.json" ] && { echo "atlandi $ET $ad $tur (onceden var)"; continue; }
    $LH "$url?preview_theme_id=$TID" --only-categories=performance --output=json --output-path="lh-$ET/$ad-mobil-$tur.json" \
      --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet --max-wait-for-load=60000 \
      --skip-audits=screenshot-thumbnails,final-screenshot --disable-full-page-screenshot $ENGEL \
      || echo "HATA $ad $tur"
    echo "bitti $ET $ad $tur $(date +%T)"
  done <<< "$SAYFALAR"
done
