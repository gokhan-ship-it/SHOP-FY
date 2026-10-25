import path from "node:path";

// Uygulama kökü: LaunchAgent WorkingDirectory'yi bu klasöre ayarlar.
export const ROOT = process.env.TTN_ROOT ?? process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const DB_PATH = process.env.TTN_DB ?? path.join(DATA_DIR, "ttn.db");
export const ENV_PATH = process.env.TTN_ENV ?? path.join(ROOT, ".env");
export const SEED_DIR = process.env.TTN_SEED ?? path.join(ROOT, "seed");
export const TP_DIR = process.env.TTN_TP ?? path.join(ROOT, "trueprofit");
export const MIGRATIONS_DIR = path.join(ROOT, "drizzle");
export const LOCAL_BACKUP_DIR = path.join(ROOT, "yedek");
