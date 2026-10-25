// assets klasöründeki dosyaları bulur, transkripti okur ve zamanlamayı hesaplar.
import { CalculateMetadataFunction, staticFile } from "remotion";
import { getStaticFiles } from "@remotion/studio";
import type { ReklamAyarlari } from "./tipler";
import { tahminiTranskript, Transkript, Zamanlama, zamanlamaHesapla } from "./zamanlama";

export const FPS = 30;
const KUTU = { w: 780, h: 900 }; // ürün fotoğrafının sığdırıldığı alan (px)

export type Gorsel = { src: string | null; w: number; h: number };

export type Kaynaklar = {
  ses: string | null;
  muzik: string | null;
  logo: string | null;
  ana: Gorsel;
  boyunda: Gorsel | null;
  eksikler: string[];
};

export type ReklamVerisi = { kaynaklar: Kaynaklar | null; zamanlama: Zamanlama | null };

const RESIM = /\.(png|jpe?g|webp)$/i;
const SES = /\.(mp3|wav|m4a|aac)$/i;

const boyutu = (src: string) =>
  new Promise<{ w: number; h: number }>((tamam, hata) => {
    const i = new Image();
    i.onload = () => tamam({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => hata(new Error(`Görsel açılamadı: ${src}`));
    i.src = src;
  });

const sigdir = (w: number, h: number) => {
  const o = Math.min(KUTU.w / w, KUTU.h / h);
  return { w: Math.round(w * o), h: Math.round(h * o) };
};

const sha1 = async (src: string) => {
  if (!globalThis.crypto?.subtle) return null;
  const veri = await (await fetch(src)).arrayBuffer();
  const ozet = await crypto.subtle.digest("SHA-1", veri);
  return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const reklamMetadata =
  (ayarlar: ReklamAyarlari): CalculateMetadataFunction<ReklamVerisi> =>
  async () => {
    const dosyalar = getStaticFiles()
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b, "tr"));
    const var_ = (d: string) => dosyalar.includes(d);
    const eksikler: string[] = [];

    // Dış ses
    let sesDosyasi: string | null = null;
    if (var_(`ses/${ayarlar.ses}`)) sesDosyasi = `ses/${ayarlar.ses}`;
    else {
      eksikler.push(`Dış ses: assets/ses/${ayarlar.ses}`);
      if (ayarlar.yerTutucuSes && var_(`ses/${ayarlar.yerTutucuSes}`))
        sesDosyasi = `ses/${ayarlar.yerTutucuSes}`;
    }
    let transkript: Transkript;
    if (sesDosyasi) {
      const ad = sesDosyasi.split("/").pop()!.replace(/\.[^.]+$/, ".json");
      if (!var_(`transkript/${ad}`))
        throw new Error(
          `"${sesDosyasi}" henüz yazıya dökülmemiş. Terminalde "npm run senkron" yazın.`,
        );
      transkript = await (await fetch(staticFile(`transkript/${ad}`))).json();
      const ozet = await sha1(staticFile(sesDosyasi));
      if (ozet && ozet !== transkript.hash)
        throw new Error(
          `"${sesDosyasi}" değişmiş, zamanlamalar eski. Terminalde "npm run senkron" yazın.`,
        );
    } else transkript = tahminiTranskript(ayarlar);

    // Ürün fotoğrafları
    const urunler = dosyalar.filter((d) => d.startsWith("urunler/") && RESIM.test(d));
    const anaYol = var_(`urunler/${ayarlar.urunGorselleri.ana}`)
      ? `urunler/${ayarlar.urunGorselleri.ana}`
      : urunler.find((d) => d !== `urunler/${ayarlar.urunGorselleri.boyunda}`) ?? null;
    if (!var_(`urunler/${ayarlar.urunGorselleri.ana}`))
      eksikler.push(`Ana ürün fotoğrafı: assets/urunler/${ayarlar.urunGorselleri.ana}`);
    const boyundaYol = var_(`urunler/${ayarlar.urunGorselleri.boyunda}`)
      ? `urunler/${ayarlar.urunGorselleri.boyunda}`
      : null;
    if (!boyundaYol)
      eksikler.push(`Boyunda fotoğraf (isteğe bağlı): assets/urunler/${ayarlar.urunGorselleri.boyunda}`);

    const gorsel = async (yol: string | null): Promise<Gorsel | null> => {
      if (!yol) return null;
      const b = await boyutu(staticFile(yol));
      return { src: staticFile(yol), ...sigdir(b.w, b.h) };
    };
    const ana = (await gorsel(anaYol)) ?? { src: null, ...KUTU };
    const boyunda = await gorsel(boyundaYol);

    // Logo ve müzik
    const logoYol = ayarlar.logo && var_(`logo/${ayarlar.logo}`)
      ? `logo/${ayarlar.logo}`
      : dosyalar.find((d) => d.startsWith("logo/") && /\.(png|jpe?g|webp|svg)$/i.test(d)) ?? null;
    if (!logoYol) eksikler.push("Logo (isteğe bağlı): assets/logo/");
    const muzikYol = ayarlar.muzik && var_(`muzik/${ayarlar.muzik}`)
      ? `muzik/${ayarlar.muzik}`
      : dosyalar.find((d) => d.startsWith("muzik/") && SES.test(d)) ?? null;

    if (eksikler.length) console.warn("Eksik dosyalar (yer tutucu kullanılıyor):\n" + eksikler.join("\n"));

    const zamanlama = zamanlamaHesapla(ayarlar, transkript);
    return {
      durationInFrames: Math.ceil(zamanlama.toplamSure * FPS),
      props: {
        kaynaklar: {
          ses: sesDosyasi ? staticFile(sesDosyasi) : null,
          muzik: muzikYol ? staticFile(muzikYol) : null,
          logo: logoYol ? staticFile(logoYol) : null,
          ana,
          boyunda,
          eksikler,
        },
        zamanlama,
      },
    };
  };
