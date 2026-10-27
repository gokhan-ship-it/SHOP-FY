import React from 'react';
import { Lock } from './Lock';
import { CX, CY, FILL1, IMPACT, R, RB, S, echo, lockState, type KilitFx } from './anim';

// HTML'deki drawScene: tek bir kare, şeffaf arka plan, saf (aynı girdi → aynı SVG).
// `id` aynı sayfadaki örneklerin gradient/clip id'lerinin çakışmasını önler; `size` piksel boyutu.
export const KilitSvg: React.FC<{ f: number; fx: KilitFx; id: string; size: number }> = ({ f, fx, id, size }) => {
  const st = lockState(f);
  const rings = [echo(f, FILL1, CX, CY, R, fx), echo(f, IMPACT, st.cx, st.cy, RB * 1.05, fx)];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${S} ${S}`} width={size} height={size}>
      {rings.map((e, i) => e && <circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill="none" stroke={e.stroke} strokeWidth={e.strokeWidth} />)}
      <Lock f={f} id={id} cx={st.cx} cy={st.cy} rad={st.rad} depth={st.depth} yaw={st.yaw} sx={st.sx} sy={st.sy}
        shO={st.shO} shQ={st.shQ} shA={st.shA} gap={st.gap} kp={st.kp} krot={st.krot} keyLime={0} ripple={-1}
        flash={st.flash} level={st.level} wave={st.wave} sheen={st.idle ? st.sheen : null} />
    </svg>
  );
};
