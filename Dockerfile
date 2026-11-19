# syntax=docker/dockerfile:1
# Image unique : le backend sert l'API et le front compilé. `docker compose up` suffit.

# 1. Front (PWA)
FROM node:22-bookworm AS front
WORKDIR /src/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# 2. Backend (compilation TypeScript)
FROM node:22-bookworm AS back
WORKDIR /src/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# 3. Exécution : uniquement le nécessaire, utilisateur non root
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATABASE_PATH=/data/caisse.sqlite \
    FRONT_DIST=/srv/app/dist
WORKDIR /srv/backend
COPY --from=back --chown=node:node /src/backend/node_modules ./node_modules
COPY --from=back --chown=node:node /src/backend/dist ./dist
COPY --from=back --chown=node:node /src/backend/migrations ./migrations
COPY --from=back --chown=node:node /src/backend/package.json ./
COPY --from=front --chown=node:node /src/app/dist /srv/app/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "dist/main.js"]
