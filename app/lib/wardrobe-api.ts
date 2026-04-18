'use client';

import { ClothingItem, ClothingItemFormData, Outfit, OutfitFormData, PendingItem, PersonalTemplate } from '@/app/types';

type JsonRecord = Record<string, unknown>;

function normalizeAssetUrl(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const isLoopbackHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1';

    if (isLoopbackHost && parsed.pathname.startsWith('/uploads/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}

function parseClothingItem(item: JsonRecord): ClothingItem {
  return {
    ...(item as unknown as Omit<ClothingItem, 'createdAt' | 'updatedAt'>),
    imageUrl: normalizeAssetUrl(item.imageUrl) as ClothingItem['imageUrl'],
    standardizedImageUrl: normalizeAssetUrl(item.standardizedImageUrl) as ClothingItem['standardizedImageUrl'],
    cutoutImageUrl: normalizeAssetUrl(item.cutoutImageUrl) as ClothingItem['cutoutImageUrl'],
    season: Array.isArray(item.season) ? (item.season as ClothingItem['season']) : [],
    createdAt: new Date(String(item.createdAt)),
    updatedAt: new Date(String(item.updatedAt)),
  };
}

function parseOutfit(outfit: JsonRecord): Outfit {
  return {
    ...(outfit as unknown as Omit<Outfit, 'createdAt' | 'updatedAt'>),
    boardImageUrl: normalizeAssetUrl(outfit.boardImageUrl) as Outfit['boardImageUrl'],
    tryOnImageUrl: normalizeAssetUrl(outfit.tryOnImageUrl) as Outfit['tryOnImageUrl'],
    season: Array.isArray(outfit.season) ? (outfit.season as Outfit['season']) : [],
    items: Array.isArray(outfit.items) ? (outfit.items as Outfit['items']) : [],
    createdAt: new Date(String(outfit.createdAt)),
    updatedAt: new Date(String(outfit.updatedAt)),
  };
}

function parseTemplate(template: JsonRecord): PersonalTemplate {
  return {
    ...(template as unknown as Omit<PersonalTemplate, 'createdAt' | 'updatedAt'>),
    imageUrl: normalizeAssetUrl(template.imageUrl) as PersonalTemplate['imageUrl'],
    createdAt: new Date(String(template.createdAt)),
    updatedAt: new Date(String(template.updatedAt)),
  };
}

function parsePendingItem(item: JsonRecord): PendingItem {
  return {
    ...(item as unknown as Omit<PendingItem, 'suggestedSeason'>),
    imageUrl: normalizeAssetUrl(item.imageUrl) as PendingItem['imageUrl'],
    standardizedImageUrl: normalizeAssetUrl(item.standardizedImageUrl) as PendingItem['standardizedImageUrl'],
    cutoutImageUrl: normalizeAssetUrl(item.cutoutImageUrl) as PendingItem['cutoutImageUrl'],
    suggestedSeason: Array.isArray(item.suggestedSeason) ? (item.suggestedSeason as PendingItem['suggestedSeason']) : [],
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown;

  if (text.trim()) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error(text.slice(0, 320) || `Request failed (${response.status})`);
      }
      throw new Error('Invalid response from server.');
    }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchItems(): Promise<ClothingItem[]> {
  const data = await parseJsonResponse<JsonRecord[]>(await fetch('/api/items'));
  return data.map(parseClothingItem);
}

export async function createItemApi(payload: ClothingItemFormData): Promise<ClothingItem> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parseClothingItem(data);
}

export async function updateItemApi(id: string, payload: Partial<ClothingItemFormData>): Promise<ClothingItem> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parseClothingItem(data);
}

export async function deleteItemApi(id: string): Promise<void> {
  await parseJsonResponse(await fetch(`/api/items/${id}`, { method: 'DELETE' }));
}

export async function fetchOutfits(): Promise<Outfit[]> {
  const data = await parseJsonResponse<JsonRecord[]>(await fetch('/api/outfits'));
  return data.map(parseOutfit);
}

export async function createOutfitApi(payload: OutfitFormData): Promise<Outfit> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parseOutfit(data);
}

export async function updateOutfitApi(id: string, payload: Partial<OutfitFormData>): Promise<Outfit> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch(`/api/outfits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parseOutfit(data);
}

export async function deleteOutfitApi(id: string): Promise<void> {
  await parseJsonResponse(await fetch(`/api/outfits/${id}`, { method: 'DELETE' }));
}

export async function generateBoardApi(outfitId: string): Promise<Outfit> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch('/api/generate-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outfitId }),
    }),
  );

  return parseOutfit(data);
}

export async function generateTryOnApi(outfitId: string): Promise<Outfit> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch('/api/generate-tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outfitId }),
    }),
  );

  return parseOutfit(data);
}

export async function fetchTemplates(): Promise<PersonalTemplate[]> {
  const data = await parseJsonResponse<JsonRecord[]>(await fetch('/api/templates'));
  return data.map(parseTemplate);
}

export async function createTemplateApi(payload: { name: string; imageUrl: string; isDefault?: boolean }): Promise<PersonalTemplate> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parseTemplate(data);
}

export async function setDefaultTemplateApi(id: string): Promise<PersonalTemplate> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    }),
  );

  return parseTemplate(data);
}

export async function deleteTemplateApi(id: string): Promise<void> {
  await parseJsonResponse(await fetch(`/api/templates/${id}`, { method: 'DELETE' }));
}

export async function fetchPendingItems(batchId?: string): Promise<PendingItem[]> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  const data = await parseJsonResponse<JsonRecord[]>(await fetch(`/api/pending-items${query}`));
  return data.map(parsePendingItem);
}

export async function createPendingBatchApi(items: PendingItem[]): Promise<{ batchId: string; items: PendingItem[] }> {
  const data = await parseJsonResponse<{ batchId: string; items: JsonRecord[] }>(
    await fetch('/api/pending-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),
  );

  return {
    batchId: data.batchId,
    items: data.items.map(parsePendingItem),
  };
}

export async function updatePendingItemApi(id: string, payload: Partial<PendingItem>): Promise<PendingItem> {
  const data = await parseJsonResponse<JsonRecord>(
    await fetch(`/api/pending-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );

  return parsePendingItem(data);
}

export async function deletePendingItemApi(id: string): Promise<void> {
  await parseJsonResponse(await fetch(`/api/pending-items/${id}`, { method: 'DELETE' }));
}

export async function clearPendingBatchApi(batchId?: string): Promise<void> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  await parseJsonResponse(await fetch(`/api/pending-items${query}`, { method: 'DELETE' }));
}
