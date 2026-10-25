import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Inter (değişken ağırlık) — yazı tipi dosyaları projede, internet gerekmez.
// latin-ext dosyası Türkçe karakterleri (ğ ş İ) kapsar; ı ü ö ç latin içinde.
export const fontFamily = "Inter";

loadFont({
  family: fontFamily,
  url: staticFile("fontlar/inter-latin-wght-normal.woff2"),
  weight: "100 900",
  format: "woff2",
  unicodeRange:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
});
loadFont({
  family: fontFamily,
  url: staticFile("fontlar/inter-latin-ext-wght-normal.woff2"),
  weight: "100 900",
  format: "woff2",
  unicodeRange:
    "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
});

export const tema = {
  genislik: 1080,
  yukseklik: 1920,
  fps: 30,
  arkaPlan: "#FFFFFF",
  yaziRengi: "#1D1D1F",
  ikincilYazi: "#6E6E73",
  // Instagram Reels/Story arayüzü için güvenli boşluklar (piksel)
  guvenliUst: 260,
  guvenliAlt: 440,
  guvenliYan: 96,
};
