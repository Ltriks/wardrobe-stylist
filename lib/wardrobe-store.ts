import { Prisma } from '@prisma/client';

import { prisma } from './db';
import {
  ClothingItem,
  ClothingItemFormData,
  Outfit,
  OutfitFormData,
  OutfitItem,
  PendingItem,
  PersonalTemplate,
  BoardStatus,
  Season,
  TryOnStatus,
} from '@/app/types';

const outfitInclude = {
  items: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
} satisfies Prisma.OutfitInclude;

function parseSeasonValue(value: string | null | undefined): Season[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Season[]) : [];
  } catch {
    return [];
  }
}

function stringifySeasonValue(value: Season[] | undefined): string {
  return JSON.stringify(value ?? []);
}

function mapClothingItem(record: {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  imageUrl: string | null;
  standardizedImageUrl: string | null;
  cutoutImageUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClothingItem {
  return {
    id: record.id,
    name: record.name,
    category: record.category as ClothingItem['category'],
    color: record.color,
    season: parseSeasonValue(record.season),
    imageUrl: record.imageUrl ?? undefined,
    standardizedImageUrl: record.standardizedImageUrl ?? undefined,
    cutoutImageUrl: record.cutoutImageUrl ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapOutfitItem(record: {
  clothingItemId: string;
  offsetX: number;
  offsetY: number;
  scale: number;
}): OutfitItem {
  return {
    clothingItemId: record.clothingItemId,
    offsetX: record.offsetX,
    offsetY: record.offsetY,
    scale: record.scale,
  };
}

function mapOutfit(record: {
  id: string;
  name: string;
  boardImageUrl: string | null;
  boardStatus: string;
  boardError: string | null;
  tryOnImageUrl: string | null;
  tryOnStatus: string;
  tryOnPrompt: string | null;
  tryOnError: string | null;
  occasion: string | null;
  season: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    clothingItemId: string;
    offsetX: number;
    offsetY: number;
    scale: number;
  }>;
}): Outfit {
  return {
    id: record.id,
    name: record.name,
    items: record.items.map(mapOutfitItem),
    boardImageUrl: record.boardImageUrl ?? undefined,
    boardStatus: record.boardStatus as BoardStatus,
    boardError: record.boardError ?? undefined,
    tryOnImageUrl: record.tryOnImageUrl ?? undefined,
    tryOnStatus: record.tryOnStatus as TryOnStatus,
    tryOnPrompt: record.tryOnPrompt ?? undefined,
    tryOnError: record.tryOnError ?? undefined,
    occasion: record.occasion ?? undefined,
    season: parseSeasonValue(record.season),
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapTemplate(record: {
  id: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PersonalTemplate {
  return {
    id: record.id,
    name: record.name,
    imageUrl: record.imageUrl,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapPendingItem(record: {
  id: string;
  batchId: string;
  imageUrl: string;
  standardizedImageUrl: string | null;
  cutoutImageUrl: string | null;
  suggestedName: string;
  suggestedCategory: string;
  suggestedColor: string;
  suggestedSeason: string;
  status: string;
  aiConfidence: number | null;
  categorySource: string | null;
  colorSource: string | null;
  seasonSource: string | null;
  rawPredictions: string | null;
  isDuplicate: boolean;
  duplicateReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PendingItem {
  return {
    id: record.id,
    batchId: record.batchId,
    imageUrl: record.imageUrl,
    standardizedImageUrl: record.standardizedImageUrl ?? undefined,
    cutoutImageUrl: record.cutoutImageUrl ?? undefined,
    suggestedName: record.suggestedName,
    suggestedCategory: record.suggestedCategory as PendingItem['suggestedCategory'],
    suggestedColor: record.suggestedColor,
    suggestedSeason: parseSeasonValue(record.suggestedSeason),
    status: record.status as PendingItem['status'],
    aiConfidence: record.aiConfidence ?? undefined,
    categorySource: (record.categorySource as PendingItem['categorySource']) ?? undefined,
    colorSource: (record.colorSource as PendingItem['colorSource']) ?? undefined,
    seasonSource: (record.seasonSource as PendingItem['seasonSource']) ?? undefined,
    rawPredictions: record.rawPredictions ?? undefined,
    isDuplicate: record.isDuplicate,
    duplicateReason: record.duplicateReason ?? undefined,
  };
}

export async function listClothingItems(): Promise<ClothingItem[]> {
  const items = await prisma.clothingItem.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return items.map(mapClothingItem);
}

export async function createClothingItem(data: ClothingItemFormData): Promise<ClothingItem> {
  const item = await prisma.clothingItem.create({
    data: {
      name: data.name,
      category: data.category,
      color: data.color,
      season: stringifySeasonValue(data.season),
      imageUrl: data.imageUrl,
      standardizedImageUrl: data.standardizedImageUrl,
      cutoutImageUrl: data.cutoutImageUrl,
      notes: data.notes,
    },
  });

  return mapClothingItem(item);
}

export async function updateClothingItem(id: string, data: Partial<ClothingItemFormData>): Promise<ClothingItem | null> {
  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing) return null;

  const item = await prisma.clothingItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.season !== undefined ? { season: stringifySeasonValue(data.season) } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.standardizedImageUrl !== undefined ? { standardizedImageUrl: data.standardizedImageUrl } : {}),
      ...(data.cutoutImageUrl !== undefined ? { cutoutImageUrl: data.cutoutImageUrl } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  return mapClothingItem(item);
}

export async function removeClothingItem(id: string): Promise<boolean> {
  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.clothingItem.delete({ where: { id } });
  return true;
}

export async function listOutfits(): Promise<Outfit[]> {
  const outfits = await prisma.outfit.findMany({
    include: outfitInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return outfits.map(mapOutfit);
}

export async function getOutfitRecord(id: string): Promise<Outfit | null> {
  const outfit = await prisma.outfit.findUnique({
    where: { id },
    include: outfitInclude,
  });

  return outfit ? mapOutfit(outfit) : null;
}

export async function createOutfitRecord(data: OutfitFormData): Promise<Outfit> {
  const outfit = await prisma.outfit.create({
    data: {
      name: data.name,
      boardImageUrl: data.boardImageUrl,
      boardStatus: data.boardStatus ?? (data.boardImageUrl ? 'success' : 'idle'),
      boardError: data.boardError ?? null,
      tryOnStatus: 'idle',
      occasion: data.occasion,
      season: stringifySeasonValue(data.season),
      notes: data.notes,
      items: {
        create: data.itemIds.map((itemId, index) => ({
          clothingItemId: itemId,
          sortOrder: index,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        })),
      },
    },
    include: outfitInclude,
  });

  return mapOutfit(outfit);
}

export async function updateOutfitRecord(id: string, data: Partial<OutfitFormData>): Promise<Outfit | null> {
  const existing = await prisma.outfit.findUnique({
    where: { id },
    include: outfitInclude,
  });

  if (!existing) return null;

  const existingAdjustmentMap = new Map(
    existing.items.map(item => [
      item.clothingItemId,
      {
        offsetX: item.offsetX,
        offsetY: item.offsetY,
        scale: item.scale,
      },
    ]),
  );

  const itemsChanged = Array.isArray(data.itemIds);
  const boardChanged =
    data.boardImageUrl !== undefined && data.boardImageUrl !== existing.boardImageUrl;
  const boardStatusChanged = data.boardStatus !== undefined && data.boardStatus !== existing.boardStatus;
  const shouldResetBoard = itemsChanged || boardChanged || boardStatusChanged;
  const shouldResetTryOn = shouldResetBoard;

  const outfit = await prisma.$transaction(async tx => {
    if (data.itemIds) {
      await tx.outfitItem.deleteMany({ where: { outfitId: id } });
    }

    await tx.outfit.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.boardImageUrl !== undefined ? { boardImageUrl: data.boardImageUrl } : {}),
        ...(data.boardStatus !== undefined ? { boardStatus: data.boardStatus } : {}),
        ...(data.boardError !== undefined ? { boardError: data.boardError } : {}),
        ...(data.occasion !== undefined ? { occasion: data.occasion } : {}),
        ...(data.season !== undefined ? { season: stringifySeasonValue(data.season) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(shouldResetTryOn
          ? {
              ...(data.boardImageUrl === undefined ? { boardImageUrl: null } : {}),
              ...(data.boardStatus === undefined ? { boardStatus: 'idle' } : {}),
              ...(data.boardError === undefined ? { boardError: null } : {}),
              tryOnImageUrl: null,
              tryOnStatus: 'idle',
              tryOnPrompt: null,
              tryOnError: null,
            }
          : {}),
      },
    });

    if (data.itemIds) {
      await tx.outfitItem.createMany({
        data: data.itemIds.map((itemId, index) => {
          const existingAdjustment = existingAdjustmentMap.get(itemId);
          return {
            outfitId: id,
            clothingItemId: itemId,
            sortOrder: index,
            offsetX: existingAdjustment?.offsetX ?? 0,
            offsetY: existingAdjustment?.offsetY ?? 0,
            scale: existingAdjustment?.scale ?? 1,
          };
        }),
      });
    }

    return tx.outfit.findUniqueOrThrow({
      where: { id },
      include: outfitInclude,
    });
  });

  return mapOutfit(outfit);
}

export async function removeOutfit(id: string): Promise<boolean> {
  const existing = await prisma.outfit.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.outfit.delete({ where: { id } });
  return true;
}

export async function updateOutfitTryOnState(
  id: string,
  data: {
    tryOnImageUrl?: string | null;
    tryOnStatus?: TryOnStatus;
    tryOnPrompt?: string | null;
    tryOnError?: string | null;
  },
): Promise<Outfit | null> {
  const existing = await prisma.outfit.findUnique({
    where: { id },
    include: outfitInclude,
  });

  if (!existing) return null;

  const outfit = await prisma.outfit.update({
    where: { id },
    data: {
      ...(data.tryOnImageUrl !== undefined ? { tryOnImageUrl: data.tryOnImageUrl } : {}),
      ...(data.tryOnStatus !== undefined ? { tryOnStatus: data.tryOnStatus } : {}),
      ...(data.tryOnPrompt !== undefined ? { tryOnPrompt: data.tryOnPrompt } : {}),
      ...(data.tryOnError !== undefined ? { tryOnError: data.tryOnError } : {}),
    },
    include: outfitInclude,
  });

  return mapOutfit(outfit);
}

export async function updateOutfitBoardState(
  id: string,
  data: {
    boardImageUrl?: string | null;
    boardStatus?: BoardStatus;
    boardError?: string | null;
  },
): Promise<Outfit | null> {
  const existing = await prisma.outfit.findUnique({
    where: { id },
    include: outfitInclude,
  });

  if (!existing) return null;

  const outfit = await prisma.outfit.update({
    where: { id },
    data: {
      ...(data.boardImageUrl !== undefined ? { boardImageUrl: data.boardImageUrl } : {}),
      ...(data.boardStatus !== undefined ? { boardStatus: data.boardStatus } : {}),
      ...(data.boardError !== undefined ? { boardError: data.boardError } : {}),
      ...(data.boardStatus && data.boardStatus !== 'success'
        ? {
            tryOnImageUrl: null,
            tryOnStatus: 'idle',
            tryOnPrompt: null,
            tryOnError: null,
          }
        : {}),
    },
    include: outfitInclude,
  });

  return mapOutfit(outfit);
}

export async function listTemplates(): Promise<PersonalTemplate[]> {
  const templates = await prisma.personalTemplate.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return templates.map(mapTemplate);
}

export async function getDefaultTemplateRecord(): Promise<PersonalTemplate | null> {
  const template = await prisma.personalTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: 'asc' },
  });

  return template ? mapTemplate(template) : null;
}

export async function createTemplateRecord(data: { name: string; imageUrl: string; isDefault?: boolean }): Promise<PersonalTemplate> {
  const templateCount = await prisma.personalTemplate.count();
  const shouldBeDefault = data.isDefault ?? templateCount === 0;

  const template = await prisma.$transaction(async tx => {
    if (shouldBeDefault) {
      await tx.personalTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    return tx.personalTemplate.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl,
        isDefault: shouldBeDefault,
      },
    });
  });

  return mapTemplate(template);
}

export async function setDefaultTemplateRecord(id: string): Promise<PersonalTemplate | null> {
  const existing = await prisma.personalTemplate.findUnique({ where: { id } });
  if (!existing) return null;

  const template = await prisma.$transaction(async tx => {
    await tx.personalTemplate.updateMany({
      data: { isDefault: false },
    });

    return tx.personalTemplate.update({
      where: { id },
      data: { isDefault: true },
    });
  });

  return mapTemplate(template);
}

export async function removeTemplate(id: string): Promise<boolean> {
  const existing = await prisma.personalTemplate.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.$transaction(async tx => {
    await tx.personalTemplate.delete({ where: { id } });

    if (existing.isDefault) {
      const nextTemplate = await tx.personalTemplate.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (nextTemplate) {
        await tx.personalTemplate.update({
          where: { id: nextTemplate.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return true;
}

export async function listPendingUploadItems(batchId?: string): Promise<PendingItem[]> {
  const items = await prisma.pendingUploadItem.findMany({
    where: batchId ? { batchId } : undefined,
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  });

  return items.map(mapPendingItem);
}

export async function createPendingUploadBatch(items: PendingItem[], batchId?: string): Promise<{ batchId: string; items: PendingItem[] }> {
  const resolvedBatchId = batchId ?? crypto.randomUUID();

  await prisma.pendingUploadItem.createMany({
    data: items.map(item => ({
      id: item.id,
      batchId: resolvedBatchId,
      imageUrl: item.imageUrl,
      standardizedImageUrl: item.standardizedImageUrl,
      cutoutImageUrl: item.cutoutImageUrl,
      suggestedName: item.suggestedName,
      suggestedCategory: item.suggestedCategory,
      suggestedColor: item.suggestedColor,
      suggestedSeason: stringifySeasonValue(item.suggestedSeason),
      status: item.status,
      aiConfidence: item.aiConfidence,
      categorySource: item.categorySource,
      colorSource: item.colorSource,
      seasonSource: item.seasonSource,
      rawPredictions: item.rawPredictions,
      isDuplicate: item.isDuplicate ?? false,
      duplicateReason: item.duplicateReason,
    })),
  });

  return {
    batchId: resolvedBatchId,
    items: await listPendingUploadItems(resolvedBatchId),
  };
}

export async function updatePendingUploadItem(id: string, updates: Partial<PendingItem>): Promise<PendingItem | null> {
  const existing = await prisma.pendingUploadItem.findUnique({ where: { id } });
  if (!existing) return null;

  const item = await prisma.pendingUploadItem.update({
    where: { id },
    data: {
      ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl } : {}),
      ...(updates.standardizedImageUrl !== undefined ? { standardizedImageUrl: updates.standardizedImageUrl } : {}),
      ...(updates.cutoutImageUrl !== undefined ? { cutoutImageUrl: updates.cutoutImageUrl } : {}),
      ...(updates.suggestedName !== undefined ? { suggestedName: updates.suggestedName } : {}),
      ...(updates.suggestedCategory !== undefined ? { suggestedCategory: updates.suggestedCategory } : {}),
      ...(updates.suggestedColor !== undefined ? { suggestedColor: updates.suggestedColor } : {}),
      ...(updates.suggestedSeason !== undefined ? { suggestedSeason: stringifySeasonValue(updates.suggestedSeason) } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.aiConfidence !== undefined ? { aiConfidence: updates.aiConfidence } : {}),
      ...(updates.categorySource !== undefined ? { categorySource: updates.categorySource } : {}),
      ...(updates.colorSource !== undefined ? { colorSource: updates.colorSource } : {}),
      ...(updates.seasonSource !== undefined ? { seasonSource: updates.seasonSource } : {}),
      ...(updates.rawPredictions !== undefined ? { rawPredictions: updates.rawPredictions } : {}),
      ...(updates.isDuplicate !== undefined ? { isDuplicate: updates.isDuplicate } : {}),
      ...(updates.duplicateReason !== undefined ? { duplicateReason: updates.duplicateReason } : {}),
    },
  });

  return mapPendingItem(item);
}

export async function removePendingUploadItem(id: string): Promise<boolean> {
  const existing = await prisma.pendingUploadItem.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.pendingUploadItem.delete({ where: { id } });
  return true;
}

export async function clearPendingUploadBatch(batchId?: string): Promise<void> {
  await prisma.pendingUploadItem.deleteMany({
    where: batchId ? { batchId } : undefined,
  });
}
