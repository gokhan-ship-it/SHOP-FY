// .env okuma/yazma. Gizli değerler asla loglanmaz; dosya yalnızca kullanıcıya açık (600) yazılır.
import fs from "node:fs";
import { ENV_PATH } from "./paths";

export type EnvKey =
  | "SHOPIFY_STORE_DOMAIN"
  | "SHOPIFY_CLIENT_ID"
  | "SHOPIFY_CLIENT_SECRET"
  | "META_ALLOWED_AD_ACCOUNTS"
  | "META_APP_ID"
  | "META_APP_SECRET"
  | "META_ACCESS_TOKEN"
  | "META_TOKEN_EXPIRES_AT";

export const SECRET_KEYS: EnvKey[] = ["SHOPIFY_CLIENT_SECRET", "META_APP_SECRET", "META_ACCESS_TOKEN"];

export const SHOPIFY_API_VERSION = "2026-10";
export const META_API_VERSION = "v26.0";

function parse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

export function readEnv(): Record<string, string> {
  try {
    return parse(fs.readFileSync(ENV_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function env(key: EnvKey): string {
  return readEnv()[key] ?? "";
}

/** Verilen anahtarları günceller, diğerlerini korur. Boş dize anahtarı siler. */
export function writeEnv(patch: Partial<Record<EnvKey, string>>) {
  const cur = readEnv();
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === "") delete cur[k];
    else cur[k] = v.replace(/[\r\n]/g, "").trim();
  }
  const body =
    "# TTN Kâr Paneli ayarları. Bu dosyayı kimseyle paylaşma; git'e girmez.\n" +
    Object.entries(cur)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") +
    "\n";
  fs.writeFileSync(ENV_PATH, body, { mode: 0o600 });
  fs.chmodSync(ENV_PATH, 0o600);
}

export function normalizeDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function normalizeAdAccount(a: string): string {
  const s = a.trim();
  if (!s) return "";
  return s.startsWith("act_") ? s : `act_${s}`;
}

export function allowedAdAccounts(): string[] {
  return env("META_ALLOWED_AD_ACCOUNTS")
    .split(",")
    .map(normalizeAdAccount)
    .filter(Boolean);
}

/** Hiçbir koşulda veri çekilmeyecek hesaplar (brief §3.1). */
export const BLOCKED_AD_ACCOUNTS = ["act_1389905762203018"];

/** Gizli değeri ekranda gösterirken maskeler. */
export function mask(v: string): string {
  if (!v) return "";
  if (v.length <= 8) return "••••";
  return v.slice(0, 4) + "••••" + v.slice(-4);
}
