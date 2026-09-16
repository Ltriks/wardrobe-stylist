import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const DEFAULT_MODEL = 'qwen-image-2.0-pro';

type SavedSettings = { model: string; baseUrl: string; apiKey?: string };

export class SettingsValidationError extends Error {}

function settingsPath() {
  return join(process.cwd(), 'data', 'ai-settings.json');
}

async function readSavedSettings(): Promise<SavedSettings | null> {
  try {
    const value = JSON.parse(await readFile(settingsPath(), 'utf8'));
    return validateSettings(value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('无法读取 AI 配置，请检查本地配置文件。');
  }
}

function validateSettings(value: unknown): SavedSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SettingsValidationError('配置格式不正确。');
  }
  const { model, baseUrl, apiKey } = value as Record<string, unknown>;
  if (typeof model !== 'string' || !model.trim() || model.trim().length > 200 || /\s/.test(model.trim())) {
    throw new SettingsValidationError('请填写有效的模型名称（不含空格）。');
  }
  if (typeof baseUrl !== 'string' || baseUrl.length > 2048) {
    throw new SettingsValidationError('请填写完整的 HTTPS 接口地址。');
  }
  let url: URL;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new SettingsValidationError('请填写完整的 HTTPS 接口地址。');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new SettingsValidationError('接口地址须使用 HTTPS，且不能包含账号、密码、查询参数或锚点。');
  }
  if (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 4096 || /\s/.test(apiKey.trim()))) {
    throw new SettingsValidationError('API Key 格式不正确，请检查是否包含空格或换行。');
  }
  return { model: model.trim(), baseUrl: url.toString(), apiKey: typeof apiKey === 'string' ? apiKey.trim() || undefined : undefined };
}

export async function readAiSettings() {
  const saved = await readSavedSettings();
  const environmentKey = process.env.DASHSCOPE_API_KEY || process.env.MODEL_STUDIO_API_KEY;
  return {
    apiKey: saved?.apiKey || environmentKey || '',
    model: saved?.model ?? process.env.DASHSCOPE_IMAGE_MODEL ?? DEFAULT_MODEL,
    baseUrl: saved?.baseUrl ?? process.env.DASHSCOPE_IMAGE_BASE_URL ?? DEFAULT_BASE_URL,
    hasSavedSettings: saved !== null,
    keySource: saved?.apiKey ? 'page' : environmentKey ? 'environment' : 'none',
  };
}

export async function readPublicAiSettings() {
  const { apiKey, ...settings } = await readAiSettings();
  return { ...settings, hasApiKey: Boolean(apiKey) };
}

export async function saveAiSettings(value: unknown) {
  const next = validateSettings(value);
  const saved = await readSavedSettings();
  // A blank field means keep the previous key; never send a stored key to the browser.
  next.apiKey = next.apiKey || saved?.apiKey;
  await mkdir(join(process.cwd(), 'data'), { recursive: true });
  const temporaryPath = `${settingsPath()}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(temporaryPath, settingsPath());
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return readPublicAiSettings();
}

export async function resetAiSettings() {
  await rm(settingsPath(), { force: true });
  return readPublicAiSettings();
}
