import { defineConfig } from "vitest/config";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 120000,
    // Testler gerçek .env ve veritabanına asla dokunmaz
    env: { TTN_ENV: path.join(os.tmpdir(), `ttn-test-${process.pid}.env`), TTN_DB: ":memory:" },
  },
});
