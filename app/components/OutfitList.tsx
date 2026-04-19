'use client';

import { useState } from 'react';
import { Outfit, ClothingItem } from '../types';
import TryOnPreview from './TryOnPreview';
import Modal from './Modal';

interface OutfitListProps {
  outfits: Outfit[];
  items: ClothingItem[];
  hasDefaultTemplate: boolean;
  onGenerateBoard: (outfit: Outfit) => Promise<void>;
  onEdit: (outfit: Outfit) => void;
  onDelete: (id: string) => void;
  onGenerateTryOn: (outfit: Outfit) => Promise<void>;
}

export default function OutfitList({
  outfits,
  items,
  hasDefaultTemplate,
  onGenerateBoard,
  onEdit,
  onDelete,
  onGenerateTryOn,
}: OutfitListProps) {
  const [openOutfitId, setOpenOutfitId] = useState<string | null>(null);
  const [detailPreviewModes, setDetailPreviewModes] = useState<Record<string, 'board' | 'tryOn'>>({});
  const [hoveredOutfitId, setHoveredOutfitId] = useState<string | null>(null);

  const renderStatusChips = (outfit: Outfit) => (
    <>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] shadow-sm ${
          outfit.boardStatus === 'success'
            ? 'border-gray-200 bg-white text-gray-700'
            : outfit.boardStatus === 'generating'
              ? 'border-amber-100 bg-amber-50 text-amber-700'
              : outfit.boardStatus === 'failed'
                ? 'border-rose-100 bg-rose-50 text-rose-700'
                : 'border-gray-200 bg-white text-gray-600'
        }`}
      >
        Board {outfit.boardStatus || (outfit.boardImageUrl ? 'success' : 'idle')}
      </span>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] shadow-sm ${
          outfit.tryOnStatus === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : outfit.tryOnStatus === 'generating'
              ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
              : outfit.tryOnStatus === 'failed'
                ? 'border-rose-100 bg-rose-50 text-rose-700'
                : 'border-gray-200 bg-white text-gray-600'
        }`}
      >
        Try-on {outfit.tryOnStatus || 'idle'}
      </span>
    </>
  );

  if (outfits.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-300 text-5xl mb-4">👗</div>
        <p className="text-gray-600 font-medium text-lg">No outfits created yet</p>
        <p className="text-gray-400 text-sm mt-2">Create your first outfit to get started!</p>
      </div>
    );
  }

  const openOutfit = outfits.find(outfit => outfit.id === openOutfitId) ?? null;
  const openCanShowTryOn = openOutfit
    ? Boolean(openOutfit.tryOnImageUrl || openOutfit.tryOnStatus === 'generating' || openOutfit.tryOnStatus === 'failed')
    : false;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {outfits.map(outfit => {
        const canShowTryOn = Boolean(outfit.tryOnImageUrl || outfit.tryOnStatus === 'generating' || outfit.tryOnStatus === 'failed');
        const cardPreviewMode =
          outfit.tryOnImageUrl && hoveredOutfitId === outfit.id
            ? 'board'
            : outfit.tryOnImageUrl
              ? 'tryOn'
              : 'board';

        return (
          <div
            key={outfit.id}
            onMouseEnter={() => setHoveredOutfitId(outfit.id)}
            onMouseLeave={() => setHoveredOutfitId(current => (current === outfit.id ? null : current))}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div>
              <div className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4">
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
                  <TryOnPreview
                    outfit={outfit}
                    expanded={false}
                    mode={cardPreviewMode}
                    actionSlot={
                      <div className="flex flex-wrap items-center gap-2">
                        {outfit.tryOnImageUrl && (
                          <button
                            onClick={() => {
                              setDetailPreviewModes(current => ({
                                ...current,
                                [outfit.id]: 'tryOn',
                              }));
                              setOpenOutfitId(outfit.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md"
                          >
                            <span className="text-[11px] leading-none">✦</span>
                            View Try-On
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDetailPreviewModes(current => ({
                              ...current,
                              [outfit.id]: current[outfit.id] ?? (outfit.tryOnImageUrl ? 'tryOn' : 'board'),
                            }));
                            setOpenOutfitId(outfit.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
                        >
                          <span className="text-[11px] leading-none">↗</span>
                          Inspect
                        </button>
                      </div>
                    }
                    statusSlot={renderStatusChips(outfit)}
                  />
                </div>
              </div>

              <div className="space-y-3 p-4">
                {outfit.tryOnStatus === 'generating' && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                      Generating In Background
                    </p>
                    <p className="mt-1 leading-5">
                      You can keep browsing or close the detail view. We will update this outfit card when the try-on preview finishes.
                    </p>
                  </div>
                )}

                {outfit.tryOnStatus === 'failed' && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-900">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                      Try-On Failed
                    </p>
                    <p className="mt-1 leading-5">
                      {outfit.tryOnError || 'The try-on preview could not be generated this time.'}
                    </p>
                    <button
                      onClick={() => void onGenerateTryOn(outfit)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 hover:shadow-md"
                    >
                      <span className="text-[11px] leading-none">↻</span>
                      Retry Try-On
                    </button>
                  </div>
                )}

                {outfit.boardStatus === 'generating' && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">
                      Generating Board
                    </p>
                    <p className="mt-1 leading-5">
                      The overview board is still being composed in the background. You can keep browsing and this card will update when it is ready.
                    </p>
                  </div>
                )}

                {outfit.boardStatus === 'failed' && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-900">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                      Board Failed
                    </p>
                    <p className="mt-1 leading-5">
                      {outfit.boardError || 'The overview board could not be generated this time.'}
                    </p>
                    <button
                      onClick={() => void onGenerateBoard(outfit)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 hover:shadow-md"
                    >
                      <span className="text-[11px] leading-none">↻</span>
                      Retry Board
                    </button>
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

      <Modal
        isOpen={Boolean(openOutfit)}
        onClose={() => setOpenOutfitId(null)}
        title={openOutfit ? openOutfit.name : 'Outfit'}
        sizeClassName="max-w-6xl"
      >
        {openOutfit && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="space-y-4">
              <TryOnPreview
                outfit={openOutfit}
                expanded={true}
                mode={detailPreviewModes[openOutfit.id] ?? (openOutfit.tryOnImageUrl ? 'tryOn' : 'board')}
                actionSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setDetailPreviewModes(current => ({ ...current, [openOutfit.id]: 'board' }))}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                        (detailPreviewModes[openOutfit.id] ?? (openOutfit.tryOnImageUrl ? 'tryOn' : 'board')) === 'board'
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md'
                      }`}
                    >
                      <span className="text-[11px] leading-none">▦</span>
                      Board
                    </button>
                    {((!openOutfit.boardImageUrl && openOutfit.boardStatus !== 'generating') || openOutfit.boardStatus === 'failed') && (
                      <button
                        onClick={async () => {
                          setDetailPreviewModes(current => ({ ...current, [openOutfit.id]: 'board' }));
                          await onGenerateBoard(openOutfit);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3.5 py-2 text-xs font-semibold text-amber-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                      >
                        <span className="text-[11px] leading-none">↻</span>
                        {openOutfit.boardStatus === 'failed' ? 'Retry Board' : 'Generate Board'}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        setDetailPreviewModes(current => ({ ...current, [openOutfit.id]: 'tryOn' }));
                        if ((!openOutfit.tryOnImageUrl || openOutfit.tryOnStatus === 'failed') && openOutfit.tryOnStatus !== 'generating') {
                          await onGenerateTryOn(openOutfit);
                        }
                      }}
                      disabled={openOutfit.tryOnStatus === 'generating'}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                        (detailPreviewModes[openOutfit.id] ?? (openOutfit.tryOnImageUrl ? 'tryOn' : 'board')) === 'tryOn'
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'border border-emerald-200 bg-white text-emerald-700 hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md'
                      } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-sm`}
                    >
                      <span className="text-[11px] leading-none">✦</span>
                      {openOutfit.tryOnStatus === 'generating'
                        ? 'Generating…'
                        : openOutfit.tryOnStatus === 'failed'
                          ? 'Retry Try-On'
                        : openCanShowTryOn
                          ? 'Try-On'
                          : hasDefaultTemplate
                            ? 'Generate Try-On'
                            : 'Upload Template First'}
                    </button>
                  </div>
                }
                statusSlot={renderStatusChips(openOutfit)}
              />

              <div className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Review Focus
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {(detailPreviewModes[openOutfit.id] ?? (openOutfit.tryOnImageUrl ? 'tryOn' : 'board')) === 'tryOn'
                    ? hasDefaultTemplate
                      ? 'This try-on preview uses your default model photo plus the current board image to create a styled editorial reference.'
                      : 'Upload and set a default template photo first, then generate a try-on preview from this board.'
                    : 'Use the board to review the look as a set. This is still an overview board, not a precise garment simulation.'}
                </p>
              </div>

              {openOutfit.tryOnStatus === 'generating' && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                    Background Job
                  </p>
                  <p className="mt-2 text-sm leading-6 text-indigo-900">
                    The try-on image is still being generated. You can close this window and come back later. The request will keep running.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-gray-400">Items ({openOutfit.items.length})</p>
                <div className="space-y-2">
                  {openOutfit.items.map(outfitItem => {
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
                {openOutfit.occasion && (
                  <span className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                    {openOutfit.occasion}
                  </span>
                )}
                {openOutfit.season && (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    {openOutfit.season}
                  </span>
                )}
              </div>

              {openOutfit.notes && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Notes</p>
                  <p className="text-sm leading-relaxed text-gray-600">{openOutfit.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(openOutfit)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
                >
                  <span className="text-[12px] leading-none">✎</span>
                  Edit Outfit
                </button>
                <button
                  onClick={() => {
                    setOpenOutfitId(null);
                    onDelete(openOutfit.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md"
                >
                  <span className="text-[12px] leading-none">🗑</span>
                  Delete Outfit
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
