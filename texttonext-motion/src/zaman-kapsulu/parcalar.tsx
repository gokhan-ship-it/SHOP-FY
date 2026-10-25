// Sahne parçaları: cümle, ikonlar, tarih + kilit, geri sayım, soru halkası,
// kapanış kartı ve yer tutucu kolye.
import React from "react";
import { AbsoluteFill, Img, interpolate } from "remotion";
import { fontFamily } from "../tema";
import type { ReklamAyarlari, Sahne } from "./tipler";
import type { SahneZamani } from "./zamanlama";
import { sinirla, yumusakCikis, yumusakGecis } from "./urun";

const sabit = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Kelimenin aşağıdan yukarı kayarak ve bulanıklıktan netleşerek belirmesi
export const belirme = (t: number, bas: number, sure = 0.6) => {
  const o = yumusakCikis(sinirla((t - bas) / sure));
  return {
    opacity: o,
    transform: `translateY(${(1 - o) * 24}px)`,
    filter: o < 1 ? `blur(${(1 - o) * 10}px)` : undefined,
  } as React.CSSProperties;
};

export const sahneCikisi = (t: number, z: SahneZamani) =>
  interpolate(t, [z.bitis - 0.35, z.bitis], [1, 0], { ...sabit, easing: yumusakGecis });

const normal = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]/gu, "");
export const kelimeZamani = (z: SahneZamani, onEk: string, yedek: number) =>
  z.kelimeler.find((k) => normal(k.metin).startsWith(normal(onEk)))?.baslangic ?? yedek;

// ── Cümle ────────────────────────────────────────────────────
export const Cumle: React.FC<{ t: number; s: Sahne; z: SahneZamani; a: ReklamAyarlari }> = ({
  t,
  s,
  z,
  a,
}) => {
  if (t < z.baslangic || t > z.bitis) return null;
  const vurgulu = z.kelimeler.some((k) => k.kalin);
  const tekSeferde = s.giris === "tek-seferde";
  const orta = s.konum === "orta";
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: orta ? "center" : "flex-start",
        paddingTop: orta ? a.guvenliAlan.ust : a.guvenliAlan.ust + 50,
        paddingBottom: a.guvenliAlan.alt,
        paddingLeft: a.guvenliAlan.yan,
        paddingRight: a.guvenliAlan.yan,
        opacity: sahneCikisi(t, z),
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: s.buyukYazi ? a.yazi.buyukBoyut : a.yazi.boyut,
          letterSpacing: a.yazi.harfAraligi,
          lineHeight: 1.12,
          color: a.renkler.anaMetin,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {z.kelimeler.map((k, i) => {
          const bas = tekSeferde
            ? Math.max(z.baslangic, z.konusmaBaslangic - 0.05)
            : Math.max(z.baslangic, k.baslangic - 0.08);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontWeight: vurgulu ? (k.kalin ? 700 : 400) : a.yazi.kalinlik,
                marginRight: i < z.kelimeler.length - 1 ? "0.24em" : 0,
                ...belirme(t, bas, tekSeferde ? 0.8 : 0.6),
              }}
            >
              {k.metin}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── İnce çizgili ikonlar ─────────────────────────────────────
type IkonAdi = "fotograf" | "video" | "mesaj";
export const Ikon: React.FC<{ ad: IkonAdi; renk: string; boyut: number }> = ({ ad, renk, boyut }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 64 64" fill="none" stroke={renk} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {ad === "fotograf" && (
      <>
        <rect x="8" y="14" width="48" height="36" rx="6" />
        <circle cx="22" cy="26" r="4" />
        <polyline points="12 46 26 33 36 41 44 34 52 42" />
      </>
    )}
    {ad === "video" && (
      <>
        <rect x="8" y="16" width="48" height="32" rx="6" />
        <path d="M28 25 L40 32 L28 39 Z" />
      </>
    )}
    {ad === "mesaj" && (
      <>
        <path d="M14 14 H50 A6 6 0 0 1 56 20 V40 A6 6 0 0 1 50 46 H30 L20 54 V46 H14 A6 6 0 0 1 8 40 V20 A6 6 0 0 1 14 14 Z" />
        <path d="M18 26 H46 M18 34 H38" />
      </>
    )}
  </svg>
);

