const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

describe('RebuildBot - Buildathon checklist', () => {
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

  test('Analyzer detects hardcoded local paths in any source folder', () => {
    const fs2 = require('fs');
    const os = require('os');
    const path2 = require('path');
    const analyzer = require('../lib/analyzer.js');
    const run = analyzer.default ? analyzer.default : analyzer;

    const tmp = fs2.mkdtempSync(path2.join(os.tmpdir(), 'rebuildbot-test-'));
    try {
      // Simulate a project with a hardcoded Windows user path inside src/
      fs2.mkdirSync(path2.join(tmp, 'src'), { recursive: true });
      fs2.writeFileSync(
        path2.join(tmp, 'src', 'index.js'),
        'const p = "C:\\\\Users\\\\someone\\\\Desktop\\\\project";\n'
      );

      const report = run(tmp);
      const check = report.checks.find((c) => c.id === 'no-hardcoded-paths');
      expect(check.pass).toBe(false);
      expect(check.detail).toMatch(/src\/index\.js/);
    } finally {
      fs2.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('Self-hosted fonts are present and not excluded from the build', () => {
    const fontsDir = path.join(projectRoot, 'app', 'fonts');
    ['inter-latin.woff2', 'space-grotesk-latin.woff2', 'jetbrains-mono-latin.woff2'].forEach((f) => {
      const file = path.join(fontsDir, f);
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
    });

    // The fonts must not be excluded by .dockerignore or .gitignore,
    // otherwise the offline Docker build would fail to find them.
    const dockerignore = fs.readFileSync(path.join(projectRoot, '.dockerignore'), 'utf8');
    expect(dockerignore).not.toMatch(/^\s*app\/fonts/im);
    const gitignore = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
    expect(gitignore).not.toMatch(/^\s*app\/fonts/im);
  });

  test('Fonts are wired through next/font/local in the layout', () => {
    const fontsJs = fs.readFileSync(path.join(projectRoot, 'app', 'fonts', 'fonts.js'), 'utf8');
    expect(fontsJs).toMatch(/localFont/);
    expect(fontsJs).toMatch(/--font-inter/);
    expect(fontsJs).toMatch(/--font-space/);
    expect(fontsJs).toMatch(/--font-jetbrains/);

    const layout = fs.readFileSync(path.join(projectRoot, 'app', 'layout.js'), 'utf8');
    expect(layout).toMatch(/fontVariables/);
  });

  test('Health route exists and is never cached', () => {
    const route = path.join(projectRoot, 'app', 'api', 'health', 'route.js');
    expect(fs.existsSync(route)).toBe(true);
    const content = fs.readFileSync(route, 'utf8');
    // A cached response would not count as a real invocation, so the route
    // must always be dynamic and must send no-store headers.
    expect(content).toMatch(/force-dynamic/);
    expect(content).toMatch(/no-store/);
  });

  test('Keep-alive script exists and targets the health route', () => {
    const script = path.join(projectRoot, 'scripts', 'keepalive.js');
    expect(fs.existsSync(script)).toBe(true);
    const content = fs.readFileSync(script, 'utf8');
    expect(content).toMatch(/api\/health/);
    expect(content).toMatch(/KEEPALIVE_INTERVAL/);
  });

  test('The frontend sends a heartbeat to the health route', () => {
    const page = fs.readFileSync(path.join(projectRoot, 'app', 'page.js'), 'utf8');
    expect(page).toMatch(/\/api\/health/);
  });

  test('The analyze route scores the deployment own repository when input is empty', () => {
    const route = path.join(projectRoot, 'app', 'api', 'analyze', 'route.js');
    const content = fs.readFileSync(route, 'utf8');
    // On a serverless host the working folder only has the compiled bundle,
    // so the route must fall back to the GitHub repository it was built from.
    expect(content).toMatch(/VERCEL_GIT_REPO_OWNER/);
    expect(content).toMatch(/VERCEL_GIT_REPO_SLUG/);
    expect(content).toMatch(/SELF_REPO_URL/);
    expect(content).toMatch(/isSelf/);
  });

  test('Memory source scores a folder uploaded from the browser', () => {
    const { createMemorySource } = require('../lib/source.js');
    const { analyzeSource } = require('../lib/analyzer.js');

    const files = {
      'package-lock.json': '{"lockfileVersion":3}',
      '.nvmrc': '22',
      Dockerfile: 'FROM node:22-slim\n',
      'package.json': JSON.stringify({ name: 'x', scripts: { test: 'jest' } }),
      'README.md': 'npm test\n',
      '.env.example': 'PORT=5000\n',
      '.gitignore': 'node_modules\n',
      '.dockerignore': 'node_modules\n',
      'src/index.js': 'export const ok = true;\n',
    };

    const report = analyzeSource(createMemorySource(files, 'demo', true), {
      display: 'demo',
      source: 'browser',
    });

    expect(report.source).toBe('browser');
    expect(report.repoPath).toBe('demo');
    expect(report.score).toBe(100);
    expect(report.passed).toBe(report.total);
  });

  test('Memory source flags a hardcoded local path', () => {
    const { createMemorySource } = require('../lib/source.js');
    const { analyzeSource } = require('../lib/analyzer.js');

    const files = {
      'package.json': JSON.stringify({ name: 'x', scripts: { test: 'jest' } }),
      'src/index.js': 'const p = "C:\\\\Users\\\\someone\\\\Desktop\\\\x";\n',
    };

    const report = analyzeSource(createMemorySource(files, 'demo'), { source: 'browser' });
    const check = report.checks.find((c) => c.id === 'no-hardcoded-paths');
    expect(check.pass).toBe(false);
    expect(check.detail).toMatch(/src\/index\.js/);
  });

  test('The analyze route accepts a browser uploaded file map', () => {
    const route = path.join(projectRoot, 'app', 'api', 'analyze', 'route.js');
    const content = fs.readFileSync(route, 'utf8');
    expect(content).toMatch(/createMemorySource/);
    expect(content).toMatch(/analyzeSource/);
    expect(content).toMatch(/body\.files/);
  });

  test('The frontend offers a local folder picker', () => {
    const page = fs.readFileSync(path.join(projectRoot, 'app', 'page.js'), 'utf8');
    expect(page).toMatch(/webkitdirectory/);
    expect(page).toMatch(/handleFolderPick/);
    expect(page).toMatch(/FolderOpen/);
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

  test('GitHub URL parser accepts the common repository URL forms', () => {
    const { parseGithubUrl } = require('../lib/github.js');

    const plain = parseGithubUrl('https://github.com/baby-ghost1/RebuildBot');
    expect(plain).toEqual({
      owner: 'baby-ghost1',
      repo: 'RebuildBot',
      branch: null,
      url: 'https://github.com/baby-ghost1/RebuildBot.git',
    });

    expect(parseGithubUrl('https://github.com/owner/repo.git').repo).toBe('repo');
    expect(parseGithubUrl('http://github.com/owner/repo').owner).toBe('owner');
    expect(parseGithubUrl('https://www.github.com/owner/repo').owner).toBe('owner');
    expect(parseGithubUrl('git@github.com:owner/repo.git').url).toBe(
      'https://github.com/owner/repo.git'
    );

    const branch = parseGithubUrl('https://github.com/owner/repo/tree/dev');
    expect(branch.branch).toBe('dev');
    expect(branch.url).toBe('https://github.com/owner/repo.git');
  });

  test('GitHub URL parser rejects anything that is not a GitHub repo', () => {
    const { parseGithubUrl } = require('../lib/github.js');
    expect(parseGithubUrl('')).toBeNull();
    expect(parseGithubUrl('C:\\projects\\my-app')).toBeNull();
    expect(parseGithubUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGithubUrl('https://evil.com/owner/repo')).toBeNull();
    expect(parseGithubUrl('not a url')).toBeNull();
  });

  test('The analyze route module loads without errors', () => {
    const fs2 = require('fs');
    const path2 = require('path');
    const route = path2.join(projectRoot, 'app', 'api', 'analyze', 'route.js');
    expect(fs2.existsSync(route)).toBe(true);
    const content = fs2.readFileSync(route, 'utf8');
    expect(content).toMatch(/parseGithubUrl/);
    expect(content).toMatch(/cloneRepo/);
    expect(content).toMatch(/cleanupClone/);
  });

  test('Docker image includes git so GitHub URLs can be cloned', () => {
    const content = fs.readFileSync(path.join(projectRoot, 'Dockerfile'), 'utf8');
    expect(content).toMatch(/apt-get install[^\n]*\bgit\b/);
  });

  test('Analyzer throws a clear error for a missing path', () => {
    const analyzer = require('../lib/analyzer.js');
    const run = analyzer.default ? analyzer.default : analyzer;
    expect(() => run('this-folder-does-not-exist-12345')).toThrow(/Path not found/);
  });

  test('Analyzer resolves relative paths to an absolute path', () => {
    const analyzer = require('../lib/analyzer.js');
    const run = analyzer.default ? analyzer.default : analyzer;
    const report = run('.');
    expect(path.isAbsolute(report.repoPath)).toBe(true);
    expect(report.repoPath).toBe(path.resolve(projectRoot));
  });

  test('Analyzer reports every checklist item as passing', () => {
    const analyzer = require('../lib/analyzer.js');
    const report = analyzer.default ? analyzer.default(projectRoot) : analyzer(projectRoot);
    const failed = report.checks.filter((c) => !c.pass).map((c) => c.id);
    expect(failed).toEqual([]);
    expect(report.verdict).toMatch(/Perfect/i);
  });
});
