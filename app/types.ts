// Core types for Wardrobe Stylist MVP

export type Category = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory' | 'other';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  color: string;
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
  season: Season[];
  imageUrl?: string;
  standardizedImageUrl?: string;
  cutoutImageUrl?: string;
  notes?: string;
}

// Form data for creating/updating outfits
export interface OutfitFormData {
  name: string;
  itemIds: string[];
  boardImageUrl?: string;
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
  imageUrl: string;
  standardizedImageUrl?: string; // Standardized image URL for preview/try-on
  cutoutImageUrl?: string; // Future transparent cutout used for outfit boards/collages
  suggestedName: string;
  suggestedCategory: Category;
  suggestedColor: string;
  suggestedSeason: Season[];
  status: 'pending' | 'confirmed' | 'skipped';
  aiConfidence?: number; // AI confidence score (0-1)
  categorySource?: 'ai' | 'rule' | 'default'; // Source of category suggestion
  colorSource?: 'ai' | 'rule' | 'default'; // Source of color suggestion
  seasonSource?: 'ai' | 'rule' | 'default'; // Source of season suggestion
  rawPredictions?: string; // Raw MobileNet predictions for debugging
  isDuplicate?: boolean; // Whether this item is a potential duplicate
  duplicateReason?: string; // Reason for potential duplicate
}
