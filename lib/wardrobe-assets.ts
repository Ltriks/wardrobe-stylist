import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, join, normalize, resolve } from 'node:path';

export const uploadsRootDir = resolve(process.cwd(), 'public', 'uploads');
export const originalsDir = join(uploadsRootDir, 'originals');
export const standardizedDir = join(uploadsRootDir, 'standardized');
export const cutoutsDir = join(uploadsRootDir, 'cutouts');
export const boardsDir = join(uploadsRootDir, 'boards');
export const tryonsDir = join(uploadsRootDir, 'tryons');

const UPLOAD_PREFIX = '/uploads/';
const KNOWN_DIRS = new Set(['originals', 'standardized', 'cutouts', 'boards', 'tryons']);

export async function ensureWardrobeAssetDirs() {
  await Promise.all([
    mkdir(uploadsRootDir, { recursive: true }),
    mkdir(originalsDir, { recursive: true }),
    mkdir(standardizedDir, { recursive: true }),
    mkdir(cutoutsDir, { recursive: true }),
    mkdir(boardsDir, { recursive: true }),
    mkdir(tryonsDir, { recursive: true }),
  ]);
}

export function publicAssetUrl(subdir: 'originals' | 'standardized' | 'cutouts' | 'boards' | 'tryons', filename: string) {
  return `/uploads/${subdir}/${filename}`;
}

export function resolveUploadAsset(sourceUrl: string) {
  const pathname = sourceUrl.startsWith('http')
    ? new URL(sourceUrl).pathname
    : sourceUrl;

  if (!pathname.startsWith(UPLOAD_PREFIX)) {
    throw new Error('Invalid upload path');
  }

  const relativePath = pathname.slice(UPLOAD_PREFIX.length);
  const normalizedPath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const segments = normalizedPath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Invalid upload path');
  }

  const maybeDir = segments[0];
  const dir = KNOWN_DIRS.has(maybeDir) ? maybeDir : 'root';
  const filename = basename(segments[segments.length - 1]);
  const absolutePath = resolve(
    uploadsRootDir,
    dir === 'root' ? filename : join(dir, filename),
  );

  if (!absolutePath.startsWith(uploadsRootDir)) {
    throw new Error('Invalid upload filename');
  }

  return {
    dir,
    filename,
    absolutePath,
    exists: existsSync(absolutePath),
  };
}
