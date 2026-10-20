#!/usr/bin/env node
/**
 * RebuildBot server supervisor.
 *
 * Keeps the Next.js server running until you explicitly stop it.
 * If the server crashes it is restarted automatically.
 *
 * Usage:
 *   node scripts/serve.js start     start (or keep running) the server
 *   node scripts/serve.js stop      stop the server
 *   node scripts/serve.js status    show whether it is running
 *   node scripts/serve.js restart   stop then start again
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pidFile = path.join(root, '.server.pid');
const childPidFile = path.join(root, '.server.child.pid');
const logFile = path.join(root, '.server.log');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const mode = process.argv[2] || 'start';
const daemon = process.argv.includes('--daemon');
const port = process.env.PORT || '5000';
const dev = process.env.SERVE_MODE === 'dev' || process.argv.includes('dev');

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid() {
  try {
    return Number(fs.readFileSync(pidFile, 'utf8').trim());
  } catch {
    return null;
  }
}

function stopServer() {
  // Kill the Next.js child first (and its whole tree on Windows),
  // otherwise it keeps running and corrupting the .next folder.
  const childPid = readChildPid();
  if (childPid && isAlive(childPid)) {
    killTree(childPid);
    console.log(`Server process stopped (pid ${childPid}).`);
  }
  if (fs.existsSync(childPidFile)) fs.unlinkSync(childPidFile);

  const pid = readPid();
  if (pid && isAlive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
    console.log(`Supervisor stopped (pid ${pid}).`);
  }
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  console.log('Server is stopped.');
}

function readChildPid() {
  try {
    return Number(fs.readFileSync(childPidFile, 'utf8').trim());
  } catch {
    return null;
  }
}

/**
 * Kill a process and everything it spawned.
 * On Windows `taskkill /T` takes down the whole tree.
 */
function killTree(pid) {
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
    } else {
      process.kill(-pid, 'SIGKILL');
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* ignore */
    }
  }
}

function status() {
  const pid = readPid();
  if (pid && isAlive(pid)) {
    console.log(`Server is RUNNING (pid ${pid}) on http://localhost:${port}`);
  } else {
    console.log('Server is NOT running.');
  }
}

function startServer() {
  const existing = readPid();
  if (existing && isAlive(existing)) {
    console.log(`Server already running (pid ${existing}) on http://localhost:${port}`);
    return;
  }

  // Spawn a detached copy of this script so the server survives the
  // terminal being closed. The parent returns immediately.
  if (!daemon) {
    const out = fs.openSync(logFile, 'a');
    const child = spawn(
      process.execPath,
      [__filename, 'start', ...(dev ? ['dev'] : []), '--daemon'],
      { cwd: root, detached: true, stdio: ['ignore', out, out], windowsHide: true }
    );
    child.unref();

    // Wait for the daemon to write its pid file
    const started = Date.now();
    while (Date.now() - started < 15000) {
      const pid = readPid();
      if (pid && isAlive(pid)) {
        console.log(`Server started (pid ${pid}) on http://localhost:${port}`);
        console.log(`Logs: ${logFile}`);
        console.log('Stop with: npm run serve:stop');
        return;
      }
      spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},200)']);
    }
    console.log('Server did not report back in time. Check the log file.');
    return;
  }

  fs.writeFileSync(pidFile, String(process.pid));
  const log = daemon ? null : fs.createWriteStream(logFile, { flags: 'a' });
  if (log) log.write(`\n===== supervisor started ${new Date().toISOString()} =====\n`);

  let child = null;
  let stopping = false;
  let restarts = 0;

  const spawnChild = () => {
    const args = dev
      ? [nextBin, 'dev', '-p', port]
      : [nextBin, 'start', '-p', port];

    child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || '.next' },
    });

    // Remember the child pid so "npm run serve:stop" can kill the tree
    try {
      fs.writeFileSync(childPidFile, String(child.pid));
    } catch {
      /* ignore */
    }

    child.stdout.on('data', (d) => {
      if (log) log.write(d);
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      if (log) log.write(d);
      process.stderr.write(d);
    });

    child.on('exit', (code, signal) => {
      if (stopping) return;
      restarts += 1;
      const msg = `\n[supervisor] server exited (code=${code}, signal=${signal}). Restart #${restarts} in 2s...\n`;
      if (log) log.write(msg);
      process.stdout.write(msg);
      setTimeout(spawnChild, 2000);
    });

    child.on('error', (err) => {
      const msg = `\n[supervisor] failed to start: ${err.message}\n`;
      if (log) log.write(msg);
      process.stderr.write(msg);
    });
  };

  spawnChild();

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    if (child) child.kill();
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    console.log('\n[supervisor] server stopped.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', () => {
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch {
        /* ignore */
      }
    }
  });

  console.log(
    `[supervisor] ${dev ? 'dev' : 'production'} server starting on http://localhost:${port}\n` +
      `[supervisor] logs: ${logFile}\n` +
      `[supervisor] stop with: npm run serve:stop`
  );
}

if (mode === 'stop') stopServer();
else if (mode === 'status') status();
else if (mode === 'restart') {
  stopServer();
  setTimeout(startServer, 1500);
} else startServer();
