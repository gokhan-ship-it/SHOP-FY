#!/usr/bin/env bash
# texttonext-motion — tek komutla kurulum (macOS / Linux).
# Node.js yoksa kurar, proje paketlerini ve Whisper'ı (ses senkronu) hazırlar.
set -e
cd "$(dirname "$0")"
if [ "$(uname)" = "Darwin" ] && ! xcode-select -p >/dev/null 2>&1; then
  echo "Apple geliştirici araçları kuruluyor (Whisper için gerekli). Açılan pencerede 'Yükle'ye basın, bitince bu komutu tekrar çalıştırın."
  xcode-select --install
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı, kuruluyor..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  nvm install 22
fi
npm install
npm run senkron
echo "Kurulum tamam. Önizleme için: npm run dev"
