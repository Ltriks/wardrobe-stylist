#!/usr/bin/env node
// Additive, repeatable upgrade. Existing records belong to the default wardrobe.
import { PrismaClient } from '@prisma/client';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const databaseUrl = process.env.WARDROBE_DATABASE_URL || `file:${resolve(root, 'prisma/dev.db')}`;
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const tables = ['ClothingItem', 'Outfit', 'PersonalTemplate', 'PendingUploadItem'];
const cli = resolve(root, 'node_modules/prisma/build/index.js');

try {
  const existing = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ClothingItem'");
  if (!existing.length) {
    if (process.env.WARDROBE_DATABASE_URL) throw new Error('Create the test database schema before preparing profiles.');
    execFileSync(process.execPath, [cli, 'db', 'push', '--skip-generate'], { stdio: 'inherit' });
  } else {
    const columns = await Promise.all(tables.map(table => prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)));
    const missing = tables.filter((_, index) => !columns[index].some(column => column.name === 'profileId'));
    if (missing.length) {
      const backups = resolve(root, 'data/backups');
      await mkdir(backups, { recursive: true });
      const backup = join(backups, `before-family-profiles-${Date.now()}.db`);
      // SQLite makes a consistent snapshot, including any WAL contents.
      await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
      console.log(`Database backup: ${backup}`);
      await prisma.$transaction(async tx => {
        for (const table of missing) {
          await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "profileId" TEXT NOT NULL DEFAULT 'default'`);
        }
      });
    }
  }
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "WardrobeProfile" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WardrobeProfile_name_key" ON "WardrobeProfile"("name")');
    for (const table of tables) {
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${table}_profileId_idx" ON "${table}"("profileId")`);
    }
    await tx.$executeRawUnsafe("INSERT OR IGNORE INTO WardrobeProfile (id, name, createdAt) VALUES ('default', '默认衣柜', ?)", Date.now());
  });
} finally {
  await prisma.$disconnect();
}

if (!process.argv.includes('--skip-generate')) {
  execFileSync(process.execPath, [cli, 'generate'], { stdio: 'inherit' });
}
console.log('Family wardrobes ready. Existing data stays in the default wardrobe.');
