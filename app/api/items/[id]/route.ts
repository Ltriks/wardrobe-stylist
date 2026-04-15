import { NextResponse } from 'next/server';

import { removeClothingItem, updateClothingItem } from '@/lib/wardrobe-store';
import { ClothingItemFormData } from '@/app/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const payload = (await request.json()) as Partial<ClothingItemFormData>;
  const item = await updateClothingItem(id, payload);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const removed = await removeClothingItem(id);

  if (!removed) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
