'use client';

import { useEffect } from 'react';
import { TriangleAlert, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Keep the real reason in the console for debugging
    console.error('RebuildBot error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] px-6">
      <div className="w-full max-w-lg rounded-2xl border border-rose-300/60 bg-white/80 p-8 shadow-soft backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <TriangleAlert className="h-6 w-6" strokeWidth={2.2} />
        </div>

        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-[#0B132B]">
          Something went wrong
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#3D4560]">
          The page hit an unexpected error. The details below tell you exactly what failed.
        </p>

        <pre className="mt-5 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-rose-200 bg-rose-50 p-4 font-mono text-[12px] leading-relaxed text-rose-800">
          {error?.message || 'Unknown error'}
        </pre>

        {error?.digest && (
          <p className="mt-2 font-mono text-[11px] text-rose-500">Digest: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-5 py-2.5 text-[13px] font-bold text-[#39FF88] transition hover:-translate-y-0.5 hover:bg-[#111c3a]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[#0B132B]/12 bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0B132B] transition hover:border-[#0B132B]/30"
          >
            <Home className="h-4 w-4" strokeWidth={2.2} />
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
