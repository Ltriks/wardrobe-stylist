import { NextRequest, NextResponse } from 'next/server';

import { queueBoardJob } from '@/lib/board-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const outfitId = typeof body?.outfitId === 'string' ? body.outfitId : '';

    if (!outfitId) {
      return NextResponse.json({ error: 'outfitId is required' }, { status: 400 });
    }

    const outfit = await queueBoardJob(outfitId);
    if (!outfit) {
      return NextResponse.json({ error: 'Outfit not found.' }, { status: 404 });
    }

    return NextResponse.json(outfit, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Board generation failed' },
      { status: 500 },
    );
  }
}
