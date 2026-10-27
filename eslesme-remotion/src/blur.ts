// HTML'deki motion blur: 10 örnek, f, f-0.8/9, …, f-0.8 (0.8 karelik pencere ≈ 288° shutter).
export const SAMPLES = 10;
export const SHUTTER_FRAMES = 0.8;
export const blurSampleFrames = (f: number) =>
  Array.from({ length: SAMPLES }, (_, i) => f - (SHUTTER_FRAMES * i) / (SAMPLES - 1));
