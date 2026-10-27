import React, { createContext, useContext } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS } from './anim';
import { SAMPLES, blurSampleFrames } from './blur';

// @remotion/motion-blur'daki CameraMotionBlur ile aynı birleştirme: izole katman, her örnek
// plus-lighter + opacity(1/n). Fark: örnek zamanı Freeze yerine context ile verilir.
// CameraMotionBlur loop için kullanılamıyor: Freeze edilen kareler 0…119 aralığına kırpılıyor
// (son karede blur kayboluyor) ve ilk ~9 karede örnek sayısı düşürülüyor; ikisi de 119 → 0
// geçişinde atlama yapıyor. Burada örnekler HTML'deki gibi döngüye sarılıyor.
const SampleFrame = createContext<number | null>(null);

// Tasarım zaman çizelgesindeki kare (30 fps karesi). 60 fps composition'da yarım karelik
// adımlarla ilerler; zamanlamalar aynı kalır, HTML'deki gibi ara kareler de çizilir.
export const useDesignFrame = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame * FPS) / fps;
};

export const useSampleFrame = () => {
  const frame = useDesignFrame();
  return useContext(SampleFrame) ?? frame;
};

export const LoopMotionBlur: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useDesignFrame();
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
