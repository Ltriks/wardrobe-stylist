import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { runWithProfile } from './profile-context';

export async function ensureDefaultProfile() {
  return prisma.wardrobeProfile.upsert({
    where: { id: 'default' },
    create: { id: 'default', name: '默认衣柜' },
    update: {},
  });
}

// A profile is a family wardrobe selector, not an authentication boundary.
// AsyncLocalStorage also pins queued board/try-on jobs to their original wardrobe.
export function withProfile<Args extends unknown[]>(handler: (request: NextRequest, ...args: Args) => Promise<Response>) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    const profileId = request.headers.get('x-wardrobe-profile') || 'default';
    if (profileId === 'default') await ensureDefaultProfile();
    const profile = await prisma.wardrobeProfile.findUnique({ where: { id: profileId } });
    if (!profile) return NextResponse.json({ error: '成员衣柜不存在，请返回首页重新选择。' }, { status: 404 });
    try {
      const response = await runWithProfile(profileId, () => handler(request, ...args));
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Vary', 'X-Wardrobe-Profile');
      return response;
    } catch {
      return NextResponse.json({ error: '操作失败，请检查输入后重试。' }, { status: 400 });
    }
  };
}
