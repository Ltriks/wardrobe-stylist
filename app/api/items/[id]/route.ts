import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { removeClothingItem, updateClothingItem } from '@/lib/wardrobe-store';
import { ClothingItemFormData } from '@/app/types';

async function handlePATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const payload = (await request.json()) as Partial<ClothingItemFormData>;
    const item = await updateClothingItem(id, payload);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/items/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update clothing item.' },
      { status: 400 },
    );
  }
}

async function handleDELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const removed = await removeClothingItem(id);

    if (!removed) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/items/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete clothing item.' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const PATCH = withProfile(handlePATCH);
export const DELETE = withProfile(handleDELETE);
