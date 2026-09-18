'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useCategories } from '../../components/CategoryProvider';
import { CatalogCategory, categoryGroups } from '../../../lib/category-catalog';
import { wardrobeFetch } from '../../lib/profile-client';
const field = 'w-full border border-gray-300 bg-white px-3 py-2 text-sm';
export default function CategoriesPage() {
  const {categories,favorites,profileName,loading,error,reload,setData}=useCategories();
  const [query,setQuery]=useState(''); const [groupFilter,setGroupFilter]=useState('');
  const [editing,setEditing]=useState<Partial<CatalogCategory>|null>(null);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [failed,setFailed]=useState(false);
  async function save(payload:unknown, close=false) {
    setBusy(true);setMessage('');
    try { const response=await wardrobeFetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json(); if(!response.ok)throw new Error(data.error);setData(data);setFailed(false);setMessage('已保存');if(close)setEditing(null); }
    catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'保存失败');}finally{setBusy(false);}
  }
  function submit(e:FormEvent){e.preventDefault();void save(editing,true);}
  const visible=categories.filter(c=>(!groupFilter||c.group===groupFilter)&&c.label.toLowerCase().includes(query.toLowerCase()));
  return <main className="settings-page min-h-screen px-5 py-8"><div className="mx-auto max-w-4xl">
    <Link href="/settings" className="text-sm underline">← 返回设置</Link>
    <header className="mb-6 mt-7"><p className="eyebrow">衣柜计划 / 全家分类目录</p><h1 className="page-title mt-3">分类管理</h1><p className="mt-3 text-sm leading-6">分类由全家共用。点亮星标，加入「{profileName}」的常用分类；切换成员后可分别设置。</p><p className="mt-1 text-xs text-gray-500">停用后保留旧衣物记录。家居、睡眠、运动等用途可在衣物编辑中单独选择。</p></header>
    {(error||message)&&<p role={error||failed?'alert':'status'} className={`mb-4 border p-3 text-sm ${error||failed?'border-red-500 text-red-700':'border-black bg-yellow-100'}`}>{error||message}{error&&<button type="button" onClick={()=>void reload()} className="ml-3 underline">重试</button>}</p>}
    <div className="mb-5 flex flex-wrap gap-3"><input aria-label="搜索分类目录" placeholder="搜索分类名称…" value={query} onChange={e=>setQuery(e.target.value)} className={`${field} min-w-0 flex-1`}/><select aria-label="筛选部位" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-sm"><option value="">全部部位</option>{categoryGroups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select><button type="button" disabled={busy||loading} onClick={()=>{setEditing({label:'',group:groupFilter||'top',sortOrder:100,active:true});setMessage('');}} className="border-2 border-black bg-yellow-200 px-4 py-2 font-bold">＋ 新增分类</button></div>
    {editing&&<form onSubmit={submit} className="mb-6 border-2 border-black bg-yellow-50 p-5"><h2 className="mb-4 font-bold">{editing.id?'编辑分类':'新增分类'}</h2><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm">分类名称<input autoFocus required maxLength={30} value={editing.label||''} onChange={e=>setEditing({...editing,label:e.target.value})} className={field}/></label>
      <label className="text-sm">所属部位<select value={editing.group} disabled={categoryGroups.some(g=>g.id===editing.id)} onChange={e=>setEditing({...editing,group:e.target.value})} className={field}>{categoryGroups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      <label className="text-sm">排序（数字小的在前）<input type="number" min={0} max={9999} required value={editing.sortOrder??0} onChange={e=>setEditing({...editing,sortOrder:Number(e.target.value)})} className={field}/></label>
      <div className="flex gap-3 sm:col-span-3"><button className="border-2 border-black bg-yellow-200 px-4 py-2 font-bold">{busy?'保存中…':'保存分类'}</button><button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 underline">取消</button></div>
    </fieldset></form>}
    {loading?<p role="status">正在读取分类…</p>:categoryGroups.map(group=>{const rows=visible.filter(c=>c.group===group.id);if(!rows.length)return null;return <section key={group.id} className="mb-5 border-2 border-black bg-white"><h2 className="border-b-2 border-black bg-yellow-100 px-4 py-3 font-bold">{group.icon} {group.label}<span className="ml-2 text-xs font-normal">{rows.length} 项</span></h2><ul className="divide-y divide-gray-200">{rows.map(c=><li key={c.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${c.active?'':'bg-gray-100 text-gray-500'}`}>
      <button type="button" aria-label={`${favorites.includes(c.id)?'取消常用':'设为常用'}：${c.label}`} aria-pressed={favorites.includes(c.id)} disabled={busy||!c.active} onClick={()=>void save({action:'favorite',id:c.id,favorite:!favorites.includes(c.id)})} className="px-2 text-xl">{favorites.includes(c.id)?'★':'☆'}</button>
      <span className="min-w-0 flex-1 break-words font-medium">{c.label}<small className="ml-2 text-xs font-normal text-gray-500">{c.active?'':'已停用'}{categoryGroups.some(g=>g.id===c.id)?'基础分类':''}</small></span>
      <span className="text-xs text-gray-400">排序 {c.sortOrder}</span><button type="button" disabled={busy} onClick={()=>{setEditing({...c});setMessage('');window.scrollTo({top:0,behavior:'smooth'});}} className="px-2 py-1 text-sm underline">编辑</button>
      {!categoryGroups.some(g=>g.id===c.id)&&<button type="button" disabled={busy} onClick={()=>void save({...c,active:!c.active})} className="border border-gray-300 px-3 py-1 text-sm">{c.active?'停用':'启用'}</button>}
    </li>)}</ul></section>;})}
    {!loading&&!visible.length&&<p className="py-10 text-center text-gray-500">没有匹配的分类。</p>}
  </div></main>;
}
