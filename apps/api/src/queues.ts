import { Queue, Job, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const defaultOptions: QueueOptions = { connection } as any;

export const queues = {
  tts: new Queue('tts', defaultOptions),
  stt: new Queue('stt', defaultOptions),
  cloning: new Queue('cloning', defaultOptions),
};

// BullMQ v5 no longer requires QueueScheduler

export async function getJobById(id: string): Promise<Job | null> {
  for (const q of Object.values(queues)) {
    const job = await q.getJob(id);
    if (job) return job;
  }
  return null;
}
