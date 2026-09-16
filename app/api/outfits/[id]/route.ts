import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { removeOutfit, updateOutfitRecord } from '@/lib/wardrobe-store';
import { OutfitFormData } from '@/app/types';

async function handlePATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const payload = (await request.json()) as Partial<OutfitFormData>;
    const outfit = await updateOutfitRecord(id, payload);

    if (!outfit) {
      return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
    }

    return NextResponse.json(outfit);
  } catch (error) {
    console.error('PATCH /api/outfits/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update outfit.' },
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
    const removed = await removeOutfit(id);

    if (!removed) {
      return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/outfits/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete outfit.' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const PATCH = withProfile(handlePATCH);
export const DELETE = withProfile(handleDELETE);
