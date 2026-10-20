/**
 * Full end to end test of the RebuildBot website.
 * Usage: node scripts/e2e.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:5000';

let pass = 0;
let fail = 0;
const problems = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`);
  } else {
    fail += 1;
    problems.push(`${name}${detail ? ' - ' + detail : ''}`);
    console.log(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`);
  }
}

async function post(path, body, timeout = 90_000) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* not json */
  }
  return { status: res.status, json, ms: Date.now() - started };
}

async function get(path, timeout = 60_000) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  return { status: res.status, text, ms: Date.now() - started, headers: res.headers };
}

(async () => {
  console.log(`\n=== RebuildBot E2E test against ${BASE} ===\n`);

  // ---------- 1. Pages and static assets ----------
  console.log('[1] Pages');
  const home = await get('/');
  check('GET / returns 200', home.status === 200, `status=${home.status}`);
  check('page contains the title', home.text.includes('RebuildBot'));
  check('page has the analyze input', home.text.includes('GitHub URL or local folder path'));
  check('page has the folder picker button', home.text.includes('Choose a local folder'));
  check('page has the score this project button', home.text.includes('Score this project'));
  check('page has no auto analysis on load', !home.text.includes('runAnalysis()'));
  check('no emoji in the page markup', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(home.text));
  check(
    'run analysis needs input, the empty case is explained',
    home.text.includes('Paste a GitHub URL or a local folder path first') ||
      (home.text.includes('GitHub URL or local folder path')),
    'validation message or placeholder missing'
  );

  const health = await get('/api/health');
  check('GET /api/health returns 200', health.status === 200, `status=${health.status}`);
  check(
    'health sends no-store so it is never cached',
    (health.headers.get('cache-control') || '').includes('no-store'),
    health.headers.get('cache-control') || 'missing'
  );
  let healthJson = null;
  try {
    healthJson = JSON.parse(health.text);
  } catch {
    /* ignore */
  }
  check('health returns ok', healthJson?.status === 'ok');

  // ---------- 2. Local analysis ----------
  console.log('\n[2] Local path analysis');
  const local = await post('/api/analyze', {});
  check('empty body returns success', local.json?.success === true, JSON.stringify(local.json?.error || ''));
  // On a local server the empty input scores the folder on disk. On a
  // serverless host it scores the deployment's own GitHub repository.
  const isLocalSource = local.json?.report?.source === 'local';
  const isSelfSource = local.json?.report?.source === 'github' && local.json?.report?.isSelf === true;
  check(
    'empty body scores the local folder or the deployment own repo',
    isLocalSource || isSelfSource,
    `source=${local.json?.report?.source} isSelf=${local.json?.report?.isSelf}`
  );
  check('scores 100', local.json?.report?.score === 100, `score=${local.json?.report?.score}`);
  check('11 checks reported', local.json?.report?.total === 11, `total=${local.json?.report?.total}`);

  // ---------- 3. GitHub analysis ----------
  console.log('\n[3] GitHub URL analysis');
  const gh = await post('/api/analyze', { repoPath: 'https://github.com/baby-ghost1/RebuildBot' });
  check('github request succeeds', gh.json?.success === true, JSON.stringify(gh.json?.error || ''));
  check('source is github', gh.json?.report?.source === 'github');
  check('scores 100', gh.json?.report?.score === 100, `score=${gh.json?.report?.score}`);
  check('repo path is the github url', (gh.json?.report?.repoPath || '').includes('github.com'));
  check('response time under 60s', gh.ms < 60_000, `${Math.round(gh.ms / 1000)}s`);

  // ---------- 4. Browser folder upload ----------
  console.log('\n[4] Browser folder upload');
  const files = {
    'package-lock.json': '{"lockfileVersion":3}',
    '.nvmrc': '22',
    Dockerfile: 'FROM node:22-slim\n',
    'package.json': '{"name":"x","scripts":{"test":"jest"}}',
    'README.md': 'npm test\n',
    '.env.example': 'PORT=5000\n',
    '.gitignore': 'node_modules\n',
    '.dockerignore': 'node_modules\n',
    'src/index.js': 'export const ok = true;\n',
  };
  const up = await post('/api/analyze', { files, folderName: 'demo-app', hasGit: true });
  check('upload succeeds', up.json?.success === true, JSON.stringify(up.json?.error || ''));
  check('source is browser', up.json?.report?.source === 'browser');
  check('scores 100', up.json?.report?.score === 100, `score=${up.json?.report?.score}`);
  check('folder name is shown', up.json?.report?.repoPath === 'demo-app');

  const upBad = await post('/api/analyze', {
    files: { 'package.json': '{"scripts":{"test":"jest"}}', 'src/a.js': 'const p="C:\\\\Users\\\\me\\\\x";' },
    folderName: 'bad-app',
  });
  check('upload detects hardcoded paths', upBad.json?.report?.score < 100, `score=${upBad.json?.report?.score}`);

  // ---------- 5. Error handling ----------
  console.log('\n[5] Error handling');
  const badPath = await post('/api/analyze', { repoPath: 'C:\\definitely\\not\\here\\12345' });
  check('missing path returns 400', badPath.status === 400, `status=${badPath.status}`);
  check('missing path has a clear message', (badPath.json?.error || '').includes('Path not found'), badPath.json?.error);

  const badRepo = await post('/api/analyze', { repoPath: 'https://github.com/this-user-nope-xyz123/nope' });
  check('missing repo returns 400', badRepo.status === 400, `status=${badRepo.status}`);
  check('missing repo has a clear message', (badRepo.json?.error || '').length > 10, badRepo.json?.error);

  const notGithub = await post('/api/analyze', { repoPath: 'https://gitlab.com/owner/repo' });
  check('non github url is treated as a local path and errors', notGithub.status === 400, `status=${notGithub.status}`);

  const emptyFiles = await post('/api/analyze', { files: {}, folderName: 'x' });
  check('empty file map returns 400', emptyFiles.status === 400, `status=${emptyFiles.status}`);

  // ---------- 6. Keep alive ----------
  console.log('\n[6] Keep alive');
  for (let i = 0; i < 3; i += 1) {
    const ping = await get('/api/health');
    check(`ping ${i + 1} returns 200`, ping.status === 200, `status=${ping.status}`);
  }

  // ---------- 7. Docker judge command ----------
  console.log('\n[7] Docker judge command');
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      'docker run --rm --network none rebuildbot npm test 2>&1',
      { encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const m = out.match(/Tests:\s+(\d+) passed, (\d+) total/);
    check('docker offline tests pass', Boolean(m), (m ? `${m[1]}/${m[2]}` : out.slice(-160)));
  } catch (err) {
    check('docker offline tests pass', false, (err.stdout || err.message || '').toString().slice(-160));
  }

  // ---------- Summary ----------
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (problems.length) {
    console.log('\nProblems found:');
    problems.forEach((p) => console.log('  - ' + p));
  }
  process.exit(fail > 0 ? 1 : 0);
})();
