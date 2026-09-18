'use client';
import { useCategories } from './components/CategoryProvider';
import { matchesCategory } from '../lib/category-catalog';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClothingFit, clothingFitLabels } from '../lib/tryon-fit';
import { ClothingItem, Category, Season, ClothingItemFormData, Outfit, OutfitFormData, PendingItem, PersonalTemplate } from './types';
import { ClothingForm, ClothingList, FilterBar, Modal, OutfitForm, OutfitList, BatchUploadButton, PersonalTemplateManager } from './components';
import {
  createItemApi,
  createOutfitApi,
  createPendingBatchApi,
  deleteItemApi,
  deleteOutfitApi,
  fetchItems,
  fetchOutfits,
  fetchTemplates,
  generateBoardApi,
  generateTryOnApi,
  updateItemApi,
  updateOutfitApi,
} from './lib/wardrobe-api';

type TabType = 'clothes' | 'outfits';

export default function Home() {
  const router = useRouter();
  const { categories } = useCategories();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [selectedSeason, setSelectedSeason] = useState<Season | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('clothes');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [defaultTemplate, setDefaultTemplateState] = useState<PersonalTemplate | undefined>(undefined);
  const [isSubmittingOutfit, setIsSubmittingOutfit] = useState(false);
  const [toast, setToast] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);

  const loadInitialData = useCallback(async () => {
    const [nextItems, nextOutfits, nextTemplates] = await Promise.all([
      fetchItems(),
      fetchOutfits(),
      fetchTemplates(),
    ]);

    setItems(nextItems);
    setOutfits(nextOutfits);
    setDefaultTemplateState(nextTemplates.find(template => template.isDefault));
  }, []);

  useEffect(() => {
    loadInitialData().catch(error => {
      const message = error instanceof Error ? error.message : "衣柜加载失败，请刷新重试。";
      console.error('Failed to load wardrobe data:', error);
      setToast({ tone: 'error', message });
    });
  }, [loadInitialData]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const hasGeneratingOutfit = outfits.some(
      outfit => outfit.tryOnStatus === 'generating' || outfit.boardStatus === 'generating',
    );
    if (!hasGeneratingOutfit) return;

    const interval = window.setInterval(() => {
      loadInitialData().catch(error => {
        console.error('Failed to refresh outfit status:', error);
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [outfits, loadInitialData]);

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = matchesCategory(item.category, selectedCategory, categories);
      const matchSeason = !selectedSeason || item.season.includes(selectedSeason);
      return matchCategory && matchSeason;
    });
  }, [items, selectedCategory, selectedSeason, categories]);

  // Clothing handlers
  const handleAddItem = useCallback(() => {
    setEditingItem(null);
    setEditingOutfit(null);
    setIsModalOpen(true);
  }, []);

  const handleEditItem = useCallback((item: ClothingItem) => {
    setEditingItem(item);
    setEditingOutfit(null);
    setIsModalOpen(true);
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    if (confirm("确定删除这件衣物吗？")) {
      void (async () => {
        try {
          await deleteItemApi(id);
          setItems(currentItems => currentItems.filter(item => item.id !== id));
        } catch (error) {
          const message = error instanceof Error ? error.message : "删除失败，请重试。";
          setToast({ tone: 'error', message });
        }
      })();
    }
  }, []);

  const handleItemSubmit = useCallback(async (data: ClothingItemFormData) => {
    if (editingItem) {
      const updated = await updateItemApi(editingItem.id, data);
      setItems(currentItems =>
        currentItems.map(item => (item.id === updated.id ? updated : item)),
      );
    } else {
      const newItem = await createItemApi(data);
      setItems(currentItems => [newItem, ...currentItems]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  }, [editingItem]);

  // Batch upload handler
  const handleBatchUploadComplete = useCallback(async (pendingItems: PendingItem[]) => {
    const result = await createPendingBatchApi(pendingItems);
    router.push(`/batch-confirm?batchId=${encodeURIComponent(result.batchId)}`);
  }, [router]);

  // Outfit handlers
  const handleAddOutfit = useCallback(() => {
    setEditingItem(null);
    setEditingOutfit(null);
    setIsModalOpen(true);
  }, []);

  const handleEditOutfit = useCallback((outfit: Outfit) => {
    setEditingOutfit(outfit);
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleDeleteOutfit = useCallback((id: string) => {
    if (confirm("确定删除这套搭配吗？")) {
      void (async () => {
        try {
          await deleteOutfitApi(id);
          setOutfits(currentOutfits => currentOutfits.filter(outfit => outfit.id !== id));
        } catch (error) {
          const message = error instanceof Error ? error.message : "删除失败，请重试。";
          setToast({ tone: 'error', message });
        }
      })();
    }
  }, []);

  const handleOutfitSubmit = useCallback(async (data: OutfitFormData) => {
    if (isSubmittingOutfit) return;

    setIsSubmittingOutfit(true);
    try {
      const payload: OutfitFormData = {
        ...data,
        boardImageUrl: undefined,
        boardStatus: 'generating',
        boardError: undefined,
      };

      let savedOutfit: Outfit;
      if (editingOutfit) {
        const updated = await updateOutfitApi(editingOutfit.id, payload);
        setOutfits(currentOutfits =>
          currentOutfits.map(outfit => (outfit.id === updated.id ? updated : outfit)),
        );
        savedOutfit = updated;
      } else {
        const newOutfit = await createOutfitApi(payload);
        setOutfits(currentOutfits => [newOutfit, ...currentOutfits]);
        savedOutfit = newOutfit;
      }

      setToast({
        tone: 'info',
        message: `正在后台为「${savedOutfit.name}」生成搭配图。`,
      });

      try {
        const queued = await generateBoardApi(savedOutfit.id);
        setOutfits(currentOutfits =>
          currentOutfits.map(outfit => (outfit.id === queued.id ? queued : outfit)),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "搭配图生成失败。";
        setOutfits(currentOutfits =>
          currentOutfits.map(outfit =>
            outfit.id === savedOutfit.id
              ? {
                  ...outfit,
                  boardStatus: 'failed',
                  boardError: message,
                }
              : outfit,
          ),
        );
        setToast({
          tone: 'error',
          message: `「${savedOutfit.name}」搭配图生成失败。`,
        });
      }

      setIsModalOpen(false);
      setEditingOutfit(null);
    } finally {
      setIsSubmittingOutfit(false);
    }
  }, [editingOutfit, isSubmittingOutfit]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setEditingOutfit(null);
    setIsSubmittingOutfit(false);
  }, []);

  const handleChangeClothingFit = useCallback(async (outfit: Outfit, pantsFit: ClothingFit) => {
    try {
      const updated = await updateOutfitApi(outfit.id, { pantsFit });
      setOutfits(current => current.map(item => item.id === updated.id ? updated : item));
      setToast({ tone: 'success', message: `已保存「${clothingFitLabels[pantsFit]}」，下次生成试穿图时生效。` });
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : '版型保存失败，请重试。' });
    }
  }, []);

  const handleGenerateTryOn = useCallback(async (outfit: Outfit) => {
    if (!defaultTemplate) {
      alert("请先上传人物照片并设为默认，再生成试穿图。");
      return;
    }

    setOutfits(currentOutfits =>
      currentOutfits.map(currentOutfit =>
        currentOutfit.id === outfit.id
          ? {
              ...currentOutfit,
              tryOnStatus: 'generating',
              tryOnError: undefined,
            }
          : currentOutfit,
      ),
    );
    setToast({
      tone: 'info',
      message: `正在后台为「${outfit.name}」生成试穿图。`,
    });

    try {
      const updated = await generateTryOnApi(outfit.id);
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit => (currentOutfit.id === updated.id ? updated : currentOutfit)),
      );
      setToast({
        tone: 'success',
        message: `「${updated.name}」试穿任务已提交，生成后会自动更新。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "试穿图生成失败。";
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit =>
          currentOutfit.id === outfit.id
            ? {
                ...currentOutfit,
                tryOnStatus: 'failed',
                tryOnError: message,
              }
            : currentOutfit,
        ),
      );
      setToast({
        tone: 'error',
        message: `「${outfit.name}」试穿生成失败：${message}`,
      });
    }
  }, [defaultTemplate]);

  const handleGenerateBoard = useCallback(async (outfit: Outfit) => {
    setOutfits(currentOutfits =>
      currentOutfits.map(currentOutfit =>
        currentOutfit.id === outfit.id
          ? {
              ...currentOutfit,
              boardStatus: 'generating',
              boardError: undefined,
            }
          : currentOutfit,
      ),
    );
    setToast({
      tone: 'info',
      message: `正在后台为「${outfit.name}」生成搭配图。`,
    });

    try {
      const updated = await generateBoardApi(outfit.id);
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit => (currentOutfit.id === updated.id ? updated : currentOutfit)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "搭配图生成失败。";
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit =>
          currentOutfit.id === outfit.id
            ? {
                ...currentOutfit,
                boardStatus: 'failed',
                boardError: message,
              }
            : currentOutfit,
        ),
      );
      setToast({
        tone: 'error',
        message: `「${outfit.name}」搭配图生成失败。`,
      });
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory('');
    setSelectedSeason('');
  }, []);

  const handleTemplateChange = useCallback(() => {
    void (async () => {
      const templates = await fetchTemplates();
      setDefaultTemplateState(templates.find(template => template.isDefault));
    })();
  }, []);

  const wardrobeSummary = useMemo(() => {
    const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
      const group = categories.find(c=>c.id===item.category)?.group || 'other';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    return {
      items: items.length,
      outfits: outfits.length,
      tops: categoryCounts.top || 0,
      bottoms: categoryCounts.bottom || 0,
      template: defaultTemplate?.name || "还未上传人物照片",
    };
  }, [items, outfits, defaultTemplate, categories]);

  return (
    <main className="wardrobe-page min-h-screen">
      <header className="hero-header">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-6">
          <div className="hero-stage">
            <div className="hero-copy">
              <span className="sticker-label">家庭穿搭作战室 · 每天都是新篇章</span>
              <h1>今天，<br /><span>穿出主角感。</span><i aria-hidden="true">✦</i></h1>
              <p>打开衣柜，让灵感登场。<br />从一件心动单品，到全家人的专属穿搭。</p>
              <div className="hero-caption"><span aria-hidden="true">↗</span> 你的衣柜 / 你的风格 / 你的主场</div>
            </div>
            <div className="hero-poster" aria-hidden="true">
              <span className="poster-kicker">今日风格，由你定义</span>
              <svg viewBox="0 0 300 240" fill="none"><path d="M132 64c0-29 43-29 43-2 0 17-24 21-24 39" stroke="currentColor" strokeWidth="12" strokeLinecap="square"/><path d="M151 102 267 182Q285 200 260 202H41Q19 200 35 183Z" stroke="currentColor" strokeWidth="12" strokeLinejoin="miter"/><path d="m66 38 8 21 23 3-19 14 4 23-19-14-21 10 8-22-16-17 23 1Z" fill="currentColor"/><path d="m240 91 4 13 15 4-14 5-5 15-4-15-15-5 15-4Z" fill="currentColor"/></svg>
              <strong>好好穿衣<br /><em>自在出场！</em></strong>
              <span className="poster-seal">穿搭<br />计划</span>
            </div>
          </div>
          <div className="summary-grid">
            <SummaryCard label="衣物收藏" value={wardrobeSummary.items.toString().padStart(2, '0')} hint={`${wardrobeSummary.tops} 件上装 · ${wardrobeSummary.bottoms} 件下装`} />
            <SummaryCard label="搭配灵感" value={wardrobeSummary.outfits.toString().padStart(2, '0')} hint={wardrobeSummary.outfits > 0 ? '灵感随时待命' : '开启第一套搭配'} />
            <SummaryCard label="人物照片" value={defaultTemplate ? '已就绪' : '待上传'} hint={wardrobeSummary.template} />
          </div>
          <div className="command-bar mt-7 flex flex-col gap-3 border-t border-slate-200/80 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="wardrobe-tabs inline-flex w-fit">
              <button
                onClick={() => setActiveTab('clothes')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'clothes'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                我的衣柜 <span>{items.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('outfits')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'outfits'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                搭配灵感 <span>{outfits.length}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/settings" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                主题与设置
              </Link>
              {activeTab === 'clothes' ? (
                <>
                  <BatchUploadButton onUploadComplete={handleBatchUploadComplete} existingItems={items} />
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加衣物
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  >
                    人物照片
                  </button>
                  <button
                    onClick={handleAddOutfit}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建搭配
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filter Section (only for clothes tab) */}
      {activeTab === 'clothes' && (
        <section className="filter-section">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <FilterBar
              selectedCategory={selectedCategory}
              selectedSeason={selectedSeason}
              onCategoryChange={setSelectedCategory}
              onSeasonChange={setSelectedSeason}
              onClear={handleClearFilters}
            />
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'clothes' ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="collection-heading">衣物档案</p>
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{filteredItems.length}</span> 件衣物
                {(selectedCategory || selectedSeason) && (
                    <span className="ml-2 text-slate-500">
                    （已筛选，共 {items.length} 件）
                  </span>
                )}
                </div>
              </div>
            </div>

            <ClothingList
              items={filteredItems}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          </>
        ) : (
          <>
            <div className="studio-intro mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">搭配工作室</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {outfits.length > 0 ? "把穿搭灵感，变成今日主角。" : "从一件喜欢的衣物，开始今天的搭配。"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  先组合单品，生成搭配图，再用人物照片预览试穿效果。
                </p>
              </div>
            </div>

              <OutfitList
                outfits={outfits}
                items={items}
                hasDefaultTemplate={Boolean(defaultTemplate)}
                onGenerateBoard={handleGenerateBoard}
                onEdit={handleEditOutfit}
                onDelete={handleDeleteOutfit}
                onGenerateTryOn={handleGenerateTryOn}
                onChangeClothingFit={handleChangeClothingFit}
              />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        sizeClassName={activeTab === 'outfits' || editingOutfit ? 'max-w-6xl' : 'max-w-md'}
        title={
          editingItem
            ? "编辑衣物"
            : editingOutfit
            ? "编辑搭配"
            : activeTab === 'clothes'
            ? "添加衣物"
            : "创建搭配"
        }
      >
        {editingItem ? (
          <ClothingForm
            initialData={{
              name: editingItem.name,
              category: editingItem.category,
              color: editingItem.color,
              usageTags: editingItem.usageTags,
              size: editingItem.size,
              season: editingItem.season,
              imageUrl: editingItem.imageUrl,
              notes: editingItem.notes,
            }}
            onSubmit={handleItemSubmit}
            onCancel={handleCloseModal}
          />
        ) : editingOutfit ? (
          <OutfitForm
            items={items}
            initialData={{
              name: editingOutfit.name,
              itemIds: editingOutfit.items.map(item => item.clothingItemId),
              occasion: editingOutfit.occasion,
              season: editingOutfit.season,
              notes: editingOutfit.notes,
            }}
            onSubmit={handleOutfitSubmit}
            onCancel={handleCloseModal}
            isSubmitting={isSubmittingOutfit}
          />
        ) : activeTab === 'clothes' ? (
          <ClothingForm onSubmit={handleItemSubmit} onCancel={handleCloseModal} />
        ) : (
          <OutfitForm items={items} onSubmit={handleOutfitSubmit} onCancel={handleCloseModal} isSubmitting={isSubmittingOutfit} />
        )}
      </Modal>

      {/* Template Manager Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="管理人物照片"
      >
        <PersonalTemplateManager
          onClose={() => setIsTemplateModalOpen(false)}
          onTemplateChange={handleTemplateChange}
        />
      </Modal>

      {toast && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                : toast.tone === 'error'
                  ? 'border-rose-200 bg-rose-50/95 text-rose-900'
                  : 'border-indigo-200 bg-white/95 text-slate-900'
            }`}
          >
            <p className="text-sm font-medium leading-6">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="summary-card">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}
