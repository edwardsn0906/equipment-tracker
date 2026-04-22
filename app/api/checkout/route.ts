import { NextRequest, NextResponse } from 'next/server';
import { getEquipmentById, checkOut } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipment_id, user_name, location, checkout_type, job_number, cost_code, notes, components_included } = body;
    if (!equipment_id || !user_name || !location || !checkout_type)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const eq = await getEquipmentById(equipment_id);
    if (!eq) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    if (eq.status === 'checked_out') return NextResponse.json({ error: 'Already checked out' }, { status: 409 });
    return NextResponse.json(await checkOut({ equipment_id, user_name, location, checkout_type, job_number, cost_code, notes, components_included }));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to check out' }, { status: 500 });
  }
}
