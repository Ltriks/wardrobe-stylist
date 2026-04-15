import { NextResponse } from 'next/server';

import { removePendingUploadItem, updatePendingUploadItem } from '@/lib/wardrobe-store';
import { PendingItem } from '@/app/types';

export async function PATCH(
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const removed = await removePendingUploadItem(params.id);

  if (!removed) {
    return NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
