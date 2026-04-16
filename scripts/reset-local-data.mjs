#!/usr/bin/env node
/**
 * Wipes local SQLite (prisma/dev.db) and all files under public/uploads/,
 * then recreates an empty DB from prisma/schema.prisma via `prisma db push`.
 *
 * Usage:
 *   npm run reset:local -- --yes
 *   RESET_LOCAL_DATA=1 npm run reset:local
 */

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const schemaPath = join(root, 'prisma', 'schema.prisma');
const uploadsRoot = join(root, 'public', 'uploads');
const prismaDir = join(root, 'prisma');

const subdirs = ['boards', 'cutouts', 'originals', 'standardized', 'tryons'];

function confirmed() {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) return true;
  if (process.env.RESET_LOCAL_DATA === '1') return true;
  return false;
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(schemaPath)) {
  console.error('Run this from the project root (missing prisma/schema.prisma).');
  process.exit(1);
}

if (!confirmed()) {
  console.error(
    'This will DELETE prisma/dev.db and ALL files under public/uploads/.\n' +
      'Re-run with:  npm run reset:local -- --yes\n' +
      'Or set env:     RESET_LOCAL_DATA=1 npm run reset:local',
  );
  process.exit(1);
}

console.log('Removing local SQLite database files…');
for (const name of ['dev.db', 'dev.db-journal', 'dev.db-wal', 'dev.db-shm']) {
  const p = join(prismaDir, name);
  if (existsSync(p)) rmSync(p, { force: true });
}

console.log('Clearing public/uploads…');
mkdirSync(uploadsRoot, { recursive: true });

for (const dir of subdirs) {
  const p = join(uploadsRoot, dir);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  mkdirSync(p, { recursive: true });
}

for (const name of readdirSync(uploadsRoot)) {
  if (name === '.gitkeep') continue;
  rmSync(join(uploadsRoot, name), { recursive: true, force: true });
}

writeFileSync(join(uploadsRoot, '.gitkeep'), '');

console.log('Applying Prisma schema (empty database)…');
run('npx', ['prisma', 'db', 'push']);

console.log('Done. Local data and uploads have been reset.');
