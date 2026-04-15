import { NextResponse } from 'next/server';

import { createTemplateRecord, listTemplates } from '@/lib/wardrobe-store';

export async function GET() {
  const templates = await listTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { name: string; imageUrl: string; isDefault?: boolean };
  const template = await createTemplateRecord(payload);
  return NextResponse.json(template, { status: 201 });
}
