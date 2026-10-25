import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

export function getSetting(key: string): string | null {
  const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null) {
  getDb()
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}

export function getJsonSetting<T>(key: string, fallback: T): T {
  const v = getSetting(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function setJsonSetting(key: string, value: unknown) {
  setSetting(key, JSON.stringify(value));
}
