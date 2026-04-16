'use client';

import { useState, useRef, useEffect } from 'react';
import { PendingItem, Category, Season, ClothingItem } from '../types';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';

interface BatchUploadButtonProps {
  onUploadComplete: (items: PendingItem[]) => void | Promise<void>;
  existingItems: ClothingItem[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
}

export default function BatchUploadButton({ onUploadComplete, existingItems }: BatchUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start loading MobileNet model in the background (non-blocking)
  useEffect(() => {
    const loadModel = async () => {
      console.log('Starting MobileNet model load...');
      try {
        // Set backend to WebGL if available, otherwise CPU
        console.log('Calling tf.ready()...');
        await tf.ready();
        const backend = tf.getBackend();
        console.log('TensorFlow.js backend:', backend);
        
        console.log('Loading MobileNet model...');
        const loadedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
        console.log('MobileNet model loaded:', loadedModel);
        setModel(loadedModel);
        setModelLoaded(true);
        setModelLoadFailed(false);
        console.log('MobileNet model loaded successfully');
      } catch (error) {
        console.error('Failed to load MobileNet model:', error);
        setModelLoaded(false);
        setModelLoadFailed(true);
      }
    };

    loadModel();
  }, []);

  // Classify image using MobileNet and map to coarse categories
  const classifyImage = async (imgElement: HTMLImageElement): Promise<{ category: Category; confidence: number; rawPredictions: string } | null> => {
    if (!model) {
      return null;
    }

    try {
      const predictions = await model.classify(imgElement);
      
      // Map MobileNet predictions to our coarse categories
      const mapped = mapMobileNetToCategory(predictions);
      console.log('MobileNet predictions:', mapped.rawPredictions);
      return mapped;
    } catch (error) {
      console.warn('MobileNet classification failed:', error);
      return null;
    }
  };

  // Extract dominant color from image using Canvas API
  const extractColorFromImage = async (imgElement: HTMLImageElement): Promise<{ color: string; confidence: number }> => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { color: 'unknown', confidence: 0 };
      }

