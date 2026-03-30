FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/packages/web
RUN bun run build

FROM oven/bun:1
WORKDIR /app/packages/web
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/packages/web/build ./build
COPY packages/web/package.json ./
CMD ["bun", "run", "start"]
