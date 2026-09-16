import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { clearPendingUploadBatch, createPendingUploadBatch, listPendingUploadItems } from '@/lib/wardrobe-store';
import { PendingItem } from '@/app/types';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId') || undefined;
  const items = await listPendingUploadItems(batchId);
  return NextResponse.json(items);
}

async function handlePOST(request: Request) {
  const payload = (await request.json()) as { items: PendingItem[]; batchId?: string };
  const result = await createPendingUploadBatch(payload.items, payload.batchId);
  return NextResponse.json(result, { status: 201 });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId') || undefined;
  await clearPendingUploadBatch(batchId);
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
export const GET = withProfile(handleGET);
export const POST = withProfile(handlePOST);
export const DELETE = withProfile(handleDELETE);
