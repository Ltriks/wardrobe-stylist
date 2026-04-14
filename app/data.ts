// In-memory data store for MVP
// In production, this would be replaced with a database

import { ClothingItem, ClothingItemFormData, Category, Season, Outfit, OutfitFormData, OutfitItem, PersonalTemplate } from './types';

// Initial sample data
const initialItems: ClothingItem[] = [];

// In-memory store
let clothingItems: ClothingItem[] = [...initialItems];
let outfits: Outfit[] = [];
let personalTemplates: PersonalTemplate[] = [];

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Clothing Item functions
export function getAllItems(): ClothingItem[] {
  return [...clothingItems];
}

export function getItemById(id: string): ClothingItem | undefined {
  return clothingItems.find(item => item.id === id);
}

export function getItemsByIds(ids: string[]): ClothingItem[] {
  return clothingItems.filter(item => ids.includes(item.id));
}

export function createItem(data: ClothingItemFormData): ClothingItem {
  const newItem: ClothingItem = {
    id: generateId(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  clothingItems.push(newItem);
  return newItem;
}

export function updateItem(id: string, data: Partial<ClothingItemFormData>): ClothingItem | undefined {
  const index = clothingItems.findIndex(item => item.id === id);
  if (index === -1) return undefined;

  clothingItems[index] = {
    ...clothingItems[index],
    ...data,
    updatedAt: new Date(),
  };
  return clothingItems[index];
}

export function deleteItem(id: string): boolean {
  const index = clothingItems.findIndex(item => item.id === id);
  if (index === -1) return false;

  clothingItems.splice(index, 1);
  return true;
}

export function filterItems(category?: Category, season?: Season): ClothingItem[] {
  return clothingItems.filter(item => {
    const matchCategory = !category || item.category === category;
    const matchSeason = !season || item.season.includes(season);
    return matchCategory && matchSeason;
  });
}

// Outfit functions
export function getAllOutfits(): Outfit[] {
  return [...outfits];
}

export function getOutfitById(id: string): Outfit | undefined {
  return outfits.find(outfit => outfit.id === id);
}

export function createOutfit(data: OutfitFormData): Outfit {
  // Convert itemIds to OutfitItem array with default adjustments
  const outfitItems: OutfitItem[] = data.itemIds.map(id => ({
    clothingItemId: id,
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
  }));

  const newOutfit: Outfit = {
    id: generateId(),
    name: data.name,
    items: outfitItems,
    boardImageUrl: data.boardImageUrl,
    occasion: data.occasion,
    season: data.season,
    notes: data.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  outfits.push(newOutfit);
  return newOutfit;
}

export function updateOutfit(id: string, data: Partial<OutfitFormData>): Outfit | undefined {
  const index = outfits.findIndex(outfit => outfit.id === id);
  if (index === -1) return undefined;

  // If updating itemIds, preserve existing adjustments where possible
  let updatedItems: OutfitItem[];
  if (data.itemIds) {
    const existingItems = outfits[index].items;
    updatedItems = data.itemIds.map(itemId => {
      const existing = existingItems.find(item => item.clothingItemId === itemId);
      return {
        clothingItemId: itemId,
        offsetX: existing?.offsetX ?? 0,
        offsetY: existing?.offsetY ?? 0,
        scale: existing?.scale ?? 1.0,
      };
    });
  } else {
    updatedItems = outfits[index].items;
  }

  outfits[index] = {
    ...outfits[index],
    ...data,
    items: updatedItems,
    updatedAt: new Date(),
  };
  return outfits[index];
}

export function updateOutfitItemAdjustment(
  outfitId: string,
  clothingItemId: string,
  adjustment: { offsetX?: number; offsetY?: number; scale?: number }
): Outfit | undefined {
  const outfitIndex = outfits.findIndex(outfit => outfit.id === outfitId);
  if (outfitIndex === -1) return undefined;

  const outfit = outfits[outfitIndex];
  const itemIndex = outfit.items.findIndex(item => item.clothingItemId === clothingItemId);
  if (itemIndex === -1) return undefined;

  // Update the specific outfit item's adjustments
  outfit.items[itemIndex] = {
    ...outfit.items[itemIndex],
    ...adjustment,
  };

  outfits[outfitIndex] = {
    ...outfit,
    updatedAt: new Date(),
  };

  return outfits[outfitIndex];
}

export function deleteOutfit(id: string): boolean {
  const index = outfits.findIndex(outfit => outfit.id === id);
  if (index === -1) return false;

  outfits.splice(index, 1);
  return true;
}

// PersonalTemplate functions
export function getAllTemplates(): PersonalTemplate[] {
  return [...personalTemplates];
}

export function getDefaultTemplate(): PersonalTemplate | undefined {
  return personalTemplates.find(t => t.isDefault);
}

export function createTemplate(data: { name: string; imageUrl: string; isDefault?: boolean }): PersonalTemplate {
  const now = new Date();
  const newTemplate: PersonalTemplate = {
    id: generateId(),
    name: data.name,
    imageUrl: data.imageUrl,
    isDefault: data.isDefault ?? personalTemplates.length === 0,
    createdAt: now,
    updatedAt: now,
  };

  // If setting as default, unset other defaults
  if (newTemplate.isDefault) {
    personalTemplates.forEach(t => {
      t.isDefault = false;
      t.updatedAt = now;
    });
  }

  personalTemplates.push(newTemplate);
  return newTemplate;
}

export function setDefaultTemplate(id: string): void {
  const now = new Date();
  personalTemplates.forEach(t => {
    t.isDefault = t.id === id;
    t.updatedAt = now;
  });
}

export function deleteTemplate(id: string): boolean {
  const index = personalTemplates.findIndex(t => t.id === id);
  if (index === -1) return false;

  const wasDefault = personalTemplates[index].isDefault;
  personalTemplates.splice(index, 1);

  // If deleted template was default and there are others, set the first as default
  if (wasDefault && personalTemplates.length > 0) {
    personalTemplates[0].isDefault = true;
    personalTemplates[0].updatedAt = new Date();
  }

  return true;
}

export function resetWardrobeState(): void {
  clothingItems = [];
  outfits = [];
  personalTemplates = [];
}
