'use client';

import { useEffect, useState } from 'react';

import { ClothingItem, Category, Season } from '../types';

interface ClothingListProps {
  items: ClothingItem[];
  onEdit: (item: ClothingItem) => void;
  onDelete: (id: string) => void;
}

const categoryColors: Record<Category, string> = {
  top: 'bg-blue-50 text-blue-700 border-blue-100',
  bottom: 'bg-green-50 text-green-700 border-green-100',
  outerwear: 'bg-purple-50 text-purple-700 border-purple-100',
  shoes: 'bg-orange-50 text-orange-700 border-orange-100',
  accessory: 'bg-pink-50 text-pink-700 border-pink-100',
  other: 'bg-gray-50 text-gray-700 border-gray-100',
};

const seasonColors: Record<Season, string> = {
  spring: 'bg-pink-50 text-pink-600 border-pink-100',
  summer: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  autumn: 'bg-orange-50 text-orange-600 border-orange-100',
  winter: 'bg-blue-50 text-blue-600 border-blue-100',
};

function ItemImagePreview({ item }: { item: ClothingItem }) {
  const sources = [item.standardizedImageUrl, item.imageUrl].filter((source): source is string => Boolean(source));
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(sources.length === 0);

  useEffect(() => {
    setSourceIndex(0);
    setShowPlaceholder(sources.length === 0);
  }, [item.id, item.standardizedImageUrl, item.imageUrl, sources.length]);

  if (showPlaceholder || sources.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">
        {getCategoryIcon(item.category)}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={item.name}
      className="w-full h-full object-contain p-2"
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

export default function ClothingList({ items, onEdit, onDelete }: ClothingListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-300 text-5xl mb-4">👔</div>
        <p className="text-gray-600 font-medium text-lg">No items in your wardrobe</p>
        <p className="text-gray-400 text-sm mt-2">Click "Add Item" to start building your collection</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map(item => (
        <div
          key={item.id}
          className="group bg-white rounded-2xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          {/* Image Preview */}
          {item.standardizedImageUrl || item.imageUrl ? (
            <div className="mb-3 h-44 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 relative">
              <ItemImagePreview item={item} />
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 14.536A4 4 0 019.95 15.95L6 17l1.05-3.95A4 4 0 018.464 10.536L9 11z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  aria-label={`Delete ${item.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3 h-44 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center relative">
              <span className="text-gray-300 text-3xl">{getCategoryIcon(item.category)}</span>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 14.536A4 4 0 019.95 15.95L6 17l1.05-3.95A4 4 0 018.464 10.536L9 11z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  aria-label={`Delete ${item.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-3">
            <h3 className="text-sm text-gray-500 leading-snug line-clamp-1">
              {item.name}
            </h3>
          </div>

          {/* Meta Info Section */}
          <div className="space-y-2">
            {/* Category & Color */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${categoryColors[item.category]}`}>
                {item.category}
              </span>
              <span className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100">
                {item.color}
              </span>
            </div>

            {/* Seasons */}
            <div>
              <div className="flex flex-wrap gap-1.5">
                {item.season.map(season => (
                  <span
                    key={season}
                    className={`px-2 py-0.5 rounded text-xs border ${seasonColors[season]}`}
                  >
                    {season}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {item.notes}
                </p>
              </div>
            )}

            {/* Added Date */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Added: {new Date(item.createdAt).toISOString().split('T')[0]}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to get category icon
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    top: '👕',
    bottom: '👖',
    outerwear: '🧥',
    shoes: '👟',
    accessory: '👜',
    other: '📦',
  };
  return icons[category] || '📦';
}
