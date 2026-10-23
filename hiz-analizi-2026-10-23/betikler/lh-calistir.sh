#!/bin/bash
# Lighthouse 13.5.0, yerel Chromium, her sayfa icin mobil ve masaustu, 3'er tur. Yalnizca performans kategorisi.
cd "$(dirname "$0")"
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
LH=./lh/node_modules/.bin/lighthouse
SAYFALAR="anasayfa|https://texttonext.com/
couple-landing|https://texttonext.com/pages/couple-daha-fazla-bilgi-al
kunye|https://texttonext.com/products/zaman-kapsulu-kunye
astor-chloe-couple|https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya
noir|https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya
kral-zincir|https://texttonext.com/products/zaman-kapsulu-bileklik-kral
couple-urunler|https://texttonext.com/collections/couple-urunler"
for tur in 1 2 3; do
  while IFS='|' read -r ad url; do
    for mod in mobil masaustu; do
      ek=""; [ "$mod" = masaustu ] && ek="--preset=desktop"
      $LH "$url" $ek --only-categories=performance --output=json --output-path="lighthouse/$ad-$mod-$tur.json" \
        --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet --max-wait-for-load=60000 \
        || echo "HATA $ad $mod $tur"
      echo "bitti $ad $mod $tur $(date +%T)"
    done
  done <<< "$SAYFALAR"
done
