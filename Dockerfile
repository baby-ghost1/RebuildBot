# RebuildBot — Rebuildable offline for the Buildathon judges
# Build:  docker build -t rebuildbot .
# Test:   docker run --rm --network none rebuildbot npm test

FROM node:22-slim
WORKDIR /app

# 1. Install exact dependency versions from the lockfile
#    (dev deps included so Jest can run the offline tests)
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy the full project source
COPY . .

# 3. Verify it rebuilds and tests pass — judges run this offline
RUN npm test

# 4. Default command (API server); judges override with `npm test`
CMD ["npm", "start"]
