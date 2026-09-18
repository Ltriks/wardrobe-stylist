// Core types for Wardrobe Stylist MVP
import type { ClothingFit } from '../lib/tryon-fit';

import type { Category } from '../lib/clothing-categories';
export type { Category } from '../lib/clothing-categories';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type BoardStatus = 'idle' | 'generating' | 'success' | 'failed';
export type TryOnStatus = 'idle' | 'generating' | 'success' | 'failed';

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  color: string;
  size?: string;
  season: Season[];
  imageUrl?: string;
  standardizedImageUrl?: string;
  cutoutImageUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutfitItem {
  clothingItemId: string;
  offsetX?: number;  // Horizontal offset in pixels (positive = right, negative = left)
  offsetY?: number;  // Vertical offset in pixels (positive = down, negative = up)
  scale?: number;    // Scale factor (1.0 = original size)
}

export interface Outfit {
  id: string;
  name: string;
  items: OutfitItem[]; // Array of outfit items with adjustment parameters
  boardImageUrl?: string;
  boardStatus?: BoardStatus;
  boardError?: string;
  tryOnImageUrl?: string;
  tryOnStatus?: TryOnStatus;
  tryOnPrompt?: string;
  tryOnError?: string;
  // Legacy storage/API name; this preference now applies to all clothing.
  pantsFit?: ClothingFit;
  tryOnFit?: ClothingFit;
  occasion?: string;
  season?: Season[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Personal template for outfit preview
export interface PersonalTemplate {
  id: string;
  name: string;
  imageUrl: string;
  isDefault: boolean; // Whether this is the default template for outfit preview
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating/updating items
export interface ClothingItemFormData {
  name: string;
  category: Category;
  color: string;
  size?: string;
  season: Season[];
  imageUrl?: string;
  standardizedImageUrl?: string;
  cutoutImageUrl?: string;
  notes?: string;
}

// Form data for creating/updating outfits
export interface OutfitFormData {
  pantsFit?: ClothingFit;
  name: string;
  itemIds: string[];
  boardImageUrl?: string;
  boardStatus?: BoardStatus;
  boardError?: string;
  occasion?: string;
  season?: Season[];
  notes?: string;
}

// Form data for updating outfit item adjustments
export interface OutfitItemAdjustmentFormData {
  clothingItemId: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

// Pending item for batch upload
export interface PendingItem {
  id: string;
  batchId?: string;
  imageUrl: string;
  standardizedImageUrl?: string; // Standardized image URL for preview/try-on
  cutoutImageUrl?: string; // Future transparent cutout used for outfit boards/collages
  suggestedName: string;
  suggestedCategory: Category;
  suggestedColor: string;
  size?: string;
  suggestedSeason: Season[];
  notes?: string;
  status: 'pending' | 'confirmed' | 'skipped';
  aiConfidence?: number; // AI confidence score (0-1)
  categorySource?: 'ai' | 'rule' | 'default'; // Source of category suggestion
  colorSource?: 'ai' | 'rule' | 'default'; // Source of color suggestion
  seasonSource?: 'ai' | 'rule' | 'default'; // Source of season suggestion
  rawPredictions?: string; // Raw MobileNet predictions for debugging
  isDuplicate?: boolean; // Whether this item is a potential duplicate
  duplicateReason?: string; // Reason for potential duplicate
}
