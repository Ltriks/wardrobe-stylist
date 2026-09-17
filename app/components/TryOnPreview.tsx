'use client';

import { Outfit } from '../types';

interface TryOnPreviewProps {
  outfit: Outfit;
  expanded?: boolean;
  mode?: 'board' | 'tryOn';
  actionSlot?: React.ReactNode;
  controlsSlot?: React.ReactNode;
  onGenerate?: () => Promise<void>;
  generateDisabledReason?: string;
}

export default function TryOnPreview({
  outfit,
  expanded = false,
  mode = 'board',
  actionSlot,
  controlsSlot,
  onGenerate,
  generateDisabledReason,
}: TryOnPreviewProps) {
  const frameClassName = expanded ? 'h-[900px]' : 'h-[420px]';
  const isTryOn = mode === 'tryOn';
  const label = isTryOn ? '试穿图' : '搭配图';
  const imageUrl = isTryOn ? outfit.tryOnImageUrl : outfit.boardImageUrl;
  const status = isTryOn ? outfit.tryOnStatus : outfit.boardStatus;
  const error = isTryOn ? outfit.tryOnError : outfit.boardError;
  const showNotice = !imageUrl || (expanded && (status === 'generating' || status === 'failed'));

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${expanded ? 'shadow-lg' : 'shadow-sm'}`}>
      {actionSlot && (
        <div className="border-b border-slate-200 px-4 py-3">
          {actionSlot}
        </div>
      )}
      {controlsSlot && <div className="border-b border-slate-200 px-4 py-3">{controlsSlot}</div>}
      {showNotice && (
        <div
          role="status"
          className={`${imageUrl ? 'px-4 py-3' : 'px-5 py-12 text-center'} ${
            status === 'failed' ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-600'
          }`}
        >
          <p className="text-sm font-semibold">
            {status === 'generating' ? `${label}生成中…` : status === 'failed' ? `${label}生成失败` : `尚未生成${label}`}
          </p>
          <p className="mt-2 break-words text-xs leading-relaxed">
            {status === 'generating'
              ? '完成后会自动更新，可以继续浏览。'
              : onGenerate
                ? generateDisabledReason || (status === 'failed' ? '可以直接重试，或打开详情查看原因。' : '点击下方按钮开始生成。')
              : status === 'failed'
                ? expanded ? (error || '本次生成失败，请重试。') : '打开详情可查看原因并重试。'
                : expanded ? '使用上方按钮开始生成。' : '打开详情即可开始生成。'}
          </p>
          {onGenerate && status !== 'generating' && (
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={Boolean(generateDisabledReason)}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'failed' ? `重新生成${label}` : `生成${label}`}
            </button>
          )}
        </div>
      )}
      {imageUrl && (
        <div className={`bg-slate-50 p-4 ${frameClassName}`}>
          <img
            src={imageUrl}
            alt={`${outfit.name} ${isTryOn ? '试穿预览' : '搭配图'}`}
            className="mx-auto h-full w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
