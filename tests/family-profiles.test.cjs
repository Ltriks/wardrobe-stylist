const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');

test('family wardrobes preserve old data and scope all wardrobe operations', async (t) => {
  const root = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'wardrobe-family-test-'));
  const databaseUrl = `file:${join(directory, 'dev.db')}`;
  const originalDatabaseUrl = process.env.WARDROBE_DATABASE_URL;
  let seed;
  let db;
  try {
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'junction');
    const schema = await readFile(join(root, 'prisma/schema.prisma'), 'utf8');
    const legacySchema = schema.replace(/^.*profileId.*\n/gm, '').replace(/model WardrobeProfile \{[^}]*\}/, '');
    const legacyPath = join(directory, 'legacy.prisma');
    await writeFile(legacyPath, legacySchema);
    execFileSync(process.execPath, [join(root, 'node_modules/prisma/build/index.js'), 'db', 'push', '--schema', legacyPath, '--skip-generate'], { stdio: 'pipe' });
    seed = new PrismaClient({ datasourceUrl: databaseUrl });
    await seed.$executeRawUnsafe("INSERT INTO ClothingItem (id,name,category,color,season,createdAt,updatedAt) VALUES ('legacy-item','Existing shirt','top','white','[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
    await seed.$executeRawUnsafe("INSERT INTO Outfit (id,name,season,createdAt,updatedAt) VALUES ('legacy-outfit','Existing outfit','[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
    await seed.$executeRawUnsafe("INSERT INTO OutfitItem (id,outfitId,clothingItemId) VALUES ('legacy-link','legacy-outfit','legacy-item')");
    await seed.$disconnect();
    seed = null;
    const prepare = () => execFileSync(process.execPath, [join(root, 'scripts/prepare-profiles.mjs'), '--skip-generate'], {
      cwd: directory, env: { ...process.env, WARDROBE_DATABASE_URL: databaseUrl }, stdio: 'pipe',
    });
    prepare();
    prepare(); // Startup can run repeatedly without changing data or member names.

    const compiled = join(directory, 'compiled');
    await mkdir(compiled);
    for (const filename of ['db', 'profile-context', 'wardrobe-store']) {
      const source = await readFile(join(root, `lib/${filename}.ts`), 'utf8');
      await writeFile(join(compiled, `${filename}.js`), ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText);
    }
    process.env.WARDROBE_DATABASE_URL = databaseUrl;
    db = require(join(compiled, 'db.js')).prisma;
    const store = require(join(compiled, 'wardrobe-store.js'));
    const { runWithProfile, currentProfileId } = require(join(compiled, 'profile-context.js'));
    const as = (id, action) => runWithProfile(id, action);
    await db.wardrobeProfile.create({ data: { id: 'child', name: '儿子' } });
    let childItem;
    let childOutfit;

    await t.test('migration backs up and retains legacy records and relationships', async () => {
      assert.equal((await readdir(join(directory, 'data/backups'))).length, 1);
      assert.equal((await as('default', store.listClothingItems))[0].id, 'legacy-item');
      const outfits = await as('default', store.listOutfits);
      assert.equal(outfits[0].items[0].clothingItemId, 'legacy-item');
      assert.equal((await as('child', store.listClothingItems)).length, 0);
      await db.wardrobeProfile.update({ where: { id: 'default' }, data: { name: '妈妈' } });
      prepare();
      assert.equal((await db.wardrobeProfile.findUnique({ where: { id: 'default' } })).name, '妈妈');
    });

    await t.test('clothing lists, edits and deletes stay within the selected wardrobe', async () => {
      childItem = await as('child', () => store.createClothingItem({ name: 'Child shirt', category: 'top', color: 'blue', season: [] }));
      assert.equal((await as('default', store.listClothingItems)).length, 1);
      assert.equal((await as('child', store.listClothingItems)).length, 1);
      assert.equal(await as('child', () => store.updateClothingItem('legacy-item', { name: 'Wrong' })), null);
      assert.equal(await as('child', () => store.removeClothingItem('legacy-item')), false);
      assert.equal((await as('child', () => store.updateClothingItem(childItem.id, { name: 'Child updated' }))).name, 'Child updated');
    });

    await t.test('outfits reject cross-member pieces, lookups, updates and job results', async () => {
      await assert.rejects(as('child', () => store.createOutfitRecord({ name: 'Mixed', itemIds: ['legacy-item'], season: [] })), /不属于/);
      childOutfit = await as('child', () => store.createOutfitRecord({ name: 'Child look', itemIds: [childItem.id], season: [] }));
      await assert.rejects(as('child', () => store.updateOutfitRecord(childOutfit.id, { itemIds: ['legacy-item'] })), /不属于/);
      assert.equal(await as('default', () => store.getOutfitRecord(childOutfit.id)), null);
      assert.equal(await as('default', () => store.updateOutfitRecord(childOutfit.id, { name: 'Wrong' })), null);
      assert.equal(await as('default', () => store.updateOutfitBoardState(childOutfit.id, { boardStatus: 'success' })), null);
      assert.equal(await as('default', () => store.updateOutfitTryOnState(childOutfit.id, { tryOnStatus: 'success' })), null);
      assert.equal(await as('default', () => store.removeOutfit(childOutfit.id)), false);
      assert.equal((await as('child', store.listOutfits)).length, 1);
    });

    await t.test('each member has an independent default personal template', async () => {
      const parent = await as('default', () => store.createTemplateRecord({ name: 'Parent', imageUrl: '/uploads/parent.png' }));
      const child = await as('child', () => store.createTemplateRecord({ name: 'Child', imageUrl: '/uploads/child.png' }));
      const child2 = await as('child', () => store.createTemplateRecord({ name: 'Child 2', imageUrl: '/uploads/child2.png' }));
      await as('child', () => store.setDefaultTemplateRecord(child2.id));
      assert.equal((await as('default', store.getDefaultTemplateRecord)).id, parent.id);
      assert.equal((await as('child', store.getDefaultTemplateRecord)).id, child2.id);
      assert.equal(await as('child', () => store.setDefaultTemplateRecord(parent.id)), null);
      assert.equal(await as('child', () => store.removeTemplate(parent.id)), false);
      await as('child', () => store.removeTemplate(child2.id));
      assert.equal((await as('child', store.getDefaultTemplateRecord)).id, child.id);
      assert.equal((await as('default', store.listTemplates)).length, 1);
    });

    await t.test('pending batches and clearing all pending items are member-scoped', async () => {
      const pending = id => ({ id, imageUrl: '/uploads/test.png', suggestedName: 'Test', suggestedCategory: 'top', suggestedColor: 'blue', suggestedSeason: [], status: 'pending' });
      await as('default', () => store.createPendingUploadBatch([pending('parent-pending')], 'shared-batch-id'));
      await as('child', () => store.createPendingUploadBatch([pending('child-pending')], 'shared-batch-id'));
      assert.equal((await as('child', () => store.listPendingUploadItems('shared-batch-id'))).length, 1);
      assert.equal(await as('child', () => store.updatePendingUploadItem('parent-pending', { suggestedName: 'Wrong' })), null);
      assert.equal(await as('child', () => store.removePendingUploadItem('parent-pending')), false);
      await as('child', () => store.clearPendingUploadBatch());
      assert.equal((await as('default', store.listPendingUploadItems)).length, 1);
      assert.equal((await as('child', store.listPendingUploadItems)).length, 0);
    });

    await t.test('concurrent and background operations keep their original member context', async () => {
      let background;
      as('child', () => {
        background = new Promise(resolve => setTimeout(resolve, 20)).then(async () => {
          assert.equal(currentProfileId(), 'child');
          return store.updateOutfitBoardState(childOutfit.id, { boardStatus: 'success', boardImageUrl: '/uploads/test-board.png' });
        });
      });
      const parent = await as('default', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        assert.equal(currentProfileId(), 'default');
        return store.listOutfits();
      });
      assert.equal(parent[0].id, 'legacy-outfit');
      assert.equal((await background).id, childOutfit.id);
      assert.throws(() => currentProfileId(), /选择成员/);
    });
  } finally {
    if (seed) await seed.$disconnect();
    if (db) await db.$disconnect();
    if (originalDatabaseUrl === undefined) delete process.env.WARDROBE_DATABASE_URL;
    else process.env.WARDROBE_DATABASE_URL = originalDatabaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
});
