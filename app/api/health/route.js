import { NextResponse } from 'next/server';

// Never cache this route. A cached response would not count as a real
// invocation, so the host would still consider the app idle.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const startedAt = Date.now();

/**
 * Lightweight health probe.
 *
 * Used to keep free-tier hosts awake. It does almost no work so it responds
 * in a few milliseconds, and it always sends no-store headers so the request
 * actually reaches the app instead of being served from a cache.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'rebuildbot',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
