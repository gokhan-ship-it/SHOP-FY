#!/bin/bash
# Mac kurulum paketini (zip) üretir. Ticari veriler (seed/, trueprofit/) depoda olmadığından ayrı klasörden alınır.
# Kullanım: scripts/paketle.sh <seed ve trueprofit klasörlerini içeren veri klasörü> <çıktı.zip>
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
VERI="${1:?veri klasörü gerekli}"
CIKTI="${2:?çıktı zip yolu gerekli}"
TMP="$(mktemp -d)"
P="$TMP/TTN-Kar-Kurulum"
mkdir -p "$P/uygulama"
tar -C "$KOK" \
  --exclude "./.env" --exclude "./data" --exclude "./yedek" --exclude "./logs" --exclude "./.runtime" \
  --exclude "./node_modules" --exclude "./.next" --exclude "./seed" --exclude "./trueprofit" --exclude "*.tsbuildinfo" --exclude "./next-env.d.ts" \
  -cf - . | tar -C "$P/uygulama" -xf -
cp -R "$VERI/seed" "$P/seed"
cp -R "$VERI/trueprofit" "$P/trueprofit"
cp "$KOK/mac/kurulum.command" "$KOK/mac/kaldir.command" "$P/"
cp "$KOK/mac/BENIOKU.txt" "$P/"
chmod +x "$P"/*.command
rm -f "$CIKTI"
if command -v zip >/dev/null 2>&1; then
  (cd "$TMP" && zip -qr -X "$CIKTI" TTN-Kar-Kurulum)
else
  # zip yoksa Python ile (çalıştırılabilir izinleri korunur)
  python3 -I -c '
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(os.path.join(src, "TTN-Kar-Kurulum")):
        dirs.sort()
        for f in sorted(files):
            full = os.path.join(root, f)
            info = zipfile.ZipInfo.from_file(full, os.path.relpath(full, src))
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(full, "rb") as fh:
                z.writestr(info, fh.read())
' "$TMP" "$CIKTI"
fi
rm -rf "$TMP"
echo "Paket hazır: $CIKTI"
