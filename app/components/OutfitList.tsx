'use client';

import { categoryLabels, seasonLabels } from '../lib/display-labels';

import { useState } from 'react';
import { Outfit, ClothingItem } from '../types';
import TryOnPreview from './TryOnPreview';
import Modal from './Modal';
import ClothingFitControl from './ClothingFitControl';
import { ClothingFit } from '../../lib/tryon-fit';

interface OutfitListProps {
  outfits: Outfit[];
  items: ClothingItem[];
  hasDefaultTemplate: boolean;
  onGenerateBoard: (outfit: Outfit) => Promise<void>;
  onEdit: (outfit: Outfit) => void;
  onDelete: (id: string) => void;
  onGenerateTryOn: (outfit: Outfit) => Promise<void>;
  onChangeClothingFit: (outfit: Outfit, fit: ClothingFit) => Promise<void>;
}

export default function OutfitList({
  outfits,
  items,
  hasDefaultTemplate,
  onGenerateBoard,
  onEdit,
  onDelete,
  onGenerateTryOn,
  onChangeClothingFit,
}: OutfitListProps) {
  const [openOutfitId, setOpenOutfitId] = useState<string | null>(null);
  const [cardPreviewModes, setCardPreviewModes] = useState<Record<string, 'board' | 'tryOn'>>({});
  const [detailPreviewModes, setDetailPreviewModes] = useState<Record<string, 'board' | 'tryOn'>>({});
  const [savingFitIds, setSavingFitIds] = useState<string[]>([]);

  const renderFitControl = (outfit: Outfit) => (
    <ClothingFitControl
      outfit={outfit}
      saving={savingFitIds.includes(outfit.id)}
      hasDefaultTemplate={hasDefaultTemplate}
      onGenerate={() => onGenerateTryOn(outfit)}
      onChange={async fit => {
        setSavingFitIds(current => [...current, outfit.id]);
        try {
          await onChangeClothingFit(outfit, fit);
        } finally {
          setSavingFitIds(current => current.filter(id => id !== outfit.id));
        }
      }}
    />
  );

  if (outfits.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-300 text-5xl mb-4">👗</div>
        <p className="text-gray-600 font-medium text-lg">你的第一套搭配，等你出场</p>
        <p className="text-gray-400 text-sm mt-2">点击「创建搭配」，把喜欢的衣物穿在一起。</p>
      </div>
    );
  }

  const openOutfit = outfits.find(outfit => outfit.id === openOutfitId) ?? null;
  const openPreviewMode = openOutfit ? detailPreviewModes[openOutfit.id] ?? (openOutfit.tryOnImageUrl ? 'tryOn' : 'board') : 'board';

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {outfits.map(outfit => {
        const cardPreviewMode = cardPreviewModes[outfit.id] ?? (outfit.tryOnImageUrl ? 'tryOn' : 'board');
        const pendingPreviewMode = (['board', 'tryOn'] as const).find(kind => {
          const status = kind === 'board' ? outfit.boardStatus : outfit.tryOnStatus;
          return status === 'failed' || status === 'generating';
        });

        return (
          <div
            key={outfit.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <div>
              <div className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-medium leading-snug text-gray-900">{outfit.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {outfit.items.length} 件衣物
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => onEdit(outfit)}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDelete(outfit.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <TryOnPreview
                    outfit={outfit}
                    expanded={false}
                    mode={cardPreviewMode}
                    onGenerate={() => cardPreviewMode === 'tryOn' ? onGenerateTryOn(outfit) : onGenerateBoard(outfit)}
                    generateDisabledReason={cardPreviewMode === 'tryOn' ? savingFitIds.includes(outfit.id) ? '正在保存版型，请稍候。' : !hasDefaultTemplate ? '请先通过「人物照片」上传照片并设为默认。' : undefined : undefined}
                    controlsSlot={cardPreviewMode === 'tryOn' ? renderFitControl(outfit) : undefined}
                    actionSlot={
                      <div role="group" aria-label={`${outfit.name} 预览切换`} className="flex rounded-lg bg-slate-100 p-1">
                        {(['board', 'tryOn'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={cardPreviewMode === mode}
                            onClick={() => setCardPreviewModes(current => ({ ...current, [outfit.id]: mode }))}
                            className={`min-w-0 flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              cardPreviewMode === mode
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            {mode === 'board' ? '搭配图' : '试穿图'}
                          </button>
                        ))}
                      </div>
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 p-4">
                <button
                  onClick={() => {
                    setDetailPreviewModes(current => ({
                      ...current,
                      [outfit.id]: pendingPreviewMode ?? cardPreviewMode,
                    }));
                    setOpenOutfitId(outfit.id);
                  }}
                  className="flex w-full items-center justify-between border-b border-gray-200 pb-3 text-sm font-semibold text-gray-900 transition-colors hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  查看详情
                  <span aria-hidden="true">↗</span>
                </button>
                {(['board', 'tryOn'] as const).map(kind => {
                  const status = kind === 'board' ? outfit.boardStatus : outfit.tryOnStatus;
                  // The visible preview already explains its own pending/error state.
                  const imageUrl = cardPreviewMode === 'board' ? outfit.boardImageUrl : outfit.tryOnImageUrl;
                  if ((status !== 'generating' && status !== 'failed') || (kind === cardPreviewMode && !imageUrl)) return null;
                  return (
                    <p key={kind} role="status" className={`text-xs ${status === 'failed' ? 'text-rose-700' : 'text-gray-600'}`}>
                      {kind === 'board' ? '搭配图' : '试穿图'}{status === 'generating' ? '生成中，完成后自动更新' : '生成失败，可在详情中重试'}
                    </p>
                  );
                })}

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">衣物（{outfit.items.length}）</p>
                  <div className="space-y-1.5">
                    {outfit.items.map(outfitItem => {
                      const item = items.find(candidate => candidate.id === outfitItem.clothingItemId);
                      if (!item) return null;

                      return (
                        <div key={outfitItem.clothingItemId} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300"></span>
                          <span className="truncate text-gray-700">{item.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-gray-400">{categoryLabels[item.category]}</span>
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
                      {outfit.season.map(season => seasonLabels[season]).join(" · ")}
                    </span>
                  )}
                </div>

                {outfit.notes && (
                  <div className="border-t border-gray-100 pt-2">
                    <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">备注</p>
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
        title={openOutfit ? openOutfit.name : "搭配"}
        sizeClassName="max-w-6xl"
      >
        {openOutfit && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="space-y-4">
              <TryOnPreview
                outfit={openOutfit}
                expanded={true}
                mode={openPreviewMode}
                onGenerate={openPreviewMode === 'board' ? () => onGenerateBoard(openOutfit) : !openOutfit.tryOnImageUrl ? () => onGenerateTryOn(openOutfit) : undefined}
                generateDisabledReason={openPreviewMode === 'tryOn' ? savingFitIds.includes(openOutfit.id) ? '正在保存版型，请稍候。' : !hasDefaultTemplate ? '请先通过「人物照片」上传照片并设为默认。' : undefined : undefined}
                controlsSlot={(openPreviewMode) === 'tryOn' ? renderFitControl(openOutfit) : undefined}
                actionSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setDetailPreviewModes(current => ({ ...current, [openOutfit.id]: 'board' }))}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                        (openPreviewMode) === 'board'
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md'
                      }`}
                    >
                      <span className="text-[11px] leading-none">▦</span>
                      搭配图
                    </button>

                    <button
                      onClick={() => setDetailPreviewModes(current => ({ ...current, [openOutfit.id]: 'tryOn' }))}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                        (openPreviewMode) === 'tryOn'
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'border border-emerald-200 bg-white text-emerald-700 hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md'
                      } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-sm`}
                    >
                      <span className="text-[11px] leading-none">✦</span>
                      试穿图
                    </button>
                  </div>
                }
              />

              <div className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  搭配说明
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {(openPreviewMode) === 'tryOn'
                    ? hasDefaultTemplate
                      ? "基于默认人物照片和当前搭配图，生成穿搭效果参考。"
                      : "先上传人物照片并设为默认，即可生成这套搭配的试穿参考图。"
                    : "用搭配图查看整体配色与层次，实际穿着效果以实物为准。"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-gray-400">衣物（{openOutfit.items.length}）</p>
                <div className="space-y-2">
                  {openOutfit.items.map(outfitItem => {
                    const item = items.find(candidate => candidate.id === outfitItem.clothingItemId);
                    if (!item) return null;

                    return (
                      <div key={outfitItem.clothingItemId} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300"></span>
                        <span className="truncate text-gray-700">{item.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-gray-400">{categoryLabels[item.category]}</span>
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
                    {openOutfit.season.map(season => seasonLabels[season]).join(" · ")}
                  </span>
                )}
              </div>

              {openOutfit.notes && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">备注</p>
                  <p className="text-sm leading-relaxed text-gray-600">{openOutfit.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(openOutfit)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
                >
                  <span className="text-[12px] leading-none">✎</span>
                  编辑搭配
                </button>
                <button
                  onClick={() => {
                    setOpenOutfitId(null);
                    onDelete(openOutfit.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md"
                >
                  <span className="text-[12px] leading-none">🗑</span>
                  删除搭配
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
