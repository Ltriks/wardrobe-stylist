const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const sharp = require('sharp');
const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const exports = {};
  const source = ts.transpileModule(readFileSync(`lib/${name}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  new Function('exports', 'require', source)(exports, path => path.startsWith('./') ? load(path.slice(2)) : require(path));
  return modules[name] = exports;
}
const { getBoardPlan, BOARD_WIDTH, BOARD_HEIGHT } = load('board-layout');
const { renderBoardImage } = load('board-renderer');
const item = (id, category, width, height) => ({ id, category, width, height });

test('single unknown, top and one-piece garments fill the frame and stay centered', () => {
  for (const category of ['other', 'top', 'loungewear', 'dress', 'unknown']) {
    const slot = getBoardPlan([item('a', category, 411, 466)]).slots.get('a');
    assert.ok(slot.width > 1000 && slot.height > 1100);
    assert.ok(Math.abs(slot.left + slot.width / 2 - BOARD_WIDTH / 2) <= 1);
    assert.ok(Math.abs(slot.top + slot.height / 2 - BOARD_HEIGHT / 2) <= 1);
  }
});

test('wide tops and narrow trousers have balanced visible areas independent of source resolution', () => {
  const plan = getBoardPlan([item('top', 'top', 507, 269), item('pants', 'bottom', 316, 512)]);
  const top = plan.slots.get('top'), pants = plan.slots.get('pants');
  assert.ok(Math.abs(top.width * top.height / (pants.width * pants.height) - 1) < 0.01);
  assert.ok(Math.abs(top.width / top.height - 507 / 269) < 0.01);
  assert.ok(top.width > pants.width);
  assert.deepEqual(plan, getBoardPlan([item('top', 'top', 5070, 2690), item('pants', 'bottom', 316, 512)]));
});

test('mixed and repeated categories retain every garment, without clipping or overlapping', () => {
  const categories = ['top', 'bottom', 'outerwear', 'loungewear', 'other', 'shoes', 'accessory'];
  for (const count of [2, 3, 4, 7, 12, 20]) {
    const items = Array.from({ length: count }, (_, i) => item(String(i), categories[i % categories.length], 180 + i * 51, 400 + (i % 3) * 400));
    const slots = [...getBoardPlan(items).slots.values()];
    assert.equal(slots.length, count);
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i];
      assert.ok(a.width > 0 && a.height > 0);
      assert.ok(a.left >= 79 && a.top >= 79 && a.left + a.width <= BOARD_WIDTH - 79 && a.top + a.height <= BOARD_HEIGHT - 79);
      for (const b of slots.slice(i + 1)) assert.ok(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
    }
  }
});

test('renderer removes transparent padding before sizing a single garment', async () => {
  const garment = await sharp({ create: { width: 100, height: 180, channels: 4, background: '#ff0000' } }).png().toBuffer();
  const padded = await sharp({ create: { width: 1000, height: 1000, channels: 4, background: '#00000000' } }).composite([{ input: garment, top: 700, left: 100 }]).png().toBuffer();
  const buffer = await renderBoardImage([{ id: 'a', category: 'other', image: padded }]);
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 240 && data[i + 1] < 20 && data[i + 2] < 20) { minX = Math.min(x, minX); maxX = Math.max(x, maxX); minY = Math.min(y, minY); maxY = Math.max(y, maxY); }
  }
  assert.ok(maxY - minY > 1150, 'visible garment must fill height despite source padding');
  assert.ok(Math.abs((minX + maxX) / 2 - BOARD_WIDTH / 2) < 2);
  assert.ok(Math.abs((minY + maxY) / 2 - BOARD_HEIGHT / 2) < 2);
});
