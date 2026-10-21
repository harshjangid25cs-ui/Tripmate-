import { NextRequest, NextResponse } from 'next/server';
import { getCustomer } from '@/lib/wa-auth/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const c = await getCustomer(req);
  if (!c) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    customer: { id: c.id, name: c.name, email: c.email, mobile: c.mobile }
  });
}
