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
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${
            expanded ? 'shadow-lg' : 'shadow-sm'
          }`}
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">试穿预览</p>
              </div>
              {actionSlot}
            </div>
            {statusSlot && <div className="mt-3 flex flex-wrap gap-2">{statusSlot}</div>}
          </div>
          <div className={`bg-slate-50 p-4 ${frameClassName}`}>
            <img
              src={outfit.tryOnImageUrl}
              alt={`${outfit.name} 试穿预览`}
              className="mx-auto h-full w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      );
    }

    if (outfit.tryOnStatus === 'generating') {
      return (
        <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 px-5 py-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">正在生成试穿图</p>
          <p className="mt-2 text-sm text-indigo-900">
            预览正在生成，关闭此面板后任务仍会在后台继续。
          </p>
        </div>
      );
    }

    if (outfit.tryOnStatus === 'failed') {
      return (
        <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50 px-5 py-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">试穿生成失败</p>
          <p className="mt-2 text-sm text-rose-900">
            {outfit.tryOnError || "本次图片生成失败，请稍后重试。"}
          </p>
        </div>
      );
    }
  }

  if (outfit.boardImageUrl) {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${
          expanded ? 'shadow-lg' : 'shadow-sm'
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">搭配灵感图</p>
            </div>
            {actionSlot}
          </div>
          {statusSlot && <div className="mt-3 flex flex-wrap gap-2">{statusSlot}</div>}
        </div>
        <div className={`bg-slate-50 p-4 ${frameClassName}`}>
          <img
            src={outfit.boardImageUrl}
            alt={`${outfit.name} 搭配图`}
            className="mx-auto h-full w-full rounded-2xl object-contain"
          />
        </div>
      </div>
    );
  }

  if (outfit.boardStatus === 'generating') {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">正在生成搭配图</p>
        <p className="mt-2 text-sm text-amber-900">
          正在制作搭配图，关闭此面板后任务仍会在后台继续。
        </p>
      </div>
    );
  }

  if (outfit.boardStatus === 'failed') {
    return (
      <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50 px-5 py-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">搭配图生成失败</p>
        <p className="mt-2 text-sm text-rose-900">
          {outfit.boardError || "本次搭配图生成失败，请稍后重试。"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">等待生成搭配图</p>
      <p className="mt-2 text-sm text-slate-600">
        这套搭配还没有搭配图，点击生成试试。
      </p>
    </div>
  );
}
