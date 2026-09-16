import { withProfile } from '@/lib/profiles';
import { NextResponse } from 'next/server';

import { removeTemplate, setDefaultTemplateRecord } from '@/lib/wardrobe-store';

async function handlePATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const payload = (await request.json()) as { isDefault?: boolean };

  if (payload.isDefault) {
    const template = await setDefaultTemplateRecord(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  }

  return NextResponse.json({ error: 'Unsupported template update' }, { status: 400 });
}

async function handleDELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const removed = await removeTemplate(id);

  if (!removed) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
export const PATCH = withProfile(handlePATCH);
export const DELETE = withProfile(handleDELETE);
