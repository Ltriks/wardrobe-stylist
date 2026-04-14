import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { Category } from '../../types';

export const runtime = 'nodejs';
const execFileAsync = promisify(execFile);
const REMBG_PYTHON = '/Users/mcq/Repos/wardrobe-stylist/.venv-rembg/bin/python3';

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

function resolveUploadPath(sourceUrl: string) {
  const uploadsDir = resolve(process.cwd(), 'public', 'uploads');
  const pathname = sourceUrl.startsWith('http')
    ? new URL(sourceUrl).pathname
    : sourceUrl;

  if (!pathname.startsWith('/uploads/')) {
    throw new Error('Invalid upload path');
  }

  const filename = basename(pathname);
  const absolutePath = resolve(uploadsDir, filename);

  if (!absolutePath.startsWith(uploadsDir)) {
    throw new Error('Invalid upload filename');
  }

  return { uploadsDir, absolutePath };
}

function getCategoryScale(category: Category, aspectRatio: number) {
  switch (category) {
    case 'top':
      // Tops with sleeves spread wide look visually smaller than pants when both use
      // the same contain box, so give them an extra boost.
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
    const roleDelta =
      (inferRole(b) === 'outerLayer' ? 1 : 0) - (inferRole(a) === 'outerLayer' ? 1 : 0);
    if (roleDelta !== 0) return roleDelta;

    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    return aName.localeCompare(bName);
  });
}

function getBoardPlan(items: BoardItemInput[]): BoardPlan {
  const byCategory = categorizeItems(items);

  const slots = new Map<string, BoardSlot>();
  const roles = new Map<string, BoardRole>();
  const first = (items: BoardItemInput[]) => items[0];
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

    slots.set(topItem.id, {
      left: 250,
      top: 100,
      width: 520,
      height: 620,
    });
    slots.set(first(byCategory.bottom)!.id, {
      left: 390,
      top: 500,
      width: 360,
      height: 620,
    });
    slots.set(first(byCategory.shoes)!.id, {
      left: 450,
      top: 1030,
      width: 340,
      height: 240,
    });
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

    slots.set(leftClusterItem.id, {
      left: 110,
      top: 110,
      width: 430,
      height: 520,
    });

    slots.set(rightClusterItem.id, {
      left: 700,
      top: 95,
      width: 390,
      height: 500,
    });

    slots.set(first(byCategory.bottom)!.id, {
      left: 395,
      top: 505,
      width: 335,
      height: 590,
    });

    slots.set(first(byCategory.shoes)!.id, {
      left: 455,
      top: 1000,
      width: 340,
      height: 235,
    });

    return { slots, roles };
  }

  if (outerwearBottomShoesLook) {
    roles.set(first(byCategory.outerwear)!.id, 'outerLayer');
    roles.set(first(byCategory.bottom)!.id, 'bottomAnchor');
    roles.set(first(byCategory.shoes)!.id, 'shoeAnchor');

    slots.set(first(byCategory.outerwear)!.id, {
      left: 250,
      top: 100,
      width: 520,
      height: 620,
    });
    slots.set(first(byCategory.bottom)!.id, {
      left: 390,
      top: 500,
      width: 360,
      height: 620,
    });
    slots.set(first(byCategory.shoes)!.id, {
      left: 450,
      top: 1030,
      width: 340,
      height: 240,
    });
    return { slots, roles };
  }

  let topCursor = 70;
  byCategory.top.forEach(item => {
    roles.set(item.id, inferRole(item));
    slots.set(item.id, {
      left: topCursor,
      top: 130,
      width: 340,
      height: 450,
    });
    topCursor += 240;
  });

  let outerwearCursor = 760;
  byCategory.outerwear.forEach(item => {
    roles.set(item.id, 'outerLayer');
    slots.set(item.id, {
      left: outerwearCursor,
      top: 120,
      width: 320,
      height: 460,
    });
    outerwearCursor += 170;
  });

  let bottomCursor = 250;
  byCategory.bottom.forEach(item => {
    roles.set(item.id, 'bottomAnchor');
    slots.set(item.id, {
      left: bottomCursor,
      top: 340,
      width: 380,
      height: 670,
    });
    bottomCursor += 260;
  });

  let shoesCursor = Math.max(160, (BOARD_WIDTH - byCategory.shoes.length * 280 - Math.max(byCategory.shoes.length - 1, 0) * 20) / 2);
  byCategory.shoes.forEach(item => {
    roles.set(item.id, 'shoeAnchor');
    slots.set(item.id, {
      left: Math.round(shoesCursor),
      top: 1090,
      width: 280,
      height: 220,
    });
    shoesCursor += 300;
  });

  let accessoryCursor = 930;
  byCategory.accessory.forEach(item => {
    roles.set(item.id, 'accessory');
    slots.set(item.id, {
      left: accessoryCursor,
      top: 900,
      width: 150,
      height: 150,
    });
    accessoryCursor += 120;
  });

  let otherCursor = 180;
  byCategory.other.forEach(item => {
    roles.set(item.id, 'other');
    slots.set(item.id, {
      left: otherCursor,
      top: 650,
      width: 220,
      height: 280,
    });
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

  await execFileAsync(REMBG_PYTHON, ['-c', script, inputPath, outputPath], {
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function ensureCutoutAsset(item: BoardItemInput) {
  const { uploadsDir, absolutePath } = resolveUploadPath(item.imageUrl);
  const baseName = basename(absolutePath, extname(absolutePath));
  const cutoutDir = join(uploadsDir, 'cutouts');
  const cutoutPath = join(cutoutDir, `${baseName}-cutout.png`);

  if (!existsSync(cutoutPath)) {
    await mkdir(cutoutDir, { recursive: true });

    const tempOutputPath = join(
      uploadsDir,
      `temp-cutout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    );

    try {
      await runRembg(absolutePath, tempOutputPath);
      const cleanedBuffer = await sharp(tempOutputPath)
        .ensureAlpha()
        .trim()
        .png()
        .toBuffer();
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
      background: BOARD_BACKGROUND,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? (body.items as BoardItemInput[]) : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 });
    }

    const uploadsDir = resolve(process.cwd(), 'public', 'uploads');
    const boardsDir = join(uploadsDir, 'boards');
    await mkdir(boardsDir, { recursive: true });

    const boardFilename = `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const boardPath = join(boardsDir, boardFilename);

    const boardBuffer = await buildBoardImage(items);
    await writeFile(boardPath, boardBuffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/boards/${boardFilename}`,
    });
  } catch (error) {
    console.error('Board generation failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Board generation failed',
      },
      { status: 500 }
    );
  }
}
