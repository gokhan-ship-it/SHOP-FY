#!/bin/bash
# TTN Kâr Paneli — servisi ve masaüstü simgesini kaldırır. Veriler (~/TTN-Kar/data, yedekler, .env) SİLİNMEZ.
set -u
ETIKET="com.texttonext.kar"
launchctl bootout "gui/$(id -u)/$ETIKET" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$ETIKET.plist"
rm -rf "$HOME/Desktop/TTN Kâr.app"
[ -L "$HOME/Desktop/TTN-Kar" ] && rm "$HOME/Desktop/TTN-Kar"
echo "Servis ve simge kaldırıldı. Verileriniz ~/TTN-Kar klasöründe duruyor; tamamen silmek isterseniz o klasörü elle silin."
