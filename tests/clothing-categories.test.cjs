const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
function load(path, imports = require) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  new Function('exports', 'require', source)(exports, imports);
  return exports;
}
const categories = load('lib/clothing-categories.ts');
const { getBoardPlan } = load('lib/board-service.ts', name => {
  if (name === './clothing-categories') return categories;
  if (name.startsWith('@/lib/')) return {};
  return require(name);
});

test('specific Chinese and model labels distinguish skirts, homewear and underwear', () => {
  for (const [name, expected] of Object.entries({ '春秋家居服套装': 'loungewear', '睡裤': 'loungewear', 'pajama shirt': 'loungewear', 'undershirt': 'underwear', '棉质内裤': 'underwear', '连衣裙': 'dress', 'miniskirt': 'dress', '宝宝长裤': 'bottom', 't-shirt': 'top', '白色开衫': 'outerwear' })) {
    assert.equal(categories.suggestClothingCategory(name), expected, name);
  }
});

test('new categories and unknown categories retain every reference within the board canvas', () => {
  for (const category of ['dress', 'loungewear', 'underwear', 'future-category']) {
    for (const count of [1, 2, 4, 9, 20]) {
      const items = Array.from({ length: count }, (_, index) => ({ id: String(index), name: '测试', category: index === 0 ? category : 'top', imageUrl: '/test.png' }));
      const plan = getBoardPlan(items);
      assert.equal(plan.slots.size, items.length);
      for (const item of items) {
        const slot = plan.slots.get(item.id);
        assert.ok(slot.width > 0 && slot.height > 0);
        assert.ok(slot.left >= 0 && slot.top >= 0);
        assert.ok(slot.left + slot.width <= 1240 && slot.top + slot.height <= 1360);
        assert.equal(plan.roles.get(item.id), 'other');
      }
    }
  }
});

test('existing top, bottom and shoes keep their classic layout', () => {
  const items = ['top', 'bottom', 'shoes'].map(category => ({ id: category, category, name: category, imageUrl: '/test.png' }));
  const plan = getBoardPlan(items);
  assert.equal(plan.slots.size, 3);
  assert.equal(plan.roles.get('top'), 'primaryTop');
  assert.equal(plan.roles.get('bottom'), 'bottomAnchor');
  assert.equal(plan.roles.get('shoes'), 'shoeAnchor');
});
