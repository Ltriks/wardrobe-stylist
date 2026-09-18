import { prisma } from './db';
import { currentProfileId } from './profile-context';
import { categoryGroups } from './category-catalog';
export async function categoryCatalog() {
  const [categories, favorites, profile] = await Promise.all([
    prisma.clothingCategory.findMany({orderBy:[{sortOrder:'asc'},{id:'asc'}]}),
    prisma.categoryFavorite.findMany({where:{profileId:currentProfileId()}}),
    prisma.wardrobeProfile.findUnique({where:{id:currentProfileId()}}),
  ]);
  return {categories, favorites:favorites.map(f=>f.categoryId), profileName:profile?.name || '当前成员'};
}
export async function validateCategory(id:unknown, existing?:string) {
  if (typeof id !== 'string') throw new Error('请选择分类。');
  const category = await prisma.clothingCategory.findUnique({where:{id}});
  if (!category || (!category.active && id !== existing)) throw new Error('分类不存在或已停用，请重新选择。');
}
export async function saveCategory(payload: Record<string,unknown>) {
  const {id, label, group, active, sortOrder} = payload;
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 30 || /[\x00-\x1f]/.test(label)) throw new Error('分类名称请填写 1–30 个字符。');
  if (typeof group !== 'string' || !categoryGroups.some(g=>g.id===group)) throw new Error('请选择所属部位。');
  if (active !== undefined && typeof active !== 'boolean') throw new Error('启用状态无效。');
  if (sortOrder !== undefined && (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999)) throw new Error('排序请填写 0–9999 的整数。');
  const data = {label:label.trim(), group, ...(active !== undefined ? {active:active as boolean}:{}), ...(sortOrder !== undefined ? {sortOrder:sortOrder as number}:{})};
  if (id !== undefined) {
    if (typeof id !== 'string') throw new Error('分类无效。');
    const old = await prisma.clothingCategory.findUnique({where:{id}});
    if (!old) throw new Error('分类不存在。');
    // Coarse local suggestions and the fallback must always remain selectable.
    if (categoryGroups.some(g=>g.id===id) && (group !== old.group || active === false)) throw new Error('基础分类需要保留原部位并保持启用。');
    return prisma.clothingCategory.update({where:{id}, data});
  }
  return prisma.clothingCategory.create({data:{id:crypto.randomUUID(),...data}});
}
export async function setCategoryFavorite(id:unknown, favorite:unknown) {
  if (typeof id !== 'string' || typeof favorite !== 'boolean') throw new Error('常用分类设置无效。');
  await validateCategory(id);
  const profileId = currentProfileId();
  if (favorite) await prisma.categoryFavorite.upsert({where:{profileId_categoryId:{profileId,categoryId:id}},create:{profileId,categoryId:id},update:{}});
  else await prisma.categoryFavorite.deleteMany({where:{profileId,categoryId:id}});
}
