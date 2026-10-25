import React from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import { senaryo } from "./senaryo";
import { tema } from "./tema";
import { UrunGorseli } from "./UrunGorseli";
import { KelimeMetni } from "./KelimeMetni";

export type ReklamProps = {
  urunler: string[];
  ses: string | null;
};

export const Reklam: React.FC<ReklamProps> = ({ urunler, ses }) => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: tema.arkaPlan }}>
      {senaryo.urunSahneleri.map((s, i) => (
        <UrunGorseli key={i} sahne={s} kaynak={urunler[s.fotograf - 1] ?? null} />
      ))}
      {senaryo.metinler.map((m, i) => (
        <KelimeMetni key={i} m={m} />
      ))}
      {ses ? (
        <Audio
          src={ses}
          // Sonda sesi yumuşakça kıs
          volume={(f) =>
            interpolate(f, [durationInFrames - fps, durationInFrames], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
