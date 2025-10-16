import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { queues } from './queues.js';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import 'dotenv/config';
import { prisma } from './db.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

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
  exposeRoute: true,
});
// Note: Swagger UI plugin is removed for Fastify v5 compatibility.
// Consumers can use the OpenAPI JSON at /documentation/json and render externally.

// Health
app.get('/health', async () => ({ status: 'ok' }));

// Auth: signup
app.post('/v1/auth/signup', async (req, reply) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().default('Personal') });
  const body = Body.parse((req as any).body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return reply.code(409).send({ error: 'email_exists' });
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({ data: { email: body.email, passwordHash } });
  const team = await prisma.team.create({ data: { name: body.name } });
  await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id, role: 'owner' } as any });
  await prisma.subscription.create({ data: { teamId: team.id, plan: 'FREE' as any, creditsMonthly: 10000 } });
  await prisma.project.create({ data: { teamId: team.id, name: 'Default' } });
  const token = (app as any).jwt.sign({ sub: user.id });
  return reply.send({ token });
});

// Auth: login
app.post('/v1/auth/login', async (req, reply) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6) });
  const body = Body.parse((req as any).body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });
  const token = (app as any).jwt.sign({ sub: user.id });
  return reply.send({ token });
});

// Me
app.get('/v1/auth/me', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const memberships = await prisma.teamMember.findMany({ where: { userId }, include: { team: true } });
  return reply.send({ userId, teams: memberships.map((m) => ({ id: m.teamId, name: (m as any).team.name, role: m.role })) });
});

// Projects
app.get('/v1/projects', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const membership = await prisma.teamMember.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const projects = await prisma.project.findMany({ where: { teamId: membership.teamId } });
  return reply.send(projects);
});

app.post('/v1/projects', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const Body = z.object({ name: z.string().min(2) });
  const body = Body.parse((req as any).body);
  const membership = await prisma.teamMember.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const project = await prisma.project.create({ data: { teamId: membership.teamId, name: body.name } });
  return reply.send(project);
});

// API Keys
app.get('/v1/api-keys', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const membership = await prisma.teamMember.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const projects = await prisma.project.findMany({ where: { teamId: membership.teamId }, include: { apiKeys: true } });
  const keys = projects.flatMap((p) => p.apiKeys.map((k) => ({ id: k.id, projectId: p.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, revokedAt: k.revokedAt })));
  return reply.send(keys);
});

app.post('/v1/projects/:id/api-keys', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const projectId = (req.params as any).id as string;
  const Body = z.object({ name: z.string().min(2) });
  const body = Body.parse((req as any).body);
  const membership = await prisma.teamMember.findFirst({ where: { userId } });
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!membership || !project || project.teamId !== membership.teamId) return reply.code(403).send({ error: 'forbidden' });
  const rawKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
  const prefix = rawKey.slice(0, 12);
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await prisma.apiKey.create({ data: { projectId, name: body.name, prefix, hashedKey } });
  return reply.send({ id: apiKey.id, key: rawKey, name: apiKey.name, createdAt: apiKey.createdAt });
});

// TTS synthesize -> DB job + queue
app.post('/v1/tts/synthesize', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const Body = z.object({ text: z.string().min(1), voiceId: z.string(), language: z.string().optional(), format: z.enum(['mp3', 'wav']).default('wav'), projectId: z.string().optional() });
  const body = Body.parse((req as any).body);
  const membership = await prisma.teamMember.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const projectId = body.projectId || (await prisma.project.findFirst({ where: { teamId: membership.teamId } }))?.id;
  const dbJob = await prisma.job.create({ data: { teamId: membership.teamId, projectId: projectId || null, type: 'tts' as any, status: 'queued' as any, queueName: 'tts', requestedBy: userId, voiceId: body.voiceId, language: body.language || null, format: body.format, inputText: body.text } });
  const qjob = await queues.tts.add('synthesize', { ...body, dbJobId: dbJob.id }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.update({ where: { id: dbJob.id }, data: { queueJobId: String(qjob.id) } as any });
  return reply.send({ id: dbJob.id, estimatedSeconds: 3 });
});

// STT transcribe
app.post('/v1/stt/transcribe', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const membership = await prisma.teamMember.findFirst({ where: { userId } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const dbJob = await prisma.job.create({ data: { teamId: membership.teamId, type: 'stt' as any, status: 'queued' as any, queueName: 'stt', requestedBy: userId } });
  const qjob = await queues.stt.add('transcribe', { dbJobId: dbJob.id }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.update({ where: { id: dbJob.id }, data: { queueJobId: String(qjob.id) } as any });
  return reply.send({ id: dbJob.id, estimatedSeconds: 10 });
});

// Voice cloning
app.post('/v1/voices/clone', { preHandler: [authenticate] }, async (req, reply) => {
  const userId = (req as any).user.sub as string;
  const membership = await prisma.teamMember.findFirst({ where: { userId } });
  if (!membership) return reply.code(403).send({ error: 'no_team' });
  const dbJob = await prisma.job.create({ data: { teamId: membership.teamId, type: 'cloning' as any, status: 'queued' as any, queueName: 'cloning', requestedBy: userId } });
  const qjob = await queues.cloning.add('clone', { dbJobId: dbJob.id }, { removeOnComplete: 100, removeOnFail: 100 } as any);
  await prisma.job.update({ where: { id: dbJob.id }, data: { queueJobId: String(qjob.id) } as any });
  return reply.send({ id: dbJob.id, status: 'queued' });
});

// Jobs
app.get('/v1/jobs/:id', { preHandler: [authenticate] }, async (req, reply) => {
  const id = (req.params as any).id as string;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return reply.code(404).send({ error: 'not_found' });
  return reply.send({ id: job.id, queue: job.queueName, status: job.status, resultUrl: job.resultUrl, format: job.format });
});

// Stream job audio from S3/MinIO
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: process.env.S3_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! }
    : undefined,
});

app.get('/v1/assets/:jobId/audio', { preHandler: [authenticate] }, async (req, reply) => {
  const jobId = (req.params as any).jobId as string;
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || !job.s3Path) return reply.code(404).send({ error: 'not_found' });
  const bucket = process.env.S3_BUCKET || 'audio-ai';
  const key = job.s3Path;
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contentType = job.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  reply.header('Content-Type', contentType);
  // @ts-expect-error
  (resp.Body as any).pipe(reply.raw);
  return reply;
});

// Webhooks (Stripe, jobs) stub
app.post('/v1/webhooks/stripe', async (_req, reply) => {
  return reply.code(200).send();
});

app.post('/v1/webhooks/jobs', async (_req, reply) => {
  return reply.code(200).send();
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
});
