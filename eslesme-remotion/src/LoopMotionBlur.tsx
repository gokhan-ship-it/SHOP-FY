import React, { createContext, useContext } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SAMPLES, blurSampleFrames } from './blur';

// @remotion/motion-blur'daki CameraMotionBlur ile aynı birleştirme: izole katman, her örnek
// plus-lighter + opacity(1/n). Fark: örnek zamanı Freeze yerine context ile verilir.
// CameraMotionBlur loop için kullanılamıyor: Freeze edilen kareler 0…119 aralığına kırpılıyor
// (son karede blur kayboluyor) ve ilk ~9 karede örnek sayısı düşürülüyor; ikisi de 119 → 0
// geçişinde atlama yapıyor. Burada örnekler HTML'deki gibi döngüye sarılıyor.
const SampleFrame = createContext<number | null>(null);

export const useSampleFrame = () => {
  const frame = useCurrentFrame();
  return useContext(SampleFrame) ?? frame;
};

export const LoopMotionBlur: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ isolation: 'isolate' }}>
      {blurSampleFrames(frame).map((t, i) => (
        <AbsoluteFill key={i} style={{ mixBlendMode: 'plus-lighter', filter: `opacity(${1 / SAMPLES})` }}>
          <SampleFrame.Provider value={t}>{children}</SampleFrame.Provider>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
