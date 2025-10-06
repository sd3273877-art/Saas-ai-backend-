import { Queue, Worker, Job } from 'bullmq';
import { S3Client } from '@aws-sdk/client-s3';
import IORedis from 'ioredis';
import 'dotenv/config';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
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

async function handleTts(job: Job) {
  // Placeholder: generate silent mp3 or return a stub URL
  return { url: 's3://audio-ai/placeholder.mp3', input: job.data };
}

async function handleStt(job: Job) {
  return { transcript: 'Hello world', words: [{ start: 0, end: 0.5, text: 'Hello' }] };
}

async function handleCloning(job: Job) {
  return { cloneId: 'vc_' + job.id, status: 'ready' };
}

new Worker('tts', handleTts, { connection });
new Worker('stt', handleStt, { connection });
new Worker('cloning', handleCloning, { connection });

console.log('Worker running');
