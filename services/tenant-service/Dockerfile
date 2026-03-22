# Stage 1: dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: production image
FROM node:20-alpine AS runner
WORKDIR /app

# create non-root user (security best practice)
RUN addgroup -S payflow && adduser -S payflow -G payflow

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.js ./
COPY package.json ./

USER payflow
EXPOSE 3003

CMD ["node", "src/index.js"]