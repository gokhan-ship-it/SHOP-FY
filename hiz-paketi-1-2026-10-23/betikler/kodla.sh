#!/bin/bash
# Telefon (ve hero icin masaustu) surumlerini uretir. Hepsi H.264 + faststart.
# hero: hafif ~1 MB ve dengeli ~1.8 MB (1706x720, ses yok, 2 gecis), masaustu 2560x1080 ~3 Mbps (2 gecis, ses yok)
# digerleri: kisa kenar 720, CRF 23 + tavan bitrate, ses varsa AAC olarak korunur.
cd "$(dirname "$0")"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart"
iki_gecis() { # girdi cikis olcek bitrate seviye
  ffmpeg -nostdin -y -v error -i "$1" -vf "scale=$3:flags=lanczos" $X264 -level:v $5 -b:v $4 -pass 1 -passlogfile "tmp/$(basename $2)" -an -f mp4 /dev/null &&
  ffmpeg -nostdin -y -v error -i "$1" -vf "scale=$3:flags=lanczos" $X264 -level:v $5 -b:v $4 -pass 2 -passlogfile "tmp/$(basename $2)" -an "$2"
}
mkdir -p tmp
tail -n +2 liste.tsv | while IFS=$'\t' read -r kod ad bolum tur; do
  g="orj/$ad.mp4"
  if [ "$tur" = hero ]; then
    [ -s yeni/hiz-hero-masaustu-1080p-3mbps.mp4 ] && continue
    iki_gecis "$g" "yeni/hiz-hero-telefon-hafif-720p.mp4"   1706:720  725k  4.0
    iki_gecis "$g" "yeni/hiz-hero-telefon-dengeli-720p.mp4" 1706:720  1300k 4.0
    iki_gecis "$g" "yeni/hiz-hero-masaustu-1080p-3mbps.mp4" 2560:1080 2950k 5.0
    continue
  fi
  if [ "$tur" = kare ]; then olcek="720:720"; else olcek="720:-2"; fi
  ses=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$g" | head -1)
  if [ -n "$ses" ]; then SES="-c:a aac -b:a 128k -ac 2"; else SES="-an"; fi
  c="yeni/hiz-$ad-telefon-720.mp4"
  ffmpeg -nostdin -y -v error -i "$g" -vf "scale=$olcek:flags=lanczos" $X264 -level:v 4.0 -crf 23 -maxrate 2000k -bufsize 4000k $SES "$c"
  # Kaynak zaten 720 genislikte ve daha kucukse: yeniden kodlamak yerine kaynagi faststart ile yeniden paketle.
  gw=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$g" | head -1)
  if [ "$gw" -le 720 ] && [ $(stat -c %s "$g") -lt $(stat -c %s "$c") ]; then
    ffmpeg -nostdin -y -v error -i "$g" -c copy -movflags +faststart "$c"
    echo "$ad: kaynak daha kucuk, yeniden paketlendi"
  fi
done
rm -rf tmp
