import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { getStaticFiles } from "@remotion/studio";
import { Reklam, ReklamProps } from "./Reklam";
import { senaryo } from "./senaryo";
import { tema } from "./tema";

const RESIM = /\.(jpe?g|png|webp)$/i;
const SES = /\.mp3$/i;

// assets/urunler ve assets/ses klasörlerindeki dosyaları otomatik bulur.
const dosyalariBul: CalculateMetadataFunction<ReklamProps> = async () => {
  const dosyalar = getStaticFiles().map((f) => f.name).sort((a, b) => a.localeCompare(b, "tr"));
  const urunler = dosyalar
    .filter((d) => d.startsWith("urunler/") && RESIM.test(d))
    .map((d) => staticFile(d));
  const sesDosyasi = dosyalar.find((d) => d.startsWith("ses/") && SES.test(d));
  return {
    props: { urunler, ses: sesDosyasi ? staticFile(sesDosyasi) : null },
    durationInFrames: Math.round(senaryo.sure * tema.fps),
  };
};

export const RemotionRoot: React.FC = () => (
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
);
