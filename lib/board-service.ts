import { prisma } from './db';
import { categoryLayoutGroup } from './category-catalog';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

import { Category, Outfit } from '@/app/types';
import { renderBoardImage } from './board-renderer';
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

const globalForBoardQueue = globalThis as typeof globalThis & {
  wardrobeBoardJobs?: Set<string>;
};

const runningBoardJobs = globalForBoardQueue.wardrobeBoardJobs ?? new Set<string>();

if (!globalForBoardQueue.wardrobeBoardJobs) {
  globalForBoardQueue.wardrobeBoardJobs = runningBoardJobs;
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
  const catalog = await prisma.clothingCategory.findMany();
  const images = [];
  for (const item of items) {
    const cutoutPath = await ensureCutoutAsset(item);
    images.push({ id: item.id, category: categoryLayoutGroup(catalog.find(c=>c.id===item.category)?.group || "other"), image: await readFile(cutoutPath) });
  }
  return renderBoardImage(images);
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
