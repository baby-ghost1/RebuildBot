# RebuildBot — Next.js · Rebuildable offline for the Buildathon judges
# Build:  docker build -t rebuildbot .
# Test:   docker run --rm --network none rebuildbot npm test

FROM node:22-slim
WORKDIR /app

# 1. Install exact dependency versions from the lockfile
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy the full project source
COPY . .

# 3. Verify it rebuilds and tests pass — judges run this offline
RUN npm test

# 4. Build the Next.js production bundle
RUN npm run build

# 5. Default command (production server on port 5000)
EXPOSE 5000
CMD ["npm", "start"]
