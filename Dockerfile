# syntax=docker/dockerfile:1

# ---------- 1. Збірка фронтенду ----------
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: для збірки Vite нативні модулі (better-sqlite3) не потрібні
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ---------- 2. Продакшн-залежності (better-sqlite3 може знадобитись компіляція) ----------
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
 && npm ci --omit=dev \
 && npm cache clean --force

# ---------- 3. Фінальний образ ----------
FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/phrases.db
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY src/phrases.json src/brand.js ./src/
COPY --from=build /app/dist ./dist

# /data: том для SQLite; працюємо від непривілейованого користувача node
RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]