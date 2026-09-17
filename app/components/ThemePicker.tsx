'use client';

import { useEffect, useState } from 'react';

type Theme = 'rebel' | 'paper';
const THEME_KEY = 'wardrobe-theme';

function useTheme() {
  const [theme, setTheme] = useState<Theme>('rebel');
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'paper' ? 'paper' : 'rebel');
    sync();
    window.addEventListener('wardrobe-theme-change', sync);
    return () => window.removeEventListener('wardrobe-theme-change', sync);
  }, []);
  function select(next: Theme) {
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works when storage is unavailable. */ }
    setTheme(next);
    window.dispatchEvent(new Event('wardrobe-theme-change'));
  }
  return { theme, select };
}

export function ThemeSelector() {
  const { theme, select } = useTheme();
  return <label className="theme-selector">界面主题
    <select aria-label="界面主题" value={theme} onChange={event => select(event.target.value as Theme)}>
      <option value="rebel">怪盗黄</option><option value="paper">米纸日常</option>
    </select>
  </label>;
}

export function ThemePanel() {
  const { theme, select } = useTheme();
  return <section className="theme-panel" aria-labelledby="theme-title">
    <div className="section-heading"><div><p className="eyebrow">让衣柜更像你</p><h2 id="theme-title">选择界面主题</h2></div><span className="sticker-label">即时生效</span></div>
    <div className="theme-options">
      {([
        ['rebel', '怪盗黄', '斜切、网点与硬阴影。今天，由你出场。'],
        ['paper', '米纸日常', '温暖纸色与清晰排版。慢慢挑，好好穿。'],
      ] as const).map(([id, title, description]) => <button type="button" key={id} aria-pressed={theme === id} onClick={() => select(id)} className={`theme-option ${theme === id ? 'is-selected' : ''}`}>
        <div className={`theme-sample theme-sample-${id}`} aria-hidden="true"><span>衣</span><i /><i /><i /></div>
        <strong>{title}<span>{theme === id ? '使用中 ✓' : '点击切换 ↗'}</span></strong><p>{description}</p>
      </button>)}
    </div>
    <p className="theme-note">自动记住这台浏览器的选择，所有成员都可使用。</p>
  </section>;
}
