import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { confirmPendingUploadItem, removePendingUploadItem, updatePendingUploadItem } from '@/lib/wardrobe-store';
import { PendingItem } from '@/app/types';

async function handlePATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const payload = (await request.json()) as Partial<PendingItem>;
  const item = await updatePendingUploadItem(params.id, payload);

  if (!item) {
    return NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

async function handleDELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const removed = await removePendingUploadItem(params.id);

  if (!removed) {
    return NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
export const POST = withProfile(async (_request: Request, { params }: { params: { id: string } }) => {
  const item = await confirmPendingUploadItem(params.id);
  return item ? NextResponse.json(item, { status: 201 }) : NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
});
export const PATCH = withProfile(handlePATCH);
export const DELETE = withProfile(handleDELETE);
