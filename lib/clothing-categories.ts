// One registry for forms, filters, labels and image layout. IDs stay stable in storage.
export const clothingCategories = [
  { value: 'top', label: '上装', icon: '👕', boardGroup: 'top' },
  { value: 'bottom', label: '下装', icon: '👖', boardGroup: 'bottom' },
  { value: 'outerwear', label: '外套', icon: '🧥', boardGroup: 'outerwear' },
  { value: 'dress', label: '裙装', icon: '👗', boardGroup: 'whole' },
  { value: 'loungewear', label: '家居服', icon: '🏠', boardGroup: 'whole' },
  { value: 'underwear', label: '内衣', icon: '🩲', boardGroup: 'whole' },
  { value: 'shoes', label: '鞋履', icon: '👟', boardGroup: 'shoes' },
  { value: 'accessory', label: '配饰', icon: '👜', boardGroup: 'accessory' },
  { value: 'other', label: '其他', icon: '📦', boardGroup: 'other' },
] as const;

export type Category = typeof clothingCategories[number]['value'];
export type BoardGroup = typeof clothingCategories[number]['boardGroup'];
export const categoryLabels: Record<string, string> = Object.fromEntries(clothingCategories.map(item => [item.value, item.label]));
export function categoryBoardGroup(category: string): BoardGroup {
  return clothingCategories.find(item => item.value === category)?.boardGroup ?? 'other';
}
export function categoryIcon(category: string): string {
  return clothingCategories.find(item => item.value === category)?.icon ?? '📦';
}

// Suggestions remain editable. Specific garment names must win over general words like "shirt".
export function suggestClothingCategory(name: string): Category {
  const text = name.toLowerCase().replace(/[_-]/g, ' ');
  if (/家居|睡衣|睡裤|睡袍|\b(pajamas?|pyjamas?|loungewear|sleepwear|nightgown|nightdress|bathrobe)\b/.test(text)) return 'loungewear';
  if (/内衣|内裤|文胸|背心式内衣|\b(underwear|underpants|undershirt|bra|brassiere|panties|briefs|boxers|lingerie)\b/.test(text)) return 'underwear';
  if (/裙|\b(dress|dresses|skirt|miniskirt|gown)\b/.test(text)) return 'dress';
  if (/外套|大衣|夹克|羽绒|开衫|\b(jacket|coat|outerwear|blazer|vest|cardigan|parka|anorak)\b/.test(text)) return 'outerwear';
  if (/裤|\b(pants|jeans|trousers|bottom|shorts|leggings|slacks|denim)\b/.test(text)) return 'bottom';
  if (/上衣|衬衫|短袖|长袖|卫衣|毛衣|背心|\b(tshirt|t shirt|shirt|top|blouse|tank|tee|sweater|hoodie|pullover)\b/.test(text)) return 'top';
  if (/鞋|靴|\b(shoes?|sneakers?|boots?|sandals?|heels?|footwear|loafer|oxford)\b/.test(text)) return 'shoes';
  if (/帽|围巾|包|腰带|眼镜|\b(bag|hat|cap|scarf|belt|glasses|accessory|sunglasses|backpack|handbag)\b/.test(text)) return 'accessory';
  return 'other';
}
