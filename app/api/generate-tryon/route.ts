import { logTryOnError, safeTryOnError } from '@/lib/tryon-diagnostics';
import { currentProfileId } from '@/lib/profile-context';
import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { queueTryOnJob } from '@/lib/tryon-service';

export const runtime = 'nodejs';

type GenerateTryOnRequest = {
  outfitId?: string;
};

async function handlePOST(request: Request) {
  let outfitId: string | undefined;
  try {
    const payload = (await request.json()) as GenerateTryOnRequest;
    outfitId = typeof payload?.outfitId === 'string' ? payload.outfitId.trim() : undefined;
    if (!outfitId) throw new Error('Missing outfitId.');
    const updatedOutfit = await queueTryOnJob(outfitId);
    return NextResponse.json(updatedOutfit, { status: 202 });
  } catch (error) {
    const safe = safeTryOnError(error);
    logTryOnError('request-failed', safe, { stage: 'queue-request', outfitId, profileId: currentProfileId() });
    const message = safe.message;
    return NextResponse.json(
      {
        error: message,
      },
      { status: message === 'Outfit not found.' ? 404 : 400 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const POST = withProfile(handlePOST);
