const fs = require('fs');
const path = require('path');

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
 */
function analyzeRepo(dir) {
  const checks = [];

  // 1. Lockfile exists
  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'uv.lock', 'Cargo.lock', 'go.sum'];
  const lockfileFound = lockfiles.find((f) => fs.existsSync(path.join(dir, f)));
  checks.push({
    id: 'lockfile',
    label: 'Lockfile present (exact dependency versions)',
    pass: !!lockfileFound,
    detail: lockfileFound || 'No lockfile found - run "npm install" to create package-lock.json',
  });

  // 2. Language version pinned
  const versionFiles = ['.nvmrc', '.python-version', 'go.mod', 'rust-toolchain.toml'];
  const versionFound = versionFiles.find((f) => fs.existsSync(path.join(dir, f)));
  checks.push({
    id: 'version-pin',
    label: 'Language version pinned (.nvmrc / .python-version / go.mod)',
    pass: !!versionFound,
    detail: versionFound || 'No version pin file found - add .nvmrc',
  });

  // 3. Dockerfile exists
  const dockerfilePath = path.join(dir, 'Dockerfile');
  const hasDockerfile = fs.existsSync(dockerfilePath);
  checks.push({
    id: 'dockerfile',
    label: 'Dockerfile present',
    pass: hasDockerfile,
    detail: hasDockerfile ? 'Dockerfile found' : 'No Dockerfile - judges cannot rebuild without it',
  });

  // 4. Dockerfile uses correct Node base image
  let baseImageOk = false;
  if (hasDockerfile) {
    const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
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
  const pkgPath = path.join(dir, 'package.json');
  let hasTestScript = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
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
  const hasReadme = fs.existsSync(path.join(dir, 'README.md'));
  checks.push({
    id: 'readme',
    label: 'README.md present with setup / run / test instructions',
    pass: hasReadme,
    detail: hasReadme ? 'README.md found' : 'No README.md - judges will not know how to run it',
  });

  // 7. .env.example exists
  const hasEnvExample = fs.existsSync(path.join(dir, '.env.example'));
  checks.push({
    id: 'env-example',
    label: '.env.example present (no secrets in code)',
    pass: hasEnvExample,
    detail: hasEnvExample ? '.env.example found' : 'No .env.example - add one listing needed env vars',
  });

  // 8. No hardcoded local paths
  let hardcodedPath = false;
  const srcDir = path.join(dir, 'app');
  if (fs.existsSync(srcDir)) {
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(js|jsx|ts|tsx|json)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          if (/C:\\Users\\|\/Users\/[a-z]+\//.test(content)) hardcodedPath = true;
        }
      }
    };
    try { walk(srcDir); } catch { /* ignore */ }
  }
  checks.push({
    id: 'no-hardcoded-paths',
    label: 'No hardcoded local paths (C:\\Users\\ or /Users/)',
    pass: !hardcodedPath,
    detail: hardcodedPath ? 'Hardcoded path found in app/' : 'Clean - no hardcoded paths',
  });

  // 9. Git initialized.
  //    Inside the Docker image there is no .git (it is excluded by
  //    .dockerignore on purpose), so this check is skipped there.
  const hasGit = fs.existsSync(path.join(dir, '.git'));
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
  const hasDockerignore = fs.existsSync(path.join(dir, '.dockerignore'));
  checks.push({
    id: 'dockerignore',
    label: '.dockerignore present (host node_modules excluded from image)',
    pass: hasDockerignore,
    detail: hasDockerignore ? '.dockerignore found' : 'No .dockerignore - the host node_modules will break the Linux image build',
  });

  // 11. .gitignore present
  const hasGitignore = fs.existsSync(path.join(dir, '.gitignore'));
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
    repoPath: dir,
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
module.exports.default = analyzeRepo;
