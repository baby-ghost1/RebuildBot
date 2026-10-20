#!/usr/bin/env node
/**
 * Dev server launcher.
 *
 * Uses a separate build folder (.next-dev) so it can run at the same time
 * as the production server (npm run serve) without corrupting either build.
 */

const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextBin, 'dev', '-p', process.env.DEV_PORT || '5173'], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: false,
  env: { ...process.env, NEXT_DIST_DIR: '.next-dev' },
});

child.on('exit', (code) => process.exit(code ?? 0));
