#!/usr/bin/env node
// Masaüstüne "Fatura Paneli" simgesi koyar (bir kez çalıştırmak yeterli).
// Simgeye çift tıklayınca panel Terminal açılmadan başlar ve tarayıcıda açılır.
//
// Kullanım (fatura klasöründe):
//   node kurulum.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const KLASOR = __dirname;
const NODE = process.execPath; // simge, kurulumu yapan Node'u kullanır
const MASAUSTU = path.join(os.homedir(), 'Desktop');
const AD = 'Fatura Paneli';

function kontrol() {
  const sorunlar = [];
  if (Number(process.versions.node.split('.')[0]) < 18) sorunlar.push(`Node.js sürümü eski (${process.versions.node}). nodejs.org'dan LTS sürümünü kurun.`);
  if (!fs.existsSync(path.join(KLASOR, '.env'))) sorunlar.push('.env dosyası bu klasörde yok. Doğru klasörde misiniz?');
  if (!fs.existsSync(path.join(KLASOR, 'panel.js'))) sorunlar.push('panel.js bu klasörde yok.');
  if (!fs.existsSync(MASAUSTU)) sorunlar.push(`Masaüstü klasörü bulunamadı: ${MASAUSTU}`);
  return sorunlar;
}

// AppleScript içinde güvenli metin: "..." içinde \ ve " kaçırılır.
const asMetin = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

function macUygulamasi() {
  const hedef = path.join(MASAUSTU, `${AD}.app`);
  const betik = [
    `do shell script "cd " & quoted form of ${asMetin(KLASOR)} & " && " & quoted form of ${asMetin(NODE)} & " panel.js >> panel.log 2>&1 &"`,
  ].join('\n');
  if (fs.existsSync(hedef)) fs.rmSync(hedef, { recursive: true, force: true });
  execFileSync('osacompile', ['-o', hedef, '-e', betik]);
  return hedef;
}

// Yedek: çift tıklanınca Terminal penceresinde paneli başlatan dosya.
function commandDosyasi() {
  const hedef = path.join(MASAUSTU, `${AD}.command`);
  const icerik = `#!/bin/bash\ncd ${JSON.stringify(KLASOR)} && ${JSON.stringify(NODE)} panel.js\n`;
  fs.writeFileSync(hedef, icerik, { mode: 0o755 });
  return hedef;
}

function main() {
  const sorunlar = kontrol();
  if (sorunlar.length) {
    console.log('\nKurulum yapılamadı:\n');
    for (const s of sorunlar) console.log('  • ' + s);
    console.log('');
    process.exit(1);
  }
  if (process.platform !== 'darwin') {
    console.log(`Bu kurulum Mac için. Paneli şu komutla açabilirsiniz:\n  ${NODE} ${path.join(KLASOR, 'panel.js')}`);
    return;
  }
  try {
    const app = macUygulamasi();
    console.log(`\nTamam! Masaüstüne "${AD}" simgesi eklendi:\n  ${app}\n`);
    console.log('Simgeye çift tıklayın; panel birkaç saniye içinde tarayıcıda açılır.');
    console.log('İsterseniz simgeyi Dock\'a sürükleyip oradan da açabilirsiniz.\n');
  } catch (e) {
    const yedek = commandDosyasi();
    console.log(`\nUygulama simgesi oluşturulamadı (${e.message.split('\n')[0]}).`);
    console.log(`Bunun yerine Masaüstüne "${path.basename(yedek)}" eklendi. Çift tıklayınca panel açılır`);
    console.log('(küçük bir Terminal penceresi de açılır, panel açıkken onu kapatmayın).\n');
  }
}

main();
