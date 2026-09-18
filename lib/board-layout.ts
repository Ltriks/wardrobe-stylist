import { categoryBoardGroup } from './clothing-categories';

export const BOARD_WIDTH = 1240;
export const BOARD_HEIGHT = 1360;
const MARGIN = 80;
const GAP = 48;

export type LayoutItem = { id: string; category: string; width: number; height: number };
export type BoardSlot = { left: number; top: number; width: number; height: number };

function priority(category: string) {
  const group = categoryBoardGroup(category);
  return { top: 0, outerwear: 1, whole: 2, other: 2, bottom: 3, shoes: 4, accessory: 5 }[group];
}

// Balance visible garment areas, not source resolution or category-specific fixed boxes.
// Shoes/accessories support the outfit; an unknown category is still a full-size garment.
function weight(category: string) {
  const group = categoryBoardGroup(category);
  return group === 'accessory' ? 0.28 : group === 'shoes' ? 0.45 : 1;
}

export function getBoardPlan(items: LayoutItem[]): { slots: Map<string, BoardSlot> } {
  const slots = new Map<string, BoardSlot>();
  if (!items.length) return { slots };
  const availableWidth = BOARD_WIDTH - 2 * MARGIN;
  const availableHeight = BOARD_HEIGHT - 2 * MARGIN;
  // Preserve the reference's aspect ratio, including unusually wide/long garments.
  const shapes = [...items].sort((a, b) => priority(a.category) - priority(b.category)).map(item => {
    const aspect = Math.max(1, item.width) / Math.max(1, item.height);
    const area = weight(item.category);
    return { item, width: Math.sqrt(area * aspect), height: Math.sqrt(area / aspect) };
  });
  // For a proposed common scale, find the row breaks requiring the least height.
  // Dynamic programming handles any item count without an exponential layout search.
  const arrange = (scale: number) => {
    const heights = Array(shapes.length + 1).fill(Infinity) as number[];
    const next = Array(shapes.length).fill(0) as number[];
    heights[shapes.length] = 0;
    for (let start = shapes.length - 1; start >= 0; start--) {
      let width = 0;
      let height = 0;
      for (let end = start; end < shapes.length; end++) {
        width += shapes[end].width * scale + (end > start ? GAP : 0);
        if (width > availableWidth) break;
        height = Math.max(height, shapes[end].height * scale);
        const total = height + (end + 1 < shapes.length ? GAP : 0) + heights[end + 1];
        if (total < heights[start]) { heights[start] = total; next[start] = end + 1; }
      }
    }
    return { height: heights[0], next };
  };

  let low = 0;
  let high = Math.min(...shapes.map(shape => Math.min(availableWidth / shape.width, availableHeight / shape.height)));
  for (let step = 0; step < 48; step++) {
    const mid = (low + high) / 2;
    if (arrange(mid).height <= availableHeight) low = mid;
    else high = mid;
  }
  const plan = arrange(low);
  let top = (BOARD_HEIGHT - plan.height) / 2;
  for (let start = 0; start < shapes.length;) {
    const end = plan.next[start];
    const row = shapes.slice(start, end);
    const rowHeight = Math.max(...row.map(shape => shape.height * low));
    const rowWidth = row.reduce((sum, shape) => sum + shape.width * low, 0) + GAP * (row.length - 1);
    let left = (BOARD_WIDTH - rowWidth) / 2;
    for (const shape of row) {
      const width = shape.width * low;
      const height = shape.height * low;
      slots.set(shape.item.id, { left: Math.round(left), top: Math.round(top + (rowHeight - height) / 2), width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) });
      left += width + GAP;
    }
    top += rowHeight + GAP;
    start = end;
  }
  return { slots };
}
