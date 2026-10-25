import { Easing, interpolate } from "remotion";

// Apple tarzı yumuşak eğri
export const yumusak = Easing.bezier(0.25, 0.1, 0.25, 1);

// Belirli bir zaman aralığında giriş/çıkış opaklığı (sert geçiş yok)
export const girisCikis = (
  kare: number,
  baslangic: number,
  bitis: number,
  gecis: number,
) =>
  interpolate(
    kare,
    [baslangic, baslangic + gecis, bitis - gecis, bitis],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak },
  );
