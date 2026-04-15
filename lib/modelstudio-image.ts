import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const DEFAULT_MODEL = 'qwen-image-2.0-pro';

function detectMimeType(filePath: string) {
  const extension = extname(filePath).toLowerCase();

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    default:
      return 'image/png';
  }
}

async function encodeImageAsDataUrl(filePath: string) {
  const buffer = await readFile(filePath);
  const mimeType = detectMimeType(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export function buildTryOnPrompt() {
  return [
    'Use Image 1 as the model reference and keep the same person, facial identity, hair, and pose.',
    'Use Image 2 as the outfit board reference.',
    'Generate a realistic fashion try-on preview where the person from Image 1 wears the outfit shown in Image 2.',
    'Preserve the overall colors, layering, silhouette, and styling direction from the board.',
    'Keep the result natural, editorial, and believable.',
    'Do not add extra garments, extra accessories, duplicate clothing pieces, text, or collage elements.',
    'Keep the background clean and simple.',
  ].join(' ');
}

type GenerateTryOnOptions = {
  templateImagePath: string;
  boardImagePath: string;
  prompt?: string;
};

export async function generateTryOnImage({
  templateImagePath,
  boardImagePath,
  prompt = buildTryOnPrompt(),
}: GenerateTryOnOptions): Promise<{ imageUrl: string; prompt: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.MODEL_STUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DASHSCOPE_API_KEY or MODEL_STUDIO_API_KEY for try-on generation.');
  }

  const baseUrl = process.env.DASHSCOPE_IMAGE_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.DASHSCOPE_IMAGE_MODEL ?? DEFAULT_MODEL;

  const [templateImage, boardImage] = await Promise.all([
    encodeImageAsDataUrl(templateImagePath),
    encodeImageAsDataUrl(boardImagePath),
  ]);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: templateImage },
              { image: boardImage },
              { text: prompt },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
        prompt_extend: true,
        watermark: false,
        size: '1024*1536',
        negative_prompt:
          'low resolution, blurry, distorted anatomy, duplicated limbs, extra garments, extra accessories, collage, text, watermark, cut off body, deformed clothing',
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Model Studio request failed.');
  }

  const imageUrl = payload?.output?.choices?.[0]?.message?.content?.[0]?.image;

  if (!imageUrl) {
    throw new Error('Model Studio did not return an output image.');
  }

  return { imageUrl, prompt };
}
