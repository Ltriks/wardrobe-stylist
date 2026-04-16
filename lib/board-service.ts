import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

import { Category, Outfit } from '@/app/types';
import {
  boardsDir,
  cutoutsDir,
  ensureWardrobeAssetDirs,
  publicAssetUrl,
  resolveUploadAsset,
  uploadsRootDir,
} from '@/lib/wardrobe-assets';
import { getOutfitRecord, listClothingItems, updateOutfitBoardState } from '@/lib/wardrobe-store';

const execFileAsync = promisify(execFile);

/** Python that has `rembg` installed. Override with env `REMBG_PYTHON` if needed (e.g. Windows path). */
function getRembgPythonExecutable(): string {
  const fromEnv = process.env.REMBG_PYTHON?.trim();
  if (fromEnv) return fromEnv;

  if (process.platform === 'win32') {
    return join(process.cwd(), '.venv-rembg', 'Scripts', 'python.exe');
  }

  return join(process.cwd(), '.venv-rembg', 'bin', 'python3');
}

type BoardItemInput = {
  id: string;
  name: string;
  category: Category;
  imageUrl: string;
};

type BoardSlot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type CategorizedItems = Record<Category, BoardItemInput[]>;
type BoardRole = 'primaryTop' | 'outerLayer' | 'bottomAnchor' | 'shoeAnchor' | 'accessory' | 'other';
type BoardPlan = {
  slots: Map<string, BoardSlot>;
  roles: Map<string, BoardRole>;
};

const BOARD_WIDTH = 1240;
const BOARD_HEIGHT = 1360;
const BOARD_BACKGROUND = { r: 244, g: 238, b: 228, alpha: 1 };

const globalForBoardQueue = globalThis as typeof globalThis & {
  wardrobeBoardJobs?: Set<string>;
};

const runningBoardJobs = globalForBoardQueue.wardrobeBoardJobs ?? new Set<string>();

if (!globalForBoardQueue.wardrobeBoardJobs) {
  globalForBoardQueue.wardrobeBoardJobs = runningBoardJobs;
}

function getCategoryScale(category: Category, aspectRatio: number) {
  switch (category) {
    case 'top':
      return aspectRatio > 1.25 ? 1.62 : 1.36;
    case 'outerwear':
      return aspectRatio > 1.2 ? 1.42 : 1.26;
    case 'bottom':
      return 0.94;
    case 'shoes':
      return 1;
    case 'accessory':
      return 1;
    default:
      return 1.04;
  }
}

function categorizeItems(items: BoardItemInput[]): CategorizedItems {
  return {
    outerwear: items.filter(item => item.category === 'outerwear'),
    top: items.filter(item => item.category === 'top'),
    bottom: items.filter(item => item.category === 'bottom'),
    shoes: items.filter(item => item.category === 'shoes'),
    accessory: items.filter(item => item.category === 'accessory'),
    other: items.filter(item => item.category === 'other'),
  };
}

function inferRole(item: BoardItemInput): BoardRole {
  const name = item.name.toLowerCase();
  const outerwearHints = /(coat|jacket|parka|puffer|down|blazer|anorak|vest|outerwear|yurong|羽绒)/;

  if (item.category === 'bottom') return 'bottomAnchor';
  if (item.category === 'shoes') return 'shoeAnchor';
  if (item.category === 'accessory') return 'accessory';
  if (item.category === 'outerwear' || outerwearHints.test(name)) return 'outerLayer';
  if (item.category === 'top') return 'primaryTop';
  return 'other';
}

function getRoleScale(role: BoardRole, category: Category, aspectRatio: number) {
  if (role === 'primaryTop') {
    return aspectRatio > 1.25 ? 1.78 : 1.48;
  }
  if (role === 'outerLayer') {
    return aspectRatio > 1.2 ? 1.52 : 1.34;
  }
  if (role === 'bottomAnchor') {
    return 0.84;
  }
  if (role === 'shoeAnchor') {
    return 1;
  }
  return getCategoryScale(category, aspectRatio);
}

