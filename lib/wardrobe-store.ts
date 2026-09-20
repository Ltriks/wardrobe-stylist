import { validateCategory } from './category-store';
import { parseUsageTags } from './category-catalog';
import { Prisma } from '@prisma/client';

import { prisma } from './db';
import { currentProfileId } from './profile-context';
import { ClothingFit, parseClothingFit } from './tryon-fit';
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
  usageTags: string;
  size: string | null;
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
    usageTags: JSON.parse(record.usageTags || "[]"),
    size: record.size ?? undefined,
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
  pantsFit: string;
  tryOnFit: string | null;
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
    pantsFit: parseClothingFit(record.pantsFit),
    tryOnFit: record.tryOnFit ? parseClothingFit(record.tryOnFit) : undefined,
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
  usageTags: string;
  size: string | null;
  suggestedSeason: string;
  notes: string | null;
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
    usageTags: JSON.parse(record.usageTags || "[]"),
    size: record.size ?? undefined,
    suggestedSeason: parseSeasonValue(record.suggestedSeason),
    notes: record.notes ?? undefined,
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
    where: { profileId: currentProfileId() },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return items.map(mapClothingItem);
}

export async function createClothingItem(data: ClothingItemFormData): Promise<ClothingItem> {
  await validateCategory(data.category);
  const item = await prisma.clothingItem.create({
    data: {
      profileId: currentProfileId(),
      name: data.name,
      category: data.category,
      color: data.color,
      usageTags: JSON.stringify(parseUsageTags(data.usageTags ?? [])),
      size: data.size,
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
  const existing = await prisma.clothingItem.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return null;

  if (data.category !== undefined) await validateCategory(data.category, existing.category);
  const imageChanged = data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl;
  const item = await prisma.clothingItem.update({
    where: { id, profileId: currentProfileId() },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.usageTags !== undefined ? { usageTags: JSON.stringify(parseUsageTags(data.usageTags)) } : {}),
      ...(data.size !== undefined ? { size: data.size } : {}),
      ...(data.season !== undefined ? { season: stringifySeasonValue(data.season) } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.standardizedImageUrl !== undefined ? { standardizedImageUrl: data.standardizedImageUrl } : {}),
      ...(data.cutoutImageUrl !== undefined ? { cutoutImageUrl: data.cutoutImageUrl } : {}),
      // Processed assets belong to the previous source photo. Invalidate them
      // atomically, including stale URLs echoed by clients, so every consumer
      // uses the replacement photo until new processed assets are generated.
      ...(imageChanged ? { standardizedImageUrl: null, cutoutImageUrl: null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  return mapClothingItem(item);
}

export async function removeClothingItem(id: string): Promise<boolean> {
  const existing = await prisma.clothingItem.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return false;

  await prisma.clothingItem.delete({ where: { id, profileId: currentProfileId() } });
  return true;
}

export async function listOutfits(): Promise<Outfit[]> {
  const outfits = await prisma.outfit.findMany({
    where: { profileId: currentProfileId() },
    include: outfitInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return outfits.map(mapOutfit);
}

export async function getOutfitRecord(id: string): Promise<Outfit | null> {
  const outfit = await prisma.outfit.findUnique({
    where: { id, profileId: currentProfileId() },
    include: outfitInclude,
  });

  return outfit ? mapOutfit(outfit) : null;
}

async function validateOutfitItems(itemIds: string[]) {
  if (!Array.isArray(itemIds) || itemIds.some(id => typeof id !== 'string')) {
    throw new Error('请选择有效的衣物。');
  }
  const uniqueIds = Array.from(new Set(itemIds));
  const count = await prisma.clothingItem.count({
    where: { id: { in: uniqueIds }, profileId: currentProfileId() },
  });
  if (count !== uniqueIds.length) throw new Error('搭配中包含不属于当前成员的衣物。');
}

export async function createOutfitRecord(data: OutfitFormData): Promise<Outfit> {
  await validateOutfitItems(data.itemIds);
  const profile = await prisma.wardrobeProfile.findUnique({ where: { id: currentProfileId() } });
  const pantsFit = parseClothingFit(data.pantsFit === undefined ? profile?.defaultPantsFit ?? 'original' : data.pantsFit);
  const outfit = await prisma.outfit.create({
    data: {
      profileId: currentProfileId(),
      name: data.name,
      boardImageUrl: data.boardImageUrl,
      boardStatus: data.boardStatus ?? (data.boardImageUrl ? 'success' : 'idle'),
      boardError: data.boardError ?? null,
      tryOnStatus: 'idle',
      pantsFit,
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
  const pantsFit = data.pantsFit === undefined ? undefined : parseClothingFit(data.pantsFit);
  const existing = await prisma.outfit.findUnique({
    where: { id, profileId: currentProfileId() },
    include: outfitInclude,
  });

  if (!existing) return null;

  if (pantsFit !== undefined && existing.tryOnStatus === 'generating') {
    throw new Error('试穿图生成中，请完成后再修改版型。');
  }

  if (data.itemIds !== undefined) await validateOutfitItems(data.itemIds);

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
      where: { id, profileId: currentProfileId(), ...(pantsFit !== undefined ? { tryOnStatus: { not: 'generating' } } : {}) },
      data: {
        ...(pantsFit !== undefined ? { pantsFit } : {}),
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
              tryOnFit: null,
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
      where: { id, profileId: currentProfileId() },
      include: outfitInclude,
    });
  });

  return mapOutfit(outfit);
}

export async function removeOutfit(id: string): Promise<boolean> {
  const existing = await prisma.outfit.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return false;

  await prisma.outfit.delete({ where: { id, profileId: currentProfileId() } });
  return true;
}

export async function updateOutfitTryOnState(
  id: string,
  data: {
    tryOnFit?: ClothingFit | null;
    tryOnImageUrl?: string | null;
    tryOnStatus?: TryOnStatus;
    tryOnPrompt?: string | null;
    tryOnError?: string | null;
  },
): Promise<Outfit | null> {
  const existing = await prisma.outfit.findUnique({
    where: { id, profileId: currentProfileId() },
    include: outfitInclude,
  });

  if (!existing) return null;

  const outfit = await prisma.outfit.update({
    where: { id, profileId: currentProfileId() },
    data: {
      ...(data.tryOnImageUrl !== undefined ? { tryOnImageUrl: data.tryOnImageUrl } : {}),
      ...(data.tryOnStatus !== undefined ? { tryOnStatus: data.tryOnStatus } : {}),
      ...(data.tryOnPrompt !== undefined ? { tryOnPrompt: data.tryOnPrompt } : {}),
      ...(data.tryOnFit !== undefined ? { tryOnFit: data.tryOnFit } : {}),
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
    where: { id, profileId: currentProfileId() },
    include: outfitInclude,
  });

  if (!existing) return null;

  const outfit = await prisma.outfit.update({
    where: { id, profileId: currentProfileId() },
    data: {
      ...(data.boardImageUrl !== undefined ? { boardImageUrl: data.boardImageUrl } : {}),
      ...(data.boardStatus !== undefined ? { boardStatus: data.boardStatus } : {}),
      ...(data.boardError !== undefined ? { boardError: data.boardError } : {}),
      ...(data.boardStatus && data.boardStatus !== 'success'
        ? {
            tryOnImageUrl: null,
            tryOnStatus: 'idle',
            tryOnPrompt: null,
            tryOnFit: null,
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
    where: { profileId: currentProfileId() },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return templates.map(mapTemplate);
}

export async function getDefaultTemplateRecord(): Promise<PersonalTemplate | null> {
  const template = await prisma.personalTemplate.findFirst({
    where: { isDefault: true, profileId: currentProfileId() },
    orderBy: { createdAt: 'asc' },
  });

  return template ? mapTemplate(template) : null;
}

export async function createTemplateRecord(data: { name: string; imageUrl: string; isDefault?: boolean }): Promise<PersonalTemplate> {
  const templateCount = await prisma.personalTemplate.count({ where: { profileId: currentProfileId() } });
  const shouldBeDefault = data.isDefault ?? templateCount === 0;

  const template = await prisma.$transaction(async tx => {
    if (shouldBeDefault) {
      await tx.personalTemplate.updateMany({
        where: { profileId: currentProfileId() },
        data: { isDefault: false },
      });
    }

    return tx.personalTemplate.create({
      data: {
        profileId: currentProfileId(),
        name: data.name,
        imageUrl: data.imageUrl,
        isDefault: shouldBeDefault,
      },
    });
  });

  return mapTemplate(template);
}

export async function setDefaultTemplateRecord(id: string): Promise<PersonalTemplate | null> {
  const existing = await prisma.personalTemplate.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return null;

  const template = await prisma.$transaction(async tx => {
    await tx.personalTemplate.updateMany({
      where: { profileId: currentProfileId() },
      data: { isDefault: false },
    });

    return tx.personalTemplate.update({
      where: { id, profileId: currentProfileId() },
      data: { isDefault: true },
    });
  });

  return mapTemplate(template);
}

export async function removeTemplate(id: string): Promise<boolean> {
  const existing = await prisma.personalTemplate.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return false;

  await prisma.$transaction(async tx => {
    await tx.personalTemplate.delete({ where: { id, profileId: currentProfileId() } });

    if (existing.isDefault) {
      const nextTemplate = await tx.personalTemplate.findFirst({
        where: { profileId: currentProfileId() },
        orderBy: { createdAt: 'asc' },
      });

      if (nextTemplate) {
        await tx.personalTemplate.update({
          where: { id: nextTemplate.id, profileId: currentProfileId() },
          data: { isDefault: true },
        });
      }
    }
  });

  return true;
}

export async function listPendingUploadItems(batchId?: string): Promise<PendingItem[]> {
  const items = await prisma.pendingUploadItem.findMany({
    where: { profileId: currentProfileId(), ...(batchId ? { batchId } : {}) },
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  });

  return items.map(mapPendingItem);
}

export async function createPendingUploadBatch(items: PendingItem[], batchId?: string): Promise<{ batchId: string; items: PendingItem[] }> {
  const resolvedBatchId = batchId ?? crypto.randomUUID();

  for (const item of items) await validateCategory(item.suggestedCategory);
  await prisma.pendingUploadItem.createMany({
    data: items.map(item => ({
      profileId: currentProfileId(),
      id: item.id,
      batchId: resolvedBatchId,
      imageUrl: item.imageUrl,
      standardizedImageUrl: item.standardizedImageUrl,
      cutoutImageUrl: item.cutoutImageUrl,
      suggestedName: item.suggestedName,
      suggestedCategory: item.suggestedCategory,
      suggestedColor: item.suggestedColor,
      usageTags: JSON.stringify(parseUsageTags(item.usageTags ?? [])),
      size: item.size,
      suggestedSeason: stringifySeasonValue(item.suggestedSeason),
      notes: item.notes,
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
  const existing = await prisma.pendingUploadItem.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return null;

  if (updates.suggestedCategory !== undefined) await validateCategory(updates.suggestedCategory, existing.suggestedCategory);
  const item = await prisma.pendingUploadItem.update({
    where: { id, profileId: currentProfileId() },
    data: {
      ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl } : {}),
      ...(updates.standardizedImageUrl !== undefined ? { standardizedImageUrl: updates.standardizedImageUrl } : {}),
      ...(updates.cutoutImageUrl !== undefined ? { cutoutImageUrl: updates.cutoutImageUrl } : {}),
      ...(updates.suggestedName !== undefined ? { suggestedName: updates.suggestedName } : {}),
      ...(updates.suggestedCategory !== undefined ? { suggestedCategory: updates.suggestedCategory } : {}),
      ...(updates.suggestedColor !== undefined ? { suggestedColor: updates.suggestedColor } : {}),
      ...(updates.usageTags !== undefined ? { usageTags: JSON.stringify(parseUsageTags(updates.usageTags)) } : {}),
      ...(updates.size !== undefined ? { size: updates.size } : {}),
      ...(updates.suggestedSeason !== undefined ? { suggestedSeason: stringifySeasonValue(updates.suggestedSeason) } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
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

export async function confirmPendingUploadItem(id: string): Promise<ClothingItem | null> {
  return prisma.$transaction(async tx => {
    const draft = await tx.pendingUploadItem.findUnique({ where: { id, profileId: currentProfileId() } });
    if (!draft) return null;
    if (draft.status !== 'pending') throw new Error('这件衣物已跳过，请先恢复后再确认。');
    if (!draft.suggestedName.trim()) throw new Error('请填写衣物名称后再确认。');
    const category = await tx.clothingCategory.findUnique({where:{id:draft.suggestedCategory}});
    if (!category?.active) throw new Error('分类已停用，请重新选择后确认。');
    const item = await tx.clothingItem.create({ data: {
      profileId: currentProfileId(),
      name: draft.suggestedName.trim(),
      category: draft.suggestedCategory,
      color: draft.suggestedColor,
      usageTags: draft.usageTags,
      size: draft.size,
      season: draft.suggestedSeason,
      imageUrl: draft.imageUrl,
      standardizedImageUrl: draft.standardizedImageUrl,
      cutoutImageUrl: draft.cutoutImageUrl,
      notes: draft.notes,
    } });
    await tx.pendingUploadItem.delete({ where: { id, profileId: currentProfileId() } });
    return mapClothingItem(item);
  });
}

export async function removePendingUploadItem(id: string): Promise<boolean> {
  const existing = await prisma.pendingUploadItem.findUnique({ where: { id, profileId: currentProfileId() } });
  if (!existing) return false;

  await prisma.pendingUploadItem.delete({ where: { id, profileId: currentProfileId() } });
  return true;
}

export async function clearPendingUploadBatch(batchId?: string): Promise<void> {
  await prisma.pendingUploadItem.deleteMany({
    where: { profileId: currentProfileId(), ...(batchId ? { batchId } : {}) },
  });
}
