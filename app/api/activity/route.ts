import { NextResponse } from 'next/server';
import { getAllActivity } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getAllActivity());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
