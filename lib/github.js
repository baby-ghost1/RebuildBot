const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const CLONE_TIMEOUT_MS = 90_000;

/**
 * Strict GitHub URL parser. Only real github.com repository URLs are
 * accepted so nothing odd can be passed to git.
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

  // SSH form
  const ssh = /^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?\/?$/i.exec(value);
  if (ssh) {
    return {
      owner: ssh[1],
      repo: ssh[2],
      branch: null,
      url: `https://github.com/${ssh[1]}/${ssh[2]}.git`,
    };
  }

  // HTTPS form, optionally with a /tree/<branch> suffix
  const https = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?(?:\/tree\/([A-Za-z0-9._\-/]+?))?\/?$/i.exec(
    value
  );
  if (https) {
    return {
      owner: https[1],
      repo: https[2],
      branch: https[4] || null,
      url: `https://github.com/${https[1]}/${https[2]}.git`,
    };
  }

  return null;
}

/**
 * Check whether a git binary is available on this machine.
 */
async function isGitAvailable() {
  try {
    await execFileAsync('git', ['--version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Shallow clone a GitHub repository into a temporary folder.
 *
 * @param {{ url: string, branch: string|null }} repo
 * @returns {Promise<string>} absolute path of the clone
 */
async function cloneRepo(repo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebuildbot-'));

  const args = [
    '-c',
    'core.longpaths=true', // Windows cannot create files with very long paths
    'clone',
    '--depth',
    '1',
    '--single-branch',
    '--quiet',
  ];
  if (repo.branch) args.push('--branch', repo.branch);
  args.push(repo.url, dir);

  try {
    await execFileAsync('git', args, {
      timeout: CLONE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    });
  } catch (err) {
    fs.rmSync(dir, { recursive: true, force: true });
    const stderr = (err.stderr || err.message || '').toString();

    if (/not found|does not exist|repository not found/i.test(stderr)) {
      throw new Error(`Repository not found: ${repo.url}`);
    }
    if (/authentication|permission denied|private/i.test(stderr)) {
      throw new Error(`Cannot access ${repo.url}. Private repos are not supported.`);
    }
    if (/timed out/i.test(stderr)) {
      throw new Error('Clone timed out. The repository may be too large.');
    }
    throw new Error(`Could not clone ${repo.url}. ${stderr.split('\n')[0] || 'git failed'}`);
  }

  return dir;
}

/**
 * Remove a temporary clone.
 */
function cleanupClone(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

module.exports = { parseGithubUrl, cloneRepo, cleanupClone, isGitAvailable };
