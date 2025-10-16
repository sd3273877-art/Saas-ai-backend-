"use client";
import { Nav } from '@/components/Nav';
import { useState } from 'react';

export default function StudioPage() {
  const [text, setText] = useState('Hello world');
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function synth() {
    setResultUrl(null);
    const token = localStorage.getItem('af_jwt');
    if (!token) return alert('Please sign up or log in first.');
    const res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + '/v1/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, voiceId: 'en_female_a', format: 'mp3' }),
    });
    const data = await res.json();
    setJobId(data.jobId);
    poll(data.jobId);
  }

  async function poll(id: string) {
    const token = localStorage.getItem('af_jwt');
    const url = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + `/v1/jobs/${id}`;
    const iv = setInterval(async () => {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.status === 'completed' && j.result?.url) {
        clearInterval(iv);
        setResultUrl(j.result.url);
      }
    }, 1000);
  }
  return (
    <main>
      <Nav />
      <section className="py-6">
        <h1 className="text-3xl font-bold">Studio</h1>
        <p className="mt-2 text-gray-300">Project-based multi-track editor. (Scaffold)</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Text Editor</h3>
            <textarea className="mt-2 w-full h-40 bg-black/30 rounded p-2" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="mt-3 px-4 py-2 bg-brand-600 rounded" onClick={synth}>Synthesize</button>
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Timeline</h3>
            <div className="mt-2 h-40 bg-black/30 rounded" />
            {jobId && <p className="mt-2 text-sm text-gray-400">Job: {jobId}</p>}
            {resultUrl && (
              <audio className="mt-3" controls>
                <source src={resultUrl} />
              </audio>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
