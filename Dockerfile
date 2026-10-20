# RebuildBot - Next.js - rebuildable offline for the Buildathon judges
#
# Build:  docker build -t rebuildbot .
# Test:   docker run --rm --network none rebuildbot npm test
# Run:    docker run -p 5000:5000 rebuildbot

FROM node:22-slim
WORKDIR /app

# Telemetry stays off so the build never reaches the network
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install exact dependency versions from the lockfile.
#    --include=dev is required: Jest and the Next.js build both run
#    inside the image, and both live in devDependencies.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# 2. Copy the full project source (.dockerignore keeps host
#    node_modules and local .env files out of the image)
COPY . .

# 3. Verify it rebuilds and the tests pass. This is the same command
#    the judges run, so a failure here fails the build early.
RUN npm test

# 4. Build the Next.js production bundle
RUN npm run build

# 5. Serve the built app
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["npm", "start"]
