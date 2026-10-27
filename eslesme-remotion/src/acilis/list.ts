import { FPS, OUT_FPS } from '../anim';
import { videoLen, type AcilisFx, type AcilisVariant, type Word } from './anim';

// Uygulama açılışı: 2 fikir × 3 dil × tam/kısa. Süre, ana ekrana geçilen ana kadar (HTML'deki videoLen).
// Tam versiyon ilk kurulumda ve günde bir kez, kısa versiyon (2.4 kat hızlı) diğer açılışlarda oynar.
export const ACILIS = (['hand', 'geo'] as AcilisVariant[]).flatMap((variant) =>
  (['merhaba', 'hello', 'hallo'] as Word[]).flatMap((word) => [false, true].map((short) => {
    const name = `${variant === 'hand' ? 'el' : 'halka'}-${short ? 'kisa' : 'tam'}-${word}`;
    return {
      id: `Acilis${variant === 'hand' ? 'El' : 'Halka'}${short ? 'Kisa' : 'Tam'}-${word}`,
      file: `out/acilis/acilis-${name}.mp4`,
      props: { variant, word, short, blur: true, bloom: true } satisfies AcilisFx & { variant: AcilisVariant; word: Word; short: boolean },
      frames: Math.ceil(videoLen(variant, word, short) * OUT_FPS / FPS - 1e-9),
    };
  })));
