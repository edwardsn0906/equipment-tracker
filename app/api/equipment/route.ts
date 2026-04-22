import { NextRequest, NextResponse } from 'next/server';
import { getAllEquipment, createEquipment } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getAllEquipment());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, category, description, serial_number, components } = await request.json();
    if (!name || !category) return NextResponse.json({ error: 'Name and category required' }, { status: 400 });
    return NextResponse.json(await createEquipment({ name, category, description, serial_number, components }), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
  }
}
