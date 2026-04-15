import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

import { ensureWardrobeAssetDirs, publicAssetUrl, resolveUploadAsset, standardizedDir } from '@/lib/wardrobe-assets';

export const runtime = 'nodejs';

const TARGET_SIZE = 512;

async function createStandardizedPng(sourcePath: string, destinationPath: string) {
  const normalizedBuffer = await sharp(sourcePath)
    .rotate()
    // Flatten to white before trimming so plain product shots crop cleanly
    // without paying the rembg cost during upload.
    .flatten({ background: '#ffffff' })
    .trim({ background: '#ffffff', threshold: 10 })
    .png()
    .toBuffer();

  const { width, height } = await sharp(normalizedBuffer).metadata();
  const visibleArea = (width ?? 0) * (height ?? 0);

  if (!visibleArea || visibleArea < 4000) {
    throw new Error('Processed garment became too sparse');
  }

  const finalBuffer = await sharp(normalizedBuffer)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  await writeFile(destinationPath, finalBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sourceUrl = typeof body?.sourceUrl === 'string' ? body.sourceUrl : '';

    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    }

    await ensureWardrobeAssetDirs();

    const { filename, absolutePath } = resolveUploadAsset(sourceUrl);

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ error: 'Source image not found' }, { status: 404 });
    }

    const nameWithoutExt = filename.slice(0, filename.length - extname(filename).length);
    const standardizedFilename = `${nameWithoutExt}-standardized.png`;
    const standardizedPath = join(standardizedDir, standardizedFilename);

    await createStandardizedPng(absolutePath, standardizedPath);

    return NextResponse.json({
      success: true,
      url: publicAssetUrl('standardized', standardizedFilename),
    });
  } catch (error) {
    console.error('Garment processing failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Garment processing failed',
      },
      { status: 500 }
    );
  }
}
