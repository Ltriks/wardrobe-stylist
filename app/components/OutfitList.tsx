'use client';

import { useState } from 'react';
import { Outfit, ClothingItem } from '../types';
import TryOnPreview from './TryOnPreview';

interface OutfitListProps {
  outfits: Outfit[];
  items: ClothingItem[];
  onEdit: (outfit: Outfit) => void;
  onDelete: (id: string) => void;
}

export default function OutfitList({
  outfits,
  items,
  onEdit,
  onDelete,
}: OutfitListProps) {
  const [activeOutfitId, setActiveOutfitId] = useState<string | null>(null);

  if (outfits.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-300 text-5xl mb-4">👗</div>
        <p className="text-gray-600 font-medium text-lg">No outfits created yet</p>
        <p className="text-gray-400 text-sm mt-2">Create your first outfit to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {outfits.map(outfit => {
        const isActive = activeOutfitId === outfit.id;

        return (
          <div
            key={outfit.id}
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-200 ${
              isActive
                ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-100 lg:col-span-3'
                : 'border-gray-200 hover:shadow-md'
            }`}
          >
            <div className={isActive ? 'lg:grid lg:grid-cols-[minmax(0,1.5fr)_320px]' : ''}>
              <div className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium leading-snug text-gray-900">{outfit.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {outfit.items.length} pieces · generated overview board
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => onEdit(outfit)}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(outfit.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <TryOnPreview outfit={outfit} expanded={isActive} />

                  <div className="absolute right-1 top-1 z-10">
                    <button
                      onClick={() => setActiveOutfitId(isActive ? null : outfit.id)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/90 text-gray-600 hover:bg-white'
                      }`}
                    >
                      {isActive ? 'Done' : 'Open Board'}
                    </button>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-xs leading-5 text-indigo-900">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                      Board View
                    </p>
                    <p className="mt-1">
                      Review the generated board as a styling overview. This MVP focuses on composition and overall balance,
                      not body simulation.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                {isActive && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Review Focus
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Use this board to decide whether the look works as a set. The next iteration can add filtering and
                      more advanced board composition controls.
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Items ({outfit.items.length})</p>
                  <div className="space-y-1.5">
                    {outfit.items.map(outfitItem => {
                      const item = items.find(candidate => candidate.id === outfitItem.clothingItemId);
                      if (!item) return null;

                      return (
                        <div key={outfitItem.clothingItemId} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300"></span>
                          <span className="truncate text-gray-700">{item.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-gray-400">{item.category}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    Board image {outfit.boardImageUrl ? 'ready' : 'pending'}
                  </span>
                  {outfit.occasion && (
                    <span className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                      {outfit.occasion}
                    </span>
                  )}
                  {outfit.season && (
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      {outfit.season}
                    </span>
                  )}
                </div>

                {outfit.notes && (
                  <div className="border-t border-gray-100 pt-2">
                    <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Notes</p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">{outfit.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
