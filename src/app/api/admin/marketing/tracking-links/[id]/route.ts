/**
 * DELETE /api/admin/marketing/tracking-links/[id]
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const svc = createServiceClient();
  const { error: dbErr } = await svc
    .from('marketing_tracking_links')
    .delete()
    .eq('id', id);

  if (dbErr) {
    console.error('[marketing/tracking-links/[id]] delete error:', dbErr.message);
    return NextResponse.json({ error: 'Failed to delete tracking link' }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedId: id });
}

export const runtime = 'nodejs';
