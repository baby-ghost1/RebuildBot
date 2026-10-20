import { NextResponse } from 'next/server';
import analyzeRepo from '../../../lib/analyzer.js';
import { parseGithubUrl, cloneRepo, cleanupClone } from '../../../lib/github.js';

// Cloning a repository can take a while, so allow a longer budget on
// serverless hosts such as Vercel.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let cloneDir = null;

  try {
    const body = await request.json();
    const input = (body.repoPath || '').trim();

    // 1. GitHub URL -> shallow clone, then analyze the clone
    const github = parseGithubUrl(input);
    if (github) {
      cloneDir = await cloneRepo(github);
      const report = analyzeRepo(cloneDir, {
        display: github.branch
          ? `${github.url.replace(/\.git$/, '')} (branch: ${github.branch})`
          : github.url.replace(/\.git$/, ''),
        source: 'github',
      });
      return NextResponse.json({ success: true, report });
    }

    // 2. Local folder path -> analyze directly
    const report = analyzeRepo(input || '.', { source: 'local' });
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Analysis failed' },
      { status: 400 }
    );
  } finally {
    if (cloneDir) cleanupClone(cloneDir);
  }
}
