import { NextResponse } from 'next/server';

import { removeOutfit, updateOutfitRecord } from '@/lib/wardrobe-store';
import { OutfitFormData } from '@/app/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const payload = (await request.json()) as Partial<OutfitFormData>;
  const outfit = await updateOutfitRecord(id, payload);

  if (!outfit) {
    return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
  }

  return NextResponse.json(outfit);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const removed = await removeOutfit(id);

  if (!removed) {
    return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
