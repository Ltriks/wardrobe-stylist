import { NextResponse } from 'next/server';

import { createOutfitRecord, listOutfits } from '@/lib/wardrobe-store';
import { OutfitFormData } from '@/app/types';

export async function GET() {
  try {
    const outfits = await listOutfits();
    return NextResponse.json(outfits);
  } catch (error) {
    console.error('GET /api/outfits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load outfits.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OutfitFormData;
    const outfit = await createOutfitRecord(payload);
    return NextResponse.json(outfit, { status: 201 });
  } catch (error) {
    console.error('POST /api/outfits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create outfit.' },
      { status: 400 },
    );
  }
}
