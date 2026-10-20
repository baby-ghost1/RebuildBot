'use client';

import { useState, useEffect } from 'react';

// 7 color pairs: [background, accent] — user-defined
const THEMES = [
  { name: 'Navy & Green', bg: '#0B132B', accent: '#39FF88' },
  { name: 'Blue & Lavender', bg: '#5B3DF5', accent: '#E8DEFF' },
  { name: 'Purple & Peach', bg: '#6A00F4', accent: '#FFD6A5' },
  { name: 'Lime & Dark', bg: '#B6FF2E', accent: '#23262F' },
  { name: 'Violet & Light', bg: '#7A35FF', accent: '#F0F2F5' },
  { name: 'Forest & Lime', bg: '#18251D', accent: '#B7FF72' },
  { name: 'Orange & Cream', bg: '#FF6115', accent: '#FFFCF4' },
];

function readableOn(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#111' : '#fff';
}

export default function Home() {
  const [themeIdx, setThemeIdx] = useState(0);
  const [repoPath, setRepoPath] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = THEMES[themeIdx];
  const onBg = readableOn(theme.bg);
  const onAccent = readableOn(theme.accent);

  useEffect(() => {
    runAnalysis();
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
      if (data.success) setReport(data.report);
      else setError(data.error || 'Analysis failed');
    } catch {
      setError('Could not reach the API.');
    }
    setLoading(false);
  };

  const cycleTheme = () => setThemeIdx((i) => (i + 1) % THEMES.length);

  const scoreColor =
    report?.score === 100
      ? 'from-emerald-400 to-teal-400'
      : report?.score >= 75
      ? 'from-amber-400 to-orange-400'
      : report?.score >= 50
      ? 'from-orange-400 to-red-400'
      : 'from-red-500 to-rose-500';

  return (
    <div style={{ backgroundColor: theme.bg, color: onBg, minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>
      {/* Header */}
      <header style={{ borderBottom: `2px solid ${theme.accent}40` }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black" style={{ backgroundColor: theme.accent, color: onAccent }}>
              R
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">RebuildBot</h1>
              <p className="text-xs opacity-70">Buildathon rebuild-readiness checker</p>
            </div>
          </div>
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition hover:scale-105"
            style={{ backgroundColor: theme.accent, color: onAccent }}
            title="Click to switch theme"
          >
            <span className="text-base">🎨</span>
            <span>{theme.name}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* How to use */}
        <section className="mb-12">
          <h2 className="text-2xl font-black mb-6">📖 How to use RebuildBot</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: '1', title: 'Enter a path', desc: 'Type the path to any repo folder, e.g. C:\\my-project. Or leave empty to check this project.' },
              { step: '2', title: 'Click Run Analysis', desc: 'RebuildBot checks 9 Buildathon checklist items in under a second.' },
              { step: '3', title: 'Read the score', desc: 'See your rebuild score (0-100) and which items need fixing before judges rebuild.' },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl p-5 border" style={{ borderColor: `${theme.accent}40`, backgroundColor: `${theme.accent}10` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-3" style={{ backgroundColor: theme.accent, color: onAccent }}>{s.step}</div>
                <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                <p className="text-xs opacity-80 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Example */}
          <div className="mt-6 rounded-2xl p-5 border" style={{ borderColor: `${theme.accent}40` }}>
            <h3 className="font-bold text-sm mb-2">💡 Example</h3>
            <p className="text-xs opacity-80 leading-relaxed mb-3">
              You have a project at <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${theme.accent}20` }}>C:\my-project</code>. Enter that path and click <strong>Run Analysis</strong>. If the score is 100/100, your project will rebuild on the judges&apos; machine. If not, fix the failing items first.
            </p>
            <div className="text-xs opacity-60">
              <strong>What judges check:</strong> Dockerfile, lockfile, .nvmrc, README.md, .env.example, npm test, no hardcoded paths, git repo.
            </div>
          </div>
        </section>

        {/* Analysis input */}
        <section className="mb-10">
          <h2 className="text-2xl font-black mb-4">🔍 Analyze a project</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Path to a repo (leave empty for this project)"
              className="flex-1 px-4 py-3 rounded-xl text-sm border-2 focus:outline-none transition"
              style={{ borderColor: `${theme.accent}50`, backgroundColor: `${theme.accent}08`, color: onBg }}
            />
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-8 py-3 rounded-xl text-sm font-bold transition hover:scale-105 disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: onAccent }}
            >
              {loading ? 'Analyzing…' : 'Run Analysis'}
            </button>
          </div>
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm border-2 border-red-400 bg-red-50 text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* Score + Checklist */}
        {report && (
          <>
            <div className="mb-8 rounded-2xl border-2 p-8 flex flex-col sm:flex-row items-center gap-8" style={{ borderColor: `${theme.accent}40` }}>
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${scoreColor} flex items-center justify-center shadow-xl`}>
                <span className="text-3xl font-black text-white">{report.score}</span>
              </div>
              <div>
                <h2 className="text-xl font-black mb-1">Score: {report.passed} / {report.total} checks passed</h2>
                <p className="text-sm opacity-80 mb-2">{report.verdict}</p>
                <p className="text-xs opacity-60">Analyzed: <code>{report.repoPath}</code></p>
              </div>
            </div>

            <div className="grid gap-3">
              {report.checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-4 px-5 py-4 rounded-xl border-2"
                  style={{
                    borderColor: check.pass ? '#34d39950' : '#f8717150',
                    backgroundColor: check.pass ? '#34d39910' : '#f8717110',
                  }}
                >
                  <div className={`text-xl mt-0.5 ${check.pass ? 'text-emerald-500' : 'text-red-500'}`}>
                    {check.pass ? '✅' : '❌'}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{check.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Judge command */}
            <div className="mt-8 rounded-2xl border-2 p-6" style={{ borderColor: `${theme.accent}40`, backgroundColor: `${theme.accent}08` }}>
              <h3 className="text-sm font-black mb-3">🐳 How judges rebuild it</h3>
              <pre className="text-xs rounded-xl p-4 overflow-x-auto" style={{ backgroundColor: `${theme.bg}20`, color: theme.accent }}>
{`docker build -t rebuildbot . && docker run --rm --network none rebuildbot npm test`}
              </pre>
              <p className="text-xs opacity-60 mt-3">
                Run this on a clean Linux machine with no internet — the tests must still pass.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t-2 py-6 text-center text-xs opacity-60" style={{ borderColor: `${theme.accent}30` }}>
        Built with Next.js + OmniRush · Solo · Frontier Buildathon 2026
      </footer>
    </div>
  );
}
