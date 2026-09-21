import { logTryOnError, safeTryOnError } from './tryon-diagnostics';
import { currentProfileId } from './profile-context';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import { generateTryOnImage } from '@/lib/modelstudio-image';
import { ensureWardrobeAssetDirs, publicAssetUrl, resolveUploadAsset, tryonsDir } from '@/lib/wardrobe-assets';
import { getDefaultTemplateRecord, getOutfitRecord, updateOutfitTryOnState } from '@/lib/wardrobe-store';

const globalForTryOnQueue = globalThis as typeof globalThis & {
  wardrobeTryOnJobs?: Set<string>;
};

const runningJobs = globalForTryOnQueue.wardrobeTryOnJobs ?? new Set<string>();

if (!globalForTryOnQueue.wardrobeTryOnJobs) {
  globalForTryOnQueue.wardrobeTryOnJobs = runningJobs;
}

export async function executeTryOnJob(outfitId: string) {
  let stage = 'prepare-references';
  try {
    const [outfit, template] = await Promise.all([
      getOutfitRecord(outfitId),
      getDefaultTemplateRecord(),
    ]);

    if (!outfit) {
      throw new Error('Outfit not found.');
    }

    if (!outfit.boardImageUrl) {
      throw new Error('This outfit does not have a board image yet.');
    }

    if (!template) {
      throw new Error('Upload and set a default template before generating a try-on preview.');
    }

    await ensureWardrobeAssetDirs();

    const templateAsset = resolveUploadAsset(template.imageUrl);
    const boardAsset = resolveUploadAsset(outfit.boardImageUrl);

    stage = 'generate-image';
    const { imageUrl, prompt } = await generateTryOnImage({
      templateImagePath: templateAsset.absolutePath,
      boardImagePath: boardAsset.absolutePath,
      clothingFit: outfit.pantsFit ?? 'original',
    });

    stage = 'download-result';
    const generatedImage = await fetch(imageUrl);
    if (!generatedImage.ok) {
      throw safeTryOnError(new Error(`Failed to download generated image (${generatedImage.status}).`), { httpStatus: generatedImage.status });
    }

    const arrayBuffer = await generatedImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `tryon-${Date.now()}-${randomUUID().slice(0, 8)}${extname(basename(new URL(imageUrl).pathname)) || '.png'}`;
    const outputPath = join(tryonsDir, filename);
    stage = 'save-result';
    await writeFile(outputPath, buffer);

    const updatedOutfit = await updateOutfitTryOnState(outfitId, {
      tryOnImageUrl: publicAssetUrl('tryons', filename),
      tryOnStatus: 'success',
      tryOnPrompt: prompt,
      tryOnFit: outfit.pantsFit ?? 'original',
      tryOnError: null,
    });

    return updatedOutfit;
  } catch (error) {
    throw safeTryOnError(error, { stage });
  }
}

export async function queueTryOnJob(outfitId: string) {
  const outfit = await getOutfitRecord(outfitId);
  if (!outfit) {
    throw new Error('Outfit not found.');
  }

  if (!outfit.boardImageUrl) {
    throw new Error('This outfit does not have a board image yet.');
  }

  const template = await getDefaultTemplateRecord();
  if (!template) {
    throw new Error('Upload and set a default template before generating a try-on preview.');
  }

  if (runningJobs.has(outfitId)) {
    return updateOutfitTryOnState(outfitId, {
      tryOnStatus: 'generating',
      tryOnError: null,
    });
  }

  await updateOutfitTryOnState(outfitId, {
    tryOnStatus: 'generating',
    tryOnError: null,
  });

  runningJobs.add(outfitId);

  void (async () => {
    try {
      await executeTryOnJob(outfitId);
    } catch (error) {
      const safe = safeTryOnError(error);
      const context = { outfitId, profileId: currentProfileId() };
      logTryOnError('job-failed', safe, context);
      try {
        await updateOutfitTryOnState(outfitId, {
          tryOnStatus: 'failed',
          tryOnError: safe.message,
        });
      } catch (saveError) {
        logTryOnError('failure-state-save-failed', saveError, { ...context, stage: 'save-failure-state' });
      }
    } finally {
      runningJobs.delete(outfitId);
    }
  })();

  return getOutfitRecord(outfitId);
}
