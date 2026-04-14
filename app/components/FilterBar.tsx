'use client';

import { Category, Season } from '../types';

interface FilterBarProps {
  selectedCategory: Category | '';
  selectedSeason: Season | '';
  onCategoryChange: (category: Category | '') => void;
  onSeasonChange: (season: Season | '') => void;
  onClear: () => void;
}

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'other', label: 'Other' },
];

const SEASONS: { value: Season | ''; label: string }[] = [
  { value: '', label: 'All Seasons' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

export default function FilterBar({
  selectedCategory,
  selectedSeason,
  onCategoryChange,
  onSeasonChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters = selectedCategory || selectedSeason;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Filters</p>
        <p className="mt-1 text-sm text-slate-600">Focus your closet by category and season before creating outfits.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCategory}
          onChange={e => onCategoryChange(e.target.value as Category | '')}
          className="min-w-[160px] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={selectedSeason}
          onChange={e => onSeasonChange(e.target.value as Season | '')}
          className="min-w-[160px] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        >
          {SEASONS.map(season => (
            <option key={season.value} value={season.value}>
              {season.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
