import { NextResponse } from 'next/server';

import { createClothingItem, listClothingItems } from '@/lib/wardrobe-store';
import { ClothingItemFormData } from '@/app/types';

export async function GET() {
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

export async function POST(request: Request) {
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