      // Resize image for faster processing
      const maxSize = 100;
      const scale = Math.min(maxSize / imgElement.width, maxSize / imgElement.height);
      canvas.width = imgElement.width * scale;
      canvas.height = imgElement.height * scale;

      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Count color occurrences
      const colorCounts: Record<string, number> = {};
      let totalPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Quantize colors to reduce noise
        const quantizedR = Math.round(r / 32) * 32;
        const quantizedG = Math.round(g / 32) * 32;
        const quantizedB = Math.round(b / 32) * 32;

        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        totalPixels++;
      }

      // Find the most common color
      let maxCount = 0;
      let dominantColorKey = '';
      for (const [colorKey, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantColorKey = colorKey;
        }
      }

      if (!dominantColorKey) {
        return { color: 'unknown', confidence: 0 };
      }

      const [r, g, b] = dominantColorKey.split(',').map(Number);
      const colorName = rgbToColorName(r, g, b);
      const confidence = totalPixels > 0 ? maxCount / totalPixels : 0;

      return { color: colorName, confidence };
    } catch (error) {
      console.warn('Color extraction failed:', error);
      return { color: 'unknown', confidence: 0 };
    }
  };

  // Map RGB values to color names
  const rgbToColorName = (r: number, g: number, b: number): string => {
    // Simple color mapping based on RGB ranges
    const colors = [
      { name: 'white', r: 240, g: 240, b: 240, threshold: 30 },
      { name: 'black', r: 30, g: 30, b: 30, threshold: 30 },
      { name: 'gray', r: 128, g: 128, b: 128, threshold: 40 },
      { name: 'red', r: 200, g: 50, b: 50, threshold: 60 },
      { name: 'blue', r: 50, g: 50, b: 200, threshold: 60 },
      { name: 'green', r: 50, g: 150, b: 50, threshold: 60 },
      { name: 'yellow', r: 200, g: 200, b: 50, threshold: 60 },
      { name: 'orange', r: 220, g: 140, b: 50, threshold: 60 },
      { name: 'purple', r: 150, g: 50, b: 150, threshold: 60 },
      { name: 'pink', r: 220, g: 150, b: 180, threshold: 60 },
      { name: 'brown', r: 139, g: 90, b: 43, threshold: 60 },
      { name: 'navy', r: 0, g: 0, b: 128, threshold: 40 },
    ];

    for (const color of colors) {
      const distance = Math.sqrt(
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2)
      );
      if (distance < color.threshold) {
        return color.name;
      }
    }

    // If no match, return a generic color based on dominant channel
    const maxChannel = Math.max(r, g, b);
    if (maxChannel === r) return 'red';
    if (maxChannel === g) return 'green';
    if (maxChannel === b) return 'blue';

    return 'unknown';
  };

  // Map MobileNet predictions to coarse categories
  const mapMobileNetToCategory = (predictions: any[]): { category: Category; confidence: number; rawPredictions: string } => {
    // MobileNet returns predictions like: [{ className: 't-shirt, tee shirt', probability: 0.95 }, ...]
    // Map to our coarse categories

    const topKeywords = ['shirt', 't-shirt', 'tee', 'blouse', 'top', 'tank top', 'sweater', 'hoodie', 'pullover', 'cardigan', 'tshirt'];
    const bottomKeywords = ['pants', 'jeans', 'trousers', 'skirt', 'shorts', 'leggings', 'slacks', 'denim'];
    const outerwearKeywords = ['jacket', 'coat', 'blazer', 'vest', 'parka', 'anorak'];
    const shoesKeywords = ['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'footwear', 'loafer', 'oxford', 'sneakers'];
    const accessoryKeywords = ['bag', 'hat', 'cap', 'scarf', 'belt', 'glasses', 'sunglasses', 'backpack', 'handbag'];

    // Log raw predictions for debugging
    const rawPredictions = predictions.slice(0, 5).map(p => `${p.className} (${(p.probability * 100).toFixed(1)}%)`).join(', ');

    for (const pred of predictions) {
      const className = pred.className.toLowerCase();
      const probability = pred.probability;

      // Check outerwear first (can overlap with top)
      if (outerwearKeywords.some(k => className.includes(k))) {
        return { category: 'outerwear', confidence: probability, rawPredictions };
      }

      if (topKeywords.some(k => className.includes(k))) {
        return { category: 'top', confidence: probability, rawPredictions };
      }

      if (bottomKeywords.some(k => className.includes(k))) {
        return { category: 'bottom', confidence: probability, rawPredictions };
      }

      if (shoesKeywords.some(k => className.includes(k))) {
        return { category: 'shoes', confidence: probability, rawPredictions };
      }

      if (accessoryKeywords.some(k => className.includes(k))) {
        return { category: 'accessory', confidence: probability, rawPredictions };
      }
    }

    // If no match, use highest probability prediction as "other"
    return { category: 'other', confidence: predictions[0]?.probability || 0.3, rawPredictions };
  };

  const standardizeImage = async (imageUrl: string): Promise<string | undefined> => {
    const response = await fetch('/api/process-garment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceUrl: imageUrl }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Garment processing failed');
    }

    return window.location.origin + result.url;
  };

  const loadImageForAnalysis = async (...candidates: Array<string | undefined>): Promise<HTMLImageElement> => {
    const urls = candidates.filter((candidate): candidate is string => Boolean(candidate));
    let lastError: unknown = new Error('No image URL available for analysis');

    for (const url of urls) {
      try {
        const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
          const nextImage = new Image();
          nextImage.crossOrigin = 'anonymous';
          nextImage.onload = () => resolve(nextImage);
          nextImage.onerror = () => reject(new Error(`Image failed to load: ${url}`));
          nextImage.src = url;

          setTimeout(() => reject(new Error(`Image load timeout: ${url}`)), 5000);
        });

        return imgElement;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const pendingItems: PendingItem[] = [];
    let completed = 0;

    for (const file of Array.from(files)) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        completed++;
        continue;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        completed++;
        continue;
      }

      try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        const imageUrl = window.location.origin + uploadResult.url;

        // Standardize image on the server so the rest of the flow uses a cleaner garment silhouette.
        let standardizedImageUrl: string | undefined;
        try {
          standardizedImageUrl = await standardizeImage(uploadResult.url);
        } catch (error) {
          console.warn('Garment processing failed, using original:', error);
          standardizedImageUrl = undefined; // Will fallback to original
        }

        // Generate rule-based suggestions (for name only)
        const ruleSuggested = generateSuggestedAttributes(file.name);

        // Try MobileNet classification for category and color extraction
        let aiCategory: Category = 'other';
        let aiConfidence = 0;
        let categorySource: 'ai' | 'rule' | 'default' = 'default';
        let aiColor: string = 'unknown';
        let colorConfidence = 0;
        let colorSource: 'ai' | 'rule' | 'default' = 'default';
        let rawPredictions = '';

        // Use AI classification only if model is already loaded
        if (modelLoaded && model) {
          try {
            const imgElement = await loadImageForAnalysis(standardizedImageUrl, imageUrl);

            // Classify using MobileNet for category
            const classificationResult = await classifyImage(imgElement);
            
            if (classificationResult) {
              rawPredictions = classificationResult.rawPredictions;
              if (classificationResult.confidence > 0.5) {
                aiCategory = classificationResult.category;
                aiConfidence = classificationResult.confidence;
                categorySource = 'ai';
              }
            } else {
              rawPredictions = 'No AI prediction';
            }

            // Extract color from image
            const colorResult = await extractColorFromImage(imgElement);
            if (colorResult.confidence > 0.3) {
              aiColor = colorResult.color;
              colorConfidence = colorResult.confidence;
              colorSource = 'ai';
            }
          } catch (aiError) {
            console.warn('AI classification failed, using rules fallback:', aiError);
            rawPredictions = `AI classify failed: ${getErrorMessage(aiError)}`;
          }
        } else {
          // Model not loaded yet, use fallback
          rawPredictions = modelLoadFailed ? 'Model load failed' : 'Model loading...';
        }

        // Use AI result if confidence is high enough, otherwise use rules
        const finalCategory = aiConfidence > 0.5 ? aiCategory : ruleSuggested.category;
        const finalColor = colorSource === 'ai' ? aiColor : ruleSuggested.color;
        const finalSeason: Season[] = []; // Season is always empty, user must confirm manually

        const pendingItem: PendingItem = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          imageUrl: imageUrl,
          standardizedImageUrl: standardizedImageUrl,
          suggestedName: ruleSuggested.name, // Name still from filename
          suggestedCategory: finalCategory,
          suggestedColor: finalColor,
          suggestedSeason: finalSeason,
          status: 'pending',
          aiConfidence: aiConfidence,
          categorySource: categorySource,
          colorSource: colorSource,
          seasonSource: 'default', // Season is always default/empty
          rawPredictions: rawPredictions, // Store raw predictions for debugging
        };

        // Duplicate detection
        const duplicateCheck = detectDuplicate(pendingItem, existingItems, pendingItems);
        if (duplicateCheck.isDuplicate) {
          pendingItem.isDuplicate = true;
          pendingItem.duplicateReason = duplicateCheck.reason;
        }

        pendingItems.push(pendingItem);
      } catch (error) {
        console.error('Upload failed:', error);
      }

      completed++;
      setUploadProgress(Math.round((completed / files.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);

    if (pendingItems.length > 0) {
      await onUploadComplete(pendingItems);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={handleClick}
          disabled={isUploading}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isUploading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading... {uploadProgress}%</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Batch Upload</span>
            </>
          )}
        </button>
        {modelLoaded ? (
          <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">
            AI Ready
          </span>
        ) : null}
      </div>
    </>
  );
}

