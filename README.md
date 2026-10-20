# RebuildBot 🤖

**OmniRush Frontier Buildathon 2026** - A **Next.js** full-stack app that checks any repository for *rebuild-readiness* using the official Buildathon judging checklist, and shows a live score.

Judges rebuild every project from scratch in Docker on a clean Linux machine and run its tests **offline**. RebuildBot makes that checklist visible, testable, and automatic.

---

## ✨ What it does

- **Live rebuild score** - analyzes a repo and scores it 0-100 against the Buildathon checklist
- **Three ways to point at a project** - a GitHub URL, a local folder path, or a folder you pick in your browser
- **11 checklist checks** - lockfile, version pin, Dockerfile, base image, test command, README, `.env.example`, no hardcoded paths, git repo, `.dockerignore`, `.gitignore`
- **One-click analysis** - hit "Run Analysis", see pass/fail instantly
- **Refined interface** - warm-white backdrop panels, `lucide-react` SVG iconography, no emoji
- **How-to-use guide built in** - worked example shown right in the dashboard
- **Failure filter** - one tap to hide passing checks and focus on what to fix
- **Inline fix commands** - every failing item comes with a copy-paste command
- **Copy-to-clipboard** - grab the exact judge command with one click
- **Zero API keys** - uses only free OmniRush features and standard open-source libraries

## 🛠 Tech stack

| Layer | Tech |
|-------|------|
| Frontend | **Next.js 14** (App Router) + React 18 + **Tailwind CSS v4** |
| Icons | **lucide-react** (SVG icon set, no emoji) |
| Backend | Next.js API Routes (`/api/health`, `/api/analyze`) |
| Repo fetching | **GitHub REST API** (`lib/github.js`) - no git binary needed, works on serverless |
| Local folders | Browser folder picker reads the files client side (`lib/source.js`) |
| Core logic | `lib/analyzer.js` - 11-point rebuild-readiness analyzer |
| Tests | Jest (31 offline tests) + `scripts/e2e.js` (34 end to end checks) |
| Container | Docker (`node:22-slim`), offline-capable |

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the server (runs detached, auto-restarts on crash)
npm run serve
```

Then open **http://localhost:5000** in your browser.

### Server commands

| Command | What it does |
|---------|--------------|
| `npm run serve` | Start the server detached. It keeps running until you stop it, and restarts itself if it crashes. |
| `npm run serve:stop` | Stop the server |
| `npm run serve:status` | Show whether it is running |
| `npm run serve:restart` | Restart it |
| `npm run dev` | Next.js dev server with hot reload on **http://localhost:5173** |
| `npm run build` | Production build |
| `npm start` | Run the production build in the foreground (honours the `PORT` env var) |
| `npm run keepalive -- <url>` | Ping the health route on a timer so a free-tier host never sleeps |

> Do not run `npm run dev` and `npm run serve` at the same time. They share the same
> `.next` folder and will fight over it.

## 💓 Health route and keep-alive

`GET /api/health` is a deliberately cheap probe that returns JSON:

```json
{ "status": "ok", "service": "rebuildbot", "uptime": 412, "time": "2026-10-20T13:20:27.717Z" }
```

It always sends `Cache-Control: no-store`, because a cached response would not count as a
real invocation and the host would still treat the app as idle.

Two keep-alive layers:

1. **In the browser** - while the dashboard is open it pings `/api/health` every 60
   seconds. It pauses when the tab is hidden, so it never wastes calls.
2. **From outside** - `scripts/keepalive.js` pings any deployed URL on a timer:

```bash
# ping every 5 minutes until you stop it
npm run keepalive -- https://rebuildbot.vercel.app

# one single ping, good for a cron job
node scripts/keepalive.js https://rebuildbot.vercel.app --once

# change the interval
node scripts/keepalive.js https://rebuildbot.vercel.app --interval 3
```

## 🧪 Test it

```bash
npm test
```

Runs **31 offline tests** that verify the Dockerfile, lockfile, `.nvmrc`, README, `.env.example`, test script, hardcoded paths, Next.js structure, the self-hosted fonts, the GitHub URL parser, the browser upload path, and that this project scores a perfect 100. **No internet required.**

## 🔎 End to end test

`scripts/e2e.js` exercises the running site exactly like a visitor would:

```bash
# start the server first
npm run serve

# then, against any deployment
node scripts/e2e.js http://localhost:5000
node scripts/e2e.js https://rebuildbot.vercel.app
```

It checks the pages, the health route, all three analysis modes (local folder, GitHub URL, browser upload), every error path, the keep-alive pings, and the Docker judge command. It prints a pass/fail summary and exits non-zero if anything is broken.

---

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

### Typography

Three self-hosted variable fonts live in `app/fonts/` and are wired through
`next/font/local`, so the build never reaches the network.

| Role | Font | File | Used for |
|------|------|------|----------|
| Sans | Inter | `inter-latin.woff2` | Body copy, buttons, labels |
| Display | Space Grotesk | `space-grotesk-latin.woff2` | Headings (h1 to h4) |
| Mono | JetBrains Mono | `jetbrains-mono-latin.woff2` | Code, paths, commands |

Line length is capped with `ch` units (`max-w-[58ch]` for body copy, `max-w-[52ch]` for
card text) so text never stretches too wide on large displays.

---

## 📁 Project structure

```
rebuildbot/
├─ app/
│  ├─ layout.js            # Root layout
│  ├─ page.js              # Dashboard UI (lucide icons, no emoji)
│  ├─ globals.css          # Tailwind v4 @theme + backdrop utilities
│  ├─ fonts/
│  │  ├─ fonts.js          # next/font/local setup
│  │  ├─ inter-latin.woff2
│  │  ├─ space-grotesk-latin.woff2
│  │  └─ jetbrains-mono-latin.woff2
│  └─ api/
│     ├─ health/route.js   # GET /api/health
│     └─ analyze/route.js  # POST /api/analyze
├─ scripts/
│  ├─ serve.js             # server supervisor (start/stop/status/restart)
│  ├─ start.js             # production launcher (honours PORT)
│  ├─ dev.js               # dev server launcher (uses .next-dev)
│  ├─ keepalive.js         # health-route pinger for free-tier hosts
│  └─ e2e.js               # end to end test of a running deployment
├─ lib/
│  ├─ analyzer.js          # 11-point rebuild-readiness logic
│  ├─ github.js            # GitHub URL parser + REST API source
│  └─ source.js            # local / memory / github source adapters
├─ tests/
│  └─ rebuild.test.js      # 23 offline checklist tests
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
