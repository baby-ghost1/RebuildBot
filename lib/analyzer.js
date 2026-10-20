const fs = require('fs');
const path = require('path');
const { createLocalSource } = require('./source.js');

/**
 * Detect whether we are running inside a container.
 * Checks several signals because /.dockerenv is not present in every
 * Docker runtime (containerd, Podman, WSL2 backed engines).
 */
function isContainer() {
  if (fs.existsSync('/.dockerenv')) return true;
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    if (/docker|containerd|kubepods|podman|lxc/.test(cgroup)) return true;
  } catch {
    /* not linux or no permission */
  }
  try {
    const mounts = fs.readFileSync('/proc/self/mountinfo', 'utf8');
    if (/docker|overlay|containerd/.test(mounts)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Analyze a repository directory and return a rebuild-readiness report.
 * Checks the Buildathon checklist items and produces a score.
 *
 * @param {string} dir  Path to the repository folder
 * @param {object} [options]
 * @param {string} [options.display]  Label to show in the report instead of the raw path
 * @param {string} [options.source]  'local' or 'github'
 * @param {boolean} [options.isSelf]  true when this is the deployment's own repo
 * @param {string} [options.baseDir]  Base directory used to resolve relative paths
 * @throws {Error} when the path does not exist or is not a directory
 */
function analyzeRepo(dir, options = {}) {
  const { display, source: sourceKind = 'local', isSelf = false, baseDir } =
    typeof options === 'string' ? { baseDir: options } : options;

  // Resolve relative paths against the project root so "." or "src" work
  const resolved = path.resolve(baseDir || process.cwd(), dir);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Not a folder: ${resolved}`);
  }

  return analyzeSource(createLocalSource(resolved), {
    display: display || resolved,
    source: sourceKind,
    isSelf,
    resolvedPath: resolved,
  });
}

/**
 * Run the checklist against any source: a folder on disk, a cloned GitHub
 * repository, or a folder the user picked in their browser.
 *
 * @param {{ exists: Function, read: Function, list: Function }} source
 * @param {object} [options]
 */
function analyzeSource(source, options = {}) {
  const { display, source: sourceKind = 'local', isSelf = false, resolvedPath = null } = options;

  const checks = [];

  // 1. Lockfile exists
  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'uv.lock', 'Cargo.lock', 'go.sum'];
  const lockfileFound = lockfiles.find((f) => source.exists(f));
  checks.push({
    id: 'lockfile',
    label: 'Lockfile present (exact dependency versions)',
    pass: !!lockfileFound,
    detail: lockfileFound || 'No lockfile found - run "npm install" to create package-lock.json',
  });

  // 2. Language version pinned
  const versionFiles = ['.nvmrc', '.python-version', 'go.mod', 'rust-toolchain.toml'];
  const versionFound = versionFiles.find((f) => source.exists(f));
  checks.push({
    id: 'version-pin',
    label: 'Language version pinned (.nvmrc / .python-version / go.mod)',
    pass: !!versionFound,
    detail: versionFound || 'No version pin file found - add .nvmrc',
  });

  // 3. Dockerfile exists
  const hasDockerfile = source.exists('Dockerfile');
  checks.push({
    id: 'dockerfile',
    label: 'Dockerfile present',
    pass: hasDockerfile,
    detail: hasDockerfile ? 'Dockerfile found' : 'No Dockerfile - judges cannot rebuild without it',
  });

  // 4. Dockerfile uses correct Node base image
  let baseImageOk = false;
  if (hasDockerfile) {
    const dockerContent = source.read('Dockerfile');
    baseImageOk = /FROM\s+node:22-slim/.test(dockerContent);
    checks.push({
      id: 'docker-base',
      label: 'Dockerfile uses node:22-slim base image',
      pass: baseImageOk,
      detail: baseImageOk ? 'Correct base image' : 'Dockerfile does not use node:22-slim',
    });
  } else {
    checks.push({ id: 'docker-base', label: 'Dockerfile uses node:22-slim base image', pass: false, detail: 'Skipped - no Dockerfile' });
  }

  // 5. Offline test command works (check for a test script)
  let hasTestScript = false;
  if (source.exists('package.json')) {
    try {
      const pkg = JSON.parse(source.read('package.json'));
      hasTestScript = !!(pkg.scripts && pkg.scripts.test);
      checks.push({
        id: 'test-command',
        label: 'One test command (npm test) defined',
        pass: hasTestScript,
        detail: hasTestScript ? `Test script: "${pkg.scripts.test}"` : 'No "test" script in package.json',
      });
    } catch {
      checks.push({ id: 'test-command', label: 'One test command (npm test) defined', pass: false, detail: 'package.json could not be parsed' });
    }
  } else {
    checks.push({ id: 'test-command', label: 'One test command (npm test) defined', pass: false, detail: 'No package.json found' });
  }

  // 6. README.md exists
  const hasReadme = source.exists('README.md');
  checks.push({
    id: 'readme',
    label: 'README.md present with setup / run / test instructions',
    pass: hasReadme,
    detail: hasReadme ? 'README.md found' : 'No README.md - judges will not know how to run it',
  });

  // 7. .env.example exists
  const hasEnvExample = source.exists('.env.example');
  checks.push({
    id: 'env-example',
    label: '.env.example present (no secrets in code)',
    pass: hasEnvExample,
    detail: hasEnvExample ? '.env.example found' : 'No .env.example - add one listing needed env vars',
  });

  // 8. No hardcoded local paths.
  //    Scans every common source folder so it works for any project
  //    layout, not just the one this repo happens to use.
  let hardcodedPath = false;
  let hardcodedWhere = '';
  const sourceDirs = ['app', 'src', 'lib', 'server', 'client', 'components', 'pages'];
  const sourceFiles = ['index.js', 'index.ts', 'index.tsx', 'main.js', 'main.ts', 'app.js', 'app.ts'];

  const looksLikeLocalPath = (content) =>
    /[A-Za-z]:\\+Users\\+/i.test(content) || /\/Users\/[a-z0-9_-]+\//i.test(content);

  const allFiles = source.list();
  const candidates = allFiles.filter((rel) => {
    if (rel.includes('node_modules/') || rel.split('/').some((s) => s.startsWith('.'))) {
      // keep dotfiles that matter, skip the rest
      const base = rel.split('/').pop();
      return ['.nvmrc', '.env.example', '.dockerignore', '.gitignore'].includes(base);
    }
    const top = rel.split('/')[0];
    const isSourceDir = sourceDirs.includes(top) && rel.includes('/');
    const isRootSource = sourceFiles.includes(rel);
    const isCode = /\.(js|jsx|ts|tsx|mjs|cjs|json|py|go|rs|java|rb|php)$/.test(rel);
    return (isSourceDir || isRootSource) && isCode;
  });

  for (const rel of candidates) {
    const content = source.read(rel);
    if (content && looksLikeLocalPath(content)) {
      hardcodedPath = true;
      if (!hardcodedWhere) hardcodedWhere = rel;
      break;
    }
  }

  checks.push({
    id: 'no-hardcoded-paths',
    label: 'No hardcoded local paths (Windows or macOS user folders)',
    pass: !hardcodedPath,
    detail: hardcodedPath
      ? `Hardcoded local path found in ${hardcodedWhere}`
      : 'Clean - no hardcoded paths',
  });

  // 9. Git initialized.
  //    Inside the Docker image there is no .git (it is excluded by
  //    .dockerignore on purpose), so this check is skipped there.
  const hasGit = source.exists('.git') || source.hasGit === true;
  const inContainer = isContainer();
  checks.push({
    id: 'git',
    label: 'Git repository initialized',
    pass: hasGit || inContainer,
    detail: hasGit
      ? 'Git repo found'
      : inContainer
        ? 'Skipped - running inside a Docker image (no .git by design)'
        : 'Not a git repo - run "git init"',
  });

  // 10. .dockerignore present (keeps host node_modules out of the image)
  const hasDockerignore = source.exists('.dockerignore');
  checks.push({
    id: 'dockerignore',
    label: '.dockerignore present (host node_modules excluded from image)',
    pass: hasDockerignore,
    detail: hasDockerignore ? '.dockerignore found' : 'No .dockerignore - the host node_modules will break the Linux image build',
  });

  // 11. .gitignore present
  const hasGitignore = source.exists('.gitignore');
  checks.push({
    id: 'gitignore',
    label: '.gitignore present (node_modules and .env never committed)',
    pass: hasGitignore,
    detail: hasGitignore ? '.gitignore found' : 'No .gitignore - node_modules and secrets may get committed',
  });

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  let verdict;
  if (score === 100) verdict = 'Perfect - judges will rebuild this first try.';
  else if (score >= 75) verdict = 'Good - fix the failing items before submitting.';
  else if (score >= 50) verdict = 'Needs work - several checklist items missing.';
  else verdict = 'Not rebuildable yet - judges cannot run this offline.';

  return {
    repoPath: display || resolvedPath,
    resolvedPath,
    source: sourceKind,
    isSelf,
    score,
    passed,
    total,
    verdict,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = analyzeRepo;
module.exports.analyzeRepo = analyzeRepo;
module.exports.analyzeSource = analyzeSource;
module.exports.default = analyzeRepo;
