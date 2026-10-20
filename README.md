# RebuildBot 🤖

**OmniRush Frontier Buildathon 2026** — A **Next.js** full-stack app that checks any repository for *rebuild-readiness* using the official Buildathon judging checklist, and shows a live score.

Judges rebuild every project from scratch in Docker on a clean Linux machine and run its tests **offline**. RebuildBot makes that checklist visible, testable, and automatic.

---

## ✨ What it does

- **Live rebuild score** — analyzes a repo and scores it 0–100 against the Buildathon checklist
- **9 checklist checks** — lockfile, version pin, Dockerfile, base image, test command, README, `.env.example`, no hardcoded paths, git repo
- **One-click analysis** — paste a path, hit "Run Analysis", see pass/fail instantly
- **7 switchable color themes** — Navy & Green, Blue & Lavender, Purple & Peach, Lime & Dark, Violet & Light, Forest & Lime, Orange & Cream
- **How-to-use guide built in** — examples shown right in the dashboard
- **Zero API keys** — uses only free OmniRush features and standard open-source libraries

## 🛠 Tech stack

| Layer | Tech |
|-------|------|
| Frontend | **Next.js 14** (App Router) + React 18 + Tailwind CSS |
| Backend | Next.js API Routes (`/api/health`, `/api/analyze`) |
| Core logic | `lib/analyzer.js` — 9-point rebuild-readiness analyzer |
| Tests | Jest (8 offline tests) |
| Container | Docker (`node:22-slim`), offline-capable |

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (port 5173)
npm run dev
```

Then open **http://localhost:5173** in your browser.

## 🧪 Test it

```bash
npm test
```

Runs **8 offline tests** that verify the Dockerfile, lockfile, `.nvmrc`, README, `.env.example`, test script, hardcoded paths, and Next.js structure. **No internet required.**

## 🐳 Rebuild it like a judge

Judges run this on a clean Linux machine with **no internet**:

```bash
docker build -t rebuildbot . && docker run --rm --network none rebuildbot npm test
```

- `docker build` installs exact dependency versions from `package-lock.json` and runs `npm test` + `npm run build`
- `docker run --network none` disables all networking
- `npm test` must still pass — that's the proof it rebuilds

## 📦 Production build

```bash
npm run build    # builds the Next.js production bundle
npm start        # serves on port 5000
```

Then open **http://localhost:5000**.

---

## 🎨 Color themes

Click the **🎨 theme button** in the header to cycle through 7 pairs:

| Theme | Colors |
|-------|--------|
| Navy & Green | `#0B132B` + `#39FF88` |
| Blue & Lavender | `#5B3DF5` + `#E8DEFF` |
| Purple & Peach | `#6A00F4` + `#FFD6A5` |
| Lime & Dark | `#B6FF2E` + `#23262F` |
| Violet & Light | `#7A35FF` + `#F0F2F5` |
| Forest & Lime | `#18251D` + `#B7FF72` |
| Orange & Cream | `#FF6115` + `#FFFCF4` |

---

## 📁 Project structure

```
rebuildbot/
├─ app/
│  ├─ layout.js            # Root layout
│  ├─ page.js              # Dashboard UI + theme switcher
│  ├─ globals.css          # Tailwind + theme CSS vars
│  └─ api/
│     ├─ health/route.js   # GET /api/health
│     └─ analyze/route.js  # POST /api/analyze
├─ lib/
│  └─ analyzer.js          # 9-point rebuild-readiness logic
├─ tests/
│  └─ rebuild.test.js      # 8 offline checklist tests
├─ .nvmrc                  # pins Node 22
├─ .env.example            # env template (no secrets)
├─ Dockerfile              # offline rebuildable
├─ next.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ jest.config.js
├─ package.json
└─ package-lock.json       # exact dependency versions
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
