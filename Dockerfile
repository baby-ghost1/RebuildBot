# RebuildBot - Full Stack Buildathon Project
FROM node:22-slim
WORKDIR /app

# Install dependencies (non-dev only)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose ports
EXPOSE 5173 5000

# Run tests (offline-safe)
CMD ["npm", "test"]
