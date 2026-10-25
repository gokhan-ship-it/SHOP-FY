#!/bin/bash
# TTN Kâr Paneli — Mac kurulum betiği.
# Kullanım (Terminal): bash ~/Downloads/TTN-Kar-Kurulum/kurulum.command
# Tekrar çalıştırmak güvenlidir: güncelleme yapar; veritabanı, .env ve yedekler korunur.
set -euo pipefail

PAKET="$(cd "$(dirname "$0")" && pwd)"
HEDEF="$HOME/TTN-Kar"
ETIKET="com.texttonext.kar"
PLIST="$HOME/Library/LaunchAgents/$ETIKET.plist"
PORT=4747
NODE_SURUM="22.22.0"
SHA_ARM64="5ed4db0fcf1eaf84d91ad12462631d73bf4576c1377e192d222e48026a902640"
SHA_X64="5ea50c9d6dea3dfa3abb66b2656f7a4e1c8cef23432b558d45fb538c7b5dedce"
UYGULAMA="$HOME/Desktop/TTN Kâr.app"

adim() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
tamam() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
uyari() { printf "  \033[33m!\033[0m %s\n" "$1"; }
hata() { printf "\n\033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

[ "$(uname)" = "Darwin" ] || hata "Bu kurulum yalnızca Mac'te çalışır."
[ -d "$PAKET/uygulama" ] || hata "Paket eksik: 'uygulama' klasörü bulunamadı. Zip dosyasını tamamen açtığınızdan emin olun."

case "$(uname -m)" in
  arm64) MIMARI="arm64"; SHA="$SHA_ARM64" ;;
  x86_64) MIMARI="x64"; SHA="$SHA_X64" ;;
  *) hata "Desteklenmeyen işlemci: $(uname -m)" ;;
esac

echo "TTN Kâr Paneli kuruluyor → $HEDEF"

adim "1/7 Çalışan servis durduruluyor (varsa)"
launchctl bootout "gui/$(id -u)/$ETIKET" 2>/dev/null && tamam "Durduruldu" || tamam "Çalışan servis yok"

adim "2/7 Dosyalar kopyalanıyor"
mkdir -p "$HEDEF" "$HEDEF/data" "$HEDEF/logs" "$HEDEF/yedek"
rsync -a --delete \
  --exclude ".env" --exclude "data/" --exclude "yedek/" --exclude "logs/" --exclude ".runtime/" \
  --exclude "node_modules/" --exclude ".next/" --exclude "seed/" --exclude "trueprofit/" --exclude ".git/" \
  "$PAKET/uygulama/" "$HEDEF/"
for d in seed trueprofit; do
  if [ -d "$PAKET/$d" ]; then rsync -a "$PAKET/$d/" "$HEDEF/$d/"; fi
done
tamam "Program dosyaları ve hazır veriler kopyalandı"

adim "3/7 Node.js hazırlanıyor (yalnızca bu klasöre; sisteme bir şey kurulmaz)"
NODE="$HEDEF/.runtime/node/bin/node"
if [ -x "$NODE" ] && [ "$("$NODE" -v)" = "v$NODE_SURUM" ]; then
  tamam "Node.js v$NODE_SURUM zaten hazır"
else
  TMP="$(mktemp -d)"
  DOSYA="node-v$NODE_SURUM-darwin-$MIMARI.tar.gz"
  curl -fL --progress-bar "https://nodejs.org/dist/v$NODE_SURUM/$DOSYA" -o "$TMP/$DOSYA" || hata "Node.js indirilemedi. İnternet bağlantısını kontrol edin."
  echo "$SHA  $TMP/$DOSYA" | shasum -a 256 -c - >/dev/null || hata "İndirilen Node.js dosyası doğrulanamadı (bozuk ya da değiştirilmiş)."
  rm -rf "$HEDEF/.runtime/node" && mkdir -p "$HEDEF/.runtime"
  tar -xzf "$TMP/$DOSYA" -C "$HEDEF/.runtime"
  mv "$HEDEF/.runtime/node-v$NODE_SURUM-darwin-$MIMARI" "$HEDEF/.runtime/node"
  rm -rf "$TMP"
  tamam "Node.js v$NODE_SURUM indirildi ve doğrulandı"
fi
export PATH="$HEDEF/.runtime/node/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1

adim "4/7 Bağımlılıklar kuruluyor ve panel derleniyor (birkaç dakika sürebilir)"
cd "$HEDEF"
npm ci --no-audit --no-fund --loglevel=error || hata "Bağımlılıklar kurulamadı."
npm run build --silent >"$HEDEF/logs/derleme.log" 2>&1 || { tail -30 "$HEDEF/logs/derleme.log"; hata "Panel derlenemedi. Ayrıntı: $HEDEF/logs/derleme.log"; }
tamam "Panel derlendi"

if [ ! -f "$HEDEF/.env" ]; then
  umask 077
  cat >"$HEDEF/.env" <<EOF
