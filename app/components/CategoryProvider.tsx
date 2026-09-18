'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CatalogCategory, categoryGroups } from '../../lib/category-catalog';
import { wardrobeFetch } from '../lib/profile-client';
type Catalog = {categories:CatalogCategory[]; favorites:string[]; profileName:string};
const Context = createContext<ReturnType<typeof useCatalogState> | null>(null);
function useCatalogState() {
  const [data,setData] = useState<Catalog>({categories:[],favorites:[],profileName:'当前成员'});
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { const response = await wardrobeFetch('/api/categories'); if (!response.ok) throw new Error('分类加载失败，请重试。'); setData(await response.json()); setError(''); }
    catch(e) { setError(e instanceof Error ? e.message : '分类加载失败。'); } finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void reload(); },[reload]);
  const labels = useMemo(()=>Object.fromEntries(data.categories.map(c=>[c.id,`${categoryGroups.find(g=>g.id===c.group)?.label || '其他'} · ${c.label}`])),[data.categories]);
  return {...data, labels, loading, error, reload, setData};
}
export function CategoryProvider({children}:{children:React.ReactNode}) { const value=useCatalogState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useCategories() { const value=useContext(Context); if(!value) throw new Error('CategoryProvider missing'); return value; }
