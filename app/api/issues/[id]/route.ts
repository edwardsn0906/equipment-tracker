import { NextRequest, NextResponse } from 'next/server';
import { resolveIssue } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { resolved_by } = await request.json();
    if (!resolved_by) return NextResponse.json({ error: 'resolved_by required' }, { status: 400 });
    const issue = await resolveIssue(parseInt(params.id), resolved_by);
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    return NextResponse.json(issue);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to resolve issue' }, { status: 500 });
  }
}
