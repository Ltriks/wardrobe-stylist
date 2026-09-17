export const clothingFits = ['original', 'natural', 'loose'] as const;
export type ClothingFit = typeof clothingFits[number];

export const clothingFitLabels: Record<ClothingFit, string> = {
  original: '保持原版',
  natural: '自然宽松',
  loose: '宽松',
};

export const clothingFitDescriptions: Record<ClothingFit, string> = {
  original: '上衣和下装都保留参考服装的原有版型。',
  natural: '衣身、袖子和裤腿适度留有余量，自然垂落、不贴身。',
  loose: '衣身、袖子和下装更宽裕，整体呈现明显的宽松轮廓。',
};

export function parseClothingFit(value: unknown): ClothingFit {
  if (!clothingFits.includes(value as ClothingFit)) throw new Error('服装版型请选择保持原版、自然宽松或宽松。');
  return value as ClothingFit;
}

export function clothingFitPrompt(fit: ClothingFit): string {
  const preserve = 'Apply the selected fit consistently to the tops, outerwear, and bottoms present in Image 2, including shirts, sweaters, jackets, trousers, shorts, skirts, or dresses as applicable. Preserve the person’s original body proportions and limb shapes; do not slim, lengthen, or reshape the body to change the fit. Preserve footwear and accessories as shown in the reference.';
  if (fit === 'original') return `Preserve the original garment cuts, body and sleeve widths, trouser leg widths, and silhouettes shown in Image 2. Do not make any clothing tighter or looser than the reference. ${preserve}`;
  const fitRule = fit === 'natural'
    ? 'Use a naturally relaxed clothing fit with moderate ease around the shoulders, chest, waist, upper arms, hips, crotch, thighs, knees, and calves. Keep the garment body, sleeves, and trouser legs comfortably roomy. The fabric should drape softly with gentle folds without clinging to the torso, arms, or legs. Avoid an exaggerated baggy or oversized look.'
    : 'Use a clearly loose clothing fit with generous room around the shoulders, chest, waist, arms, hips, crotch, thighs, knees, and calves. Use roomy garment bodies, broad sleeves, and loose trouser legs with soft draping and natural folds throughout the outfit. Do not excessively taper sleeves or trouser legs, or exaggerate garment size.';
  return `${fitRule} Preserve each reference garment’s color, fabric, pattern, pockets, neckline, closures, waistband, cuff design, and layering order. This fit instruction takes priority over the reference garment silhouettes. ${preserve}`;
}

export function clothingFitNegativePrompt(fit: ClothingFit): string {
  return fit === 'original' ? '' : ', skin-tight shirts, body-hugging tops, tight sleeves, constricted shoulders, skin-tight trousers, skinny-fit pants, compression leggings, overly tapered trouser legs, clothing clinging to torso or limbs';
}
