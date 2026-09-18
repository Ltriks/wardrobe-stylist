'use client';

import CategorySelect from './CategorySelect';

import { Category, Season } from '../types';

interface FilterBarProps {
  selectedCategory: Category | '';
  selectedSeason: Season | '';
  onCategoryChange: (category: Category | '') => void;
  onSeasonChange: (season: Season | '') => void;
  onClear: () => void;
}


const SEASONS: { value: Season | ''; label: string }[] = [
  { value: '', label: "全部季节" },
  { value: 'spring', label: "春季" },
  { value: 'summer', label: "夏季" },
  { value: 'autumn', label: "秋季" },
  { value: 'winter', label: "冬季" },
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">筛选衣物</p>
        <p className="mt-1 text-sm text-slate-600">按分类和季节，找到今天的心动单品。</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64"><CategorySelect value={selectedCategory} onChange={onCategoryChange} filter placeholder="全部分类"/></div>

        <select
          aria-label="衣物季节"
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
            清除
          </button>
        )}
      </div>
    </div>
  );
}
