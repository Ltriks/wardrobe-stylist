import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { readAiSettings } from './ai-settings';
import { resolveImageEndpoint } from './image-endpoint';
import { ClothingFit, clothingFitPrompt, clothingFitNegativePrompt } from './tryon-fit';

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => {
    throw new Error(`试穿接口返回了无法解析的响应（HTTP ${response.status}），请检查接口地址。`);
  });
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || payload?.error;
    throw new Error(typeof message === 'string' ? message : `试穿生成请求失败（HTTP ${response.status}）。`);
  }
  return payload;
}

async function waitForImageTask(endpoint: string, apiKey: string, taskId: string) {
  const url = new URL(`/api/v1/tasks/${encodeURIComponent(taskId)}`, endpoint);
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const result = await readResponse(await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(Math.min(60000, Math.max(1, deadline - Date.now()))),
    }));
    const status = result?.output?.task_status;
    if (status === 'SUCCEEDED') return result;
    if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(status)) {
      throw new Error(`试穿任务失败：${result.output.message || result.output.code || status}`);
    }
    if (status !== 'PENDING' && status !== 'RUNNING') throw new Error('试穿接口返回了未知任务状态。');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`试穿任务等待超时（任务 ${taskId}），请稍后检查服务端任务状态。`);
}

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

export function buildTryOnPrompt(clothingFit: ClothingFit = 'original') {
  return [
    'Use Image 1 as the model reference and keep the same person, facial identity, hair, and pose.',
    'Use Image 2 as the outfit board reference.',
    'Generate a realistic fashion try-on preview where the person from Image 1 wears the outfit shown in Image 2.',
    'Preserve the overall colors, layering, silhouette, and styling direction from the board.',
    'Preserve each garment type: keep dresses and skirts intact, and keep loungewear or pajama sets together. Do not replace a dress or one-piece garment with a shirt and trousers. Wear underwear as an inner layer beneath outer clothing when both are present; do not add exposure or change clothing coverage.',
    clothingFitPrompt(clothingFit),
    'Keep the result natural, editorial, and believable.',
    'Do not add extra garments, extra accessories, duplicate clothing pieces, text, or collage elements.',
    'Keep the background clean and simple.',
  ].join(' ');
}

type GenerateTryOnOptions = {
  clothingFit?: ClothingFit;
  templateImagePath: string;
  boardImagePath: string;
  prompt?: string;
};

export async function generateTryOnImage({
  templateImagePath,
  boardImagePath,
  clothingFit = 'original',
  prompt = buildTryOnPrompt(clothingFit),
}: GenerateTryOnOptions): Promise<{ imageUrl: string; prompt: string }> {
  const { apiKey, baseUrl, model } = await readAiSettings();
  if (!apiKey) {
    throw new Error('请先在 AI 设置页面配置 API Key。');
  }

  const [templateImage, boardImage] = await Promise.all([
    encodeImageAsDataUrl(templateImagePath),
    encodeImageAsDataUrl(boardImagePath),
  ]);

  const endpoint = resolveImageEndpoint(baseUrl, model);
  const parameters = {
    n: 1,
    prompt_extend: true,
    watermark: false,
    size: endpoint.protocol === 'images' ? '1024x1536' : '1024*1536',
    negative_prompt:
      'low resolution, blurry, distorted anatomy, duplicated limbs, extra garments, extra accessories, collage, text, watermark, cut off body, deformed clothing' + clothingFitNegativePrompt(clothingFit),
  };
  // Qwen Image 3 uses JSON /images/generations for both generation and editing.
  // Send the local photos as data URLs; Alibaba does not need access to localhost.
  const body = endpoint.protocol === 'images'
    ? { model, prompt, image: [templateImage, boardImage], ...parameters }
    : {
      model,
      input: { messages: [{ role: 'user', content: [{ image: templateImage }, { image: boardImage }, { text: prompt }] }] },
      parameters,
    };

  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(endpoint.protocol === 'dashscope-async' ? { 'X-DashScope-Async': 'enable' } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(endpoint.protocol === 'dashscope-async' ? 60000 : 600000),
  });

  let payload = await readResponse(response);
  if (endpoint.protocol === 'dashscope-async') {
    if (typeof payload?.output?.task_id !== 'string' || !payload.output.task_id) {
      throw new Error('试穿接口没有返回任务编号。');
    }
    payload = await waitForImageTask(endpoint.url, apiKey, payload.output.task_id);
  }

  const imageUrl = endpoint.protocol === 'images'
    ? payload?.data?.find((item: { url?: string }) => typeof item?.url === 'string')?.url
    : payload?.output?.choices?.[0]?.message?.content?.find((item: { image?: string }) => typeof item?.image === 'string')?.image;

  if (!imageUrl) {
    throw new Error('试穿接口没有返回图片，请检查模型与接口是否匹配。');
  }

  return { imageUrl, prompt };
}
