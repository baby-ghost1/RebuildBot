import { NextResponse } from 'next/server';
import analyzeRepo from '../../../lib/analyzer.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { repoPath } = body;
    const target = repoPath || process.cwd();
    const report = analyzeRepo(target);
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
