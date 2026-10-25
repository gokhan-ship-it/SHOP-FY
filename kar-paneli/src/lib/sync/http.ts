// Ağ istekleri. Hata mesajlarına asla URL, başlık ya da gövde (anahtar içerebilir) yazılmaz.
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "zaman aşımı" : "bağlantı kurulamadı";
    throw new HttpError(`Ağ hatası: ${msg}`, 0);
  } finally {
    clearTimeout(t);
  }
}

/** Gizli değerleri metinden temizler (güvenlik ağı). */
export function scrub(s: string, secrets: string[]): string {
  let out = s;
  for (const x of secrets) if (x && x.length >= 6) out = out.split(x).join("••••");
  return out.replace(/(access_token|client_secret|fb_exchange_token)=[^&\s"]+/g, "$1=••••");
}
