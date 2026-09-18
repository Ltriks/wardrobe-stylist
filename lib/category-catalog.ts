import defaults from './category-defaults.json';
export const categoryGroups = [
  {id:'top', label:'上身', icon:'👕'}, {id:'outerwear', label:'外搭', icon:'🧥'},
  {id:'bottom', label:'下身', icon:'👖'}, {id:'whole', label:'全身／套装', icon:'👗'},
  {id:'underwear', label:'贴身衣物', icon:'🩲'}, {id:'shoes', label:'鞋履', icon:'👟'},
  {id:'accessory', label:'配饰', icon:'👜'}, {id:'other', label:'其他', icon:'📦'},
];
export type CatalogCategory = {id:string; label:string; group:string; sortOrder:number; active:boolean; builtIn:boolean};
export const defaultCategories: CatalogCategory[] = defaults;
export const usageOptions = [{id:'home',label:'家居'},{id:'sleep',label:'睡眠'},{id:'sport',label:'运动'},{id:'formal',label:'正式'},{id:'daily',label:'日常'}];
export function parseUsageTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string' || !usageOptions.some(option => option.id === tag))) throw new Error('请选择有效的用途标签。');
  return Array.from(new Set(value));
}
export function matchesCategory(category:string, filter:string, catalog:CatalogCategory[]) {
  return !filter || filter === 'all' || (filter.startsWith('group:') ? catalog.find(c => c.id === category)?.group === filter.slice(6) : category === filter);
}
export function categoryLayoutGroup(group:string) { return group === 'underwear' ? 'whole' : group; }

export function refineCategorySuggestion(filename:string, coarse:string, catalog:CatalogCategory[]) {
  const text=filename.toLowerCase();
  const explicit: Array<[RegExp,string]> = [[/半身裙|\bskirt\b/,'skirt'],[/连衣裙|\bdress\b/,'onepiece-dress'],[/包屁衣|\bbodysuit\b/,'bodysuit'],[/连体衣|爬服|哈衣|\b(romper|onesie)\b/,'baby-romper'],[/连体裤|\bjumpsuit\b/,'jumpsuit']];
  const match=explicit.find(([rule])=>rule.test(text));
  if(match&&catalog.some(c=>c.id===match[1]&&c.active))return match[1];
  const detailed=catalog.filter(c=>c.active&&!categoryGroups.some(g=>g.id===c.id)&&!c.label.includes('（')&&c.label.length>=2).sort((a,b)=>b.label.length-a.label.length).find(c=>text.includes(c.label.toLowerCase()));
  if(detailed)return detailed.id;
  const original=catalog.find(c=>c.id===coarse);
  return original?.active?coarse:catalog.find(c=>c.id===original?.group&&c.active)?.id||'other';
}
