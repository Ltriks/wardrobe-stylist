import { NextResponse } from 'next/server';

import { createClothingItem, listClothingItems } from '@/lib/wardrobe-store';
import { ClothingItemFormData } from '@/app/types';

export async function GET() {
  const items = await listClothingItems();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ClothingItemFormData;
  const item = await createClothingItem(payload);
  return NextResponse.json(item, { status: 201 });
}
