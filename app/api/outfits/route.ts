import { NextResponse } from 'next/server';

import { createOutfitRecord, listOutfits } from '@/lib/wardrobe-store';
import { OutfitFormData } from '@/app/types';

export async function GET() {
  const outfits = await listOutfits();
  return NextResponse.json(outfits);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as OutfitFormData;
  const outfit = await createOutfitRecord(payload);
  return NextResponse.json(outfit, { status: 201 });
}
