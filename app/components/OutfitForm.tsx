'use client';

import { useEffect, useMemo, useState } from 'react';
import { Category, ClothingItem, Season, OutfitFormData } from '../types';

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

interface OutfitFormProps {
  items: ClothingItem[];
  initialData?: Partial<OutfitFormData>;
  onSubmit: (data: OutfitFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORY_FILTERS: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'other', label: 'Other' },
];

export default function OutfitForm({ items, initialData, onSubmit, onCancel, isSubmitting = false }: OutfitFormProps) {
  const [formData, setFormData] = useState<OutfitFormData>({
    name: '',
    itemIds: [],
    occasion: '',
    season: [],
    notes: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [colorFilter, setColorFilter] = useState('all');

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        itemIds: initialData.itemIds || [],
        occasion: initialData.occasion || '',
        season: initialData.season || [],
        notes: initialData.notes || '',
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        itemIds: [],
        occasion: '',
        season: [],
        notes: '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.itemIds.length === 0 || isSubmitting) return;
    await onSubmit(formData);
  };

  const toggleSeason = (season: Season) => {
    setFormData(prev => ({
      ...prev,
      season: (prev.season || []).includes(season)
        ? (prev.season || []).filter(s => s !== season)
        : [...(prev.season || []), season],
    }));
  };

  const toggleItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      itemIds: prev.itemIds.includes(itemId)
        ? prev.itemIds.filter(id => id !== itemId)
        : [...prev.itemIds, itemId],
    }));
  };

  const selectedItems = items.filter(item => formData.itemIds.includes(item.id));
  const availableColors = useMemo(
    () => ['all', ...Array.from(new Set(items.map(item => item.color).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [items]
  );
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesColor = colorFilter === 'all' || item.color === colorFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.color.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesColor && matchesSearch;
    });
  }, [items, categoryFilter, colorFilter, searchQuery]);
  const selectedSummary = selectedItems.length === 0
    ? 'Pick at least one piece'
    : `${selectedItems.length} piece${selectedItems.length > 1 ? 's' : ''} selected`;

  const hasActiveFilters = categoryFilter !== 'all' || colorFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5 pb-24 sm:pb-0">
      <div className="space-y-4 sm:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Outfit Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Weekend Coffee Run"
            required
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Look details</p>
              <p className="mt-1 text-sm text-slate-700">
                Set the name and season first, then scroll into the wardrobe list to pick pieces.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedItems.length} selected
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Season <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map(season => (
                <button
                  key={season.value}
                  type="button"
                  onClick={() => toggleSeason(season.value)}
                  disabled={isSubmitting}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    (formData.season || []).includes(season.value)
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {season.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Occasion <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.occasion}
              onChange={e => setFormData(prev => ({ ...prev, occasion: e.target.value }))}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Work, Casual, Travel"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Selection</p>
            <p className="mt-1 text-sm font-medium text-indigo-950">{selectedSummary}</p>
            <p className="mt-1 text-xs text-indigo-700">
              Tap cards below to add or remove pieces without leaving this screen.
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-indigo-700 shadow-sm">
            {selectedItems.length}
          </div>
        </div>
        {selectedItems.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {selectedItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                disabled={isSubmitting}
                className="flex min-w-[10rem] items-center gap-2 rounded-xl border border-indigo-100 bg-white px-2.5 py-2 text-left shadow-sm"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-indigo-100 bg-slate-50">
                  {item.standardizedImageUrl || item.imageUrl ? (
                    <img
                      src={item.standardizedImageUrl || item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">👔</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="truncate text-xs text-slate-500">{item.color} · {item.category}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Select pieces</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Search, filter, and tap pieces to build the look. This view is meant to feel like a closet browser, not a long checkbox list.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50/70 p-3 sm:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">Quick pick</p>
              <p className="mt-1 text-sm text-purple-900">
                Use search and filters, then tap rows to add or remove pieces quickly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Search by name, color, or category"
              />
              <select
                value={colorFilter}
                onChange={e => setColorFilter(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {availableColors.map(color => (
                  <option key={color} value={color}>
                    {color === 'all' ? 'All colors' : color}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map(category => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setCategoryFilter(category.value)}
                  disabled={isSubmitting}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    categoryFilter === category.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between sm:hidden">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setColorFilter('all');
                  }}
                  className="text-xs font-medium text-purple-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2 sm:hidden">
              {filteredItems.map(item => {
                const isSelected = formData.itemIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    disabled={isSubmitting}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {item.standardizedImageUrl || item.imageUrl ? (
                        <img
                          src={item.standardizedImageUrl || item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl text-gray-300">👔</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium leading-5 text-gray-900">{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{item.color} · {item.category}</p>
                        </div>
                        <div
                          className={`mt-0.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Tap'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 hidden grid-cols-2 gap-3 sm:grid md:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map(item => {
                const isSelected = formData.itemIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    disabled={isSubmitting}
                    className={`rounded-2xl border p-2.5 text-left transition-all sm:p-3 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="relative h-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:h-36">
                      {item.standardizedImageUrl || item.imageUrl ? (
                        <img
                          src={item.standardizedImageUrl || item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">👔</div>
                      )}
                      <div
                        className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/90 text-slate-600 ring-1 ring-black/5'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Tap'}
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-gray-900">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.color} · {item.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                No pieces match the current filters.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:block">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Outfit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Weekend Coffee Run"
              required
            />
          </div>

          <div className="hidden rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Selected pieces</p>
            <p className="mt-2 text-sm text-indigo-900">
              {selectedItems.length > 0
                ? `${selectedItems.length} pieces ready for this look`
                : 'Choose at least one piece to start building the board.'}
            </p>
            <div className="mt-4 space-y-3">
              {selectedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-indigo-100 bg-slate-50">
                    {item.standardizedImageUrl || item.imageUrl ? (
                      <img
                        src={item.standardizedImageUrl || item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-slate-300">👔</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.color} · {item.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    disabled={isSubmitting}
                    className="ml-3 rounded-full px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {formData.itemIds.length === 0 && (
              <p className="mt-3 text-sm text-red-500">Please select at least one item</p>
            )}
          </div>

          <div className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 sm:block">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Occasion <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.occasion}
                onChange={e => setFormData(prev => ({ ...prev, occasion: e.target.value }))}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Work, Casual, Travel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Season <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map(season => (
                  <button
                    key={season.value}
                    type="button"
                    onClick={() => toggleSeason(season.value)}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      (formData.season || []).includes(season.value)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {season.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
                placeholder="Any notes about balance, mood, or styling intent..."
              />
            </div>
          </div>
        </aside>
      </div>

      {isSubmitting && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-900">
              {initialData ? 'Updating outfit board...' : 'Creating outfit board...'}
            </span>
            <span className="text-indigo-600">Working</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
          </div>
        </div>
      )}

      <div className="hidden gap-3 pt-2 sm:flex">
        <button
          type="submit"
          disabled={formData.itemIds.length === 0 || !formData.name.trim() || isSubmitting}
          className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : initialData ? 'Update Outfit' : 'Create Outfit'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formData.itemIds.length === 0 || !formData.name.trim() || isSubmitting}
            className="flex-[1.4] rounded-xl bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : initialData ? 'Update Outfit' : 'Create Outfit'}
          </button>
        </div>
      </div>
    </form>
  );
}
