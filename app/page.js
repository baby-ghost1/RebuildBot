'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Terminal,
  CheckCircle2,
  XCircle,
  Search,
  BookOpen,
  Lightbulb,
  Gavel,
  ArrowRight,
  FolderSearch,
  FolderGit2,
  Boxes,
  ShieldCheck,
  Sparkles,
  Cpu,
  Layers,
  Copy,
  Check,
  RotateCcw,
  CircleAlert,
  FileCode2,
  Lock,
  ListChecks,
  Gauge,
  Zap,
} from 'lucide-react';

const STEPS = [
  {
    icon: FolderSearch,
    title: 'Point at a project',
    body: 'Paste the absolute path of any repo folder, for example C:\\projects\\my-app. Leave it empty to score this very project.',
  },
  {
    icon: Search,
    title: 'Run the analysis',
    body: 'RebuildBot inspects eleven Buildathon checklist items against that folder and grades each one as pass or fail.',
  },
  {
    icon: ShieldCheck,
    title: 'Read the score',
    body: 'A score of 100 means the judges can rebuild your project offline on a clean machine. Anything lower points to exactly what to fix.',
  },
];

const JUDGE_CMD = 'docker build -t rebuildbot . && docker run --rm --network none rebuildbot npm test';

export default function Home() {
  const [repoPath, setRepoPath] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: repoPath || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        setShowOnlyFailures(false);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Could not reach the API. Make sure the server is running.');
    }
    setLoading(false);
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(JUDGE_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard is blocked in this browser. Select the command and copy it manually.');
    }
  };

  const scoreTone =
    report?.score === 100
      ? 'from-[#39FF88] to-[#22d06a]'
      : report?.score >= 75
        ? 'from-[#39FF88] to-amber-400'
        : report?.score >= 50
          ? 'from-amber-400 to-orange-500'
          : 'from-orange-500 to-rose-500';

  const visibleChecks = showOnlyFailures
    ? report?.checks.filter((c) => !c.pass) ?? []
    : report?.checks ?? [];

  const failureCount = report ? report.checks.filter((c) => !c.pass).length : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#FBFAF7]" />
        <div className="absolute inset-0 grid-veil opacity-70" />
        <div className="absolute -top-56 left-1/2 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#39FF88]/22 blur-[140px]" />
        <div className="absolute -bottom-48 -right-24 h-[38rem] w-[38rem] rounded-full bg-[#0B132B]/10 blur-[130px]" />
      </div>

      {/* Top bar - branding and source only, no navbar links */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B132B] text-[#39FF88] shadow-soft">
            <Bot className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-extrabold tracking-tight text-[#0B132B]">RebuildBot</h1>
            <p className="text-[10.5px] font-medium text-[#0B132B]/50">
              Buildathon rebuild-readiness checker
            </p>
          </div>
        </div>

        <a
          href="https://github.com/baby-ghost1/RebuildBot"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-1.5 rounded-full border border-[#0B132B]/10 bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold text-[#0B132B] backdrop-blur transition hover:border-[#39FF88] hover:bg-[#39FF88]/12"
        >
          <FolderGit2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Source</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
        </a>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-14 pb-14 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#39FF88]/40 bg-[#39FF88]/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B132B]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            OmniRush Frontier Buildathon 2026
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#0B132B] sm:text-6xl">
            Know if your project{' '}
            <span className="relative inline-block">
              <span className="relative z-10">rebuilds</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 -skew-x-6 rounded-sm bg-[#39FF88]/55 sm:bottom-2 sm:h-4" />
            </span>{' '}
            before the judges do.
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[#3D4560] sm:text-base">
            Every Buildathon project is rebuilt from scratch in Docker on a clean Linux machine
            with its tests running offline. RebuildBot grades a repository against that exact
            checklist in under a second, so you can fix what matters before you submit.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#analyze"
              className="group inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-6 py-3 text-sm font-bold text-[#39FF88] shadow-lift transition hover:-translate-y-0.5 hover:bg-[#111c3a]"
            >
              <Terminal className="h-4 w-4" strokeWidth={2.4} />
              Analyze a project
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-[#0B132B]/12 bg-white/70 px-6 py-3 text-sm font-semibold text-[#0B132B] backdrop-blur transition hover:border-[#0B132B]/25 hover:bg-white"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.2} />
              How it works
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Gauge, label: '11 checks', note: 'Full Buildathon checklist' },
              { icon: Zap, label: 'Under 1s', note: 'Scores any local folder' },
              { icon: Lock, label: 'No API keys', note: 'Runs fully offline' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-[#0B132B]/8 bg-white/60 px-4 py-3 backdrop-blur"
              >
                <s.icon className="h-4 w-4 shrink-0 text-[#0B132B]/60" strokeWidth={2.1} />
                <div className="leading-tight">
                  <p className="text-[12.5px] font-bold text-[#0B132B]">{s.label}</p>
                  <p className="text-[11px] text-[#0B132B]/50">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to use */}
        <section id="how-it-works" className="scroll-mt-24 pb-16">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B132B]/45">
                Getting started
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0B132B] sm:text-3xl">
                How to use RebuildBot
              </h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#0B132B]/10 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold text-[#0B132B]/60 backdrop-blur sm:flex">
              <Cpu className="h-3.5 w-3.5" strokeWidth={2.2} />
              One command
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group relative overflow-hidden rounded-2xl border border-[#0B132B]/8 bg-white/70 p-6 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#39FF88]/60 hover:shadow-lift"
              >
                <div className="absolute right-4 top-4 font-mono text-[11px] font-bold text-[#0B132B]/25">
                  0{i + 1}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B132B] text-[#39FF88] transition group-hover:scale-105">
                  <step.icon className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <h3 className="mt-5 text-[15px] font-bold text-[#0B132B]">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#3D4560]">{step.body}</p>
              </div>
            ))}
          </div>

          {/* Worked example - light header, no heavy black bar */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#0B132B]/8 bg-white/60 shadow-soft backdrop-blur-xl">
            <div className="flex items-center gap-2.5 border-b border-[#0B132B]/8 bg-[#39FF88]/12 px-5 py-3">
              <Lightbulb className="h-4 w-4 text-[#0B132B]" strokeWidth={2.2} />
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#0B132B]">
                Worked example
              </span>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-[13px] leading-relaxed text-[#3D4560]">
                  You are shipping a project from{' '}
                  <code className="rounded-md border border-[#0B132B]/10 bg-[#0B132B]/5 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0B132B]">
                    C:\projects\my-app
                  </code>
                  . Enter that path above and press{' '}
                  <span className="font-semibold text-[#0B132B]">Run Analysis</span>. RebuildBot
                  reports the score, and every failing row names the exact file to add or fix
                  before the deadline.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[#3D4560]">
                  A 100 out of 100 means the judge command runs green on a machine with no
                  internet access. Anything lower tells you what is still missing.
                </p>
              </div>
              <div className="rounded-xl border border-[#0B132B]/8 bg-[#FBFAF7] p-4">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B132B]/45">
                  What the judge runs
                </p>
                <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-[#0B132B]">
                  <code>docker build -t rebuildbot .</code>
                  <span className="text-[#0B132B]/35">{' && '}</span>
                  <code>docker run --rm</code>
                  <span className="text-[#0B132B]/35"> </span>
                  <code>--network none</code>
                  <span className="text-[#0B132B]/35"> </span>
                  <code>rebuildbot npm test</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Analyzer - light header instead of a solid black slab */}
        <section id="analyze" className="scroll-mt-24">
          <div className="overflow-hidden rounded-3xl border border-[#0B132B]/8 bg-white/70 shadow-lift backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0B132B]/8 bg-[#39FF88]/10 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Boxes className="h-[18px] w-[18px] text-[#0B132B]" strokeWidth={2.2} />
                <h2 className="text-sm font-bold tracking-tight text-[#0B132B]">Analyze a repository</h2>
              </div>
              <span className="rounded-full border border-[#0B132B]/10 bg-white/70 px-3 py-1 font-mono text-[10px] font-semibold text-[#0B132B]/60">
                POST /api/analyze
              </span>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <FolderSearch
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0B132B]/35"
                    strokeWidth={2.2}
                  />
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                    placeholder="Absolute path to a repo folder - leave empty to score this project"
                    className="w-full rounded-xl border border-[#0B132B]/12 bg-white/80 py-3.5 pl-11 pr-4 text-sm text-[#0B132B] outline-none transition placeholder:text-[#0B132B]/35 focus:border-[#39FF88] focus:neon-ring"
                  />
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B132B] px-7 py-3.5 text-sm font-bold text-[#39FF88] transition hover:-translate-y-0.5 hover:bg-[#111c3a] disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" strokeWidth={2.4} />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-[11.5px] text-[#0B132B]/45">
                Press Enter to run. Leave the field empty to score the RebuildBot project itself.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
                  <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={2.2} />
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        {report && (
          <section ref={resultsRef} className="mt-8 scroll-mt-24">
            <div className="overflow-hidden rounded-3xl border border-[#0B132B]/8 bg-white/70 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col items-center gap-7 p-8 sm:flex-row sm:p-9">
                <div className="relative shrink-0">
                  <div
                    className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${scoreTone} shadow-lift`}
                  >
                    <span className="text-4xl font-black text-[#0B132B]">{report.score}</span>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-[#0B132B]/10 bg-white px-3 py-0.5 text-[10px] font-bold text-[#0B132B]/60">
                    out of 100
                  </div>
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#0B132B]">
                    {report.passed} of {report.total} checks passed
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#3D4560]">{report.verdict}</p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#0B132B]/10 bg-[#FBFAF7] px-3 py-1.5 font-mono text-[11px] text-[#0B132B]/60">
                    <Layers className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {report.repoPath}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#0B132B]/8">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-[#0B132B]/60" strokeWidth={2.2} />
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B132B]/55">
                      Checklist detail
                    </h4>
                    {failureCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        {failureCount} failing
                      </span>
                    )}
                  </div>

                  {failureCount > 0 && (
                    <button
                      onClick={() => setShowOnlyFailures((v) => !v)}
                      className="rounded-full border border-[#0B132B]/12 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#0B132B] transition hover:border-[#39FF88] hover:bg-[#39FF88]/12"
                    >
                      {showOnlyFailures ? 'Show all checks' : 'Show only failures'}
                    </button>
                  )}
                </div>

                <div className="grid gap-2.5 px-6 pb-6">
                  {visibleChecks.length === 0 && (
                    <div className="rounded-xl border border-[#39FF88]/40 bg-[#39FF88]/10 px-4 py-6 text-center text-[13px] font-semibold text-[#0B132B]">
                      Every checklist item passes. This project rebuilds cleanly.
                    </div>
                  )}
                  {visibleChecks.map((check) => (
                    <div
                      key={check.id}
                      className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition ${
                        check.pass
                          ? 'border-[#39FF88]/45 bg-[#39FF88]/8'
                          : 'border-rose-300/60 bg-rose-50/70'
                      }`}
                    >
                      {check.pass ? (
                        <CheckCircle2
                          className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#0B132B]"
                          strokeWidth={2.3}
                        />
                      ) : (
                        <XCircle
                          className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rose-500"
                          strokeWidth={2.3}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0B132B]">{check.label}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#3D4560]/80">
                          {check.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Judge command */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#0B132B]/8 bg-white/60 shadow-soft backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0B132B]/8 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Gavel className="h-4 w-4 text-[#0B132B]/70" strokeWidth={2.2} />
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#0B132B]/70">
                    Reproduce the judge run
                  </h4>
                </div>
                <button
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#0B132B]/12 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#0B132B] transition hover:border-[#39FF88] hover:bg-[#39FF88]/12"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#0B132B]" strokeWidth={2.6} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="p-5">
                <pre className="overflow-x-auto rounded-xl bg-[#0B132B] p-4 font-mono text-[12px] leading-relaxed text-[#39FF88]">
                  <code>docker build -t rebuildbot .</code>
                  <span className="text-white/30">{' && '}</span>
                  <code>docker run --rm</code>
                  <span className="text-white/30"> </span>
                  <code>--network none</code>
                  <span className="text-white/30"> </span>
                  <code>rebuildbot npm test</code>
                </pre>
                <p className="mt-3 text-[12px] leading-relaxed text-[#3D4560]/75">
                  Runs on a clean Linux machine with no internet. The tests must still pass, which
                  is exactly what proves the project rebuilds.
                </p>
              </div>
            </div>

            {/* Rebuild recipe */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: FileCode2,
                  title: 'Deterministic install',
                  body: 'npm ci installs the exact versions pinned in package-lock.json.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Offline safe',
                  body: 'The image runs with --network none and the tests still pass.',
                },
                {
                  icon: Cpu,
                  title: 'Pinned runtime',
                  body: 'Node 22 is fixed by .nvmrc, engines.node and the node:22-slim base.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#0B132B]/8 bg-white/60 p-5 backdrop-blur"
                >
                  <card.icon className="h-[18px] w-[18px] text-[#0B132B]/70" strokeWidth={2.1} />
                  <h4 className="mt-3 text-[13px] font-bold text-[#0B132B]">{card.title}</h4>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#3D4560]/80">{card.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0B132B]/8 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88]">
              <Bot className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <p className="text-[12px] font-semibold text-[#0B132B]/70">
              RebuildBot - solo entry, Frontier Buildathon 2026
            </p>
          </div>
          <p className="text-[11px] font-medium text-[#0B132B]/45">
            Built with Next.js and OmniRush · MIT licensed
          </p>
        </div>
      </footer>
    </div>
  );
}
