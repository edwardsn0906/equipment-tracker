import { NextRequest, NextResponse } from 'next/server';
import { getAllIssues, createIssue } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getAllIssues());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { equipment_id, equipment_name, reported_by, description, severity } = await request.json();
    if (!equipment_id || !reported_by || !description || !severity)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    return NextResponse.json(await createIssue({ equipment_id, equipment_name, reported_by, description, severity }), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
