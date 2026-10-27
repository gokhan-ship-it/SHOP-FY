import React, { useLayoutEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AbsoluteFill, cancelRender, continueRender, delayRender } from 'remotion';

// Motion blur + bloom, kayan noktalı ortalama ile.
// LoopMotionBlur/CameraMotionBlur örnekleri opacity(1/n) katmanlarla topluyor; tarayıcı her katmanı
// 8 bite yuvarladığı için hareketsiz renkler bile 10'un katlarına kayıyor (lime 222 → 220) ve
// gradyanlar kademeleniyor. Burada her örnek (bir SVG) ayrı çizilip Float32 tamponda ortalanıyor:
// hareketsiz pikseller birebir kendi renginde kalıyor, blur açık ve kapalı kareler aynı renkte buluşuyor.
// Ortalama, HTML'deki 'lighter' + 1/n birikimiyle aynı: önçarpımlı renklerin aritmetik ortalaması.

type Props = {
  width: number;
  height: number;
  // örnek zamanları (blur kapalıysa tek eleman)
  samples: number[];
  // bir örneğin bağımsız SVG'si (xmlns ve piksel boyutu dahil)
  renderSample: (t: number) => React.ReactElement;
  // örnek zamanları dışında çizimi etkileyen her şey (efekt prop'ları vb.)
  depsKey: string;
  // HTML'deki gibi bulanık kopya arkaya, 'lighter' ile
  bloom: { px: number; opacity: number } | null;
};

const loadSvg = async (markup: string) => {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const composite = async (markups: string[], w: number, h: number, scratch: HTMLCanvasElement) => {
  scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!;
  const out = new ImageData(w, h);
  const unique = [...new Set(markups)];
  if (unique.length === 1) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(await loadSvg(unique[0]), 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }
  const acc = new Float32Array(w * h * 4);
  const weight = new Map<string, number>();
  for (const m of markups) weight.set(m, (weight.get(m) ?? 0) + 1);
  for (const m of unique) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(await loadSvg(m), 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data, k = weight.get(m)!;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (!a) continue;
      const ak = (a / 255) * k;
      acc[i] += d[i] * ak; acc[i + 1] += d[i + 1] * ak; acc[i + 2] += d[i + 2] * ak; acc[i + 3] += ak;
    }
  }
  const o = out.data, n = markups.length;
  for (let i = 0; i < o.length; i += 4) {
    const A = acc[i + 3];
    if (A <= 0) continue;
    o[i] = Math.round(acc[i] / A); o[i + 1] = Math.round(acc[i + 1] / A); o[i + 2] = Math.round(acc[i + 2] / A);
    o[i + 3] = Math.round((A / n) * 255);
  }
  return out;
};

export const FloatMotionBlur: React.FC<Props> = ({ width, height, samples, renderSample, depsKey, bloom }) => {
  const main = useRef<HTMLCanvasElement>(null), glow = useRef<HTMLCanvasElement>(null);
  const scratch = useRef<HTMLCanvasElement | null>(null);
  const render = useRef(renderSample);
  render.current = renderSample;
  const samplesKey = samples.join(',');

  useLayoutEffect(() => {
    const handle = delayRender('Motion blur örnekleri');
    let live = true;
    scratch.current ??= document.createElement('canvas');
    const markups = samplesKey.split(',').map((t) => renderToStaticMarkup(render.current(Number(t))));
    composite(markups, width, height, scratch.current)
      .then((img) => {
        if (!live) return;
        main.current?.getContext('2d')!.putImageData(img, 0, 0);
        if (glow.current && main.current) {
          const g = glow.current.getContext('2d')!;
          g.clearRect(0, 0, width, height);
          g.drawImage(main.current, 0, 0);
        }
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    return () => { live = false; continueRender(handle); };
  }, [samplesKey, depsKey, width, height, bloom !== null]);

  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
  return (
    <AbsoluteFill>
      {bloom && (
        <canvas ref={glow} width={width} height={height}
          style={{ ...fill, mixBlendMode: 'plus-lighter', opacity: bloom.opacity, filter: `blur(${bloom.px}px)` }} />
      )}
      <canvas ref={main} width={width} height={height} style={fill} />
    </AbsoluteFill>
  );
};
