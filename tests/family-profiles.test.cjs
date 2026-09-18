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
    const legacySchema = schema.replace(/model (?:ClothingCategory|CategoryFavorite) \{[^}]*\}/g, '').replace(/^.*usageTags.*\n/gm, '').replace(/^.*profileId.*\n/gm, '').replace(/^.*(?:pantsFit|tryOnFit).*\n/gm, '').replace(/model WardrobeProfile \{[^}]*\}/, '')
      .replace(/^.*size\s+String\?.*\n/gm, '')
      .replace(/model PendingUploadItem \{[^}]*\}/, block => block.replace(/^.*notes\s+String\?.*\n/gm, ''));
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
    for (const filename of ['db', 'profile-context', 'wardrobe-store', 'tryon-fit', 'category-store', 'category-catalog']) {
      const source = await readFile(join(root, `lib/${filename}.ts`), 'utf8');
      await writeFile(join(compiled, `${filename}.js`), ts.transpileModule(source, {
        compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText);
    }
    await writeFile(join(compiled, 'category-defaults.json'), await readFile(join(root, 'lib/category-defaults.json')));
    process.env.WARDROBE_DATABASE_URL = databaseUrl;
    db = require(join(compiled, 'db.js')).prisma;
    const store = require(join(compiled, 'wardrobe-store.js'));
    const { runWithProfile, currentProfileId } = require(join(compiled, 'profile-context.js'));
    const as = (id, action) => runWithProfile(id, action);
    await db.wardrobeProfile.create({ data: { id: 'child', name: '儿子', defaultPantsFit: 'natural' } });
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

    await t.test('fit preferences persist per outfit, inherit member defaults, and preserve existing images', async () => {
      assert.equal((await as('default', store.listOutfits))[0].pantsFit, 'original');
      assert.equal(childOutfit.pantsFit, 'natural');
      await as('child', () => store.updateOutfitBoardState(childOutfit.id, { boardStatus: 'success', boardImageUrl: '/uploads/board.png' }));
      await as('child', () => store.updateOutfitTryOnState(childOutfit.id, { tryOnStatus: 'success', tryOnImageUrl: '/uploads/old.png', tryOnFit: 'natural', tryOnPrompt: 'old prompt' }));
      const changed = await as('child', () => store.updateOutfitRecord(childOutfit.id, { pantsFit: 'loose' }));
      assert.equal(changed.pantsFit, 'loose');
      assert.equal(changed.tryOnFit, 'natural');
      assert.equal(changed.tryOnImageUrl, '/uploads/old.png');
      assert.equal(changed.boardImageUrl, '/uploads/board.png');
      assert.equal((await as('child', () => store.getOutfitRecord(childOutfit.id))).pantsFit, 'loose');
      assert.equal(await as('default', () => store.updateOutfitRecord(childOutfit.id, { pantsFit: 'original' })), null);
      for (const pantsFit of ['skinny', '', null, 1]) {
        await assert.rejects(as('child', () => store.updateOutfitRecord(childOutfit.id, { pantsFit })), /服装版型/);
      }
      await as('child', () => store.updateOutfitTryOnState(childOutfit.id, { tryOnStatus: 'generating' }));
      await assert.rejects(as('child', () => store.updateOutfitRecord(childOutfit.id, { pantsFit: 'original' })), /生成中/);
      await as('child', () => store.updateOutfitTryOnState(childOutfit.id, { tryOnStatus: 'success', tryOnFit: 'loose' }));
      assert.equal((await as('child', () => store.getOutfitRecord(childOutfit.id))).tryOnFit, 'loose');
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

    await t.test('catalog edits preserve IDs and history, favorites remain member-scoped, and tags round trip', async () => {
      const catalog = require(join(compiled, 'category-store.js'));
      const custom = await as('child', () => catalog.saveCategory({label:'宝宝背带裤',group:'whole',sortOrder:2}));
      await as('child', () => catalog.setCategoryFavorite(custom.id,true));
      assert.ok((await as('child',catalog.categoryCatalog)).favorites.includes(custom.id));
      assert.equal((await as('default',catalog.categoryCatalog)).favorites.includes(custom.id),false);
      const garment = await as('child',()=>store.createClothingItem({name:'背带裤',category:custom.id,color:'蓝色',season:[],usageTags:['home','daily']}));
      assert.deepEqual(garment.usageTags,['home','daily']);
      await assert.rejects(as('child',()=>store.updateClothingItem(garment.id,{usageTags:['invalid']})), /用途/);
      await as('child',()=>catalog.saveCategory({...custom,label:'婴儿背带裤',active:false}));
      assert.equal((await as('child',()=>store.updateClothingItem(garment.id,{category:custom.id,name:'新名字'}))).category,custom.id);
      await assert.rejects(as('child',()=>store.createClothingItem({name:'新衣',category:custom.id,color:'白',season:[]})),/停用/);
      await assert.rejects(as('child',()=>catalog.saveCategory({id:'top',label:'上装',group:'top',active:false})),/基础分类/);
      await assert.rejects(as('child',()=>catalog.saveCategory({label:'错误',group:'missing'})),/部位/);
      prepare();
      const after = await as('default',catalog.categoryCatalog);
      assert.equal(after.categories.find(c=>c.id===custom.id).label,'婴儿背带裤');
      assert.equal(after.categories.find(c=>c.id===custom.id).active,false);
      assert.equal((await readdir(join(directory,'data/backups'))).length,1);
    });

    await t.test('batch drafts persist notes, size and manual seasons, and confirm atomically within their wardrobe', async () => {
      const id = 'metadata-draft';
      await as('child', () => store.createPendingUploadBatch([{ id, imageUrl: '/uploads/test.png', cutoutImageUrl: '/uploads/cutout.png', suggestedName: '旧名', suggestedCategory: 'top', suggestedColor: '白色', suggestedSeason: [], status: 'pending', notes: '初始备注', size: '80' }], 'metadata-batch'));
      assert.equal(await as('default', () => store.confirmPendingUploadItem(id)), null);
      await as('child', () => store.updatePendingUploadItem(id, { suggestedName: '', notes: '', size: '' }));
      await assert.rejects(as('child', () => store.confirmPendingUploadItem(id)), /名称/);
      const empty = (await as('child', () => store.listPendingUploadItems('metadata-batch')))[0];
      assert.equal(empty.notes, '');
      assert.equal(empty.size, '');
      await as('child', () => store.updatePendingUploadItem(id, { suggestedName: '宝宝上衣', notes: '柔软棉质', size: '90/52', usageTags: ['home','sleep'], suggestedSeason: ['spring', 'autumn'] }));
      const item = await as('child', () => store.confirmPendingUploadItem(id));
      assert.equal(item.name, '宝宝上衣');
      assert.equal(item.notes, '柔软棉质');
      assert.equal(item.size, '90/52');
      assert.deepEqual(item.usageTags,['home','sleep']);
      assert.deepEqual(item.season, ['spring', 'autumn']);
      assert.equal(item.cutoutImageUrl, '/uploads/cutout.png');
      assert.equal((await as('child', () => store.listPendingUploadItems('metadata-batch'))).length, 0);
      assert.equal(await as('child', () => store.confirmPendingUploadItem(id)), null);
      assert.equal((await as('child', store.listClothingItems)).filter(row => row.name === '宝宝上衣').length, 1);
      const edited = await as('child', () => store.updateClothingItem(item.id, { size: '100', notes: '手动修改', season: [] }));
      assert.equal(edited.size, '100');
      assert.deepEqual(edited.season, []);
    });
  } finally {
    if (seed) await seed.$disconnect();
    if (db) await db.$disconnect();
    if (originalDatabaseUrl === undefined) delete process.env.WARDROBE_DATABASE_URL;
    else process.env.WARDROBE_DATABASE_URL = originalDatabaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
});

test('upgrading existing family wardrobes seeds fit defaults once without changing old results', async () => {
  const root = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'wardrobe-fit-upgrade-'));
  const databaseUrl = `file:${join(directory, 'dev.db')}`;
  const db = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'junction');
    const schema = (await readFile(join(root, 'prisma/schema.prisma'), 'utf8')).replace(/^.*(?:pantsFit|tryOnFit|defaultPantsFit).*\n/gm, '');
    await writeFile(join(directory, 'legacy.prisma'), schema);
    execFileSync(process.execPath, [join(root, 'node_modules/prisma/build/index.js'), 'db', 'push', '--schema', join(directory, 'legacy.prisma'), '--skip-generate'], { stdio: 'pipe' });
    await db.$executeRawUnsafe("INSERT INTO WardrobeProfile (id,name) VALUES ('child','儿子'),('default','默认衣柜')");
    for (const profile of ['child', 'default']) {
      await db.$executeRawUnsafe("INSERT INTO Outfit (id,profileId,name,season,tryOnImageUrl,tryOnStatus,tryOnPrompt,createdAt,updatedAt) VALUES (?,?,?,'[]','/uploads/old.png','success','original prompt',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", profile, profile, profile);
    }
    const prepare = () => execFileSync(process.execPath, [join(root, 'scripts/prepare-profiles.mjs'), '--skip-generate'], { cwd: directory, env: { ...process.env, WARDROBE_DATABASE_URL: databaseUrl }, stdio: 'pipe' });
    prepare();
    const child = await db.outfit.findUnique({ where: { id: 'child' } });
    assert.equal(child.pantsFit, 'natural');
    assert.equal(child.tryOnFit, 'original');
    assert.equal(child.tryOnImageUrl, '/uploads/old.png');
    assert.equal(child.tryOnPrompt, 'original prompt');
    assert.equal((await db.outfit.findUnique({ where: { id: 'default' } })).pantsFit, 'original');
    assert.equal((await db.wardrobeProfile.findUnique({ where: { id: 'child' } })).defaultPantsFit, 'natural');
    await db.outfit.update({ where: { id: 'child' }, data: { pantsFit: 'loose' } });
    await db.wardrobeProfile.update({ where: { id: 'child' }, data: { name: '果果' } });
    prepare();
    assert.equal((await db.outfit.findUnique({ where: { id: 'child' } })).pantsFit, 'loose');
    assert.equal((await db.wardrobeProfile.findUnique({ where: { id: 'child' } })).defaultPantsFit, 'natural');
    assert.equal((await readdir(join(directory, 'data/backups'))).length, 1);
  } finally {
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
