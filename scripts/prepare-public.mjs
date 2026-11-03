import './build-icons.mjs';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
mkdirSync('public', { recursive: true });
for (const dir of ['assets', 'data', 'admitright']) {
  if (existsSync(dir)) cpSync(dir, `public/${dir}`, { recursive: true });
}
