export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface ApiJob {
  id: string;
  type: 'tts' | 'stt' | 'cloning' | 'dubbing';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface TtsRequest {
  text: string;
  voiceId: string;
  language?: string;
  format?: 'mp3' | 'wav';
  speed?: number; // 0.5 - 2
  pitch?: number; // -12 .. +12 semitones
  ssml?: boolean;
}

export interface TtsResponse {
  jobId: string;
  estimatedSeconds: number;
}
