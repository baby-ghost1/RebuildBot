import { useState, useEffect } from 'react';

function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [error, setError] = useState('');

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
    } catch (e) {
      setError('Could not reach the API. Is the server running on port 5000?');
    }
    setLoading(false);
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const scoreColor =
    report?.score === 100
      ? 'from-emerald-500 to-teal-500'
      : report?.score >= 75
      ? 'from-amber-500 to-orange-500'
      : report?.score >= 50
      ? 'from-orange-500 to-red-500'
      : 'from-red-600 to-rose-700';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-lg font-bold text-white">RebuildBot</h1>
              <p className="text-xs text-slate-400">Buildathon rebuild-readiness checker</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
            OmniRush Buildathon 2026
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Optional: path to a repo (leave empty to check this project)"
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Analyzing…' : 'Run Analysis'}
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Score card */}
        {report && (
          <>
            <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800/60 p-8 flex flex-col sm:flex-row items-center gap-8">
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${scoreColor} flex items-center justify-center shadow-lg`}>
                <span className="text-3xl font-black text-white">{report.score}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Rebuild Score: {report.passed} / {report.total} checks passed
                </h2>
                <p className="text-slate-300 text-sm mb-2">{report.verdict}</p>
                <p className="text-xs text-slate-500">
                  Analyzed: <code className="text-slate-400">{report.repoPath}</code>
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid gap-3">
              {report.checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-4 px-5 py-4 rounded-xl border ${
                    check.pass
                      ? 'bg-emerald-900/20 border-emerald-800/50'
                      : 'bg-red-900/20 border-red-800/50'
                  }`}
                >
                  <div className={`text-xl mt-0.5 ${check.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                    {check.pass ? '✅' : '❌'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-100">{check.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Judge command */}
            <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
              <h3 className="text-sm font-bold text-white mb-3">How judges will rebuild it</h3>
              <pre className="text-xs text-emerald-400 bg-black/50 rounded-lg p-4 overflow-x-auto">
{`docker build -t rebuildbot . && docker run --rm --network none rebuildbot npm test`}
              </pre>
              <p className="text-xs text-slate-500 mt-3">
                Run this on a clean Linux machine with no internet — the tests must still pass.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
        Built with OmniRush sub-agents · Solo · Frontier Buildathon 2026
      </footer>
    </div>
  );
}

export default App;