function sortTopCluster(items: BoardItemInput[]) {
  return [...items].sort((a, b) => {
    const roleDelta = (inferRole(b) === 'outerLayer' ? 1 : 0) - (inferRole(a) === 'outerLayer' ? 1 : 0);
    if (roleDelta !== 0) return roleDelta;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

function getBoardPlan(items: BoardItemInput[]): BoardPlan {
  const byCategory = categorizeItems(items);
  const slots = new Map<string, BoardSlot>();
  const roles = new Map<string, BoardRole>();
  const first = (list: BoardItemInput[]) => list[0];
  const topLikeItems = sortTopCluster([...byCategory.outerwear, ...byCategory.top]);

  const hasOuterwear = byCategory.outerwear.length > 0;
  const hasTop = byCategory.top.length > 0;
  const hasBottom = byCategory.bottom.length > 0;
  const hasShoes = byCategory.shoes.length > 0;
  const hasAccessory = byCategory.accessory.length > 0;

  const onlyClassicThreePiece =
    topLikeItems.length === 1 &&
    byCategory.bottom.length === 1 &&
    byCategory.shoes.length === 1 &&
    hasBottom &&
    hasShoes &&
    !hasAccessory &&
    byCategory.other.length === 0;

  const twoTopLayersBottomShoesLook =
    topLikeItems.length === 2 &&
    byCategory.bottom.length === 1 &&
    byCategory.shoes.length === 1 &&
    !hasAccessory &&
    byCategory.other.length === 0;

  const outerwearBottomShoesLook =
    hasOuterwear &&
    !hasTop &&
    hasBottom &&
    hasShoes &&
    !hasAccessory &&
    byCategory.other.length === 0;

  if (onlyClassicThreePiece) {
    const topItem = topLikeItems[0];
    roles.set(topItem.id, inferRole(topItem));
    roles.set(first(byCategory.bottom)!.id, 'bottomAnchor');
    roles.set(first(byCategory.shoes)!.id, 'shoeAnchor');
    slots.set(topItem.id, { left: 250, top: 100, width: 520, height: 620 });
    slots.set(first(byCategory.bottom)!.id, { left: 390, top: 500, width: 360, height: 620 });
    slots.set(first(byCategory.shoes)!.id, { left: 450, top: 1030, width: 340, height: 240 });
    return { slots, roles };
  }

  if (twoTopLayersBottomShoesLook) {
    const [firstTopLayer, secondTopLayer] = topLikeItems;
    const rightClusterItem = topLikeItems.find(item => inferRole(item) === 'outerLayer') ?? secondTopLayer;
    const leftClusterItem = topLikeItems.find(item => item.id !== rightClusterItem.id) ?? firstTopLayer;

    roles.set(leftClusterItem.id, inferRole(leftClusterItem));
    roles.set(rightClusterItem.id, inferRole(rightClusterItem));
    roles.set(first(byCategory.bottom)!.id, 'bottomAnchor');
    roles.set(first(byCategory.shoes)!.id, 'shoeAnchor');

    slots.set(leftClusterItem.id, { left: 135, top: 135, width: 360, height: 430 });
    slots.set(rightClusterItem.id, { left: 745, top: 120, width: 345, height: 420 });
    slots.set(first(byCategory.bottom)!.id, { left: 365, top: 420, width: 405, height: 690 });
    slots.set(first(byCategory.shoes)!.id, { left: 455, top: 1000, width: 340, height: 235 });
    return { slots, roles };
  }

  if (outerwearBottomShoesLook) {
    roles.set(first(byCategory.outerwear)!.id, 'outerLayer');
    roles.set(first(byCategory.bottom)!.id, 'bottomAnchor');
    roles.set(first(byCategory.shoes)!.id, 'shoeAnchor');
    slots.set(first(byCategory.outerwear)!.id, { left: 250, top: 100, width: 520, height: 620 });
    slots.set(first(byCategory.bottom)!.id, { left: 390, top: 500, width: 360, height: 620 });
    slots.set(first(byCategory.shoes)!.id, { left: 450, top: 1030, width: 340, height: 240 });
    return { slots, roles };
  }

  let topCursor = 70;
  byCategory.top.forEach(item => {
    roles.set(item.id, inferRole(item));
    slots.set(item.id, { left: topCursor, top: 130, width: 340, height: 450 });
    topCursor += 240;
  });

  let outerwearCursor = 760;
  byCategory.outerwear.forEach(item => {
    roles.set(item.id, 'outerLayer');
    slots.set(item.id, { left: outerwearCursor, top: 120, width: 320, height: 460 });
    outerwearCursor += 170;
  });

  let bottomCursor = 250;
  byCategory.bottom.forEach(item => {
    roles.set(item.id, 'bottomAnchor');
    slots.set(item.id, { left: bottomCursor, top: 340, width: 380, height: 670 });
    bottomCursor += 260;
  });

  let shoesCursor = Math.max(
    160,
    (BOARD_WIDTH - byCategory.shoes.length * 280 - Math.max(byCategory.shoes.length - 1, 0) * 20) / 2,
  );
  byCategory.shoes.forEach(item => {
    roles.set(item.id, 'shoeAnchor');
    slots.set(item.id, { left: Math.round(shoesCursor), top: 1090, width: 280, height: 220 });
    shoesCursor += 300;
  });

  let accessoryCursor = 930;
  byCategory.accessory.forEach(item => {
    roles.set(item.id, 'accessory');
    slots.set(item.id, { left: accessoryCursor, top: 900, width: 150, height: 150 });
    accessoryCursor += 120;
  });

  let otherCursor = 180;
  byCategory.other.forEach(item => {
    roles.set(item.id, 'other');
    slots.set(item.id, { left: otherCursor, top: 650, width: 220, height: 280 });
    otherCursor += 200;
  });

  return { slots, roles };
}

async function runRembg(inputPath: string, outputPath: string) {
  const script = [
    'from pathlib import Path',
    'from rembg import remove',
    'import sys',
    'source = Path(sys.argv[1])',
    'target = Path(sys.argv[2])',
    'target.write_bytes(remove(source.read_bytes()))',
  ].join('; ');

  await execFileAsync(getRembgPythonExecutable(), ['-c', script, inputPath, outputPath], {
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function ensureCutoutAsset(item: BoardItemInput) {
  await ensureWardrobeAssetDirs();
  const { absolutePath } = resolveUploadAsset(item.imageUrl);
  const baseName = basename(absolutePath, extname(absolutePath));
  const cutoutPath = join(cutoutsDir, `${baseName}-cutout.png`);

  if (!existsSync(cutoutPath)) {
    const tempOutputPath = join(uploadsRootDir, `temp-cutout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`);
    try {
      await runRembg(absolutePath, tempOutputPath);
      const cleanedBuffer = await sharp(tempOutputPath).ensureAlpha().trim().png().toBuffer();
      await writeFile(cutoutPath, cleanedBuffer);
    } catch (error) {
      const fallbackBuffer = await sharp(absolutePath)
        .rotate()
        .flatten({ background: '#ffffff' })
        .trim({ background: '#ffffff', threshold: 10 })
        .png()
        .toBuffer();
      await writeFile(cutoutPath, fallbackBuffer);
      console.warn(`Cutout fallback used for ${item.name}:`, error);
    } finally {
      if (existsSync(tempOutputPath)) {
        await unlink(tempOutputPath).catch(() => undefined);
      }
    }
  }

  return cutoutPath;
}

async function buildBoardImage(items: BoardItemInput[]) {
  const canvas = sharp({
    create: {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      channels: 4,
      background: { r: 244, g: 238, b: 228, alpha: 1 },
    },
  });

  const { slots, roles } = getBoardPlan(items);
  const composites: sharp.OverlayOptions[] = [];
  const orderedItems = [...items].sort((a, b) => {
    const order: Record<BoardRole, number> = {
      primaryTop: 20,
      outerLayer: 30,
      bottomAnchor: 10,
      shoeAnchor: 40,
      accessory: 50,
      other: 15,
    };
    return (order[roles.get(a.id) ?? 'other'] ?? 0) - (order[roles.get(b.id) ?? 'other'] ?? 0);
  });

  for (const item of orderedItems) {
    const slot = slots.get(item.id);
    if (!slot) continue;

    const cutoutPath = await ensureCutoutAsset(item);
    const metadata = await sharp(cutoutPath).metadata();
    const aspectRatio = (metadata.width ?? slot.width) / Math.max(metadata.height ?? slot.height, 1);
    const scale = getRoleScale(roles.get(item.id) ?? 'other', item.category, aspectRatio);
    const targetWidth = Math.round(slot.width * scale);
    const targetHeight = Math.round(slot.height * scale);

    const boardAsset = await sharp(cutoutPath)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    composites.push({
      input: boardAsset,
      top: slot.top - Math.round((targetHeight - slot.height) / 2),
      left: slot.left - Math.round((targetWidth - slot.width) / 2),
    });
  }

  return canvas.composite(composites).png().toBuffer();
}

function toBoardItems(outfit: Outfit, allItems: Awaited<ReturnType<typeof listClothingItems>>): BoardItemInput[] {
  return outfit.items
    .map(outfitItem => allItems.find(item => item.id === outfitItem.clothingItemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(item => Boolean(item.standardizedImageUrl || item.imageUrl))
    .map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      imageUrl: item.standardizedImageUrl || item.imageUrl!,
    }));
}

export async function executeBoardJob(outfitId: string) {
  const [outfit, allItems] = await Promise.all([getOutfitRecord(outfitId), listClothingItems()]);
  if (!outfit) throw new Error('Outfit not found.');

  const items = toBoardItems(outfit, allItems);
  if (items.length === 0) {
    throw new Error('This outfit does not have any valid item images for board generation.');
  }

  await ensureWardrobeAssetDirs();
  await mkdir(boardsDir, { recursive: true });

  const boardFilename = `board-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
  const boardPath = join(boardsDir, boardFilename);
  const boardBuffer = await buildBoardImage(items);
  await writeFile(boardPath, boardBuffer);

  return updateOutfitBoardState(outfitId, {
    boardImageUrl: publicAssetUrl('boards', boardFilename),
    boardStatus: 'success',
    boardError: null,
  });
}

export async function queueBoardJob(outfitId: string) {
  const outfit = await getOutfitRecord(outfitId);
  if (!outfit) throw new Error('Outfit not found.');

  if (runningBoardJobs.has(outfitId)) {
    return updateOutfitBoardState(outfitId, {
      boardStatus: 'generating',
      boardError: null,
    });
  }

  await updateOutfitBoardState(outfitId, {
    boardImageUrl: null,
    boardStatus: 'generating',
    boardError: null,
  });

  runningBoardJobs.add(outfitId);

  void (async () => {
    try {
      await executeBoardJob(outfitId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Board generation failed.';
      await updateOutfitBoardState(outfitId, {
        boardStatus: 'failed',
        boardError: message,
      });
    } finally {
      runningBoardJobs.delete(outfitId);
    }
  })();

  return getOutfitRecord(outfitId);
}
