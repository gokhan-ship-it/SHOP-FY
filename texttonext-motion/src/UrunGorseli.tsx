import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { UrunSahnesi } from "./senaryo";
import { tema, fontFamily } from "./tema";
import { girisCikis } from "./yardimci";

// Fotoğrafa YALNIZCA konum, ölçek ve opaklık uygulanır.
// Filtre, renk düzeltme, kırpma veya yeniden çizim yoktur.
export const UrunGorseli: React.FC<{ sahne: UrunSahnesi; kaynak: string | null }> = ({
  sahne,
  kaynak,
}) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bas = sahne.baslangic * fps;
  const son = sahne.bitis * fps;

  const ilerleme = interpolate(kare, [bas, son], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let olcek = 1;
  let x = 0;
  if (sahne.hareket === "yakinlas") olcek = 1 + 0.06 * ilerleme;
  if (sahne.hareket === "uzaklas") olcek = 1.06 - 0.06 * ilerleme;
  if (sahne.hareket === "kay-sol") {
    olcek = 1.02;
    x = 40 - 80 * ilerleme;
  }
  if (sahne.hareket === "kay-sag") {
    olcek = 1.02;
    x = -40 + 80 * ilerleme;
  }

  const opaklik = girisCikis(kare, bas, son, 0.8 * fps);
  if (opaklik <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: opaklik,
        transform: `translateX(${x}px) scale(${olcek})`,
      }}
    >
      {kaynak ? (
        <Img
          src={kaynak}
          style={{ width: 860, height: 1060, objectFit: "contain" }}
        />
      ) : (
        <YerTutucu numara={sahne.fotograf} />
      )}
    </AbsoluteFill>
  );
};

const YerTutucu: React.FC<{ numara: number }> = ({ numara }) => (
  <div
    style={{
      width: 720,
      height: 900,
      borderRadius: 48,
      background: "#F5F5F7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      fontSize: 34,
      fontWeight: 500,
      color: tema.ikincilYazi,
    }}
  >
    Ürün görseli {numara}
  </div>
);
