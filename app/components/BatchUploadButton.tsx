'use client';

import { useCategories } from './CategoryProvider';
import { refineCategorySuggestion } from '../../lib/category-catalog';
import { Pixels, suggestLocalAttributes } from '../lib/local-clothing-analysis';

import { useState, useRef, useEffect } from 'react';
import { PendingItem, ClothingItem } from '../types';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';

// Share one download/model across remounts and React Strict Mode effects.
let localModelPromise: Promise<mobilenet.MobileNet> | undefined;
function loadLocalModel() {
  if (!localModelPromise) {
    localModelPromise = tf.ready().then(() => mobilenet.load({ version: 2, alpha: 1.0 })).catch(error => {
      localModelPromise = undefined;
      throw error;
    });
  }
  return localModelPromise;
}

interface BatchUploadButtonProps {
  onUploadComplete: (items: PendingItem[]) => void | Promise<void>;
  existingItems: ClothingItem[];
}

export default function BatchUploadButton({ onUploadComplete, existingItems }: BatchUploadButtonProps) {
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const modelRef = useRef<mobilenet.MobileNet | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLocalModel().then(model => {
      if (!cancelled) { modelRef.current = model; setModelLoaded(true); }
    }).catch(() => { if (!cancelled) setModelLoaded(false); });
    return () => { cancelled = true; };
  }, []);

  const imagePixels = (image: HTMLImageElement): Pixels | undefined => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
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
      throw new Error(result.error || "衣物处理失败");
    }

    return result.url;
  };

  const loadImageForAnalysis = async (...candidates: Array<string | undefined>): Promise<HTMLImageElement> => {
    const urls = candidates.filter((candidate): candidate is string => Boolean(candidate));
    let lastError: unknown = new Error("没有可供识别的图片");

    for (const url of urls) {
      try {
        const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
          const nextImage = new Image();
          nextImage.crossOrigin = 'anonymous';
          const timer = setTimeout(() => reject(new Error(`Image load timeout: ${url}`)), 5000);
          nextImage.onload = () => { clearTimeout(timer); resolve(nextImage); };
          nextImage.onerror = () => { clearTimeout(timer); reject(new Error(`Image failed to load: ${url}`)); };
          nextImage.src = url;
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
          throw new Error(uploadResult.error || "上传失败");
        }

        const imageUrl = uploadResult.url;

        // Standardize image on the server so the rest of the flow uses a cleaner garment silhouette.
        let standardizedImageUrl: string | undefined;
        try {
          standardizedImageUrl = await standardizeImage(uploadResult.url);
        } catch (error) {
          console.warn('Garment processing failed, using original:', error);
          standardizedImageUrl = undefined; // Will fallback to original
        }

        // Colour is independent of MobileNet readiness/failure. Use the original
        // image first: the standardized image has artificial opaque white padding.
        let pixels: Pixels | undefined;
        let analysisImage: HTMLImageElement | undefined;
        try {
          analysisImage = await loadImageForAnalysis(imageUrl, standardizedImageUrl);
          pixels = imagePixels(analysisImage);
        } catch (error) { console.warn('Local colour analysis unavailable:', error); }
        const readyModel = modelRef.current;
        const suggestions = await suggestLocalAttributes(file.name, pixels,
          readyModel && analysisImage ? async () => {
            const modelImage = standardizedImageUrl
              ? await loadImageForAnalysis(standardizedImageUrl, imageUrl) : analysisImage!;
            return readyModel.classify(modelImage, 5);
          } : undefined,
        );
        const suggestedName = file.name.replace(/\.[^/.]+$/, '').replace(/_+/g, ' ').trim() || '未命名衣物';

        const suggestedCategory = refineCategorySuggestion(file.name, suggestions.category, categories);
        const pendingItem: PendingItem = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          imageUrl: imageUrl,
          standardizedImageUrl: standardizedImageUrl,
          suggestedName,
          suggestedCategory,
          suggestedColor: suggestions.color,
          suggestedSeason: [],
          status: 'pending',
          aiConfidence: suggestions.confidence,
          categorySource: suggestedCategory !== suggestions.category ? 'rule' : suggestions.categorySource,
          colorSource: suggestions.colorSource,
          seasonSource: 'default', // Season is always default/empty
          rawPredictions: suggestions.rawPredictions, // Store raw predictions for debugging
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
          title={modelLoaded ? "本地分类和颜色建议已就绪，上传后可修改" : "本地颜色与文件名建议可用，上传后可修改"}
          onClick={handleClick}
          disabled={isUploading || categoriesLoading || !!categoriesError}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isUploading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>上传中… {uploadProgress}%</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>批量上传</span>
            </>
          )}
        </button>

      </div>
    </>
  );
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
      item.suggestedCategory !== 'other' && item.suggestedColor !== 'unknown' &&
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
      item.suggestedCategory !== 'other' && item.suggestedColor !== 'unknown' &&
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
