import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { createTemplateRecord, listTemplates } from '@/lib/wardrobe-store';

async function handleGET() {
  const templates = await listTemplates();
  return NextResponse.json(templates);
}

async function handlePOST(request: Request) {
  const payload = (await request.json()) as { name: string; imageUrl: string; isDefault?: boolean };
  const template = await createTemplateRecord(payload);
  return NextResponse.json(template, { status: 201 });
}

export const dynamic = 'force-dynamic';
export const GET = withProfile(handleGET);
export const POST = withProfile(handlePOST);
