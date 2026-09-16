import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { createClothingItem, listClothingItems } from '@/lib/wardrobe-store';
import { ClothingItemFormData } from '@/app/types';

async function handleGET() {
  try {
    const items = await listClothingItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load clothing items.' },
      { status: 500 },
    );
  }
}

async function handlePOST(request: Request) {
  try {
    const payload = (await request.json()) as ClothingItemFormData;
    const item = await createClothingItem(payload);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create clothing item.' },
      { status: 400 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const GET = withProfile(handleGET);
export const POST = withProfile(handlePOST);
