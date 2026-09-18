import { Category, suggestClothingCategory } from '../../lib/clothing-categories';

export type Pixels = { data: ArrayLike<number>; width: number; height: number };
export type Prediction = { className: string; probability: number };
type Source = 'ai' | 'rule' | 'default';

export function colorFromRgb(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const value = max / 255, saturation = max ? delta / max : 0;
  if (value < 0.19) return 'black';
  if (saturation < 0.10) return value > 0.84 ? 'white' : 'gray';
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue >= 18 && hue <= 65 && saturation < 0.36 && value > 0.58) return 'beige';
  if (saturation < 0.17) return value > 0.9 ? 'white' : 'gray';
  if (hue < 18 || hue >= 340) return value > 0.68 && saturation < 0.6 ? 'pink' : 'red';
  if (hue < 45) return value < 0.7 ? 'brown' : 'orange';
  if (hue < 70) return value < 0.5 ? 'brown' : 'yellow';
  if (hue < 170) return 'green';
  if (hue < 260) return value < 0.56 ? 'navy' : 'blue';
  if (hue < 310) return 'purple';
  return value > 0.65 ? 'pink' : 'purple';
}

// A lightweight background heuristic, not segmentation: remove only the uniform
// colour connected to the image edge. Never delete all white pixels in a garment.
export function suggestPixelColor({ data, width, height }: Pixels): { color: string; confidence: number } {
  const count = width * height;
  if (width < 1 || height < 1 || data.length < count * 4) return { color: 'unknown', confidence: 0 };
  const border: number[] = [];
  for (let x = 0; x < width; x++) { border.push(x); if (height > 1) border.push((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { border.push(y * width); if (width > 1) border.push(y * width + width - 1); }
  const groups = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (const pixel of border) {
    const i = pixel * 4;
    if (data[i + 3] < 128) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key = [r, g, b].map(v => Math.round(v / 24)).join(',');
    const group = groups.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    group.count++; group.r += r; group.g += g; group.b += b; groups.set(key, group);
  }
  const clusters = Array.from(groups.values());
  const background = clusters.map(seed => {
    const neighbors = clusters.filter(group => Math.hypot(
      group.r / group.count - seed.r / seed.count,
      group.g / group.count - seed.g / seed.count,
      group.b / group.count - seed.b / seed.count,
    ) <= 32);
    return neighbors.reduce((sum, group) => ({ count: sum.count + group.count, r: sum.r + group.r, g: sum.g + group.g, b: sum.b + group.b }), { count: 0, r: 0, g: 0, b: 0 });
  }).sort((a, b) => b.count - a.count)[0];
  const uniformBackground = background && background.count >= border.length * 0.5;
  const removed = new Uint8Array(count);
  if (uniformBackground) {
    const rgb = [background.r, background.g, background.b].map(v => v / background.count);
    const queue = new Int32Array(count); let head = 0, tail = 0;
    const visit = (pixel: number) => {
      if (removed[pixel]) return;
      const i = pixel * 4;
      const distance = Math.hypot(data[i] - rgb[0], data[i + 1] - rgb[1], data[i + 2] - rgb[2]);
      if (data[i + 3] < 128 || distance <= 32) { removed[pixel] = 1; queue[tail++] = pixel; }
    };
    border.forEach(visit);
    while (head < tail) {
      const p = queue[head++], x = p % width;
      if (x > 0) visit(p - 1); if (x + 1 < width) visit(p + 1);
      if (p >= width) visit(p - width); if (p + width < count) visit(p + width);
    }
  }
  let foreground = 0;
  for (let p = 0; p < count; p++) if (!removed[p] && data[p * 4 + 3] >= 128) foreground++;
  // White-on-white cannot be reliably separated with this heuristic. Prefer a
  // modest centre-based suggestion instead of letting a tiny print determine it.
  const fallback = foreground < count * 0.08;
  const votes = new Map<string, number>(); let total = 0;
  for (let p = 0; p < count; p++) {
    if (data[p * 4 + 3] < 128 || (!fallback && removed[p])) continue;
    const x = (p % width + 0.5) / width, y = (Math.floor(p / width) + 0.5) / height;
    if (fallback && (x < 0.2 || x > 0.8 || y < 0.2 || y > 0.8)) continue;
    const weight = fallback || uniformBackground ? 1 : 0.03 + Math.pow(1 - Math.abs(x - 0.5) * 2, 2) * (1 - Math.abs(y - 0.5) * 2);
    const color = colorFromRgb(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    votes.set(color, (votes.get(color) ?? 0) + weight); total += weight;
  }
  const sorted = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
  if (!total || !sorted.length) return { color: 'unknown', confidence: 0 };
  const [color, amount] = sorted[0];
  const paleShades = ['white', 'gray', 'beige'];
  const justShading = paleShades.includes(color) && paleShades.includes(sorted[1]?.[0]);
  return { color: !justShading && amount / total < 0.55 && (sorted[1]?.[1] ?? 0) / total > 0.25 ? 'multicolor' : color, confidence: amount / total * (fallback ? 0.4 : 1) };
}

export function suggestFilenameColor(filename: string): string {
  const name = filename.toLowerCase().replace(/[_-]/g, ' ');
  const matches: [RegExp, string][] = [
    [/藏蓝|深蓝|\bnavy\b/, 'navy'], [/米白|米色|奶油|\b(beige|cream|ivory)\b/, 'beige'],
    [/白|\bwhite\b/, 'white'], [/黑|\bblack\b/, 'black'], [/灰|\b(gr[ae]y)\b/, 'gray'],
    [/蓝|\bblue\b/, 'blue'], [/粉|\bpink\b/, 'pink'], [/红|\bred\b/, 'red'],
    [/绿|\bgreen\b/, 'green'], [/黄|\byellow\b/, 'yellow'], [/紫|\bpurple\b/, 'purple'],
    [/橙|\borange\b/, 'orange'], [/棕|咖啡|\bbrown\b/, 'brown'],
  ];
  return matches.find(([pattern]) => pattern.test(name))?.[1] ?? 'unknown';
}

export function suggestModelCategory(predictions: Prediction[]): { category: Category; confidence: number } {
  const scores = new Map<Category, number>();
  for (const prediction of predictions) {
    const category = suggestClothingCategory(prediction.className);
    if (category !== 'other' && Number.isFinite(prediction.probability) && prediction.probability > 0)
      scores.set(category, (scores.get(category) ?? 0) + prediction.probability);
  }
  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const [category, score] = sorted[0] ?? ['other', 0];
  return score >= 0.45 && score - (sorted[1]?.[1] ?? 0) >= 0.12
    ? { category, confidence: Math.min(score, 1) } : { category: 'other', confidence: 0 };
}

export async function suggestLocalAttributes(filename: string, pixels?: Pixels, classify?: () => Promise<Prediction[]>) {
  let category = suggestClothingCategory(filename);
  let categorySource: Source = category === 'other' ? 'default' : 'rule';
  let confidence = 0;
  let rawPredictions = '';
  const filenameColor = suggestFilenameColor(filename);
  const sampled = pixels ? suggestPixelColor(pixels) : { color: 'unknown', confidence: 0 };
  // An explicit filename is useful for initial suggestions, especially pale fabrics.
  const color = filenameColor !== 'unknown' ? filenameColor : sampled.color;
  if (category === 'other' && classify) {
    try {
      const predictions = await classify();
      const suggested = suggestModelCategory(predictions);
      category = suggested.category; confidence = suggested.confidence;
      categorySource = category === 'other' ? 'default' : 'ai';
      rawPredictions = predictions.map(p => `${p.className} (${Math.round(p.probability * 100)}%)`).join(', ');
    } catch { rawPredictions = '本地分类暂不可用，已保留颜色与文件名建议'; }
  }
  return { category, categorySource, color, colorSource: (color === 'unknown' ? 'default' : 'rule') as Source, confidence, rawPredictions };
}
