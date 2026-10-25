// ─────────────────────────────────────────────────────────────
//  SES SENKRONU
//  assets/ses içindeki her MP3'ü Whisper ile yazıya döker ve her
//  kelimenin zamanını assets/transkript/<dosya-adı>.json dosyasına yazar.
//  Ses dosyası değişmediyse (aynı içerik) tekrar çalıştırmaz.
//  Kullanım:  node scripts/senkron.mjs           (bir kez)
//             node scripts/senkron.mjs --izle    (değişiklikleri izle)
// ─────────────────────────────────────────────────────────────
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SES_KLASORU = path.join(KOK, "assets", "ses");
const TRANSKRIPT_KLASORU = path.join(KOK, "assets", "transkript");
const WHISPER_KLASORU = path.join(KOK, "whisper.cpp");
const WHISPER_SURUM = "1.5.5";
// Türkçe için iyi bir denge: "small". Daha isabetli ama yavaş: "medium".
const MODEL = process.env.WHISPER_MODEL || "small";

const mp3leriBul = (klasor) =>
  fs.existsSync(klasor)
    ? fs.readdirSync(klasor, { withFileTypes: true }).flatMap((g) => {
        const tam = path.join(klasor, g.name);
        if (g.isDirectory()) return mp3leriBul(tam);
        return /\.mp3$/i.test(g.name) ? [tam] : [];
      })
    : [];

const ozet = (dosya) => createHash("sha1").update(fs.readFileSync(dosya)).digest("hex");

const transkriptYolu = (mp3) =>
  path.join(TRANSKRIPT_KLASORU, path.basename(mp3).replace(/\.mp3$/i, ".json"));

// Remotion'un kendi ffmpeg'i kullanılır, ayrıca ffmpeg kurmaya gerek yok.
const ffmpeg = (args) => {
  const windows = process.platform === "win32";
  const r = spawnSync(windows ? "npx.cmd" : "npx", ["remotion", "ffmpeg", ...args], {
    cwd: KOK,
    stdio: "pipe",
    shell: windows,
  });
  if (r.status !== 0) throw new Error(`ffmpeg hatası:\n${r.stderr}`);
  return String(r.stderr);
};

// Sesteki gerçek sessiz aralıklar (kelime sınırlarını keskinleştirmek ve
// istenen duraklamaları sessiz yere eklemek için kullanılır)
const sessizlikleriBul = (wav) => {
  const cikti = ffmpeg(["-i", wav, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"]);
  const araliklar = [];
  let bas = null;
  for (const satir of cikti.split("\n")) {
    const b = satir.match(/silence_start: ([\d.]+)/);
    const s = satir.match(/silence_end: ([\d.]+)/);
    if (b) bas = +b[1];
    if (s && bas !== null) {
      araliklar.push({ baslangic: +bas.toFixed(3), bitis: +(+s[1]).toFixed(3) });
      bas = null;
    }
  }
  return araliklar;
};

// 16 kHz mono 16-bit WAV dosyasının süresi (saniye)
const wavSuresi = (wav) => {
  const b = fs.readFileSync(wav);
  let i = 12;
  while (i < b.length - 8) {
    const ad = b.toString("ascii", i, i + 4);
    const boy = b.readUInt32LE(i + 4);
    if (ad === "data") return boy / 2 / 16000;
    i += 8 + boy;
  }
  throw new Error("WAV verisi okunamadı");
};

let whisperHazir = false;
const whisperHazirla = async () => {
  if (whisperHazir) return;
  console.log("Whisper hazırlanıyor (ilk seferde birkaç dakika sürebilir)...");
  await installWhisperCpp({ to: WHISPER_KLASORU, version: WHISPER_SURUM, printOutput: false });
  await downloadWhisperModel({ model: MODEL, folder: WHISPER_KLASORU, printOutput: false });
  whisperHazir = true;
};

const yaziyaDok = async (mp3) => {
  const hedef = transkriptYolu(mp3);
  const hash = ozet(mp3);
  if (fs.existsSync(hedef)) {
    const eski = JSON.parse(fs.readFileSync(hedef, "utf8"));
    if (eski.hash === hash) return false;
  }
  await whisperHazirla();
  console.log(`Yazıya dökülüyor: ${path.relative(KOK, mp3)}`);
  const wav = path.join(WHISPER_KLASORU, "gecici-16khz.wav");
  ffmpeg(["-y", "-i", mp3, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", wav]);
  const sonuc = await transcribe({
    inputPath: wav,
    whisperPath: WHISPER_KLASORU,
    whisperCppVersion: WHISPER_SURUM,
    model: MODEL,
    modelFolder: WHISPER_KLASORU,
    tokenLevelTimestamps: true,
    language: "tr",
    splitOnWord: true,
    printOutput: false,
  });
  const { captions } = toCaptions({ whisperCppOutput: sonuc });
  const kelimeler = captions
    .map((c) => ({
      metin: c.text.trim(),
      baslangic: +(c.startMs / 1000).toFixed(3),
      bitis: +(c.endMs / 1000).toFixed(3),
    }))
    .filter((k) => k.metin && !/^\[.*\]$/.test(k.metin));
  const sure = +wavSuresi(wav).toFixed(3);
  const sessizlikler = sessizlikleriBul(wav);
  fs.rmSync(wav, { force: true });
  fs.mkdirSync(TRANSKRIPT_KLASORU, { recursive: true });
  fs.writeFileSync(
    hedef,
    JSON.stringify(
      { dosya: path.relative(SES_KLASORU, mp3).split(path.sep).join("/"), hash, model: MODEL, sure, sessizlikler, kelimeler },
      null,
      1,
    ) + "\n",
  );
  console.log(`  ${kelimeler.length} kelime, ${sure} sn → ${path.relative(KOK, hedef)}`);
  return true;
};

const hepsiniIsle = async () => {
  for (const mp3 of mp3leriBul(SES_KLASORU)) {
    try {
      await yaziyaDok(mp3);
    } catch (e) {
      console.error(`"${path.basename(mp3)}" yazıya dökülemedi:`, e.message);
    }
  }
};

await hepsiniIsle();

if (process.argv.includes("--izle")) {
  console.log("assets/ses klasörü izleniyor; yeni veya değişen MP3'ler otomatik işlenecek.");
  let zamanlayici = null;
  let calisiyor = Promise.resolve();
  fs.watch(SES_KLASORU, { recursive: true }, () => {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => {
      calisiyor = calisiyor.then(hepsiniIsle);
    }, 1500);
  });
}
