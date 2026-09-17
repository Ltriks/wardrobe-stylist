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
    const outfitColumns = columns[tables.indexOf('Outfit')];
    const profileColumns = await prisma.$queryRawUnsafe('PRAGMA table_info("WardrobeProfile")');
    const missingFit = !outfitColumns.some(column => column.name === 'pantsFit');
    const missingResultFit = !outfitColumns.some(column => column.name === 'tryOnFit');
    const missingDefaultFit = !profileColumns.some(column => column.name === 'defaultPantsFit');
    if (missing.length || missingFit || missingResultFit || missingDefaultFit) {
      const backups = resolve(root, 'data/backups');
      await mkdir(backups, { recursive: true });
      const backup = join(backups, `before-wardrobe-upgrade-${Date.now()}.db`);
      // SQLite makes a consistent snapshot, including any WAL contents.
      await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
      console.log(`Database backup: ${backup}`);
      await prisma.$transaction(async tx => {
        for (const table of missing) {
          await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "profileId" TEXT NOT NULL DEFAULT 'default'`);
        }
        await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WardrobeProfile" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "defaultPantsFit" TEXT NOT NULL DEFAULT 'original')`);
        if (profileColumns.length && missingDefaultFit) {
          await tx.$executeRawUnsafe(`ALTER TABLE "WardrobeProfile" ADD COLUMN "defaultPantsFit" TEXT NOT NULL DEFAULT 'original'`);
        }
        if (missingDefaultFit) {
          // Seed the existing son's wardrobe once; renaming it later keeps this preference.
          await tx.$executeRawUnsafe(`UPDATE "WardrobeProfile" SET "defaultPantsFit" = 'natural' WHERE "name" = '儿子'`);
        }
        if (missingFit) {
          await tx.$executeRawUnsafe(`ALTER TABLE "Outfit" ADD COLUMN "pantsFit" TEXT NOT NULL DEFAULT 'original'`);
          await tx.$executeRawUnsafe(`UPDATE "Outfit" SET "pantsFit" = COALESCE((SELECT "defaultPantsFit" FROM "WardrobeProfile" WHERE "id" = "Outfit"."profileId"), 'original')`);
        }
        if (missingResultFit) {
          await tx.$executeRawUnsafe('ALTER TABLE "Outfit" ADD COLUMN "tryOnFit" TEXT');
          await tx.$executeRawUnsafe(`UPDATE "Outfit" SET "tryOnFit" = 'original' WHERE "tryOnImageUrl" IS NOT NULL`);
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
console.log('Wardrobe profiles and fit preferences ready.');
