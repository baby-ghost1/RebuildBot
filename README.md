# RebuildBot 🤖

**OmniRush Frontier Buildathon 2026** — A full-stack app that checks any repository for *rebuild-readiness* using the official Buildathon judging checklist, and shows a live score.

Judges rebuild every project from scratch in Docker on a clean Linux machine and run its tests **offline**. RebuildBot makes that checklist visible, testable, and automatic.

---

## ✨ What it does

- **Live rebuild score** — analyzes a repo and scores it 0–100 against the Buildathon checklist
- **9 checklist checks** — lockfile, version pin, Dockerfile, base image, test command, README, `.env.example`, no hardcoded paths, git repo
- **One-click analysis** — paste a path, hit "Run Analysis", see pass/fail instantly
- **Judge command shown** — the exact `docker build && docker run --network none` command the judges will run
- **Zero API keys** — uses only free OmniRush features and standard open-source libraries

## 🛠 Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 22 + Express |
| Tests | Jest + custom analyzer test |
| Container | Docker (`node:22-slim`), offline-capable |
| Build | Vite build served by Express in production |

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start dev (API on :5000 + Vite on :5173)
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Run only the API
```bash
npm run server
```

### Run only the frontend
```bash
npm run client
```

## 🧪 Test it

```bash
npm test
```

Runs 7 offline tests that verify the Dockerfile, lockfile, `.nvmrc`, README, `.env.example`, test script, and absence of hardcoded paths. **No internet required.**

## 🐳 Rebuild it like a judge

Judges run this on a clean Linux machine with **no internet**:

```bash
docker build -t rebuildbot . && docker run --rm --network none rebuildbot npm test
```

- `docker build` installs exact dependency versions from `package-lock.json`
- `docker run --network none` disables all networking
- `npm test` must still pass — that's the proof it rebuilds

## 📦 Build for production

```bash
npm run build     # builds the React app into /dist
npm start         # Express serves /dist + API on port 5000
```

Then open **http://localhost:5000**.

---

## 📁 Project structure

```
rebuildbot/
├─ .nvmrc              # pins Node 22
├─ .env.example        # env template (no secrets)
├─ .gitignore
├─ Dockerfile          # offline rebuildable
├─ package.json
├─ package-lock.json   # exact dependency versions
├─ index.html          # Vite entry
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ src/
│  ├─ server/
│  │   ├─ index.js     # Express API
│  │   └─ analyzer.js  # rebuild-readiness logic
│  └─ client/
│      ├─ main.jsx     # React entry
│      ├─ App.jsx      # dashboard UI
│      └─ index.css    # Tailwind
└─ tests/
   └─ rebuild.test.js  # 7 offline checklist tests
```

## 🔑 API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/analyze` | Analyze a repo path `{ repoPath? }` and return a rebuild report |

## 🏆 Why this meets the judging criteria

- **It works** — run `npm run dev`, open the dashboard, analysis runs live
- **It's worth using** — any dev preparing for a Buildathon/hackathon can check their repo in 2 seconds
- **It rebuilds** — `docker build && docker run --network none npm test` passes offline
- **OmniRush built it** — frontend, backend, tests, and docs were generated in OmniRush sub-agent sessions

---

## 📝 License

MIT

## 🔗 Links

- Buildathon: [omnirush.ai/buildathon](https://omnirush.ai/buildathon)
- Repo: [github.com/baby-ghost1/RebuildBot](https://github.com/baby-ghost1/RebuildBot)
