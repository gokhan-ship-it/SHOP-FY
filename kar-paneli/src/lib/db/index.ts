import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { DB_PATH, MIGRATIONS_DIR } from "../paths";

export type DB = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

type Holder = { db?: DB };
const holder = globalThis as unknown as { __ttnDb?: Holder };
holder.__ttnDb ??= {};

export function openDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema }) as DB;
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

export function getDb(): DB {
  if (!holder.__ttnDb!.db) holder.__ttnDb!.db = openDb(DB_PATH);
  return holder.__ttnDb!.db;
}

/** Testler için: geçici bir veritabanını etkin yapar. */
export function setDbForTests(db: DB | undefined) {
  holder.__ttnDb!.db = db;
}

export { schema };
