'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      const message = error instanceof Error ? error.message : 'Failed to load wardrobe data.';
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
      const matchCategory = !selectedCategory || item.category === selectedCategory;
      const matchSeason = !selectedSeason || item.season.includes(selectedSeason);
      return matchCategory && matchSeason;
    });
  }, [items, selectedCategory, selectedSeason]);

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
    if (confirm('Are you sure you want to delete this item?')) {
      void (async () => {
        try {
          await deleteItemApi(id);
          setItems(currentItems => currentItems.filter(item => item.id !== id));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delete failed.';
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
    if (confirm('Are you sure you want to delete this outfit?')) {
      void (async () => {
        try {
          await deleteOutfitApi(id);
          setOutfits(currentOutfits => currentOutfits.filter(outfit => outfit.id !== id));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delete failed.';
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
        message: `Generating a board for “${savedOutfit.name}” in the background.`,
      });

      try {
        const queued = await generateBoardApi(savedOutfit.id);
        setOutfits(currentOutfits =>
          currentOutfits.map(outfit => (outfit.id === queued.id ? queued : outfit)),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Board generation failed.';
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
          message: `Board generation for “${savedOutfit.name}” failed.`,
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

  const handleGenerateTryOn = useCallback(async (outfit: Outfit) => {
    if (!defaultTemplate) {
      alert('Please upload and set a default template before generating a try-on preview.');
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
      message: `Generating a try-on preview for “${outfit.name}” in the background.`,
    });

    try {
      const updated = await generateTryOnApi(outfit.id);
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit => (currentOutfit.id === updated.id ? updated : currentOutfit)),
      );
      setToast({
        tone: 'success',
        message: `Try-on preview for “${updated.name}” is ready.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Try-on generation failed.';
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
        message: `Try-on preview for “${outfit.name}” failed: ${message}`,
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
      message: `Generating a board for “${outfit.name}” in the background.`,
    });

    try {
      const updated = await generateBoardApi(outfit.id);
      setOutfits(currentOutfits =>
        currentOutfits.map(currentOutfit => (currentOutfit.id === updated.id ? updated : currentOutfit)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Board generation failed.';
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
        message: `Board generation for “${outfit.name}” failed.`,
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
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    return {
      items: items.length,
      outfits: outfits.length,
      tops: categoryCounts.top || 0,
      bottoms: categoryCounts.bottom || 0,
      template: defaultTemplate?.name || 'No template yet',
    };
  }, [items, outfits, defaultTemplate]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2ff_45%,#f8fafc_100%)]">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Wardrobe Stylist MVP 2.0
              </span>
              <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-slate-900">
                Build outfits you would actually trust, not just manage clothes.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Keep your wardrobe organized, confirm uploads quickly, and preview outfits against a more personal template instead of a generic mannequin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <SummaryCard label="Items" value={wardrobeSummary.items.toString()} hint={`${wardrobeSummary.tops} tops · ${wardrobeSummary.bottoms} bottoms`} />
              <SummaryCard label="Outfits" value={wardrobeSummary.outfits.toString()} hint={wardrobeSummary.outfits > 0 ? 'Ready to refine' : 'Create your first look'} />
              <SummaryCard label="Template" value={defaultTemplate ? 'On' : 'Off'} hint={wardrobeSummary.template} />
              <SummaryCard label="Focus" value={activeTab === 'clothes' ? 'Closet' : 'Looks'} hint={activeTab === 'clothes' ? 'Upload and sort' : 'Preview and adjust'} />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('clothes')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'clothes'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Clothes ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('outfits')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'outfits'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Outfits ({outfits.length})
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
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
                    Add Item
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  >
                    👤 Manage Template
                  </button>
                  <button
                    onClick={handleAddOutfit}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Outfit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filter Section (only for clothes tab) */}
      {activeTab === 'clothes' && (
        <section className="border-b border-white/60 bg-white/50">
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Closet</p>
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{filteredItems.length}</span> visible items
                {(selectedCategory || selectedSeason) && (
                    <span className="ml-2 text-slate-500">
                    (filtered from {items.length} total)
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
            <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Outfit Studio</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {outfits.length > 0 ? 'Review and compare generated overview boards.' : 'Start building looks from the pieces you already trust.'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  This first MVP focuses on generating a board image for each look so you can judge balance and layering without fake try-on.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <span className="block font-medium">Current board mode</span>
                <span className="block mt-1 text-indigo-700">
                  {outfits.length > 0 ? 'Generated board images' : 'Create your first look'}
                </span>
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
            ? 'Edit Item'
            : editingOutfit
            ? 'Edit Outfit'
            : activeTab === 'clothes'
            ? 'Add New Item'
            : 'Create New Outfit'
        }
      >
        {editingItem ? (
          <ClothingForm
            initialData={{
              name: editingItem.name,
              category: editingItem.category,
              color: editingItem.color,
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
        title="Manage Personal Template"
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}
