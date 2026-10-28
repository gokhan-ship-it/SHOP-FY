import React from 'react';
import { ShapesSvg, type TShape } from './shapes';
import { tunnel, type TunnelCfg } from './anim';

// Tekrar kullanılabilir kalp tüneli. `hero` dalınan kahraman kalbi çizer (couple: kalp konturu, single: kilitten dönen kalp);
// tünel onu halkaların önüne, çıkış perdesinin arkasına yerleştirir.
export const heartTunnelShapes = (
  t: number, te: number, cfg: TunnelCfg, hero: (h: { persp: number; na: number }) => TShape[],
): TShape[] => {
  const T = tunnel(t, te, cfg);
  return [...T.back, ...(T.hero ? hero(T.hero) : []), ...T.front];
};

export const HeartTunnel: React.FC<{
  t: number; te: number; cfg: TunnelCfg; hero: (h: { persp: number; na: number }) => TShape[]; id: string; width: number; height: number;
}> = ({ t, te, cfg, hero, id, width, height }) => <ShapesSvg shapes={heartTunnelShapes(t, te, cfg, hero)} id={id} width={width} height={height} />;
