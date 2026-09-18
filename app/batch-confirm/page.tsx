'use client';

import { clothingCategories } from '../../lib/clothing-categories';

import { colorLabel } from '../lib/display-labels';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PendingItem, Category, Season } from '../types';
import { clearPendingBatchApi, confirmPendingItemApi, fetchPendingItems, updatePendingItemApi } from '../lib/wardrobe-api';

import ClothingSizeInput from '../components/ClothingSizeInput';
import { createPendingDraftSaver } from '../lib/pending-draft-saver';

const CATEGORIES = clothingCategories;

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: "春季" },
  { value: 'summer', label: "夏季" },
  { value: 'autumn', label: "秋季" },
  { value: 'winter', label: "冬季" },
];

function BatchConfirmPageContent() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batchId') || undefined;
  return <BatchConfirmEditor key={batchId || 'empty'} batchId={batchId} />;
}

function BatchConfirmEditor({ batchId }: { batchId?: string }) {
  const router = useRouter();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const drafts = useRef<PendingItem[]>([]);
  const processing = useRef(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const saver = useMemo(() => createPendingDraftSaver(
    updatePendingItemApi,
    () => setSaveError('修改尚未保存，内容已保留。请重试保存。'),
    () => setSaveError(''),
  ), []);

  const replaceItems = (items: PendingItem[]) => {
    drafts.current = items;
    setPendingItems(items);
  };

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (saver.hasUnsaved()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => { saver.dispose(); window.removeEventListener('beforeunload', warnUnsaved); };
  }, [saver]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!batchId) {
        if (!cancelled) {
          replaceItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const items = await fetchPendingItems(batchId);
        if (!cancelled) {
          replaceItems(items.map(item => ({ ...item, suggestedColor: colorLabel(item.suggestedColor) })));
        }
      } catch (error) {
        if (!cancelled) {
          setError('待确认衣物加载失败，请刷新重试。');
          replaceItems([]);
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
    const validIds = new Set(pendingItems.filter(item => item.status === 'pending').map(item => item.id));
    setSelectedIds(prev => prev.filter(id => validIds.has(id)));
  }, [pendingItems]);

  const updateItem = (id: string, updates: Partial<PendingItem>) => {
    replaceItems(drafts.current.map(item => item.id === id ? { ...item, ...updates } : item));
    saver.edit(id, updates);
  };

  const flushEdits = () => { void saver.flush().catch(() => setSaveError('修改尚未保存，内容已保留。请重试保存。')); };
  const leavePage = async () => {
    if (processing.current) return;
    try { await saver.flush(); router.push('/'); }
    catch { setSaveError('修改尚未保存，请重试保存后返回衣柜。'); }
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

  const applyBulkCategory = (category: Category) => {
    for (const id of selectedIds) updateItem(id, { suggestedCategory: category, categorySource: 'default' });
    flushEdits();
  };

  const toggleSeason = (id: string, season: Season) => {
    const item = drafts.current.find(candidate => candidate.id === id);
    if (!item) return;
    const suggestedSeason = item.suggestedSeason.includes(season)
      ? item.suggestedSeason.filter(value => value !== season)
      : [...item.suggestedSeason, season];
    updateItem(id, { suggestedSeason, seasonSource: 'default' });
  };

  const confirmItems = async (id?: string) => {
    if (processing.current) return;
    if (saver.isComposing()) { setError('请先完成当前输入，再确认入柜。'); return; }
    const items = drafts.current.filter(item => item.status === 'pending' && (!id || item.id === id));
    if (!items.length) return;
    if (items.some(item => !item.suggestedName.trim())) { setError('请填写衣物名称后再确认。'); return; }
    processing.current = true;
    setIsProcessing(true);
    setError('');
    try {
      await saver.flush();
      for (const item of items) {
        await confirmPendingItemApi(item.id);
        replaceItems(drafts.current.filter(candidate => candidate.id !== item.id));
      }
      if (!id) {
        if (batchId) await clearPendingBatchApi(batchId);
        router.push('/');
      }
    } catch (error) {
      setError(`${error instanceof Error ? error.message : '确认失败，请重试。'} 已入柜的衣物不会重复添加，其余衣物可继续确认。`);
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  };

  const pendingCount = pendingItems.filter(item => item.status === 'pending').length;
  const pendingIds = pendingItems.filter(item => item.status === 'pending').map(item => item.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every(id => selectedIds.includes(id));
  const selectedCount = selectedIds.length;

  if (isLoading) {
    return <BatchConfirmFallback />;
  }

  if (pendingItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-300 text-5xl mb-4">📦</div>
          <p className="text-gray-600">{error || '没有待确认的衣物'}</p>
          <button
            onClick={() => void leavePage()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            返回衣柜
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
              <h1 className="text-xl font-semibold text-gray-900">批量入柜确认</h1>
              <p className="text-gray-500 text-sm mt-1">
                {pendingCount} 件衣物待确认
                {selectedCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    · {selectedCount} 件已选
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAllPending}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                {allPendingSelected ? "取消全选" : "全选"}
              </button>
              <button
                onClick={() => void leavePage()}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => void confirmItems()}
                disabled={pendingCount === 0 || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? "处理中…" : `全部确认（${pendingCount}）`}
              </button>
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-900">批量设置分类：</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => applyBulkCategory(cat.value)}
                  disabled={isProcessing}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
          {selectedCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">批量设置季节：</span>
              {[
                { label: '春秋', value: ['spring', 'autumn'] },
                { label: '夏季', value: ['summer'] },
                { label: '冬季', value: ['winter'] },
                { label: '四季', value: ['spring', 'summer', 'autumn', 'winter'] },
                { label: '清空', value: [] },
              ].map(preset => (
                <button key={preset.label} type="button" disabled={isProcessing}
                  onClick={() => {
                    for (const id of selectedIds) updateItem(id, { suggestedSeason: preset.value as Season[], seasonSource: 'default' });
                    flushEdits();
                  }}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >{preset.label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {(error || saveError) && (
        <div role="alert" className="mx-auto max-w-6xl px-6 pt-4 text-sm text-red-700">
          {error && <p>{error}</p>}
          {saveError && <p>{saveError} <button type="button" disabled={isProcessing} onClick={flushEdits} className="underline">重试保存</button></p>}
        </div>
      )}
      {/* Items Grid */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingItems.map(item => (
            <PendingItemCard
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelected={() => toggleSelected(item.id)}
              onUpdate={(updates) => updateItem(item.id, updates)}
              disabled={isProcessing}
              onComposition={value => saver.composition(item.id, value)}
              onBlur={() => { saver.composition(item.id, false); flushEdits(); }}
              onToggleSeason={(season) => void toggleSeason(item.id, season)}
              onSkip={() => { updateItem(item.id, { status: 'skipped' }); flushEdits(); }}
              onConfirm={() => void confirmItems(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BatchConfirmFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-300 text-5xl mb-4">⏳</div>
        <p className="text-gray-600">正在加载待确认衣物…</p>
      </div>
    </div>
  );
}

export default function BatchConfirmPage() {
  return (
    <Suspense fallback={<BatchConfirmFallback />}>
      <BatchConfirmPageContent />
    </Suspense>
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
  disabled,
  onComposition,
  onBlur,
}: {
  item: PendingItem;
  disabled: boolean;
  onComposition: (value: boolean) => void;
  onBlur: () => void;
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
        <img
          src={item.standardizedImageUrl || item.imageUrl}
          alt={item.suggestedName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {isSkipped && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="text-gray-500 font-medium">已跳过</span>
          </div>
        )}
        <label className="absolute top-2 left-2 inline-flex items-center justify-center rounded-md bg-white/90 p-1 shadow-sm">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isSkipped || disabled}
            onChange={onToggleSelected}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        {/* AI Badge */}
        {isAI && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            智能识别
          </div>
        )}
        {/* Duplicate Warning */}
        {item.isDuplicate && (
          <div className="absolute top-10 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full" title={item.duplicateReason}>
            ⚠️ 可能重复
          </div>
        )}
        {item.suggestedSeason.length === 0 && <span className="absolute bottom-2 left-2 bg-white text-xs px-2 py-1">季节未设置</span>}

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
          <p className="mb-1 text-xs text-gray-600">衣物名称</p>
          <input
            type="text"
            aria-label="衣物名称"
            value={item.suggestedName}
            onChange={(e) => onUpdate({ suggestedName: e.target.value })}
            onCompositionStart={() => onComposition(true)}
            onCompositionEnd={e => { onUpdate({ suggestedName: e.currentTarget.value }); onComposition(false); }}
            onBlur={onBlur}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSkipped || disabled}
          />
        </div>

        {/* Category */}
        <div>
          <p className="mb-1 text-xs text-gray-600">分类</p>
          <select
            aria-label="分类"
            value={item.suggestedCategory}
            onChange={(e) => onUpdate({ suggestedCategory: e.target.value as Category })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSkipped || disabled}
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
          <p className="mb-1 text-xs text-gray-600">颜色</p>
          <input
            type="text"
            aria-label="颜色"
            value={item.suggestedColor}
            onChange={(e) => onUpdate({ suggestedColor: e.target.value })}
            onCompositionStart={() => onComposition(true)}
            onCompositionEnd={e => { onUpdate({ suggestedColor: e.currentTarget.value }); onComposition(false); }}
            onBlur={onBlur}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="颜色"
            disabled={isSkipped || disabled}
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-gray-600">尺码（选填）</p>
          <ClothingSizeInput
            value={item.size || ''}
            onChange={e => onUpdate({ size: e.target.value })}
            onCompositionStart={() => onComposition(true)}
            onCompositionEnd={e => { onUpdate({ size: e.currentTarget.value }); onComposition(false); }}
            onBlur={onBlur}
            disabled={isSkipped || disabled}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Season */}
        <p className="text-xs text-gray-600">适穿季节（选填，手动多选）</p>
        <div className="flex flex-wrap gap-1">
          {SEASONS.map(season => (
            <button
              key={season.value}
              type="button"
              onClick={() => onToggleSeason(season.value)}
              disabled={isSkipped || disabled}
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

        <div>
          <label className="mb-1 block text-xs text-gray-600" htmlFor={`notes-${item.id}`}>备注（选填）</label>
          <textarea
            id={`notes-${item.id}`}
            aria-label="备注"
            rows={3}
            value={item.notes || ''}
            onChange={e => onUpdate({ notes: e.target.value })}
            onCompositionStart={() => onComposition(true)}
            onCompositionEnd={e => { onUpdate({ notes: e.currentTarget.value }); onComposition(false); }}
            onBlur={onBlur}
            disabled={isSkipped || disabled}
            placeholder="例如：材质、穿着偏好…"
            className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onSkip}
            disabled={isSkipped || disabled}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            跳过
          </button>
          <button
            onClick={onConfirm}
            disabled={isSkipped || disabled}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
