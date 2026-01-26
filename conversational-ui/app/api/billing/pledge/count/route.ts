import { NextResponse } from 'next/server';
import { getActivePledgeCount } from '@/lib/db/queries';

export async function GET() {
  const count = await getActivePledgeCount();
  return NextResponse.json({ count });
}
