'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ThemePanel } from '../components/ThemePicker';

type Settings = {
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  hasSavedSettings: boolean;
  keySource: string;
};

const fieldClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function applySettings(next: Settings) {
    setSettings(next);
    setModel(next.model);
    setBaseUrl(next.baseUrl);
    setApiKey('');
  }

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings/ai', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      applySettings(result);
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : '加载失败，请重试。' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function persist(reset = false) {
    if (reset && !window.confirm('恢复后将移除页面保存的配置，重新使用环境配置。确定恢复吗？')) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings/ai', {
        method: reset ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(!reset ? { body: JSON.stringify({ model, baseUrl, apiKey }) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      applySettings(result);
      setMessage({ error: false, text: reset ? '已恢复环境配置，下次试穿时生效。' : '配置已保存，下次试穿时生效，无需重启。' });
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : '保存失败，请重试。' });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void persist();
  }

  return (
    <main className="settings-page min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600">← 返回衣柜</Link>
        <header className="mb-7 mt-8">
          <p className="eyebrow">衣柜计划 / 控制面板</p>
          <h1 className="page-title mt-3">个性化设置</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">挑选喜欢的界面风格，设置全家共用的试穿模型。</p>
        </header>

        <ThemePanel />

        {message && <div role={message.error ? 'alert' : 'status'} className={`mb-5 rounded-xl border px-4 py-3 text-sm ${message.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</div>}
        {loading ? <p role="status" className="py-10 text-center text-slate-500">正在读取配置…</p> : !settings ? (
          <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">重新加载</button>
        ) : (
          <form onSubmit={submit} className="settings-model rounded-3xl border border-white bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <h2 className="font-semibold text-slate-900">试穿模型</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${settings.hasApiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{settings.hasApiKey ? '密钥已配置' : '尚未配置密钥'}</span>
            </div>
            <fieldset disabled={busy} className="mt-6 space-y-6 disabled:opacity-70">
              <div>
                <label htmlFor="api-key" className="text-sm font-medium text-slate-800">API 密钥</label>
                <input id="api-key" type="password" autoComplete="new-password" spellCheck={false} value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? '留空保留现有密钥；输入新密钥可替换' : '输入 DashScope API 密钥'} maxLength={4096} aria-describedby="key-help" className={fieldClass} />
                <p id="key-help" className="mt-2 text-xs leading-5 text-slate-500">{settings.keySource === 'page' ? '当前使用页面保存的密钥。' : settings.keySource === 'environment' ? '当前使用环境配置中的密钥。' : '生成试穿图需要有效的密钥。'}已保存的密钥不会回显到页面。</p>
              </div>
              <div>
                <label htmlFor="model" className="text-sm font-medium text-slate-800">模型名称</label>
                <input id="model" required maxLength={200} value={model} onChange={event => setModel(event.target.value)} placeholder="qwen-image-2.0-pro" spellCheck={false} className={fieldClass} />
                <p className="mt-2 text-xs leading-5 text-slate-500">填写支持当前 DashScope 多模态图像生成接口的模型名称。</p>
              </div>
              <div>
                <label htmlFor="base-url" className="text-sm font-medium text-slate-800">接口地址</label>
                <input id="base-url" type="url" required maxLength={2048} value={baseUrl} onChange={event => setBaseUrl(event.target.value)} spellCheck={false} aria-describedby="url-help" className={fieldClass} />
                <p id="url-help" className="mt-2 text-xs leading-5 text-slate-500">填写完整的 HTTPS 请求地址，并与密钥所属地域一致。试穿时会向此地址发送密钥、人物模板图和搭配图。</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" disabled={!settings.hasSavedSettings} onClick={() => void persist(true)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">恢复环境配置</button>
                <button type="submit" className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700">{busy ? '正在保存…' : '保存配置'}</button>
              </div>
            </fieldset>
          </form>
        )}
        <p className="mt-5 text-xs leading-6 text-slate-500">此设置仅影响试穿图片生成，衣物自动分类仍使用浏览器中的 MobileNet。保存配置不会调用模型或产生生成费用。</p>
      </div>
    </main>
  );
}
