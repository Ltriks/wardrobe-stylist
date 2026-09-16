import { NextResponse } from 'next/server';
import { readPublicAiSettings, resetAiSettings, saveAiSettings, SettingsValidationError } from '@/lib/ai-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isSameOrigin(request: Request) {
  // Next.js may normalize request.url to localhost even when the browser uses 127.0.0.1.
  const host = request.headers.get('host');
  return Boolean(host) && request.headers.get('origin') === `${new URL(request.url).protocol}//${host}`;
}

export async function GET() {
  try {
    return json(await readPublicAiSettings());
  } catch {
    return json({ error: '无法读取 AI 配置，请检查本地配置文件。' }, 500);
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: '仅允许从本站设置页面修改配置。' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json({ error: '配置格式不正确。' }, 415);
  }
  try {
    const body = await request.text();
    if (body.length > 16384) return json({ error: '配置内容过长。' }, 413);
    return json(await saveAiSettings(JSON.parse(body)));
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: '配置格式不正确。' }, 400);
    if (error instanceof SettingsValidationError) return json({ error: error.message }, 400);
    return json({ error: '保存失败，请检查本地配置文件和目录权限。' }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: '仅允许从本站设置页面修改配置。' }, 403);
  try {
    return json(await resetAiSettings());
  } catch {
    return json({ error: '恢复失败，请检查本地配置目录权限。' }, 500);
  }
}
