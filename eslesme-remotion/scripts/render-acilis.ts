// Uygulama açılışı videolarının hepsini render eder (out/acilis/).
import { spawnSync } from 'node:child_process';
import { ACILIS } from '../src/acilis/list';

for (const a of ACILIS) {
  const r = spawnSync('npx', ['remotion', 'render', a.id, a.file], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
