// Önizleme: önce sesi yazıya döker, sonra Remotion Studio'yu açar.
// Çalışırken assets/ses klasörüne yeni ses konursa zamanlamalar yeniden hesaplanır.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const senkron = path.join(KOK, "scripts", "senkron.mjs");

spawnSync(process.execPath, [senkron], { cwd: KOK, stdio: "inherit" });
const izleyici = spawn(process.execPath, [senkron, "--izle"], { cwd: KOK, stdio: "inherit" });
const studio = spawn(windows ? "npx.cmd" : "npx", ["remotion", "studio"], {
  cwd: KOK,
  stdio: "inherit",
  shell: windows,
});
studio.on("exit", (kod) => {
  izleyici.kill();
  process.exit(kod ?? 0);
});
