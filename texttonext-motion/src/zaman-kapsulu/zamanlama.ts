// Dış ses transkriptini (Whisper kelime zamanları) senaryodaki cümlelerle
// eşleştirir ve tüm sahne/kelime zamanlarını hesaplar.
import type { ReklamAyarlari } from "./tipler";

export type Transkript = {
  dosya: string;
  hash: string;
  sure: number;
  sessizlikler: { baslangic: number; bitis: number }[];
  kelimeler: { metin: string; baslangic: number; bitis: number }[];
};

export type GorunenKelime = { metin: string; kalin: boolean; baslangic: number; bitis: number };

export type SahneZamani = {
  baslangic: number; // video saniyesi
  bitis: number;
  konusmaBaslangic: number;
  konusmaBitis: number;
  kelimeler: GorunenKelime[];
};

export type Zamanlama = {
  sahneler: SahneZamani[];
  kapanisBaslangic: number;
  toplamSure: number;
  // Dış sesin parçaları: istenen duraklamalar için ses bu noktalardan bölünür
  sesParcalari: { sesBaslangic: number; sesBitis: number; videoBaslangic: number }[];
};

// **kalın** işaretli metni kelimelere ayırır
export const kelimelereAyir = (metin: string) => {
  let kalin = false;
  return metin
    .split(/\s+/)
    .filter(Boolean)
    .map((parca) => {
      let p = parca;
      if (p.startsWith("**")) {
        kalin = true;
        p = p.slice(2);
      }
      const buKalin = kalin;
      if (p.includes("**")) {
        p = p.replace(/\*\*/g, "");
        kalin = false;
      }
      return { metin: p, kalin: buKalin };
    });
};

const normal = (s: string) =>
  s.toLocaleLowerCase("tr").normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");

const BENZER: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };
const sade = (c: string) => BENZER[c] ?? c;

// Karakter düzeyinde hizalama (Whisper kelimeyi bölse/birleştirse de çalışır)
const hizala = (a: string, b: string): Int32Array => {
  const n = a.length;
  const m = b.length;
  const dp = new Int32Array((n + 1) * (m + 1));
  const idx = (i: number, j: number) => i * (m + 1) + j;
  for (let i = 1; i <= n; i++) dp[idx(i, 0)] = i * 2;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const maliyet = a[i - 1] === b[j - 1] ? 0 : sade(a[i - 1]) === sade(b[j - 1]) ? 1 : 3;
      dp[idx(i, j)] = Math.min(
        dp[idx(i - 1, j - 1)] + maliyet,
        dp[idx(i - 1, j)] + 2,
        dp[idx(i, j - 1)] + 2,
      );
    }
  }
  // Transkriptin sonundaki fazlalıklar ücretsiz
  let j = 0;
  for (let k = 0; k <= m; k++) if (dp[idx(n, k)] < dp[idx(n, j)]) j = k;
  const eslesme = new Int32Array(n).fill(-1);
  let i = n;
  while (i > 0 && j > 0) {
    const maliyet = a[i - 1] === b[j - 1] ? 0 : sade(a[i - 1]) === sade(b[j - 1]) ? 1 : 3;
    if (dp[idx(i, j)] === dp[idx(i - 1, j - 1)] + maliyet) {
      if (maliyet < 3) eslesme[i - 1] = j - 1;
      i--;
      j--;
    } else if (dp[idx(i, j)] === dp[idx(i - 1, j)] + 2) i--;
    else j--;
  }
  return eslesme;
};

type Aralik = { baslangic: number; bitis: number };

// Senaryodaki her kelimenin seste söylendiği zaman (ses saniyesi)
const kelimeZamanlari = (cumleler: string[][], t: Transkript): Aralik[][] => {
  let a = "";
  const aSahibi: number[] = [];
  const duz = cumleler.flat();
  duz.forEach((k, i) => {
    const n = normal(k);
    a += n;
    for (let c = 0; c < n.length; c++) aSahibi.push(i);
  });
  let b = "";
  const bZaman: Aralik[] = [];
  for (const k of t.kelimeler) {
    const n = normal(k.metin);
    const d = (k.bitis - k.baslangic) / Math.max(1, n.length);
    for (let c = 0; c < n.length; c++)
      bZaman.push({ baslangic: k.baslangic + c * d, bitis: k.baslangic + (c + 1) * d });
    b += n;
  }
  const eslesme = hizala(a, b);
  const sonuc: (Aralik | null)[] = duz.map(() => null);
  for (let c = 0; c < a.length; c++) {
    const j = eslesme[c];
    if (j < 0) continue;
    const w = aSahibi[c];
    const z = bZaman[j];
    const mevcut = sonuc[w];
    sonuc[w] = mevcut
      ? { baslangic: Math.min(mevcut.baslangic, z.baslangic), bitis: Math.max(mevcut.bitis, z.bitis) }
      : { ...z };
  }
  // Eşleşmeyen kelimeleri komşularına göre doldur
  for (let w = 0; w < sonuc.length; w++) {
    if (sonuc[w]) continue;
    const onceki = sonuc.slice(0, w).reverse().find(Boolean);
    const sonraki = sonuc.slice(w + 1).find(Boolean);
    const bas = onceki ? onceki.bitis : 0;
    const son = sonraki ? sonraki.baslangic : t.sure;
    sonuc[w] = { baslangic: bas, bitis: Math.max(bas, son) };
  }
  // Sessizliklere göre keskinleştir: Whisper'ın kelime sınırları ±0,3 sn
  // kayabilir; sınıra yakın gerçek bir sessizlik varsa sınırı oraya oturt.
  const keskin = (sonuc as Aralik[]).map((z) => ({ ...z }));
  for (let w = 0; w < keskin.length; w++) {
    const z = keskin[w];
    for (const s of t.sessizlikler) {
      if (z.baslangic >= s.baslangic && z.baslangic < s.bitis && s.bitis < z.bitis) z.baslangic = s.bitis;
      if (z.bitis > s.baslangic && z.bitis <= s.bitis && s.baslangic > z.baslangic) z.bitis = s.baslangic;
    }
  }
  const TOLERANS = 0.35;
  for (let w = 0; w + 1 < keskin.length; w++) {
    const a = keskin[w];
    const b = keskin[w + 1];
    const sinir = (a.bitis + b.baslangic) / 2;
    let enIyi: { baslangic: number; bitis: number } | null = null;
    for (const s of t.sessizlikler) {
      if (s.bitis < sinir - TOLERANS || s.baslangic > sinir + TOLERANS) continue;
      if (s.baslangic <= a.baslangic || s.bitis >= b.bitis) continue;
      const uzaklik = Math.abs((s.baslangic + s.bitis) / 2 - sinir);
      if (!enIyi || uzaklik < Math.abs((enIyi.baslangic + enIyi.bitis) / 2 - sinir)) enIyi = s;
    }
    if (enIyi) {
      a.bitis = enIyi.baslangic;
      b.baslangic = enIyi.bitis;
    }
  }
  for (let w = 1; w < keskin.length; w++)
    keskin[w].baslangic = Math.max(keskin[w].baslangic, keskin[w - 1].baslangic);
  // Cümlelere geri böl
  const out: Aralik[][] = [];
  let k = 0;
  for (const c of cumleler) out.push(c.map(() => keskin[k++]));
  return out;
};

