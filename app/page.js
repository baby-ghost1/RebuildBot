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
  Globe,
  ClipboardCopy,
  Trash2,
  FolderOpen,
} from 'lucide-react';

// Copy and paste ready fix for every failing checklist item
const FIX_HINTS = {
  lockfile: 'npm install',
  'version-pin': 'echo "22" > .nvmrc',
  dockerfile: 'cp rebuildbot/Dockerfile .',
  'docker-base': 'FROM node:22-slim',
  'test-command': '"test": "jest --ci --runInBand"',
  readme: 'Write a README.md with setup, run and test steps',
  'env-example': 'cp .env.example .env',
  'no-hardcoded-paths': 'Replace the absolute path with a relative one',
  git: 'git init && git add . && git commit -m "init"',
  dockerignore: 'echo "node_modules" > .dockerignore',
  gitignore: 'echo "node_modules" > .gitignore',
};

const STEPS = [
  {
    icon: FolderSearch,
    title: 'Point at a project',
    body: 'Paste a GitHub repository URL or a local folder path. Leave it empty to score this very project.',
  },
  {
    icon: Search,
    title: 'Run the analysis',
    body: 'RebuildBot clones the repo into a temp folder, inspects eleven Buildathon checklist items, and grades each one as pass or fail.',
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
  const [copiedFix, setCopiedFix] = useState('');
  const [inputCopied, setInputCopied] = useState(false);
  const [inputError, setInputError] = useState('');
  // Which source the user is currently working with. Only one is active at a
  // time, so the other inputs are disabled and stay out of the way.
  const [mode, setMode] = useState('none'); // none | url | folder | self
  // Which control started the run, so only that button shows a spinner.
  const [loadingSource, setLoadingSource] = useState(null); // null | url | folder | self
  const [folderName, setFolderName] = useState('');
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    // No automatic analysis on load. The user picks what to score, either by
    // entering a repo or by pressing the "Score this project" button.
  }, []);

  // Heartbeat: while the dashboard is open it pings the health route on a
  // timer. This keeps the instance warm and makes the next request feel
  // instant. It pauses when the tab is hidden so it never wastes calls.
  useEffect(() => {
    let timer = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        fetch('/api/health', { cache: 'no-store' }).catch(() => {});
      }, 60_000);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const runAnalysis = async (options = {}) => {
    const { allowEmpty = false, source = 'url' } = options;
    const target = repoPath.trim();

    // The Run Analysis button needs something to work on. The "Score this
    // project" button passes allowEmpty because it has its own target.
    if (!target && !allowEmpty) {
      setInputError('Paste a GitHub URL or a local folder path first.');
      return;
    }

    setInputError('');
    setLoading(true);
    setLoadingSource(source);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: repoPath || undefined }),
      });

      // Read the body even on a non-2xx so the real reason is shown
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(
          data?.error ||
          `Request failed with status ${res.status} ${res.statusText || ''}`.trim()
        );
        return;
      }

      if (data?.success) {
        setReport(data.report);
        setShowOnlyFailures(false);
      } else {
        setError(data?.error || 'Analysis failed for an unknown reason.');
      }
    } catch (e) {
      setError(
        `Could not reach the server: ${e?.message || 'network error'}. ` +
          'Is the app still running on port 5000?'
      );
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
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

  /**
   * Read a folder the user picks in their browser and score it on the server.
   * This is the only way to analyse a local project from a hosted deployment,
   * because the server cannot see the user's disk.
   */
  const handleFolderPick = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = ''; // allow picking the same folder again
    if (picked.length === 0) return;

    setLoading(true);
    setLoadingSource('folder');
    setInputError('');
    setError('');

    try {
      const files = {};
      let total = 0;
      let hasGit = false;
      const MAX_FILES = 300;
      const MAX_BYTES = 4 * 1024 * 1024;

      for (const file of picked) {
        // webkitRelativePath looks like "my-app/src/index.js" - drop the root
        // folder so paths are relative to the project root.
        const full = file.webkitRelativePath || file.name;
        const parts = full.split('/');
        const rel = parts.length > 1 ? parts.slice(1).join('/') : parts[0];

        // The .git folder can be huge, so never upload it. We only record
        // that it exists so the git check still works.
        if (rel === '.git' || rel.startsWith('.git/')) {
          hasGit = true;
          continue;
        }

        if (Object.keys(files).length >= MAX_FILES) break;
        if (total + file.size > MAX_BYTES) break;

        files[rel] = await file.text();
        total += file.size;
      }

      const rootName = (picked[0].webkitRelativePath || picked[0].name).split('/')[0];

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, folderName: rootName, hasGit }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error || `Upload failed with status ${res.status}`);
        return;
      }

      setFolderName(rootName);
      setReport(data.report);
      setShowOnlyFailures(false);
      setMode('folder');
    } catch (e) {
      setError(`Could not read the selected folder: ${e?.message || 'unknown error'}`);
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  /**
   * The input action button has two states:
   *  1. Paste  - pulls the latest text from the clipboard into the input
   *  2. Clear - turns into a bin icon and clears the input on click
   */
  const handleInputAction = async () => {
    if (inputCopied) {
      setRepoPath('');
      setInputCopied(false);
      setInputError('');
      setMode('none');
      return;
    }
    try {
      setError('');
      const text = await navigator.clipboard.readText();
      setRepoPath(text);
      setInputCopied(true);
      setMode(text.trim() ? 'url' : 'none');
      // Keep the caret in the field so the user can carry on editing
      inputRef.current?.focus();
    } catch {
      // The browser blocked clipboard reads. Focus the field so a manual
      // Ctrl+V still works and say exactly what happened.
      setError(
        'The browser blocked clipboard access. Click the field and press Ctrl+V to paste.'
      );
      inputRef.current?.focus();
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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88] shadow-soft">
            <Bot className="h-4 w-4" strokeWidth={2.2} />
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

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-14 pb-14 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#39FF88]/40 bg-[#39FF88]/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B132B]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            OmniRush Frontier Buildathon 2026
          </div>

          <h1 className="mt-6 max-w-[18ch] text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0B132B] sm:text-5xl">
            Know if your project{' '}
            <span className="relative inline-block">
              <span className="relative z-10">rebuilds</span>
              <span className="absolute inset-x-0 bottom-0.5 z-0 h-2.5 -skew-x-6 rounded-sm bg-[#39FF88]/55 sm:bottom-1 sm:h-3" />
            </span>{' '}
            before the judges do.
          </h1>

          <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-[#3D4560] sm:text-base">
            Every Buildathon project is rebuilt from scratch in Docker on a clean Linux machine
            with its tests running offline. RebuildBot grades a repository against that exact
            checklist in under a second, so you can fix what matters before you submit.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <a
              href="#analyze"
              className="group inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-6 py-3 text-sm font-bold text-[#39FF88] shadow-lift transition hover:-translate-y-0.5 hover:bg-[#111c3a]"
            >
              <Terminal className="h-3.5 w-3.5" strokeWidth={2.4} />
              Analyze a project
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-[#0B132B]/12 bg-white/70 px-6 py-3 text-sm font-semibold text-[#0B132B] backdrop-blur transition hover:border-[#0B132B]/25 hover:bg-white"
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2.2} />
              How it works
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid gap-2.5 sm:grid-cols-3">
            {[
              { icon: Gauge, label: '11 checks', note: 'Full Buildathon checklist' },
              { icon: Zap, label: 'Under 1s', note: 'Scores any local folder' },
              { icon: Lock, label: 'No API keys', note: 'Runs fully offline' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-lg border border-[#0B132B]/8 bg-white/60 px-3.5 py-2.5 backdrop-blur"
              >
                <s.icon className="h-3.5 w-3.5 shrink-0 text-[#0B132B]/60" strokeWidth={2.1} />
                <div className="leading-tight">
                  <p className="text-[12.5px] font-bold text-[#0B132B]">{s.label}</p>
                  <p className="max-w-[24ch] text-[11px] leading-snug text-[#0B132B]/50">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to use */}
        <section id="how-it-works" className="scroll-mt-24 pb-16">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B132B]/45">
                Getting started
              </p>
              <h2 className="mt-1.5 max-w-[24ch] text-balance text-2xl font-extrabold tracking-tight text-[#0B132B] sm:text-3xl">
                How to use RebuildBot
              </h2>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-[#0B132B]/10 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold text-[#0B132B]/60 backdrop-blur sm:flex">
              <Cpu className="h-3 w-3" strokeWidth={2.2} />
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88] transition group-hover:scale-105">
                  <step.icon className="h-4 w-4" strokeWidth={2.1} />
                </div>
                <h3 className="mt-5 text-[15px] font-bold text-[#0B132B]">{step.title}</h3>
                <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-[#3D4560]">{step.body}</p>
              </div>
            ))}
          </div>

          {/* Worked example - light header, no heavy black bar */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#0B132B]/8 bg-white/60 shadow-soft backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-[#0B132B]/8 bg-[#39FF88]/12 px-5 py-2.5">
              <Lightbulb className="h-3.5 w-3.5 text-[#0B132B]" strokeWidth={2.2} />
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#0B132B]">
                Worked example
              </span>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="max-w-[52ch] text-[13px] leading-relaxed text-[#3D4560]">
                  Paste a GitHub URL such as{' '}
                  <code className="rounded-md border border-[#0B132B]/10 bg-[#0B132B]/5 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0B132B]">
                    https://github.com/owner/repo
                  </code>
                  , or point at a local folder like{' '}
                  <code className="rounded-md border border-[#0B132B]/10 bg-[#0B132B]/5 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0B132B]">
                    C:\projects\my-app
                  </code>
                  . RebuildBot clones the repository into a temporary folder, scores it, and
                  cleans up afterwards. Every failing row names the exact file to add or fix
                  before the deadline.
                </p>
                <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[#3D4560]">
                  A 100 out of 100 means the judge command runs green on a machine with no
                  internet access. Anything lower tells you what is still missing.
                </p>
              </div>
              <div className="rounded-lg border border-[#0B132B]/8 bg-[#FBFAF7] p-3.5">
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0B132B]/8 bg-[#39FF88]/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-[#0B132B]" strokeWidth={2.2} />
                <h2 className="text-sm font-bold tracking-tight text-[#0B132B]">Analyze a repository</h2>
              </div>
              <div className="flex items-center gap-2">
                {mode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRepoPath('');
                      setInputCopied(false);
                      setInputError('');
                      setMode('none');
                      setFolderName('');
                      setReport(null);
                      setError('');
                    }}
                    className="rounded-full border border-[#0B132B]/12 bg-white/70 px-3 py-1 text-[10.5px] font-semibold text-[#0B132B] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                  >
                    Reset
                  </button>
                )}
                <span className="rounded-full border border-[#0B132B]/10 bg-white/70 px-3 py-1 font-mono text-[10px] font-semibold text-[#0B132B]/60">
                  POST /api/analyze
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <FolderSearch
                    className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0B132B]/35"
                    strokeWidth={2.2}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={repoPath}
                    disabled={loading || mode === 'folder' || mode === 'self'}
                    onChange={(e) => {
                      setRepoPath(e.target.value);
                      if (inputCopied) setInputCopied(false);
                      if (inputError) setInputError('');
                      setMode(e.target.value.trim() ? 'url' : 'none');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                    placeholder="GitHub URL or local folder path - leave empty to score this project"
                    className={`w-full rounded-lg border bg-white/80 py-3 pl-11 pr-12 text-sm text-[#0B132B] outline-none transition placeholder:text-[#0B132B]/35 focus:neon-ring ${
                      inputError
                        ? 'border-rose-400 focus:border-rose-400'
                        : 'border-[#0B132B]/12 focus:border-[#39FF88]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleInputAction}
                    title={inputCopied ? 'Clear the field' : 'Paste from clipboard'}
                    aria-label={inputCopied ? 'Clear the field' : 'Paste from clipboard'}
                    className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border transition ${
                      inputCopied
                        ? 'border-rose-300/70 bg-rose-100 text-rose-600 hover:border-rose-400 hover:bg-rose-200'
                        : 'border-[#39FF88]/50 bg-[#39FF88]/15 text-[#0B132B] hover:border-[#39FF88] hover:bg-[#39FF88]/35'
                    }`}
                  >
                    {inputCopied ? (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                    ) : (
                      <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={2.3} />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => runAnalysis({ source: 'url' })}
                  disabled={loading}
                  title="Run the checklist against the URL or path in the input box"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B132B] px-6 py-3 text-sm font-bold text-[#39FF88] transition hover:-translate-y-0.5 hover:bg-[#111c3a] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingSource === 'url' ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>

              <p className="mt-2.5 text-[11.5px] text-[#0B132B]/45">
                Press Enter to run, or use one of the buttons below.
              </p>

              {inputError && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-rose-600">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.3} />
                  {inputError}
                </p>
              )}

              {mode !== 'none' && !inputError && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[#0B132B]/55">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0B132B]" strokeWidth={2.6} />
                  {mode === 'url' && 'Using the URL or path in the input box.'}
                  {mode === 'folder' && `Using the folder "${folderName}" from this computer.`}
                  {mode === 'self' && 'Using this project own source repository.'}
                </p>
              )}

              {/* Choose a local folder from the browser */}
              <input
                id="rebuildbot-folder-input"
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                directory=""
                multiple
                onChange={handleFolderPick}
                className="sr-only"
              />
              <label
                htmlFor="rebuildbot-folder-input"
                title={
                  mode !== 'none' && mode !== 'folder'
                    ? 'Only one source can be active at a time. Use Reset to switch.'
                    : 'Pick a folder from this computer'
                }
                className={`group mt-3 flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-[#0B132B]/10 bg-[#FBFAF7] px-4 py-3.5 text-left transition ${
                  loading || mode === 'url' || mode === 'self'
                    ? 'pointer-events-none cursor-not-allowed opacity-40'
                    : 'hover:-translate-y-0.5 hover:border-[#39FF88] hover:bg-[#39FF88]/10'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88] transition group-hover:scale-105">
                  {loadingSource === 'folder' ? (
                    <RotateCcw className="h-[18px] w-[18px] animate-spin" strokeWidth={2.3} />
                  ) : (
                    <FolderOpen className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#0B132B]">
                    {loadingSource === 'folder' ? 'Reading folder...' : 'Choose a local folder'}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[#3D4560]/80">
                    {folderName
                      ? `Last analysed: ${folderName}. Pick another to re-run.`
                      : 'Pick a folder from this computer and score it, even on a hosted deployment.'}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#0B132B]/50 transition-transform group-hover:translate-x-1"
                  strokeWidth={2.4}
                />
              </label>

              {/* Score this project button */}
              <button
                type="button"
                onClick={() => {
                  setRepoPath('');
                  setInputCopied(false);
                  setInputError('');
                  setMode('self');
                  runAnalysis({ allowEmpty: true, source: 'self' });
                }}
                disabled={loading || mode === 'url' || mode === 'folder'}
                title={mode !== 'none' && mode !== 'self' ? 'Only one source can be active at a time. Use Reset to switch.' : 'Run the checklist against this project'}
                className="group mt-4 flex w-full items-center gap-3.5 rounded-xl border border-[#0B132B]/10 bg-[#FBFAF7] px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#39FF88] hover:bg-[#39FF88]/10 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88] transition group-hover:scale-105">
                  {loadingSource === 'self' ? (
                    <RotateCcw className="h-[18px] w-[18px] animate-spin" strokeWidth={2.3} />
                  ) : (
                    <Bot className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#0B132B]">Score this project</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[#3D4560]/80">
                    Run the full 11-point checklist against RebuildBot own source repository.
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#0B132B]/50 transition-transform group-hover:translate-x-1"
                  strokeWidth={2.4}
                />
              </button>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <CircleAlert className="mt-px h-4 w-4 shrink-0 text-rose-600" strokeWidth={2.2} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-rose-800">Analysis failed</p>
                      <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-rose-700">
                        {error}
                      </p>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-rose-600">
                        GitHub URLs must look like https://github.com/owner/repo. A local path
                        must exist on the machine running the app, so on a hosted deployment use
                        the folder picker button instead.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Empty state - shown until the user runs an analysis */}
        {!report && !loading && (
          <section className="mt-8 rounded-3xl border border-dashed border-[#0B132B]/15 bg-white/50 p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B132B] text-[#39FF88]">
              <Gauge className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-[#0B132B]">No analysis yet</h3>
            <p className="mx-auto mt-2 max-w-[46ch] text-[12.5px] leading-relaxed text-[#3D4560]/80">
              Enter a GitHub URL or a local folder path above and press Run Analysis, or press
              Score this project to run the checklist against RebuildBot own source.
            </p>
          </section>
        )}

        {/* Results */}
        {report && (
          <section ref={resultsRef} className="mt-8 scroll-mt-24">
            <div className="overflow-hidden rounded-3xl border border-[#0B132B]/8 bg-white/70 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col items-center gap-7 p-7 sm:flex-row sm:p-8">
                <div className="relative shrink-0">
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${scoreTone} shadow-lift`}
                  >
                    <span className="text-4xl font-black text-[#0B132B]">{report.score}</span>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#0B132B]/10 bg-white px-2.5 py-0.5 text-[9.5px] font-bold text-[#0B132B]/70">
                    {report.score}% rebuild score
                  </div>
                </div>

                <div className="min-w-0 max-w-[46ch] flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#0B132B]">
                    {report.passed} of {report.total} checks passed
                  </h3>                  <p className="mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-[#3D4560]">{report.verdict}</p>
                  <p className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#0B132B]/10 bg-[#FBFAF7] px-2.5 py-1 font-mono text-[10px] text-[#0B132B]/60">
                    {report.source === 'github' ? (
                      <Globe className="h-3 w-3 shrink-0" strokeWidth={2.2} />
                    ) : report.source === 'browser' ? (
                      <FolderOpen className="h-3 w-3 shrink-0" strokeWidth={2.2} />
                    ) : (
                      <FolderSearch className="h-3 w-3 shrink-0" strokeWidth={2.2} />
                    )}
                    <span className="truncate">{report.repoPath}</span>
                  </p>
                  {report.isSelf && (
                    <p className="mt-1.5 text-[11px] font-medium text-[#0B132B]/50">
                      This deployment is scoring its own source repository on GitHub.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#0B132B]/8">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 pb-4">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-3.5 w-3.5 text-[#0B132B]/60" strokeWidth={2.2} />
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B132B]/55">
                      Checklist detail
                    </h4>
                    {failureCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9.5px] font-bold text-rose-700">
                        {failureCount} failing
                      </span>
                    )}
                  </div>

                  {failureCount > 0 && (
                    <button
                      onClick={() => setShowOnlyFailures((v) => !v)}
                      className="rounded-full border border-[#0B132B]/12 bg-white/70 px-2.5 py-1 text-[10.5px] font-semibold text-[#0B132B] transition hover:border-[#39FF88] hover:bg-[#39FF88]/12"
                    >
                      {showOnlyFailures ? 'Show all checks' : 'Show only failures'}
                    </button>
                  )}
                </div>

                <div className="grid gap-4 px-5 pb-6">
                  {visibleChecks.length === 0 && (
                    <div className="rounded-xl border border-[#39FF88]/40 bg-[#39FF88]/10 px-4 py-6 text-center text-[12.5px] font-semibold text-[#0B132B]">
                      Every checklist item passes. This project rebuilds cleanly.
                    </div>
                  )}
                  {visibleChecks.map((check) => (
                    <div
                      key={check.id}
                      className={`group relative overflow-hidden rounded-xl border transition ${
                        check.pass
                          ? 'border-[#39FF88]/40 bg-[#39FF88]/8 hover:border-[#39FF88]/70'
                          : 'border-rose-300/70 bg-rose-50/70 hover:border-rose-400'
                      }`}
                    >
                      {/* Colour coded accent bar on the left */}
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${
                          check.pass ? 'bg-[#39FF88]' : 'bg-rose-500'
                        }`}
                      />

                      <div className="flex items-start gap-3.5 py-4 pl-5 pr-4">
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

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-bold text-[#0B132B]">{check.label}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                                check.pass
                                  ? 'bg-[#39FF88]/25 text-[#0B132B]'
                                  : 'bg-rose-200 text-rose-800'
                              }`}
                            >
                              {check.pass ? 'Pass' : 'Fail'}
                            </span>
                          </div>

                          <p className="mt-1.5 max-w-[72ch] text-[12px] leading-relaxed text-[#3D4560]/85">
                            {check.detail}
                          </p>

                          {!check.pass && FIX_HINTS[check.id] && (
                            <div className="mt-3 flex items-center gap-2">
                              <pre className="overflow-x-auto rounded-lg bg-[#0B132B] px-3 py-2 font-mono text-[10.5px] leading-relaxed text-[#39FF88]">
                                <code>{FIX_HINTS[check.id]}</code>
                              </pre>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard
                                    ?.writeText(FIX_HINTS[check.id])
                                    .then(() => {
                                      setCopiedFix(check.id);
                                      setTimeout(() => setCopiedFix(''), 2000);
                                    })
                                    .catch(() => {});
                                }}
                                title="Copy this fix"
                                className="shrink-0 rounded-lg border border-[#0B132B]/12 bg-white p-1.5 text-[#0B132B] transition hover:border-[#39FF88] hover:bg-[#39FF88]/15"
                              >
                                {copiedFix === check.id ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Judge command */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#0B132B]/8 bg-white/60 shadow-soft backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0B132B]/8 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Gavel className="h-3.5 w-3.5 text-[#0B132B]/70" strokeWidth={2.2} />
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#0B132B]/70">
                    Reproduce the judge run
                  </h4>
                </div>
                <button
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1 rounded-full border border-[#0B132B]/12 bg-white/70 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#0B132B] transition hover:border-[#39FF88] hover:bg-[#39FF88]/12"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-[#0B132B]" strokeWidth={2.6} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" strokeWidth={2.2} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="p-4">
                <pre className="overflow-x-auto rounded-xl bg-[#0B132B] p-4 font-mono text-[12px] leading-relaxed text-[#39FF88]">
                  <code>docker build -t rebuildbot .</code>
                  <span className="text-white/30">{' && '}</span>
                  <code>docker run --rm</code>
                  <span className="text-white/30"> </span>
                  <code>--network none</code>
                  <span className="text-white/30"> </span>
                  <code>rebuildbot npm test</code>
                </pre>
                <p className="mt-3 max-w-[68ch] text-[12px] leading-relaxed text-[#3D4560]/75">
                  Runs on a clean Linux machine with no internet. The tests must still pass, which
                  is exactly what proves the project rebuilds.
                </p>
              </div>
            </div>

            {/* Rebuild recipe */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  className="rounded-xl border border-[#0B132B]/8 bg-white/60 p-4 backdrop-blur"
                >
                  <card.icon className="h-4 w-4 text-[#0B132B]/70" strokeWidth={2.1} />
                  <h4 className="mt-3 text-[13px] font-bold text-[#0B132B]">{card.title}</h4>
                  <p className="mt-1.5 max-w-[32ch] text-[12px] leading-relaxed text-[#3D4560]/80">{card.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer - mirrors the light top bar, no heavy bar treatment */}
      <footer className="mx-auto max-w-5xl px-6 pb-10 pt-4">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#0B132B]/8 pt-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B132B] text-[#39FF88]">
              <Bot className="h-3.5 w-3.5" strokeWidth={2.2} />
            </div>
            <p className="text-[12px] font-semibold text-[#0B132B]/65">
              RebuildBot - solo entry, Frontier Buildathon 2026
            </p>
          </div>
          <p className="text-[11px] font-medium text-[#0B132B]/40">
            Built with Next.js and OmniRush - MIT licensed
          </p>
        </div>
      </footer>
    </div>
  );
}
