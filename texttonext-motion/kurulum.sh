#!/usr/bin/env bash
# texttonext-motion — tek komutla kurulum (macOS / Linux).
# Node.js yoksa kurar, ardından proje paketlerini yükler.
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı, kuruluyor..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  nvm install 22
fi
npm install
echo "Kurulum tamam. Önizleme için: npm run dev"
