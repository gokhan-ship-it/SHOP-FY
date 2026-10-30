#!/usr/bin/env bash
# Üç MP4 + iki PNG'yi out/ klasörüne üretir.
# H.264 · yuv420p · ses izi yok · bt709 · faststart (Remotion MP4'lerde moov'u başa alır).
# CRF değerleri boyut hedeflerine göre seçildi: Klip1 ≤ 250 KB, Klip2 ≤ 400 KB, Klip3 ≤ 300 KB.
set -euo pipefail
cd "$(dirname "$0")/.."

CRF1="${CRF1:-13}"
CRF2="${CRF2:-16}"
CRF3="${CRF3:-16}"

ORTAK=(--codec=h264 --pixel-format=yuv420p --color-space=bt709 --muted --image-format=png --x264-preset=veryslow --log=warn)

npx remotion render Klip1Bekleme out/jfclub-1-bekleme.mp4 "${ORTAK[@]}" --crf="$CRF1"
npx remotion render Klip2Acilis out/jfclub-2-acilis.mp4 "${ORTAK[@]}" --crf="$CRF2"
npx remotion render Klip3Acik out/jfclub-3-acik.mp4 "${ORTAK[@]}" --crf="$CRF3"

npx remotion still Klip1Bekleme out/jfclub-kapali.png --frame=0 --image-format=png --log=warn
npx remotion still Klip3Acik out/jfclub-acik.png --frame=0 --image-format=png --log=warn

ls -l out/*.mp4 out/*.png
