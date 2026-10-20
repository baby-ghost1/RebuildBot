const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

describe('RebuildBot — Buildathon checklist', () => {
  test('Dockerfile exists and uses node:22-slim', () => {
    const dockerPath = path.join(projectRoot, 'Dockerfile');
    expect(fs.existsSync(dockerPath)).toBe(true);
    const content = fs.readFileSync(dockerPath, 'utf8');
    expect(content).toMatch(/FROM\s+node:22-slim/);
  });

  test('package-lock.json exists (exact dependency versions)', () => {
    const lockPath = path.join(projectRoot, 'package-lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  test('.nvmrc pins Node 22', () => {
    const nvmrc = path.join(projectRoot, '.nvmrc');
    expect(fs.existsSync(nvmrc)).toBe(true);
    expect(fs.readFileSync(nvmrc, 'utf8').trim()).toBe('22');
  });

  test('README.md exists with setup instructions', () => {
    const readme = path.join(projectRoot, 'README.md');
    expect(fs.existsSync(readme)).toBe(true);
    const content = fs.readFileSync(readme, 'utf8');
    expect(content).toContain('npm test');
  });

  test('.env.example exists (no secrets in code)', () => {
    const envExample = path.join(projectRoot, '.env.example');
    expect(fs.existsSync(envExample)).toBe(true);
  });

  test('package.json defines a test script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.test).toContain('jest');
  });

  test('No hardcoded user paths in app/', () => {
    const appDir = path.join(projectRoot, 'app');
    const walk = (dir) => {
      let found = false;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (walk(full)) found = true;
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          if (/C:\\Users\\|\/Users\/[a-z]+\//.test(content)) found = true;
        }
      }
      return found;
    };
    expect(walk(appDir)).toBe(false);
  });

  test('Next.js app structure exists', () => {
    expect(fs.existsSync(path.join(projectRoot, 'app', 'page.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'app', 'layout.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'app', 'api', 'analyze', 'route.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'lib', 'analyzer.js'))).toBe(true);
  });

  test('.dockerignore excludes node_modules and .env', () => {
    const dockerignore = path.join(projectRoot, '.dockerignore');
    expect(fs.existsSync(dockerignore)).toBe(true);
    const content = fs.readFileSync(dockerignore, 'utf8');
    expect(content).toMatch(/^node_modules/m);
    expect(content).toMatch(/^\.env$/m);
  });

  test('.gitignore excludes node_modules and .env', () => {
    const gitignore = path.join(projectRoot, '.gitignore');
    expect(fs.existsSync(gitignore)).toBe(true);
    const content = fs.readFileSync(gitignore, 'utf8');
    expect(content).toMatch(/node_modules/);
    expect(content).toMatch(/\.env/);
  });

  test('Dockerfile installs from the lockfile with npm ci', () => {
    const content = fs.readFileSync(path.join(projectRoot, 'Dockerfile'), 'utf8');
    expect(content).toMatch(/COPY\s+package\.json\s+package-lock\.json/);
    expect(content).toMatch(/RUN\s+npm\s+ci/);
  });

  test('package.json declares engines.node and a start script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    expect(pkg.engines.node).toBeDefined();
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });

  test('Analyzing this project yields a perfect score', () => {
    const analyzer = require('../lib/analyzer.js');
    const report = analyzer.default ? analyzer.default(projectRoot) : analyzer(projectRoot);
    // Inside the Docker image the .git directory is intentionally absent,
    // and the analyzer marks that check as skipped-but-passing, so the
    // score is still 100 in both environments.
    expect(report.score).toBe(100);
    expect(report.passed).toBe(report.total);
  });

  test('Analyzer reports every checklist item as passing', () => {
    const analyzer = require('../lib/analyzer.js');
    const report = analyzer.default ? analyzer.default(projectRoot) : analyzer(projectRoot);
    const failed = report.checks.filter((c) => !c.pass).map((c) => c.id);
    expect(failed).toEqual([]);
    expect(report.verdict).toMatch(/Perfect/i);
  });
});
