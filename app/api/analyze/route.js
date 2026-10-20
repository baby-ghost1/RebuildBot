import { NextResponse } from 'next/server';
import analyzeRepo, { analyzeSource } from '../../../lib/analyzer.js';
import { createMemorySource } from '../../../lib/source.js';
import { parseGithubUrl, createGitHubSource } from '../../../lib/github.js';

// Reading a repository over the GitHub API can take a moment, so allow a
// longer budget on serverless hosts such as Vercel.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Work out the URL of the repository this deployment was built from.
 *
 * On a serverless host the working directory only contains the compiled
 * bundle, not the source, so scoring "this project" locally would be
 * misleading. Instead we score the actual GitHub repository.
 *
 * Vercel injects VERCEL_GIT_REPO_OWNER and VERCEL_GIT_REPO_SLUG, and
 * SELF_REPO_URL can be set manually on any other host.
 */
function getSelfRepoUrl() {
  if (process.env.SELF_REPO_URL) return process.env.SELF_REPO_URL;

  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  if (owner && slug) return `https://github.com/${owner}/${slug}`;

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const input = (body.repoPath || '').trim();

    // 1. A folder the user picked in their browser. The files are read on
    //    the client and sent here, so this works on a hosted deployment
    //    where the server cannot see the user's disk.
    if (body.files && typeof body.files === 'object') {
      const fileCount = Object.keys(body.files).length;
      if (fileCount === 0) {
        throw new Error('No files were received from the selected folder.');
      }
      const report = analyzeSource(createMemorySource(body.files, body.folderName, body.hasGit), {
        display: body.folderName || 'selected folder',
        source: 'browser',
        isSelf: false,
      });
      return NextResponse.json({ success: true, report });
    }

    // 2. A GitHub URL, or this deployment's own repository
    const selfRepo = input ? null : getSelfRepoUrl();
    const github = parseGithubUrl(input || selfRepo || '');

    if (github) {
      const source = await createGitHubSource(github.owner, github.repo, github.branch);
      const report = analyzeSource(source, {
        display: source.display,
        source: 'github',
        isSelf: !input,
      });
      return NextResponse.json({ success: true, report });
    }

    // 3. A local folder path -> analyse directly on disk
    const report = analyzeRepo(input || '.', { source: 'local' });
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Analysis failed' },
      { status: 400 }
    );
  }
}
