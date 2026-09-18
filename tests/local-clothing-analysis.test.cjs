const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
function load(file) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(exports, name => name.includes('clothing-categories') ? load('lib/clothing-categories.ts') : require(name));
  return exports;
}
const { colorFromRgb, suggestPixelColor, suggestFilenameColor, suggestModelCategory, suggestLocalAttributes } = load('app/lib/local-clothing-analysis.ts');
function pixels(draw, width = 100, height = 100) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(draw(x, y), (y * width + x) * 4);
  return { data, width, height };
}
const blueOnWhite = pixels((x, y) => x > 30 && x < 70 && y > 15 && y < 85 ? [35, 80, 190, 255] : [255, 255, 255, 255]);

test('removes edge-connected white and textured grey backgrounds, retaining garment colour', () => {
  assert.equal(suggestPixelColor(blueOnWhite).color, 'blue');
  const creamOnGrey = pixels((x, y) => x > 25 && x < 75 && y > 10 && y < 90 ? [224, 207, 181, 255] : [130 + (x % 12), 130 + (x % 12), 130 + (x % 12), 255]);
  assert.equal(suggestPixelColor(creamOnGrey).color, 'beige');
});

test('white fabric remains white, transparent padding and fully transparent images are handled', () => {
  const whiteOnBlue = pixels((x, y) => x > 20 && x < 80 && y > 10 && y < 90 ? [245, 245, 245, 255] : [40, 70, 150, 255]);
  assert.equal(suggestPixelColor(whiteOnBlue).color, 'white');
  const whiteWithPrint = pixels((x, y) => x > 48 && x < 53 && y > 48 && y < 53 ? [10, 20, 80, 255] : [250, 250, 250, 255]);
  assert.equal(suggestPixelColor(whiteWithPrint).color, 'white');
  const navyTransparent = pixels((x, y) => x > 20 && x < 80 && y > 10 && y < 90 ? [30, 45, 85, 255] : [255, 255, 255, 0]);
  assert.equal(suggestPixelColor(navyTransparent).color, 'navy');
  assert.equal(suggestPixelColor(pixels(() => [0, 0, 0, 0])).color, 'unknown');
});

test('neutral shades are not RGB-channel guesses, and colour keywords respect word boundaries', () => {
  for (const [rgb, expected] of [[[185, 185, 185], 'gray'], [[235, 220, 192], 'beige'], [[25, 40, 95], 'navy'], [[235, 170, 185], 'pink']]) assert.equal(colorFromRgb(...rgb), expected);
  assert.equal(suggestFilenameColor('藏蓝宝宝裤子.jpg'), 'navy');
  assert.equal(suggestFilenameColor('米白连体衣.jpg'), 'beige');
  assert.equal(suggestFilenameColor('redshank_image.jpg'), 'unknown');
});

test('colour suggestions work before model load and after classification failure', async () => {
  const noModel = await suggestLocalAttributes('IMG_123.jpg', blueOnWhite);
  assert.equal(noModel.color, 'blue');
  assert.equal(noModel.colorSource, 'rule');
  assert.equal(noModel.category, 'other');
  const failed = await suggestLocalAttributes('IMG_123.jpg', blueOnWhite, async () => { throw new Error('WebGL unavailable'); });
  assert.equal(failed.color, 'blue');
  assert.equal(failed.categorySource, 'default');
});

test('explicit filename suggestions skip inference; confident unrelated labels never override them', async () => {
  let calls = 0;
  const result = await suggestLocalAttributes('米色宝宝连体衣.jpg', blueOnWhite, async () => { calls++; return [{ className: 'dog', probability: 0.98 }]; });
  assert.equal(calls, 0);
  assert.equal(result.category, 'loungewear');
  assert.equal(result.categorySource, 'rule');
  assert.equal(result.color, 'beige');
  assert.deepEqual(suggestModelCategory([{ className: 'dog', probability: 0.95 }, { className: 'jersey', probability: 0.02 }]), { category: 'other', confidence: 0 });
});

test('related model labels combine into a suggestion, while competing categories remain uncertain', () => {
  assert.equal(suggestModelCategory([{ className: 'jersey', probability: 0.3 }, { className: 'sweatshirt', probability: 0.26 }]).category, 'top');
  assert.equal(suggestModelCategory([{ className: 'shirt', probability: 0.48 }, { className: 'jeans', probability: 0.43 }]).category, 'other');
});
