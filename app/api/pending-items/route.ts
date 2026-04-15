import { NextResponse } from 'next/server';

import { clearPendingUploadBatch, createPendingUploadBatch, listPendingUploadItems } from '@/lib/wardrobe-store';
import { PendingItem } from '@/app/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId') || undefined;
  const items = await listPendingUploadItems(batchId);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { items: PendingItem[]; batchId?: string };
  const result = await createPendingUploadBatch(payload.items, payload.batchId);
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId') || undefined;
  await clearPendingUploadBatch(batchId);
  return NextResponse.json({ ok: true });
}
