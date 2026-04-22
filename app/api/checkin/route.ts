import { NextRequest, NextResponse } from 'next/server';
import { getEquipmentById, checkIn } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { equipment_id, notes } = await request.json();
    if (!equipment_id) return NextResponse.json({ error: 'equipment_id required' }, { status: 400 });
    const eq = getEquipmentById(equipment_id);
    if (!eq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (eq.status !== 'checked_out') return NextResponse.json({ error: 'Not currently checked out' }, { status: 409 });
    return NextResponse.json(checkIn(equipment_id, notes));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
