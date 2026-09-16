'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { selectedProfileId, selectProfile } from '../lib/profile-client';

type Profile = { id: string; name: string };

export default function ProfileSwitcher() {
  const pathname = usePathname();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState('default');
  const [mode, setMode] = useState<'create' | 'rename' | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const response = await fetch('/api/profiles', { cache: 'no-store' });
      if (!response.ok) throw new Error('读取成员失败，请重试。');
      const next: Profile[] = await response.json();
      const id = selectedProfileId();
      setProfiles(next);
      setActiveId(id);
      if (!next.some(profile => profile.id === id)) setError('当前成员不存在，请选择一个衣柜。');
    } catch {
      setError('读取成员失败，请重试。');
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/profiles', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeId, name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (mode === 'create') {
        selectProfile(result.id);
      } else {
        setProfiles(current => current.map(profile => profile.id === activeId ? result : profile));
        setMode(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  const active = profiles.find(profile => profile.id === activeId);
  const onHome = pathname === '/';

  return (
    <div className="border-b border-slate-200 bg-white px-5 py-3">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="family-profile" className="font-semibold text-slate-700">成员衣柜</label>
          <select id="family-profile" value={activeId} disabled={busy || !profiles.length || !onHome || mode !== null}
            onChange={event => selectProfile(event.target.value)}
            className="min-w-0 max-w-[12rem] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-medium text-slate-900 disabled:opacity-60">
            {!profiles.length && <option value="default">正在加载…</option>}
            {profiles.length > 0 && !active && <option value={activeId}>请选择成员</option>}
            {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          {onHome ? <>
            <button type="button" disabled={busy || !profiles.length} onClick={() => { setMode('create'); setName(''); setError(''); }} className="rounded-lg px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">＋ 添加成员</button>
            <button type="button" disabled={busy || !active} onClick={() => { setMode('rename'); setName(active?.name || ''); setError(''); }} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50">改名</button>
          </> : <span className="text-xs text-slate-500">返回首页可切换成员</span>}
          <p className="text-xs text-slate-500 sm:ml-auto">分别收纳衣物与搭配 · 无需登录</p>
        </div>
        {mode && <form onSubmit={save} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <label htmlFor="profile-name" className="text-sm text-slate-600">{mode === 'create' ? '新成员名称' : '成员名称'}</label>
          <input id="profile-name" value={name} onChange={event => setName(event.target.value)} required maxLength={40} disabled={busy} autoFocus placeholder="例如：儿子、妈妈" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? '保存中…' : mode === 'create' ? '创建并切换' : '保存名称'}</button>
          <button type="button" disabled={busy} onClick={() => { setMode(null); setError(''); }} className="px-3 py-2 text-sm text-slate-500">取消</button>
          {mode === 'create' && <p className="w-full text-xs text-slate-500">新成员会拥有一个空衣柜，原有成员的数据会保留。AI 设置由全家共用。</p>}
        </form>}
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error} {!profiles.length && <button onClick={() => void load()} className="underline">重新加载</button>}</p>}
      </div>
    </div>
  );
}
