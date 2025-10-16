import { Queue, Worker, Job } from 'bullmq';
import { S3Client } from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
export const queues = {
  tts: new Queue('tts', { connection }),
  stt: new Queue('stt', { connection }),
  cloning: new Queue('cloning', { connection }),
};

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! }
    : undefined,
});

const prisma = new PrismaClient();

async function handleTts(job: Job) {
  const url = 's3://audio-ai/placeholder.mp3';
  await prisma.job.update({ where: { id: job.id as string }, data: { status: 'completed', result: { url } } }).catch(() => {});
  return { url, input: job.data };
}

async function handleStt(job: Job) {
  const result = { transcript: 'Hello world', words: [{ start: 0, end: 0.5, text: 'Hello' }] };
  await prisma.job.update({ where: { id: job.id as string }, data: { status: 'completed', result } }).catch(() => {});
  return result;
}

async function handleCloning(job: Job) {
  const cloneId = (job.data as any).cloneId || 'vc_' + job.id;
  await prisma.voiceClone.update({ where: { id: cloneId }, data: { status: 'ready', modelRef: `model_${cloneId}` } }).catch(() => {});
  await prisma.job.update({ where: { id: job.id as string }, data: { status: 'completed', result: { cloneId, status: 'ready' } } }).catch(() => {});
  return { cloneId, status: 'ready' };
}

new Worker('tts', handleTts, { connection });
new Worker('stt', handleStt, { connection });
new Worker('cloning', handleCloning, { connection });

console.log('Worker running');
