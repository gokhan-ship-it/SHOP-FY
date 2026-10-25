import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { getStaticFiles } from "@remotion/studio";
import { Reklam, ReklamProps } from "./Reklam";
import { senaryo } from "./senaryo";
import { tema } from "./tema";
import { videolar } from "./videolar";
import { ZamanKapsuluReklam } from "./zaman-kapsulu/ZamanKapsuluReklam";
import { FPS, reklamMetadata, ReklamVerisi } from "./zaman-kapsulu/kaynaklar";

// Her video ayar dosyası için bir bileşen (bir kez oluşturulur)
const reklamlar = videolar.map((ayarlar) => {
  const Bilesen: React.FC<ReklamVerisi> = (p) => <ZamanKapsuluReklam {...p} ayarlar={ayarlar} />;
  return { ayarlar, Bilesen };
});

const RESIM = /\.(jpe?g|png|webp)$/i;
const SES = /\.mp3$/i;

// assets/urunler ve assets/ses klasörlerindeki dosyaları otomatik bulur.
const dosyalariBul: CalculateMetadataFunction<ReklamProps> = async () => {
  const dosyalar = getStaticFiles().map((f) => f.name).sort((a, b) => a.localeCompare(b, "tr"));
  const urunler = dosyalar
    .filter((d) => d.startsWith("urunler/") && RESIM.test(d))
    .map((d) => staticFile(d));
  const sesDosyasi = dosyalar.find((d) => /^ses\/[^/]+$/.test(d) && SES.test(d));
  return {
    props: { urunler, ses: sesDosyasi ? staticFile(sesDosyasi) : null },
    durationInFrames: Math.round(senaryo.sure * tema.fps),
  };
};

export const RemotionRoot: React.FC = () => (
  <>
    {reklamlar.map(({ ayarlar, Bilesen }) => (
      <Composition
        key={ayarlar.id}
        id={ayarlar.id}
        component={Bilesen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 30}
        defaultProps={{ kaynaklar: null, zamanlama: null }}
        calculateMetadata={reklamMetadata(ayarlar)}
      />
    ))}
    <Composition
      id="Reklam"
      component={Reklam}
      width={tema.genislik}
      height={tema.yukseklik}
      fps={tema.fps}
      durationInFrames={Math.round(senaryo.sure * tema.fps)}
      defaultProps={{ urunler: [], ses: null }}
      calculateMetadata={dosyalariBul}
    />
  </>
);
