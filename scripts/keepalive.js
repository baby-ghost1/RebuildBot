#!/usr/bin/env node
/**
 * Keep-alive pinger.
 *
 * Free tier hosts such as Render put an idle app to sleep after a few
 * minutes, and the first visitor then waits for a cold start. A small
 * external ping loop stops that.
 *
 * Usage:
 *   node scripts/keepalive.js https://rebuildbot.vercel.app
 *   KEEPALIVE_URL=https://... KEEPALIVE_INTERVAL=5 node scripts/keepalive.js
 *
 * Options:
 *   --once      ping a single time and exit (good for a cron job)
 *   --interval  minutes between pings (default 5)
 */

const args = process.argv.slice(2);
const once = args.includes('--once');

const intervalIndex = args.indexOf('--interval');
const intervalMinutes =
  intervalIndex !== -1 && args[intervalIndex + 1]
    ? Number(args[intervalIndex + 1])
    : Number(process.env.KEEPALIVE_INTERVAL || 5);

// Collect the plain URL argument, skipping flags and their values
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--interval') {
    i += 1; // skip the value that follows the flag
    continue;
  }
  if (args[i].startsWith('--')) continue;
  positional.push(args[i]);
}

const url = (positional[0] || process.env.KEEPALIVE_URL || '').replace(/\/+$/, '');

if (!url) {
  console.error('Usage: node scripts/keepalive.js <url> [--once] [--interval minutes]');
  process.exit(1);
}

const endpoint = `${url}/api/health`;
const INTERVAL = Math.max(1, intervalMinutes) * 60 * 1000;

async function ping() {
  try {
    const started = Date.now();
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'rebuildbot-keepalive' },
      signal: AbortSignal.timeout(20_000),
    });
    const ms = Date.now() - started;
    console.log(
      `[keepalive] ${new Date().toISOString()} -> ${res.status} in ${ms}ms`
    );
    return res.ok;
  } catch (err) {
    console.log(`[keepalive] ${new Date().toISOString()} -> FAILED (${err.message})`);
    return false;
  }
}

(async () => {
  await ping();
  if (once) process.exit(0);

  console.log(`[keepalive] pinging ${endpoint} every ${intervalMinutes} minute(s). Ctrl+C to stop.`);
  setInterval(ping, INTERVAL);
})();