// Ses yokken kaba bir tahmini zamanlama üretir
export const tahminiTranskript = (ayarlar: ReklamAyarlari): Transkript => {
  let t = 0.3;
  const kelimeler: Transkript["kelimeler"] = [];
  for (const s of ayarlar.sahneler) {
    for (const k of kelimelereAyir(s.metin)) {
      const d = 0.12 + 0.065 * normal(k.metin).length;
      kelimeler.push({ metin: k.metin, baslangic: t, bitis: t + d });
      t += d + 0.04;
    }
    t += 0.55;
  }
  return { dosya: "", hash: "", sure: t, sessizlikler: [], kelimeler };
};

export const zamanlamaHesapla = (ayarlar: ReklamAyarlari, t: Transkript): Zamanlama => {
  const cumleler = ayarlar.sahneler.map((s) => kelimelereAyir(s.metin));
  const zamanlar = kelimeZamanlari(
    cumleler.map((c) => c.map((k) => k.metin)),
    t,
  );
  const konusma = zamanlar.map((z) => ({ bas: z[0].baslangic, son: z[z.length - 1].bitis }));

  // İstenen duraklamalar: seste yeterli boşluk yoksa araya sessizlik eklenir
  const eklemeler: { nokta: number; sure: number }[] = [];
  let sondaEk = 0;
  ayarlar.sahneler.forEach((s, i) => {
    const istenen = s.sonrasindaDuraklama ?? 0;
    if (!istenen) return;
    const son = konusma[i].son;
    const sonraki = i + 1 < konusma.length ? konusma[i + 1].bas : t.sure;
    const bosluk = Math.max(0, sonraki - son);
    if (bosluk >= istenen) return;
    if (i + 1 >= konusma.length) {
      sondaEk = istenen - bosluk;
      return;
    }
    const sessiz = t.sessizlikler.find((x) => x.bitis > son && x.baslangic < sonraki);
    const nokta = sessiz ? (Math.max(sessiz.baslangic, son) + Math.min(sessiz.bitis, sonraki)) / 2 : son + bosluk / 2;
    eklemeler.push({ nokta, sure: istenen - bosluk });
  });
  eklemeler.sort((a, b) => a.nokta - b.nokta);
  const v = (sn: number) => sn + eklemeler.filter((e) => e.nokta <= sn).reduce((x, e) => x + e.sure, 0);

  const sesParcalari: Zamanlama["sesParcalari"] = [];
  let onceki = 0;
  for (const e of [...eklemeler, { nokta: t.sure, sure: 0 }]) {
    sesParcalari.push({ sesBaslangic: onceki, sesBitis: e.nokta, videoBaslangic: v(onceki) });
    onceki = e.nokta;
  }

  const ONDEN = 0.35; // görsel, sesten bu kadar önce hazırlanmaya başlar
  const sesSonu = v(t.sure) + sondaEk;
  const sahneler: SahneZamani[] = cumleler.map((c, i) => {
    const kBas = v(konusma[i].bas);
    const kSon = v(konusma[i].son);
    const oncekiSon = i > 0 ? v(konusma[i - 1].son) : 0;
    // Önceki cümleden sonra duraklama isteniyorsa o cümle duraklama boyunca ekranda kalır
    const onden = i > 0 && ayarlar.sahneler[i - 1].sonrasindaDuraklama ? 0.12 : ONDEN;
    const baslangic = i === 0 ? 0 : Math.min(kBas, Math.max(oncekiSon + 0.05, kBas - onden));
    return {
      baslangic,
      bitis: 0,
      konusmaBaslangic: kBas,
      konusmaBitis: kSon,
      kelimeler: c.map((k, j) => ({
        ...k,
        baslangic: v(zamanlar[i][j].baslangic),
        bitis: v(zamanlar[i][j].bitis),
      })),
    };
  });
  sahneler.forEach((s, i) => (s.bitis = i + 1 < sahneler.length ? sahneler[i + 1].baslangic : sesSonu));

  return {
    sahneler,
    kapanisBaslangic: sesSonu,
    toplamSure: sesSonu + ayarlar.kapanis.sure,
    sesParcalari,
  };
};
