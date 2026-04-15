'use client';

import { Outfit } from '../types';

interface TryOnPreviewProps {
  outfit: Outfit;
  expanded?: boolean;
  mode?: 'board' | 'tryOn';
  actionSlot?: React.ReactNode;
  statusSlot?: React.ReactNode;
}

export default function TryOnPreview({
  outfit,
  expanded = false,
  mode = 'board',
  actionSlot,
  statusSlot,
}: TryOnPreviewProps) {
  const frameClassName = expanded ? 'h-[900px]' : 'h-[420px]';

  if (mode === 'tryOn') {
    if (outfit.tryOnImageUrl) {
      return (
        <div
          className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white ${
            expanded ? 'shadow-lg' : 'shadow-sm'
          }`}
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Try-On Preview</p>
              </div>
              {actionSlot}
            </div>
            {statusSlot && <div className="mt-3 flex flex-wrap gap-2">{statusSlot}</div>}
          </div>
          <div className={`bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 ${frameClassName}`}>
            <img
              src={outfit.tryOnImageUrl}
              alt={`${outfit.name} try-on preview`}
              className="mx-auto h-full w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      );
    }

    if (outfit.tryOnStatus === 'generating') {
      return (
        <div className="rounded-[28px] border border-dashed border-indigo-300 bg-indigo-50 px-5 py-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Generating Try-On</p>
          <p className="mt-2 text-sm text-indigo-900">
            We are generating the preview now. You can close this panel and the job will keep running in the background.
          </p>
        </div>
      );
    }

    if (outfit.tryOnStatus === 'failed') {
      return (
        <div className="rounded-[28px] border border-dashed border-rose-300 bg-rose-50 px-5 py-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">Try-On Failed</p>
          <p className="mt-2 text-sm text-rose-900">
            {outfit.tryOnError || 'The image editor could not generate a result this time.'}
          </p>
        </div>
      );
    }
  }

  if (outfit.boardImageUrl) {
    return (
      <div
        className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white ${
          expanded ? 'shadow-lg' : 'shadow-sm'
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Generated Board</p>
            </div>
            {actionSlot}
          </div>
          {statusSlot && <div className="mt-3 flex flex-wrap gap-2">{statusSlot}</div>}
        </div>
        <div className={`bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 ${frameClassName}`}>
          <img
            src={outfit.boardImageUrl}
            alt={`${outfit.name} board`}
            className="mx-auto h-full w-full rounded-2xl object-contain"
          />
        </div>
      </div>
    );
  }

  if (outfit.boardStatus === 'generating') {
    return (
      <div className="rounded-[28px] border border-dashed border-amber-300 bg-amber-50 px-5 py-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">Generating Board</p>
        <p className="mt-2 text-sm text-amber-900">
          We are composing the overview board now. You can close this panel and the job will keep running in the background.
        </p>
      </div>
    );
  }

  if (outfit.boardStatus === 'failed') {
    return (
      <div className="rounded-[28px] border border-dashed border-rose-300 bg-rose-50 px-5 py-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">Board Failed</p>
        <p className="mt-2 text-sm text-rose-900">
          {outfit.boardError || 'The board image could not be generated this time.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Board Pending</p>
      <p className="mt-2 text-sm text-slate-600">
        This outfit does not have a generated board image yet.
      </p>
    </div>
  );
}
