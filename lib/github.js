const GITHUB_API = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SOURCE_FILES = 20;

const treeCache = new Map();
const contentCache = new Map();

/**
 * Strict GitHub URL parser. Only real github.com repository URLs are
 * accepted so nothing odd can be passed on.
 *
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   git@github.com:owner/repo.git
 *
 * @returns {{ owner: string, repo: string, branch: string|null, url: string }|null}
 */
function parseGithubUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;

  const ssh = /^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?\/?$/i.exec(value);
  if (ssh) {
    return {
      owner: ssh[1],
      repo: ssh[2],
      branch: null,
      url: `https://github.com/${ssh[1]}/${ssh[2]}`,
    };
  }

  const https = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?(?:\/tree\/([A-Za-z0-9._\-/]+?))?\/?$/i.exec(
    value
  );
  if (https) {
    return {
      owner: https[1],
      repo: https[2],
      branch: https[4] || null,
      url: `https://github.com/${https[1]}/${https[2]}`,
    };
  }

  return null;
}

function apiHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'rebuildbot',
  };
  // A token raises the rate limit from 60 to 5000 requests per hour and
  // also allows private repositories to be inspected.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubApi(url) {
  let res;
  try {
    res = await fetch(url, { headers: apiHeaders(), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new Error(`Could not reach GitHub: ${err.message}`);
  }

  if (res.status === 404) {
    throw new Error('Repository not found. Check the URL and make sure the repo is public.');
  }
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw new Error(
        'GitHub API rate limit reached. Add a GITHUB_TOKEN environment variable to raise the limit.'
      );
    }
    throw new Error('GitHub refused the request (403). The repo may be private.');
  }
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a file's content from raw.githubusercontent.com. This host is not
 * rate limited like the API, so file contents are effectively free.
 */
async function fetchRaw(owner, repo, branch, filePath) {
  const url = `${RAW_BASE}/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) return null;
  return res.text();
}

/**
 * Build a source that exposes a GitHub repository through the REST API.
 * No git binary is needed, so this works on serverless hosts.
 */
async function createGitHubSource(owner, repo, branch) {
  const cacheKey = `${owner}/${repo}@${branch || 'default'}`;
  let meta = treeCache.get(cacheKey);

  if (!meta) {
    let targetBranch = branch;
    if (!targetBranch) {
      const info = await githubApi(`${GITHUB_API}/repos/${owner}/${repo}`);
      targetBranch = info.default_branch || 'main';
    }

    const tree = await githubApi(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
        targetBranch
      )}?recursive=1`
    );

    if (!tree.tree) {
      throw new Error('Could not read the repository tree from GitHub.');
    }

    meta = {
      branch: targetBranch,
      paths: tree.tree.filter((n) => n.type === 'blob').map((n) => n.path),
      truncated: Boolean(tree.truncated),
    };
    treeCache.set(cacheKey, meta);
  }

  const { branch: resolvedBranch, paths, truncated } = meta;

  // Files whose contents the checklist actually reads
  const contentPaths = paths.filter(
    (p) =>
      p === 'package.json' ||
      p === 'Dockerfile' ||
      p === 'README.md' ||
      p === '.env.example' ||
      p === '.nvmrc' ||
      p === '.gitignore' ||
      p === '.dockerignore' ||
      p === 'go.mod' ||
      p === 'Cargo.toml' ||
      p === 'pyproject.toml' ||
      p === 'requirements.txt'
  );

  // A sample of source files, used only by the hardcoded path check
  const sourceFiles = paths
    .filter((p) => /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|rb|php)$/.test(p))
    .filter((p) => !p.includes('node_modules/'))
    .slice(0, MAX_SOURCE_FILES);

  const wanted = [...new Set([...contentPaths, ...sourceFiles])];
  const contents = new Map();

  await Promise.all(
    wanted.map(async (filePath) => {
      const key = `${cacheKey}:${filePath}`;
      if (contentCache.has(key)) {
        contents.set(filePath, contentCache.get(key));
        return;
      }
      try {
        const text = await fetchRaw(owner, repo, resolvedBranch, filePath);
        contentCache.set(key, text);
        contents.set(filePath, text);
      } catch {
        contents.set(filePath, null);
      }
    })
  );

  return {
    kind: 'github',
    display: `https://github.com/${owner}/${repo}`,
    // A GitHub repository is always a git repository
    hasGit: true,
    truncated,
    exists(rel) {
      return paths.includes(rel);
    },
    read(rel) {
      const value = contents.get(rel);
      return value === undefined ? null : value;
    },
    list() {
      return paths;
    },
  };
}

module.exports = { parseGithubUrl, createGitHubSource };
