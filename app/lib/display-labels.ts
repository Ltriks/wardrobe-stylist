export { categoryLabels } from '../../lib/clothing-categories';
export const seasonLabels: Record<string, string> = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
export const statusLabels: Record<string, string> = { idle: '待生成', generating: '生成中', success: '已完成', failed: '生成失败' };
const colorLabels: Record<string, string> = {
  unknown: '未识别', white: '白色', black: '黑色', gray: '灰色', grey: '灰色', red: '红色', blue: '蓝色', green: '绿色',
  yellow: '黄色', orange: '橙色', purple: '紫色', pink: '粉色', brown: '棕色', navy: '藏蓝色', beige: '米色', multicolor: '多色',
};
export function colorLabel(value: string) { return colorLabels[value.toLowerCase()] || value; }

// Keep service values stable; translate only the message presented to the user.
export function errorLabel(message: string): string {
  const errors: Record<string, string> = {
    'Outfit not found': '这套搭配不存在。', 'Outfit not found.': '这套搭配不存在。',
    'Item not found': '这件衣物不存在。', 'Template not found': '这张人物照片不存在。',
    'Pending item not found': '这件待确认衣物不存在。', 'Unsupported template update': '无法更新这张人物照片。',
    'No file provided': '请先选择图片。', 'Upload failed': '上传失败，请重试。',
    'File too large. Max size: 20MB': '图片不能超过 20MB。',
    'Invalid file type. Supported: JPEG, PNG, GIF, WebP, HEIC, HEIF': '请选择 JPEG、PNG、GIF、WebP、HEIC 或 HEIF 图片。',
    'This HEIC/HEIF image could not be converted. Please export it as JPEG or PNG and try again.': '这张图片转换失败，请先转成 JPEG 或 PNG 后重试。',
    'Board generation failed': '搭配图生成失败，请重试。',
    'Failed to load outfits.': '搭配加载失败。', 'Failed to create outfit.': '创建搭配失败。',
    'Failed to update outfit.': '更新搭配失败。', 'Failed to delete outfit.': '删除搭配失败。',
    'Failed to load clothing items.': '衣物加载失败。', 'Failed to create clothing item.': '添加衣物失败。',
    'Failed to update clothing item.': '更新衣物失败。', 'Failed to delete clothing item.': '删除衣物失败。',
    'Failed to fetch': '连接失败，请检查网络后重试。',
  };
  return errors[message] || message;
}
