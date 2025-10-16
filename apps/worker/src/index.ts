import { Queue, Worker, Job } from 'bullmq';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import IORedis from 'ioredis';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

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

const prisma = new PrismaClient();

async function ensureBucket(bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

function generateWavSine(seconds: number, frequency = 440, sampleRate = 44100): Buffer {
  const numSamples = Math.floor(seconds * sampleRate);
  const headerSize = 44;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(headerSize + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format PCM
  buffer.writeUInt16LE(1, 22); // channels mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    const intSample = Math.max(-1, Math.min(1, sample)) * 0.25; // reduce volume
    const s = Math.floor(intSample * 32767);
    buffer.writeInt16LE(s, headerSize + i * 2);
  }
  return buffer;
}

async function handleTts(job: Job) {
  const dbJobId: string | undefined = (job.data as any).dbJobId;
  const bucket = process.env.S3_BUCKET || 'audio-ai';
  await ensureBucket(bucket);
  const wav = generateWavSine(1.0);
  const key = `tts/${dbJobId || job.id}.wav`;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: wav, ContentType: 'audio/wav' }));
  if (dbJobId) {
    await prisma.job.update({ where: { id: dbJobId }, data: { status: 'completed' as any, s3Path: key, resultUrl: `s3://${bucket}/${key}` } });
  }
  return { s3Path: key };
}

async function handleStt(job: Job) {
  const dbJobId: string | undefined = (job.data as any).dbJobId;
  if (dbJobId) {
    await prisma.job.update({ where: { id: dbJobId }, data: { status: 'completed' as any, resultUrl: undefined } });
  }
  return { transcript: 'Hello world', words: [{ start: 0, end: 0.5, text: 'Hello' }] };
}

async function handleCloning(job: Job) {
  const dbJobId: string | undefined = (job.data as any).dbJobId;
  if (dbJobId) {
    await prisma.job.update({ where: { id: dbJobId }, data: { status: 'completed' as any } });
  }
  return { cloneId: 'vc_' + job.id, status: 'ready' };
}

new Worker('tts', handleTts, { connection });
new Worker('stt', handleStt, { connection });
new Worker('cloning', handleCloning, { connection });

console.log('Worker running');