# TTN Kâr Paneli ayarları. Bu dosyayı kimseyle paylaşma; git'e girmez.
SHOPIFY_STORE_DOMAIN=52ae29-e0.myshopify.com
META_ALLOWED_AD_ACCOUNTS=act_426980502817664
EOF
  umask 022
  tamam ".env oluşturuldu (anahtarlar panelin Kurulum ekranından girilecek)"
fi
chmod 600 "$HEDEF/.env"

# Yerel git deposu (Xcode araçları kuruluysa; değilse sessizce atlanır, panel için gerekmez)
if xcode-select -p >/dev/null 2>&1 && command -v git >/dev/null 2>&1; then
  if [ ! -d "$HEDEF/.git" ]; then
    git -C "$HEDEF" init -q && git -C "$HEDEF" config user.name "TTN Kâr" && git -C "$HEDEF" config user.email "kar@localhost"
  fi
  git -C "$HEDEF" add -A >/dev/null 2>&1 && git -C "$HEDEF" commit -qm "Kurulum $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1 || true
  tamam "Yerel git deposu güncellendi (.env ve data/ hariç)"
fi

adim "5/7 Arka plan servisi kuruluyor ($ETIKET)"
mkdir -p "$HOME/Library/LaunchAgents"
cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETIKET</string>
  <key>ProgramArguments</key>
  <array>
    <string>$HEDEF/.runtime/node/bin/node</string>
    <string>$HEDEF/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-H</string><string>127.0.0.1</string>
    <string>-p</string><string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$HEDEF</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>NEXT_TELEMETRY_DISABLED</key><string>1</string>
    <key>TZ</key><string>Europe/Istanbul</string>
    <key>PATH</key><string>$HEDEF/.runtime/node/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$HEDEF/logs/sunucu.log</string>
  <key>StandardErrorPath</key><string>$HEDEF/logs/sunucu-hata.log</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/$ETIKET" 2>/dev/null || true
tamam "Servis kuruldu: oturum açılınca başlar, çökerse yeniden başlar"

adim "6/7 Masaüstü simgesi oluşturuluyor"
rm -rf "$UYGULAMA"
osacompile -o "$UYGULAMA" <<EOF
on run
  set acik to false
  try
    do shell script "curl -fs --max-time 2 http://127.0.0.1:$PORT/api/saglik >/dev/null"
    set acik to true
  end try
  if not acik then
    try
      do shell script "launchctl kickstart gui/\$(id -u)/$ETIKET || launchctl bootstrap gui/\$(id -u) '$PLIST'"
    end try
    repeat 40 times
      try
        do shell script "curl -fs --max-time 2 http://127.0.0.1:$PORT/api/saglik >/dev/null"
        set acik to true
        exit repeat
      end try
      delay 1
    end repeat
  end if
  if acik then
    open location "http://localhost:$PORT"
  else
    display dialog "TTN Kâr Paneli başlatılamadı. Kayıt: ~/TTN-Kar/logs/sunucu-hata.log" buttons {"Tamam"} default button 1 with icon caution
  end if
end run
EOF
if [ -f "$HEDEF/mac/simge.icns" ]; then
  cp "$HEDEF/mac/simge.icns" "$UYGULAMA/Contents/Resources/applet.icns"
  touch "$UYGULAMA"
fi
# Masaüstünde program klasörüne kısayol
if [ ! -e "$HOME/Desktop/TTN-Kar" ]; then ln -s "$HEDEF" "$HOME/Desktop/TTN-Kar"; fi
tamam "Masaüstüne 'TTN Kâr' simgesi ve 'TTN-Kar' klasör kısayolu kondu"

adim "7/7 Panel açılıyor"
for i in $(seq 1 60); do
  if curl -fs --max-time 2 "http://127.0.0.1:$PORT/api/saglik" >/dev/null 2>&1; then break; fi
  sleep 1
done
if curl -fs --max-time 2 "http://127.0.0.1:$PORT/api/saglik" >/dev/null 2>&1; then
  tamam "Panel çalışıyor: http://localhost:$PORT"
  if grep -q "^SHOPIFY_CLIENT_SECRET=" "$HEDEF/.env"; then open "http://localhost:$PORT"; else open "http://localhost:$PORT/kurulum"; fi
else
  uyari "Panel henüz yanıt vermedi. Birkaç saniye sonra masaüstündeki 'TTN Kâr' simgesine tıklayın."
  uyari "Sorun sürerse: $HEDEF/logs/sunucu-hata.log"
fi

cat <<EOF

────────────────────────────────────────────────────────
 Kurulum bitti.
 • Panel:            http://localhost:$PORT
 • Masaüstü simgesi: Masaüstü → "TTN Kâr"
 • Program klasörü:  $HEDEF  (Masaüstünde "TTN-Kar" kısayolu)

 Dock'a eklemek için: Masaüstündeki "TTN Kâr" simgesini
 ekranın altındaki Dock'a sürükleyip bırakın.
────────────────────────────────────────────────────────
EOF
