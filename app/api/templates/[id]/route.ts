import { NextResponse } from 'next/server';

import { removeTemplate, setDefaultTemplateRecord } from '@/lib/wardrobe-store';

export async function PATCH(
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

export async function DELETE(
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
