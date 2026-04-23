import { NextRequest, NextResponse } from 'next/server';
import { getEquipmentById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eq = await getEquipmentById(params.id);
    if (!eq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(eq);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
