import { NextResponse } from 'next/server';

import { queueTryOnJob } from '@/lib/tryon-service';

export const runtime = 'nodejs';

type GenerateTryOnRequest = {
  outfitId?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as GenerateTryOnRequest;
  const outfitId = payload.outfitId?.trim();

  if (!outfitId) {
    return NextResponse.json({ error: 'Missing outfitId.' }, { status: 400 });
  }

  try {
    const updatedOutfit = await queueTryOnJob(outfitId);
    return NextResponse.json(updatedOutfit, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Try-on generation failed.';
    return NextResponse.json(
      {
        error: message,
      },
      { status: message === 'Outfit not found.' ? 404 : 400 },
    );
  }
}
