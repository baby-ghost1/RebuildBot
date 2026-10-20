# RebuildBot 🤖

**OmniRush Frontier Buildathon 2026** - A **Next.js** full-stack app that checks any repository for *rebuild-readiness* using the official Buildathon judging checklist, and shows a live score.

Judges rebuild every project from scratch in Docker on a clean Linux machine and run its tests **offline**. RebuildBot makes that checklist visible, testable, and automatic.

---

## ✨ What it does

- **Live rebuild score** - analyzes a repo and scores it 0-100 against the Buildathon checklist
- **11 checklist checks** - lockfile, version pin, Dockerfile, base image, test command, README, `.env.example`, no hardcoded paths, git repo, `.dockerignore`, `.gitignore`
- **One-click analysis** - paste a path, hit "Run Analysis", see pass/fail instantly
- **Refined interface** - warm-white backdrop panels, `lucide-react` SVG iconography, no emoji
- **How-to-use guide built in** - worked example shown right in the dashboard
- **Failure filter** - one tap to hide passing checks and focus on what to fix
- **Copy-to-clipboard** - grab the exact judge command with one click
- **Zero API keys** - uses only free OmniRush features and standard open-source libraries

## 🛠 Tech stack

| Layer | Tech |
|-------|------|
| Frontend | **Next.js 14** (App Router) + React 18 + **Tailwind CSS v4** |
| Icons | **lucide-react** (SVG icon set, no emoji) |
| Backend | Next.js API Routes (`/api/health`, `/api/analyze`) |
| Core logic | `lib/analyzer.js` - 11-point rebuild-readiness analyzer |
| Tests | Jest (14 offline tests) |
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
- `npm test` must still pass - that's the proof it rebuilds

## 📦 Production build

```bash
npm run build    # builds the Next.js production bundle
npm start        # serves on port 5000
```

Then open **http://localhost:5000**.

---

## 🎨 Design system

Single fixed palette, no theme toggle.

| Role | Color | Usage |
|------|-------|-------|
| Primary / ink | `#0B132B` | Headings, dark panels, buttons, code blocks |
| Accent | `#39FF88` | Highlights, icons on dark, score gradients, focus rings |
| Surface | `#FBFAF7` | Warm-white page background (not grey) |
| Text | `#3D4560` | Body copy, secondary labels |

Panels use a translucent white fill with `backdrop-filter: blur()`, layered over a soft grid
veil and two blurred colour blooms for depth.

Tailwind v4 is configured in CSS via `@theme` in `app/globals.css` - there is no
`tailwind.config.js` file.

---

## 📁 Project structure

```
rebuildbot/
├─ app/
│  ├─ layout.js            # Root layout
│  ├─ page.js              # Dashboard UI (lucide icons, no emoji)
│  ├─ globals.css          # Tailwind v4 @theme + backdrop utilities
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
├─ postcss.config.js       # @tailwindcss/postcss
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

- **It works** - run `npm run dev`, open the dashboard, analysis runs live
- **It's worth using** - any dev preparing for a Buildathon/hackathon can check their repo in 2 seconds
- **It rebuilds** - `docker build && docker run --network none npm test` passes offline
- **OmniRush built it** - frontend, backend, tests, and docs were generated in OmniRush sub-agent sessions

---

## 📝 License

MIT

## 🔗 Links

- Buildathon: [omnirush.ai/buildathon](https://omnirush.ai/buildathon)
- Repo: [github.com/baby-ghost1/RebuildBot](https://github.com/baby-ghost1/RebuildBot)
