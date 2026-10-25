import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Metin } from "./senaryo";
import { fontFamily, tema } from "./tema";
import { girisCikis, yumusak } from "./yardimci";

// Metni kelime kelime, yumuşakça beliren şekilde gösterir.
export const KelimeMetni: React.FC<{ m: Metin }> = ({ m }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bas = m.baslangic * fps;
  const son = m.bitis * fps;

  const genelOpaklik = girisCikis(kare, bas, son + 1, 0.5 * fps);
  if (kare < bas || kare > son) return null;

  const kelimeler = m.metin.split(" ");
  const aralik = 0.16 * fps; // kelimeler arası gecikme
  const sure = 0.7 * fps; // her kelimenin belirme süresi

  return (
    <AbsoluteFill
      style={{
        justifyContent: m.konum === "ust" ? "flex-start" : "flex-end",
        alignItems: "center",
        paddingTop: tema.guvenliUst,
        paddingBottom: tema.guvenliAlt,
        paddingLeft: tema.guvenliYan,
        paddingRight: tema.guvenliYan,
        opacity: genelOpaklik,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: m.vurgu ? 76 : 44,
          fontWeight: m.vurgu ? 600 : 400,
          letterSpacing: m.vurgu ? "-0.02em" : "-0.01em",
          lineHeight: 1.15,
          color: m.vurgu ? tema.yaziRengi : tema.ikincilYazi,
          textAlign: "center",
          // Ana başlık ile alt metin aynı kenarda çakışmasın
          marginTop: m.konum === "ust" && !m.vurgu ? 110 : 0,
        }}
      >
        {kelimeler.map((k, i) => {
          const t = bas + i * aralik;
          const o = interpolate(kare, [t, t + sure], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: yumusak,
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${(1 - o) * 18}px)`,
                marginRight: i < kelimeler.length - 1 ? "0.25em" : 0,
              }}
            >
              {k}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
