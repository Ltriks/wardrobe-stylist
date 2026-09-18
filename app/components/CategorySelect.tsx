'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { categoryGroups } from '../../lib/category-catalog';
import { useCategories } from './CategoryProvider';

type Props = { value: string; onChange: (value: string) => void; disabled?: boolean; filter?: boolean; placeholder?: string };

export default function CategorySelect({ value, onChange, disabled = false, filter = false, placeholder = '请选择分类' }: Props) {
  const { categories, favorites, labels, loading, error, reload } = useCategories();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 240, height: 300 });
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent | FocusEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const reposition = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    panel.current?.querySelector('input')?.focus({ preventScroll: true });
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); return; }
    const bounds = root.current!.getBoundingClientRect();
    const below = window.innerHeight - bounds.bottom - 12;
    const above = bounds.top - 12;
    const upward = below < 250 && above > below;
    const height = Math.min(330, upward ? above : below);
    const width = Math.min(Math.max(bounds.width, 240), window.innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), top: upward ? bounds.top - height - 4 : bounds.bottom + 4, width, height });
    setQuery('');
    setOpen(true);
  }

  const options = categories.filter(category => (filter || category.active || category.id === value)
    && `${category.label} ${categoryGroups.find(group => group.id === category.group)?.label}`.toLowerCase().includes(query.toLowerCase()));
  function choose(id: string) {
    onChange(id);
    setOpen(false);
    root.current?.querySelector('button')?.focus();
  }
  const option = (id: string, label: string) => (
    <button type="button" key={id} aria-pressed={value === id}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-yellow-100 focus:bg-yellow-100 ${value === id ? 'bg-yellow-200 font-bold' : ''}`}
      onClick={() => choose(id)}>{label}</button>
  );
  const selected = value.startsWith('group:')
    ? `${categoryGroups.find(group => group.id === value.slice(6))?.label} · 全部`
    : labels[value] || ((!value || value === 'all') ? placeholder : value);

  return <div ref={root} className="relative min-w-0 w-full" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); root.current?.querySelector('button')?.focus(); }
  }}>
    <button type="button" aria-label="选择分类" aria-expanded={open} aria-controls={open ? panelId : undefined}
      disabled={disabled || loading} onClick={toggle}
      className="flex w-full min-w-0 items-center justify-between gap-2 border border-gray-300 bg-white px-3 py-2 text-left text-sm">
      <span className="truncate" title={selected}>{loading ? '分类加载中…' : selected}{categories.find(category => category.id === value)?.active === false ? '（已停用）' : ''}</span><span>▾</span>
    </button>
    {open && createPortal(<div ref={panel} id={panelId} role="region" aria-label="分类选项" style={{ position: 'fixed', left: position.left, top: position.top, width: position.width, maxHeight: position.height, zIndex: 100 }}
      className="flex flex-col border-2 border-black bg-white shadow-lg">
      <input aria-label="搜索分类" value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); if (event.key === 'ArrowDown') { event.preventDefault(); panel.current?.querySelector('button')?.focus(); } }}
        placeholder="搜索分类或部位…" className="w-full shrink-0 border-b border-gray-300 px-3 py-2 text-sm" />
      <div className="min-h-0 overflow-y-auto">
        {filter && option('', '全部分类')}
        {error && <button type="button" onClick={() => void reload()} className="p-3 text-red-700">{error} 点击重试</button>}
        {options.some(category => favorites.includes(category.id)) && <><p className="bg-yellow-100 px-3 py-1 text-xs font-bold">★ 常用</p>{options.filter(category => favorites.includes(category.id)).map(category => option(category.id, labels[category.id]))}</>}
        {categoryGroups.map(group => {
          const rows = options.filter(category => category.group === group.id);
          if (!rows.length) return null;
          return <div key={group.id}><p className="bg-gray-100 px-3 py-1 text-xs font-bold">{group.icon} {group.label}</p>
            {filter && option(`group:${group.id}`, `全部${group.label}`)}
            {rows.map(category => option(category.id, `${category.label}${category.active ? '' : '（已停用）'}`))}
          </div>;
        })}
        {!options.length && !error && <p className="p-3 text-sm text-gray-500">没有匹配分类，可到设置 → 分类管理添加。</p>}
      </div>
    </div>, document.body)}
  </div>;
}
