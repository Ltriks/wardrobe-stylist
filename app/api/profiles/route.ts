import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureDefaultProfile } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function validateName(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 40 || /[\x00-\x1f]/.test(value)) {
    throw new Error('成员名称请填写 1–40 个字符。');
  }
  return value.trim();
}

export async function GET() {
  await ensureDefaultProfile();
  const profiles = await prisma.wardrobeProfile.findMany();
  profiles.sort((a, b) => a.id === b.id ? 0 : a.id === 'default' ? -1 : b.id === 'default' ? 1 : a.createdAt.getTime() - b.createdAt.getTime());
  return json(profiles);
}

async function save(request: Request, rename: boolean) {
  const host = request.headers.get('host');
  if (request.headers.get('origin') !== `${new URL(request.url).protocol}//${host}`) {
    return json({ error: '请从本站页面管理成员。' }, 403);
  }
  try {
    const payload = await request.json();
    const name = validateName(payload.name);
    await ensureDefaultProfile();
    if (rename) {
      if (typeof payload.id !== 'string') return json({ error: '请选择成员。' }, 400);
      return json(await prisma.wardrobeProfile.update({ where: { id: payload.id }, data: { name } }));
    }
    return json(await prisma.wardrobeProfile.create({ data: { name } }), 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return json({ error: error.code === 'P2002' ? '这个成员名称已存在，请换一个名称。' : '成员不存在或保存失败。' }, 400);
    }
    return json({ error: error instanceof Error && error.message.startsWith('成员名称') ? error.message : '保存失败，请检查输入。' }, 400);
  }
}

export async function POST(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }
