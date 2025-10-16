export interface AudioAIOptions {
  apiKey: string;
  baseUrl?: string;
}

export class AudioAI {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts: AudioAIOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? 'http://localhost:4000';
  }

  private async request(path: string, init: RequestInit): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  }

  tts = {
    synthesize: async (input: { text: string; voiceId: string; format?: 'mp3' | 'wav' }) => {
      return this.request('/v1/tts/synthesize', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  };

  stt = {
    transcribe: async (input: { /* file upload flow in app */ }) => {
      return this.request('/v1/stt/transcribe', { method: 'POST', body: JSON.stringify(input) });
    },
  };

  jobs = {
    get: async (id: string) => {
      return this.request(`/v1/jobs/${id}`, { method: 'GET' });
    },
  };
}
