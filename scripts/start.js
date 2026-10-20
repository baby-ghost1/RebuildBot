#!/usr/bin/env node
/**
 * Production server launcher.
 *
 * Uses the PORT environment variable when it is set, and falls back to 5000
 * locally. This is what makes the app work unchanged on Render, Railway,
 * Fly.io, Heroku and Docker, all of which inject their own PORT.
 */

const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const port = process.env.PORT || '5000';

const child = spawn(process.execPath, [nextBin, 'start', '-p', port], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
