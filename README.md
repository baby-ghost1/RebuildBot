# RebuildBot

**OmniRush RebuildBot** — Automatically rebuilds projects in Docker with offline tests.

## What it does
- **OmniRush sub-agents** (via `omnirush` CLI) build, test, and merge code
- **Docker container** that runs tests offline (no internet needed)
- **Automatic rebuild** — judges can rebuild your project from scratch
- **Zero API keys** — uses only free OmniRush features

## How to use

1. **Install OmniRush** (if not installed):
   ```bash
   npm install -g omnirush
   omnirush login
   ```

2. **Join the Buildathon**:
   - Register on Unstop: https://unstop.com/p/omnirush-agentic-buildathon-2026-omnirush-1769914
   - Or join via console: https://omnirush.ai/console/buildathon?join=1

3. **Start your project**:
   ```bash
   cd rebuildbot
   npm install
   npm run dev   # starts Vite dev server
   ```

4. **OmniRush will create sessions** — you see progress bars in the dashboard.

5. **Submit** before **20 Oct 11:59 PM IST**

## Why judges love it
- ✅ **Rebuilds first time** — OmniRush runs Docker on clean Linux, tests offline
- ✅ **Tests pass without internet** — `docker run --network none`
- ✅ **Clear documentation** — README, Dockerfile, .env.example
- ✅ **Sub-agent workflow** — SWARM pattern (frontend + backend + tests)

## Quick start
```bash
# Clone
git clone https://github.com/your-org/rebuildbot.git
cd rebuildbot

# Install
npm install

# Run dev server
npm run dev

# In another terminal, start OmniRush
omnirush buildathon
```

## Requirements
- Node.js 22+
- Docker (for submission)
- OmniRush account (free)

## License
MIT
