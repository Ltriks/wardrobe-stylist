import sharp from 'sharp';
import { BOARD_HEIGHT, BOARD_WIDTH, getBoardPlan } from './board-layout';

export type BoardImageInput = { id: string; category: string; image: Buffer };

export async function renderBoardImage(items: BoardImageInput[]): Promise<Buffer> {
  // Trim even cached cutouts so transparent padding never counts as garment size.
  const prepared = await Promise.all(items.map(async item => {
    const { data, info } = await sharp(item.image).rotate().ensureAlpha().trim().png().toBuffer({ resolveWithObject: true });
    return { ...item, image: data, width: info.width, height: info.height };
  }));
  const { slots } = getBoardPlan(prepared);
  const composites = await Promise.all(prepared.map(async item => {
    const slot = slots.get(item.id)!;
    const { data, info } = await sharp(item.image)
      .resize(slot.width, slot.height, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
    return { input: data, left: slot.left + Math.floor((slot.width - info.width) / 2), top: slot.top + Math.floor((slot.height - info.height) / 2) };
  }));
  return sharp({ create: { width: BOARD_WIDTH, height: BOARD_HEIGHT, channels: 4, background: { r: 244, g: 238, b: 228, alpha: 1 } } })
    .composite(composites).png().toBuffer();
}