function generateSuggestedAttributes(filename: string): {
  name: string;
  category: Category;
  color: string;
  season: Season[];
} {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Remove common prefixes/suffixes
  const cleanName = nameWithoutExt
    .replace(/^[0-9]+_?/, '') // Remove leading numbers
    .replace(/_+/g, ' ') // Replace underscores with spaces
    .trim();

  // Determine category based on keywords
  const category = determineCategory(cleanName);

  // Determine color based on keywords
  const color = determineColor(cleanName);

  // Determine season based on keywords
  const season = determineSeason(cleanName);

  return {
    name: cleanName,
    category,
    color,
    season,
  };
}

function determineCategory(name: string): Category {
  const lowerName = name.toLowerCase();

  // Top keywords
  if (/\b(tshirt|t-shirt|shirt|top|blouse|tank|tee)\b/.test(lowerName)) {
    return 'top';
  }

  // Bottom keywords
  if (/\b(pants|jeans|trousers|bottom|skirt|shorts)\b/.test(lowerName)) {
    return 'bottom';
  }

  // Outerwear keywords
  if (/\b(jacket|coat|outerwear|blazer|vest|cardigan)\b/.test(lowerName)) {
    return 'outerwear';
  }

  // Shoes keywords
  if (/\b(shoes|sneakers|boots|sandals|heels|footwear)\b/.test(lowerName)) {
    return 'shoes';
  }

  // Accessory keywords
  if (/\b(bag|hat|cap|scarf|belt|glasses|accessory)\b/.test(lowerName)) {
    return 'accessory';
  }

  return 'other';
}

