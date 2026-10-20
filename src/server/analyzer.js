import fs from 'fs';
import path from 'path';

/**
 * Analyze a repository directory and return a rebuild-readiness report.
 * Checks the Buildathon checklist items and produces a score.
 */
export default function analyzeRepo(dir) {
  const checks = [];

  // 1. Lockfile exists
  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'uv.lock', 'Cargo.lock', 'go.sum'];
  const lockfileFound = lockfiles.find((f) => fs.existsSync(path.join(dir, f)));
  checks.push({
    id: 'lockfile',
    label: 'Lockfile present (exact dependency versions)',
    pass: !!lockfileFound,
    detail: lockfileFound || 'No lockfile found — run "npm install" to create package-lock.json',
  });

  // 2. Language version pinned
  const versionFiles = ['.nvmrc', '.python-version', 'go.mod', 'rust-toolchain.toml'];
  const versionFound = versionFiles.find((f) => fs.existsSync(path.join(dir, f)));
  checks.push({
    id: 'version-pin',
    label: 'Language version pinned (.nvmrc / .python-version / go.mod)',
    pass: !!versionFound,
    detail: versionFound || 'No version pin file found — add .nvmrc',
  });

  // 3. Dockerfile exists
  const dockerfilePath = path.join(dir, 'Dockerfile');
  const hasDockerfile = fs.existsSync(dockerfilePath);
  checks.push({
    id: 'dockerfile',
    label: 'Dockerfile present',
    pass: hasDockerfile,
    detail: hasDockerfile ? 'Dockerfile found' : 'No Dockerfile — judges cannot rebuild without it',
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
    checks.push({ id: 'docker-base', label: 'Dockerfile uses node:22-slim base image', pass: false, detail: 'Skipped — no Dockerfile' });
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
    detail: hasReadme ? 'README.md found' : 'No README.md — judges will not know how to run it',
  });

  // 7. .env.example exists
  const hasEnvExample = fs.existsSync(path.join(dir, '.env.example'));
  checks.push({
    id: 'env-example',
    label: '.env.example present (no secrets in code)',
    pass: hasEnvExample,
    detail: hasEnvExample ? '.env.example found' : 'No .env.example — add one listing needed env vars',
  });

  // 8. No hardcoded local paths
  let hardcodedPath = false;
  const srcDir = path.join(dir, 'src');
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
    detail: hardcodedPath ? 'Hardcoded path found in src/' : 'Clean — no hardcoded paths',
  });

  // 9. Git initialized
  const hasGit = fs.existsSync(path.join(dir, '.git'));
  checks.push({
    id: 'git',
    label: 'Git repository initialized',
    pass: hasGit,
    detail: hasGit ? 'Git repo found' : 'Not a git repo — run "git init"',
  });

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  let verdict;
  if (score === 100) verdict = 'Perfect — judges will rebuild this first try.';
  else if (score >= 75) verdict = 'Good — fix the failing items before submitting.';
  else if (score >= 50) verdict = 'Needs work — several checklist items missing.';
  else verdict = 'Not rebuildable yet — judges cannot run this offline.';

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
