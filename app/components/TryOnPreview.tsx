'use client';

import { Outfit } from '../types';

interface TryOnPreviewProps {
  outfit: Outfit;
  expanded?: boolean;
}

export default function TryOnPreview({ outfit, expanded = false }: TryOnPreviewProps) {
  if (outfit.boardImageUrl) {
    return (
      <div
        className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white ${
          expanded ? 'shadow-lg' : 'shadow-sm'
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Generated Board</p>
          <p className="mt-1 text-sm text-slate-600">
            A composed overview image for quickly judging balance, color, and layering.
          </p>
        </div>
        <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <img
            src={outfit.boardImageUrl}
            alt={`${outfit.name} board`}
            className={`mx-auto w-full rounded-2xl object-contain ${
              expanded ? 'max-h-[900px]' : 'max-h-[420px]'
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Board Pending</p>
      <p className="mt-2 text-sm text-slate-600">
        This outfit does not have a generated board image yet. Edit and save it again to regenerate the board.
      </p>
    </div>
  );
}
