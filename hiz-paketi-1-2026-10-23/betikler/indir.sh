#!/bin/bash
# Orijinalleri Shopify CDN'den indirir (salt okuma).
cd "$(dirname "$0")"
tail -n +2 liste.tsv | while IFS=$'\t' read -r kod ad bolum tur; do
  [ -s "orj/$ad.mp4" ] && continue
  curl -sS -f -o "orj/$ad.mp4" "https://cdn.shopify.com/videos/c/o/v/$kod.mp4" || echo "HATA $ad"
  echo "$ad $(stat -c %s orj/$ad.mp4)"
done