export const Ikonlar: React.FC<{
  t: number;
  z: SahneZamani;
  a: ReklamAyarlari;
  hedef: { x: number; y: number };
}> = ({ t, z, a, hedef }) => {
  if (t < z.baslangic || t > z.bitis) return null;
  const adlar: IkonAdi[] = ["fotograf", "video", "mesaj"];
  const akisBas = Math.max(z.konusmaBaslangic, Math.min(z.konusmaBitis, z.bitis - 1.2));
  return (
    <AbsoluteFill>
      {adlar.map((ad, i) => {
        const gorunme = kelimeZamani(z, a.ikonKelimeleri[ad], z.konusmaBaslangic + i * 0.5) - 0.08;
        const akis = yumusakGecis(sinirla((t - akisBas - i * 0.12) / 0.9));
        const x0 = 540 + (i - 1) * 220;
        const y0 = 640;
        const x = x0 + (hedef.x - x0) * akis;
        const y = y0 + (hedef.y - y0) * akis;
        const olcek = 1 - 0.82 * akis;
        const kaybolma = 1 - sinirla((akis - 0.45) / 0.55);
        return (
          <div
            key={ad}
            style={{
              position: "absolute",
              left: x - 55,
              top: y - 55,
              transform: `scale(${olcek})`,
              opacity: kaybolma,
            }}
          >
            <div style={belirme(t, gorunme)}>
              <Ikon ad={ad} renk={a.renkler.cizgi} boyut={110} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Tarih ve kilit ───────────────────────────────────────────
export const TarihKilit: React.FC<{ t: number; z: SahneZamani; a: ReklamAyarlari }> = ({ t, z, a }) => {
  if (t < z.baslangic || t > z.bitis) return null;
  const gorunme = kelimeZamani(z, "tarih", z.konusmaBaslangic + 0.4) - 0.08;
  const kilitlenme = Math.min(kelimeZamani(z, "kilit", gorunme + 0.6) + 0.25, z.bitis - 0.9);
  const kapanma = yumusakCikis(sinirla((t - kilitlenme) / 0.7));
  return (
    <AbsoluteFill style={{ opacity: sahneCikisi(t, z) }}>
      <div
        style={{
          position: "absolute",
          left: 580,
          width: 380,
          top: 830,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div style={belirme(t, gorunme)}>
          <svg width={104} height={104} viewBox="0 0 64 64" fill="none" stroke={a.renkler.cizgi} strokeWidth={1.6} strokeLinecap="round">
            <path d="M22 30 V21 A10 10 0 0 1 42 21 V30" transform={`translate(0 ${(1 - kapanma) * -9})`} />
            <rect x="15" y="30" width="34" height="26" rx="6" />
            <circle cx="32" cy="41" r="2.2" />
            <path d="M32 43 V48" />
          </svg>
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 60,
            fontWeight: 700,
            letterSpacing: a.yazi.harfAraligi,
            lineHeight: 1.1,
            color: a.renkler.anaMetin,
            textAlign: "center",
            ...belirme(t, gorunme + 0.12, 0.7),
          }}
        >
          {a.tarih}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Geri sayım ───────────────────────────────────────────────
const geriSay = (a: ReklamAyarlari, gecen: number) => {
  const g = a.geriSayim;
  const toplam = Math.max(0, ((g.gun * 24 + g.saat) * 60 + g.dakika) * 60 + g.saniye - gecen);
  return [
    Math.floor(toplam / 86400),
    Math.floor((toplam % 86400) / 3600),
    Math.floor((toplam % 3600) / 60),
    toplam % 60,
  ];
};

export const GeriSayim: React.FC<{ t: number; z: SahneZamani; a: ReklamAyarlari }> = ({ t, z, a }) => {
  if (t < z.baslangic || t > z.bitis) return null;
  const bas = z.baslangic + 0.25;
  const gecen = Math.max(0, Math.floor(t - bas));
  const kesir = t - bas - gecen;
  const simdi = geriSay(a, gecen);
  const once = geriSay(a, gecen - 1);
  const gecis = gecen > 0 ? yumusakCikis(sinirla(kesir / 0.45)) : 1;
  return (
    <AbsoluteFill style={{ opacity: sahneCikisi(t, z) }}>
      <div
        style={{
          position: "absolute",
          top: 880,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 24,
          fontFamily,
        }}
      >
        {simdi.map((deger, i) => {
          const yaz = (d: number) => (i === 0 ? String(d) : String(d).padStart(2, "0"));
          const degisti = once[i] !== deger && gecis < 1;
          return (
            <div key={i} style={{ width: 200, textAlign: "center", ...belirme(t, bas - 0.1 + i * 0.08, 0.7) }}>
              <div
                style={{
                  position: "relative",
                  height: 120,
                  fontSize: 100,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: "120px",
                  color: a.renkler.anaMetin,
                  fontVariantNumeric: "tabular-nums",
                  overflow: "hidden",
                }}
              >
                {degisti && (
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - gecis, transform: `translateY(${-gecis * 26}px)` }}>
                    {yaz(once[i])}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: degisti ? gecis : 1,
                    transform: degisti ? `translateY(${(1 - gecis) * 26}px)` : undefined,
                  }}
                >
                  {yaz(deger)}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 500, color: a.renkler.ikincilMetin }}>
                {a.geriSayimEtiketleri[i]}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Kapsülün üzerinde nefes alan ince halka ──────────────────
export const SoruHalkasi: React.FC<{
  t: number;
  z: SahneZamani;
  a: ReklamAyarlari;
  merkez: { x: number; y: number };
  olcek: number;
}> = ({ t, z, a, merkez, olcek }) => {
  if (t < z.baslangic || t > z.bitis) return null;
  const gorunme = sinirla((t - z.baslangic - 0.6) / 0.9);
  const nefes = 0.5 - 0.5 * Math.cos(((t - z.baslangic) / 2.6) * Math.PI * 2);
  const cap = 230 * olcek * (1 + 0.05 * nefes);
  return (
    <div
      style={{
        position: "absolute",
        left: merkez.x - cap / 2,
        top: merkez.y - cap / 2,
        width: cap,
        height: cap,
        borderRadius: "50%",
        border: `1.5px solid ${a.renkler.cizgi}`,
        filter: "blur(1.2px)",
        opacity: gorunme * (0.12 + 0.26 * nefes) * sahneCikisi(t, z),
      }}
    />
  );
};

// ── Kapanış kartı ────────────────────────────────────────────
export const Kapanis: React.FC<{ t: number; bas: number; a: ReklamAyarlari; logo: string | null }> = ({
  t,
  bas,
  a,
  logo,
}) => {
  if (t < bas) return null;
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <div
        style={{
          position: "absolute",
          top: 1215,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={belirme(t, bas + 0.25, 0.8)}>
          {logo ? (
            <Img src={logo} style={{ maxWidth: 440, maxHeight: 96, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: "-0.03em", color: a.renkler.anaMetin }}>
              {a.kapanis.logoMetni}
            </div>
          )}
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, color: a.renkler.ikincilMetin, ...belirme(t, bas + 0.5, 0.8) }}>
          {a.kapanis.site}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: a.guvenliAlan.alt + 20,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: "0.04em",
          color: a.renkler.ikincilMetin,
          ...belirme(t, bas + 0.75, 0.8),
        }}
      >
        {a.kapanis.altSatir}
      </div>
    </AbsoluteFill>
  );
};

// ── Ürün fotoğrafı yokken geçici kolye çizimi ────────────────
export const YerTutucuKolye: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 780 900">
    <defs>
      <linearGradient id="kapsulGumus" x1="0" x2="1">
        <stop offset="0" stopColor="#DCDCE0" />
        <stop offset="0.45" stopColor="#F6F6F8" />
        <stop offset="1" stopColor="#C9C9CE" />
      </linearGradient>
    </defs>
    <path d="M150 20 C 170 330, 300 560, 382 640" fill="none" stroke="#BDBDC3" strokeWidth={3} strokeLinecap="round" />
    <path d="M630 20 C 610 330, 480 560, 398 640" fill="none" stroke="#BDBDC3" strokeWidth={3} strokeLinecap="round" />
    <circle cx="390" cy="648" r="13" fill="none" stroke="#BDBDC3" strokeWidth={3} />
    <rect x="352" y="664" width="76" height="148" rx="38" fill="url(#kapsulGumus)" stroke="#C3C3C8" strokeWidth={1.5} />
    <path d="M354 700 H426" stroke="#C3C3C8" strokeWidth={1.5} />
  </svg>
);
