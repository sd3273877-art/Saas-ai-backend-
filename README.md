# AuralForge — Audio AI Studio (Monorepo)

Monorepo for a SaaS audio AI studio featuring TTS, STT, voice cloning, dubbing, and a modern Studio UI.

## Packages

- `apps/web` — Next.js 15 + Tailwind frontend
- `apps/api` — Fastify API (TypeScript), BullMQ queues, Prisma ORM
- `apps/worker` — Job workers for TTS/STT/Cloning (stubbed)
- `packages/shared` — Shared types
- `packages/sdk-js` — Minimal JS SDK

## Prerequisites

- Node.js 20+
- Docker (for Postgres, Redis, MinIO)

## Environment

Create `.env` files as needed or export env vars:

```
# API
API_PORT=4000
JWT_SECRET=devsecret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audio_ai?schema=public
REDIS_URL=redis://localhost:6379
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=audio-ai

# WEB
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Local Dev

1. Start services:

```
docker compose up -d
```

2. Create the S3 bucket in MinIO console (`http://localhost:9001`) named `audio-ai` or via CLI.

3. Install deps and generate Prisma client:

```
npm ci
npm run -w apps/api prisma:generate
```

4. Run DB migrations:

```
npm run -w apps/api prisma:migrate
```

5. Start API, Worker, and Web (in separate terminals or tmux panes):

```
npm run dev:api
npm run dev:worker
npm run dev
```

Open `http://localhost:3000`.

## Notes

- API docs available as OpenAPI JSON at `/documentation/json`.
- Jobs are stubbed to complete with placeholder outputs.
- Replace stubs with real model inference and media processing.

