'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PendingItem, Category, Season, ClothingItemFormData } from '../types';
import { clearPendingBatchApi, createItemApi, deletePendingItemApi, fetchPendingItems, updatePendingItemApi } from '../lib/wardrobe-api';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'other', label: 'Other' },
];

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

export default function BatchConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const batchId = searchParams.get('batchId') || undefined;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!batchId) {
        if (!cancelled) {
          setPendingItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const items = await fetchPendingItems(batchId);
        if (!cancelled) {
          setPendingItems(items);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load pending items:', error);
          setPendingItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  useEffect(() => {
    const validIds = new Set(pendingItems.map(item => item.id));
    setSelectedIds(prev => prev.filter(id => validIds.has(id)));
  }, [pendingItems]);

  const updateItem = async (id: string, updates: Partial<PendingItem>) => {
    const updated = await updatePendingItemApi(id, updates);
    setPendingItems(prev =>
      prev.map(item =>
        item.id === id ? updated : item
      )
    );
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPending = () => {
    const pendingIds = pendingItems.filter(item => item.status === 'pending').map(item => item.id);
    const allSelected = pendingIds.length > 0 && pendingIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : pendingIds);
  };

  const applyBulkCategory = async (category: Category) => {
    if (selectedIds.length === 0) return;

    await Promise.all(
      selectedIds.map(id =>
        updatePendingItemApi(id, {
          suggestedCategory: category,
          categorySource: 'default',
        }),
      ),
    );

    const items = await fetchPendingItems(batchId);
    setPendingItems(items);
  };

  const toggleSeason = async (id: string, season: Season) => {
    const item = pendingItems.find(pendingItem => pendingItem.id === id);
    if (!item) return;

    const newSeasons = item.suggestedSeason.includes(season)
      ? item.suggestedSeason.filter(s => s !== season)
      : [...item.suggestedSeason, season];

    await updateItem(id, { suggestedSeason: newSeasons });
  };

  const confirmAll = async () => {
    setIsProcessing(true);

    // Process only pending items (confirmed items are already removed)
    const itemsToProcess = pendingItems.filter(item => item.status === 'pending');

    for (const item of itemsToProcess) {
      const formData: ClothingItemFormData = {
        name: item.suggestedName,
        category: item.suggestedCategory,
        color: item.suggestedColor,
        season: item.suggestedSeason,
        imageUrl: item.imageUrl,
        standardizedImageUrl: item.standardizedImageUrl,
        cutoutImageUrl: item.cutoutImageUrl,
      };

      await createItemApi(formData);
    }

    if (batchId) {
      await clearPendingBatchApi(batchId);
    }
    // Navigate back to clothes list
    router.push('/');
  };

  const skipItem = async (id: string) => {
    await updateItem(id, { status: 'skipped' });
  };

  const confirmItem = async (id: string) => {
    const item = pendingItems.find(item => item.id === id);
    if (!item) return;

    // Create the clothing item immediately
    const formData: ClothingItemFormData = {
      name: item.suggestedName,
      category: item.suggestedCategory,
      color: item.suggestedColor,
      season: item.suggestedSeason,
      imageUrl: item.imageUrl,
      standardizedImageUrl: item.standardizedImageUrl,
    };

    await createItemApi(formData);
    await deletePendingItemApi(id);
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  const pendingCount = pendingItems.filter(item => item.status === 'pending').length;
  const pendingIds = pendingItems.filter(item => item.status === 'pending').map(item => item.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every(id => selectedIds.includes(id));
  const selectedCount = selectedIds.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-300 text-5xl mb-4">⏳</div>
          <p className="text-gray-600">Loading pending items...</p>
        </div>
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-300 text-5xl mb-4">📦</div>
          <p className="text-gray-600">No pending items to confirm</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Batch Upload Confirmation</h1>
              <p className="text-gray-500 text-sm mt-1">
                {pendingCount} items pending confirmation
                {selectedCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    · {selectedCount} selected
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAllPending}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                {allPendingSelected ? 'Clear Selection' : 'Select All'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAll}
                disabled={pendingCount === 0 || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Confirm All (${pendingCount})`}
              </button>
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-900">Bulk set category:</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => void applyBulkCategory(cat.value)}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Items Grid */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingItems.map(item => (
            <PendingItemCard
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelected={() => toggleSelected(item.id)}
              onUpdate={(updates) => void updateItem(item.id, updates)}
              onToggleSeason={(season) => void toggleSeason(item.id, season)}
              onSkip={() => void skipItem(item.id)}
              onConfirm={() => void confirmItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PendingItemImage({ item }: { item: PendingItem }) {
  const sources = [item.standardizedImageUrl, item.imageUrl].filter((source): source is string => Boolean(source));
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(sources.length === 0);

  useEffect(() => {
    setSourceIndex(0);
    setShowPlaceholder(sources.length === 0);
  }, [item.id, item.standardizedImageUrl, item.imageUrl, sources.length]);

  if (showPlaceholder || sources.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-300">
        <span className="text-sm font-medium">No image</span>
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={item.suggestedName}
      className="w-full h-full object-cover"
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex(prev => prev + 1);
          return;
        }

        setShowPlaceholder(true);
      }}
    />
  );
}

function PendingItemCard({
  item,
  isSelected,
  onToggleSelected,
  onUpdate,
  onToggleSeason,
  onSkip,
  onConfirm,
}: {
  item: PendingItem;
  isSelected: boolean;
  onToggleSelected: () => void;
  onUpdate: (updates: Partial<PendingItem>) => void;
  onToggleSeason: (season: Season) => void;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  const isSkipped = item.status === 'skipped';
  const isAI = item.categorySource === 'ai' || item.colorSource === 'ai';

  return (
    <div className={`bg-white rounded-lg border ${isSkipped ? 'border-gray-200 opacity-50' : 'border-gray-200'} shadow-sm overflow-hidden`}>
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        <PendingItemImage item={item} />
        {isSkipped && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="text-gray-500 font-medium">Skipped</span>
          </div>
        )}
        <label className="absolute top-2 left-2 inline-flex items-center justify-center rounded-md bg-white/90 p-1 shadow-sm">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelected}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        {/* AI Badge */}
        {isAI && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            AI
          </div>
        )}
        {/* Duplicate Warning */}
        {item.isDuplicate && (
          <div className="absolute top-10 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full" title={item.duplicateReason}>
            ⚠️ 可能重复
          </div>
        )}
        {/* Source indicators */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {item.categorySource === 'ai' && (
            <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">C-AI</span>
          )}
          {item.colorSource === 'ai' && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">CLR-AI</span>
          )}
          {item.categorySource === 'rule' && (
            <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded">C-Rule</span>
          )}
          {item.colorSource === 'rule' && (
            <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded">CLR-Rule</span>
          )}
          {item.seasonSource === 'default' && (
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">S-?</span>
          )}
        </div>
        
        {/* Debug info - raw predictions */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded max-w-[140px] truncate">
          {item.rawPredictions || 'No raw predictions'}
        </div>
      </div>

      {/* Duplicate Warning */}
      {item.isDuplicate && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-700 text-sm">
            ⚠️ {item.duplicateReason}
          </p>
        </div>
      )}
      
      {/* Form */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <div>
          <input
            type="text"
            value={item.suggestedName}
            onChange={(e) => onUpdate({ suggestedName: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSkipped}
          />
        </div>

        {/* Category */}
        <div>
          <select
            value={item.suggestedCategory}
            onChange={(e) => onUpdate({ suggestedCategory: e.target.value as Category })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSkipped}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <input
            type="text"
            value={item.suggestedColor}
            onChange={(e) => onUpdate({ suggestedColor: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Color"
            disabled={isSkipped}
          />
        </div>

        {/* Season */}
        <div className="flex flex-wrap gap-1">
          {SEASONS.map(season => (
            <button
              key={season.value}
              type="button"
              onClick={() => onToggleSeason(season.value)}
              disabled={isSkipped}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                item.suggestedSeason.includes(season.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              } ${isSkipped ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {season.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onSkip}
            disabled={isSkipped}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
          <button
            onClick={onConfirm}
            disabled={isSkipped}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
