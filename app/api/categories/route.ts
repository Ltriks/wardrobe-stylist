import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { withProfile } from '@/lib/profiles';
import { categoryCatalog, saveCategory, setCategoryFavorite } from '@/lib/category-store';
export const dynamic = 'force-dynamic';
export const GET = withProfile(async () => NextResponse.json(await categoryCatalog()));
export const POST = withProfile(async request => {
  if (request.headers.get('origin') !== `${new URL(request.url).protocol}//${request.headers.get('host')}`) return NextResponse.json({error:'请从本站页面管理分类。'},{status:403});
  try {
    const body = await request.json();
    if (body.action === 'favorite') await setCategoryFavorite(body.id,body.favorite);
    else await saveCategory(body);
    return NextResponse.json(await categoryCatalog());
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError ? (error.code === 'P2002' ? '这个部位已有同名分类。' : '保存失败，请重试。') : error instanceof Error ? error.message : '保存失败。';
    return NextResponse.json({error:message},{status:400});
  }
});
