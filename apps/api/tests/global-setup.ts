import { execSync } from 'node:child_process';
import fs from 'node:fs';

/** Creates a fresh SQLite test DB with seed data before the suite, cleans up after. */
export default function setup() {
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: 'file:./test.db' };
  fs.rmSync('prisma/test.db', { force: true });
  execSync('npx prisma db push --skip-generate', { env, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'pipe' });

  return () => {
    fs.rmSync('uploads-test', { recursive: true, force: true });
  };
}
