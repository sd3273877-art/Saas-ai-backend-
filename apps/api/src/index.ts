import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { queues, getJobById } from './queues.js';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import 'dotenv/config';

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

// Auth routes (stub)
app.post('/v1/auth/login', async (req, reply) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6) });
  const body = Body.parse((req as any).body);
  // TODO: verify user
  const token = (app as any).jwt.sign({ sub: body.email, roles: ['owner'] });
  return reply.send({ token });
});

// API Keys (stub)
app.get('/v1/api-keys', { preHandler: [authenticate] }, async (_req, _reply) => {
  return [{ id: 'key_123', name: 'Default', createdAt: new Date().toISOString() }];
});

// TTS synthesize (stub streaming later)
app.post('/v1/tts/synthesize', { preHandler: [authenticate] }, async (req, reply) => {
  const Body = z.object({ text: z.string(), voiceId: z.string(), language: z.string().optional(), format: z.enum(['mp3', 'wav']).default('mp3') });
  const body = Body.parse((req as any).body);
  const job = await queues.tts.add('synthesize', body, { removeOnComplete: 100, removeOnFail: 100 } as any);
  return reply.send({ jobId: job.id, estimatedSeconds: 3, request: body });
});

// STT transcribe (stub)
app.post('/v1/stt/transcribe', { preHandler: [authenticate] }, async (req, reply) => {
  const job = await queues.stt.add('transcribe', {}, { removeOnComplete: 100, removeOnFail: 100 } as any);
  return reply.send({ jobId: job.id, estimatedSeconds: 10 });
});

// Voice cloning (stub)
app.post('/v1/voices/clone', { preHandler: [authenticate] }, async (_req, reply) => {
  const job = await queues.cloning.add('clone', {}, { removeOnComplete: 100, removeOnFail: 100 } as any);
  return reply.send({ cloneId: 'vc_' + job.id, status: 'queued', jobId: job.id });
});

// Jobs
app.get('/v1/jobs/:id', { preHandler: [authenticate] }, async (req, reply) => {
  const id = (req.params as any).id as string;
  const job = await getJobById(id);
  if (!job) return reply.code(404).send({ error: 'not found' });
  const state = await job.getState();
  const result = state === 'completed' ? await job.getReturnValue() : undefined;
  return reply.send({ id: job.id, queue: job.queueName, status: state, result });
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
