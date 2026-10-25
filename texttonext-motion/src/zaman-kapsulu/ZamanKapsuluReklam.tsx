import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { Kaynaklar, ReklamVerisi } from "./kaynaklar";
import { Cumle, GeriSayim, Ikonlar, Kapanis, SoruHalkasi, TarihKilit, YerTutucuKolye } from "./parcalar";
import type { ReklamAyarlari } from "./tipler";
import { ekranNoktasi, Katman, urunKatmanlari, urunKirpmasi, YER_TUTUCU_KAPSUL } from "./urun";
import type { Zamanlama } from "./zamanlama";

// Ürün fotoğrafına yalnızca konum, ölçek, opaklık ve kenar kırpma uygulanır.
// Renk, filtre veya yeniden çizim yoktur.
const UrunFotografi: React.FC<{ katman: Katman; kaynaklar: Kaynaklar; a: ReklamAyarlari }> = ({
  katman,
  kaynaklar,
  a,
}) => {
  const g = katman.gorsel === "boyunda" && kaynaklar.boyunda ? kaynaklar.boyunda : kaynaklar.ana;
  if (katman.opaklik <= 0.001) return null;
  const y = a.kenarYumusatma * 100;
  const maske = `linear-gradient(to right, transparent, #000 ${y}%, #000 ${100 - y}%, transparent), linear-gradient(to bottom, transparent, #000 ${y}%, #000 ${100 - y}%, transparent)`;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: g.w,
        height: g.h,
        transformOrigin: "0 0",
        transform: `translate(${katman.sx}px, ${katman.sy}px) rotate(${katman.r}deg) scale(${katman.k}) translate(${-katman.px * g.w}px, ${-katman.py * g.h}px)`,
        opacity: katman.opaklik,
      }}
    >
      {a.golge.acik && katman.gorsel === "ana" ? (
        <div
          style={{
            position: "absolute",
            left: `${((kaynaklar.ana.src ? a.kapsulNoktasi.x : YER_TUTUCU_KAPSUL.x) - a.golge.genislik / 2) * 100}%`,
            width: `${a.golge.genislik * 100}%`,
            top: `${a.golge.y * 100 - 2.5}%`,
            height: "5%",
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(0,0,0,${a.golge.opaklik}), rgba(0,0,0,0))`,
          }}
        />
      ) : null}
      {g.src ? (
        <Img
          src={g.src}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            WebkitMaskImage: maske,
            maskImage: maske,
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0 }}>
          <YerTutucuKolye />
        </div>
      )}
    </div>
  );
};

const muzikSeviyesi = (t: number, a: ReklamAyarlari, z: Zamanlama) => {
  let konusma = 0;
  for (const s of z.sahneler) {
    const giris = sinir((t - (s.konusmaBaslangic - 0.5)) / 0.4);
    const cikis = sinir((s.konusmaBitis + 0.5 - t) / 0.4);
    konusma = Math.max(konusma, Math.min(giris, cikis));
  }
  const seviye = a.muzikSeviyesi + (a.muzikKonusurkenSeviyesi - a.muzikSeviyesi) * konusma;
  const acilis = sinir(t / 1.2);
  const kapanis = sinir((z.toplamSure - t) / 1.5);
  return seviye * acilis * kapanis;
};
const sinir = (x: number) => Math.min(1, Math.max(0, x));

export const ZamanKapsuluReklam: React.FC<ReklamVerisi & { ayarlar: ReklamAyarlari }> = ({
  ayarlar: a,
  kaynaklar,
  zamanlama: z,
}) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!kaynaklar || !z) return <AbsoluteFill style={{ backgroundColor: a.renkler.zemin }} />;
  const t = kare / fps;

  const katmanlar = urunKatmanlari(t, a, kaynaklar, z);
  const kirpmaY = urunKirpmasi(t, a, z);
  const kirpma = `linear-gradient(to bottom, transparent ${kirpmaY}px, #000 ${kirpmaY + 180}px)`;
  const anaKatman = katmanlar.find((k) => k.gorsel === "ana") ?? katmanlar[0];
  const kapsul = ekranNoktasi(
    anaKatman,
    kaynaklar.ana,
    kaynaklar.ana.src ? a.kapsulNoktasi : YER_TUTUCU_KAPSUL,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: a.renkler.zemin, overflow: "hidden" }}>
      {/* Ürün katmanları (sabit sırada: ana, boyunda) */}
      <AbsoluteFill style={{ WebkitMaskImage: kirpma, maskImage: kirpma }}>
        {(["ana", "boyunda"] as const).map((g) => {
          const k = katmanlar.find((x) => x.gorsel === g);
          return k ? <UrunFotografi key={g} katman={k} kaynaklar={kaynaklar} a={a} /> : null;
        })}
      </AbsoluteFill>

      {a.sahneler.map((s, i) => {
        const sz = z.sahneler[i];
        return (
          <React.Fragment key={i}>
            {s.efekt === "ikonlar" && <Ikonlar t={t} z={sz} a={a} hedef={kapsul} />}
            {s.efekt === "tarih-kilit" && <TarihKilit t={t} z={sz} a={a} />}
            {s.efekt === "geri-sayim" && <GeriSayim t={t} z={sz} a={a} />}
            {s.efekt === "soru-halkasi" && (
              <SoruHalkasi t={t} z={sz} a={a} merkez={kapsul} olcek={anaKatman.k} />
            )}
            <Cumle t={t} s={s} z={sz} a={a} />
          </React.Fragment>
        );
      })}

      <Kapanis t={t} bas={z.kapanisBaslangic} a={a} logo={kaynaklar.logo} />

      {/* Dış ses: istenen duraklamalar için parçalar halinde yerleştirilir */}
      {kaynaklar.ses
        ? z.sesParcalari.map((p, i) => {
            const bas = Math.round(p.videoBaslangic * fps);
            const sure = Math.round((p.sesBitis - p.sesBaslangic) * fps);
            if (sure <= 0) return null;
            return (
              <Sequence key={i} from={bas} durationInFrames={sure} layout="none" name={`Dış ses ${i + 1}`}>
                <Audio src={kaynaklar.ses!} trimBefore={Math.round(p.sesBaslangic * fps)} />
              </Sequence>
            );
          })
        : null}

      {/* Arka plan müziği: çok kısık, ses konuşurken biraz daha alçalır */}
      {kaynaklar.muzik ? (
        <Audio
          src={kaynaklar.muzik}
          loop
          volume={(f) => muzikSeviyesi(f / fps, a, z)}
        />
      ) : null}
    </AbsoluteFill>
  );
};

