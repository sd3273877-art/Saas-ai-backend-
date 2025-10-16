import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { queues, getJobById } from './queues.js';
import { PrismaClient } from '@prisma/client';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import 'dotenv/config';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });
const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! }
    : undefined,
});

// Plugins
await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(jwt, { secret: process.env.JWT_SECRET || 'devsecret' });
await app.register(swagger, {
  openapi: {
    info: {
      title: 'AuralForge API',
      version: '0.1.0',
      description: 'TTS, STT, cloning, dubbing, jobs, billing',
    },
    servers: [{ url: process.env.API_BASE_URL || 'http://localhost:4000' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    },
    security: [{ bearerAuth: [] }],
  },
});
// Note: Swagger UI plugin is removed for Fastify v5 compatibility.
// Consumers can use the OpenAPI JSON at /documentation/json and render externally.

// Health
app.get('/health', async () => ({ status: 'ok' }));

// Auth routes (basic email+password stub)
app.post('/v1/auth/login', async (req, reply) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6) });
  const body = Body.parse((req as any).body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return reply.code(401).send({ error: 'invalid credentials' });
  // For demo, accept any password if exists; replace with proper hash check
  const token = (app as any).jwt.sign({ sub: user.id, roles: ['owner'] });
  return reply.send({ token, user: { id: user.id, email: user.email } });
});

app.post('/v1/auth/signup', async (req, reply) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() });
  const body = Body.parse((req as any).body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return reply.code(409).send({ error: 'email in use' });
  const user = await prisma.user.create({ data: { email: body.email, passwordHash: 'dev', name: body.name } });
  // Create a personal team
  const team = await prisma.team.create({ data: { name: body.name ?? 'My Team', slug: `team_${user.id.slice(0,6)}`, ownerId: user.id } });
  await prisma.membership.create({ data: { userId: user.id, teamId: team.id, role: 'owner' } });
  const token = (app as any).jwt.sign({ sub: user.id, roles: ['owner'], teamId: team.id });
  return reply.send({ token, user: { id: user.id, email: user.email }, team: { id: team.id, name: team.name } });
});

// API Keys (stub)
app.get('/v1/api-keys', { preHandler: [authenticate] }, async (req, _reply) => {
  const user = (req as any).user as any;
  const keys = await prisma.apiKey.findMany({ where: { teamId: user.teamId } });
  return keys.map(k => ({ id: k.id, name: k.name, createdAt: k.createdAt }));
});

app.post('/v1/api-keys', { preHandler: [authenticate] }, async (req, reply) => {
  const Body = z.object({ name: z.string().min(1) });
  const body = Body.parse((req as any).body);
  const user = (req as any).user as any;
  const prefix = 'afk_';
  const lastFour = Math.random().toString().slice(2,6);
  const hash = `sha256:${Math.random().toString(36).slice(2)}`;
  const key = await prisma.apiKey.create({ data: { teamId: user.teamId, name: body.name, prefix, lastFour, hash } });
  return reply.send({ id: key.id, prefix, lastFour });
});

// TTS synthesize (stub streaming later)
app.post('/v1/tts/synthesize', { preHandler: [authenticate] }, async (req, reply) => {
  const Body = z.object({ text: z.string(), voiceId: z.string(), language: z.string().optional(), format: z.enum(['mp3', 'wav']).default('mp3') });
  const body = Body.parse((req as any).body);
  const user = (req as any).user as any;
  const job = await queues.tts.add('synthesize', { ...body, teamId: user.teamId, userId: user.sub }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.create({ data: { id: job.id as string, type: 'tts', status: 'queued', teamId: user.teamId, userId: user.sub, metadata: body } });
  return reply.send({ jobId: job.id, estimatedSeconds: 3, request: body });
});

// STT transcribe (stub)
app.post('/v1/stt/transcribe', { preHandler: [authenticate] }, async (req, reply) => {
  const user = (req as any).user as any;
  const job = await queues.stt.add('transcribe', { teamId: user.teamId, userId: user.sub }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.create({ data: { id: job.id as string, type: 'stt', status: 'queued', teamId: user.teamId, userId: user.sub } });
  return reply.send({ jobId: job.id, estimatedSeconds: 10 });
});

// Voice cloning (stub)
app.post('/v1/voices/clone', { preHandler: [authenticate] }, async (req, reply) => {
  const user = (req as any).user as any;
  const Body = z.object({ name: z.string().min(1), type: z.enum(['instant', 'professional']), samples: z.array(z.string()).default([]) });
  const body = Body.parse((req as any).body);
  const clone = await prisma.voiceClone.create({ data: { teamId: user.teamId, userId: user.sub, name: body.name, type: body.type, samplesS3: body.samples } });
  const job = await queues.cloning.add('clone', { cloneId: clone.id, teamId: user.teamId }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.create({ data: { id: job.id as string, type: 'cloning', status: 'queued', teamId: user.teamId, userId: user.sub, metadata: { cloneId: clone.id } } });
  return reply.send({ cloneId: clone.id, status: 'queued', jobId: job.id });
});

// Jobs
app.get('/v1/jobs/:id', { preHandler: [authenticate] }, async (req, reply) => {
  const id = (req.params as any).id as string;
  const job = await getJobById(id);
  if (!job) return reply.code(404).send({ error: 'not found' });
  const state = await job.getState();
  const result = state === 'completed' ? (job as any).returnvalue : undefined;
  await prisma.job.update({ where: { id }, data: { status: state as any, result } }).catch(() => {});
  return reply.send({ id: job.id, queue: job.queueName, status: state, result });
});

// Webhooks (Stripe, jobs) stub
app.post('/v1/webhooks/stripe', async (_req, reply) => {
  return reply.code(200).send();
});

app.post('/v1/webhooks/jobs', async (_req, reply) => {
  return reply.code(200).send();
});

// Signed upload (simple server-side put; replace with presign in production)
app.post('/v1/storage/upload', { preHandler: [authenticate] }, async (req, reply) => {
  const Body = z.object({ key: z.string(), contentType: z.string(), data: z.string() });
  const body = Body.parse((req as any).body);
  const buffer = Buffer.from(body.data, 'base64');
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET || 'audio-ai', Key: body.key, Body: buffer, ContentType: body.contentType }));
  return reply.send({ ok: true, key: body.key });
});

function authenticate(req: any, reply: any, done: any) {
  try {
    const auth = req.headers.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) return reply.code(401).send({ error: 'missing token' });
    const token = auth.slice('Bearer '.length);
    (req as any).user = (app as any).jwt.verify(token);
    done();
  } catch (e) {
    reply.code(401).send({ error: 'invalid token' });
  }
}

const port = Number(process.env.API_PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on :${port}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