function determineColor(name: string): string {
  const lowerName = name.toLowerCase();

  const colorKeywords: Record<string, string> = {
    white: 'white',
    black: 'black',
    blue: 'blue',
    red: 'red',
    green: 'green',
    yellow: 'yellow',
    pink: 'pink',
    purple: 'purple',
    orange: 'orange',
    gray: 'gray',
    grey: 'gray',
    brown: 'brown',
    beige: 'beige',
    navy: 'navy',
    // Chinese keywords
    白: 'white',
    黑: 'black',
    蓝: 'blue',
    红: 'red',
    绿: 'green',
    黄: 'yellow',
    粉: 'pink',
    紫: 'purple',
    橙: 'orange',
    灰: 'gray',
    棕: 'brown',
  };

  for (const [keyword, color] of Object.entries(colorKeywords)) {
    if (lowerName.includes(keyword)) {
      return color;
    }
  }

  return 'unknown';
}

function determineSeason(name: string): Season[] {
  const lowerName = name.toLowerCase();

  const seasonKeywords: Record<string, Season> = {
    spring: 'spring',
    春: 'spring',
    summer: 'summer',
    夏: 'summer',
    autumn: 'autumn',
    fall: 'autumn',
    秋: 'autumn',
    winter: 'winter',
    冬: 'winter',
  };

  const seasons: Season[] = [];

  for (const [keyword, season] of Object.entries(seasonKeywords)) {
    if (lowerName.includes(keyword)) {
      if (!seasons.includes(season)) {
        seasons.push(season);
      }
    }
  }

  return seasons;
}

// Duplicate detection function
// Returns { isDuplicate: boolean, reason: string } based on simple heuristics
function detectDuplicate(
  item: PendingItem,
  existingItems: ClothingItem[],
  otherPendingItems: PendingItem[]
): { isDuplicate: boolean; reason: string } {
  // Check against existing clothing items
  for (const existing of existingItems) {
    // Rule 1: Same category and color (high confidence)
    if (
      existing.category === item.suggestedCategory &&
      existing.color === item.suggestedColor
    ) {
      return {
        isDuplicate: true,
        reason: `与现有衣物 "${existing.name}" 类别和颜色相同`,
      };
    }

    // Rule 2: Similar name (contains same keywords)
    const nameKeywords = item.suggestedName.toLowerCase().split(/\s+/);
    const existingNameKeywords = existing.name.toLowerCase().split(/\s+/);
    const commonKeywords = nameKeywords.filter((k) =>
      existingNameKeywords.includes(k)
    );
    if (commonKeywords.length >= 2) {
      return {
        isDuplicate: true,
        reason: `与现有衣物 "${existing.name}" 名称相似`,
      };
    }
  }

  // Check against other pending items in the same batch
  for (const pending of otherPendingItems) {
    if (pending.id === item.id) continue;

    // Rule 3: Same category and color in the same batch
    if (
      pending.suggestedCategory === item.suggestedCategory &&
      pending.suggestedColor === item.suggestedColor
    ) {
      return {
        isDuplicate: true,
        reason: `与同批上传的图片类别和颜色相同`,
      };
    }
  }

  return { isDuplicate: false, reason: "" };
}
