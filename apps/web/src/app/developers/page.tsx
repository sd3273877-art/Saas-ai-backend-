"use client";
import { Nav } from '@/components/Nav';
import { useEffect, useState } from 'react';

export default function DevelopersPage() {
  const [keys, setKeys] = useState<{id:string; name:string; createdAt:string}[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('af_jwt');
    if (!token) return;
    fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + '/v1/api-keys', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setKeys).catch(()=>{});
  }, []);

  async function createKey() {
    setCreating(true);
    const token = localStorage.getItem('af_jwt');
    const res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + '/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Default' }),
    });
    const k = await res.json();
    setCreating(false);
    setKeys((prev) => [...prev, { id: k.id, name: 'Default', createdAt: new Date().toISOString() }]);
  }
  return (
    <main>
      <Nav />
      <section className="py-12">
        <h1 className="text-4xl font-bold">Developers</h1>
        <p className="mt-3 text-gray-300">REST API and SDKs for TTS, STT, cloning, jobs, and webhooks.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold">JavaScript</h2>
            <pre className="mt-3 rounded bg-black/40 p-4 text-sm overflow-x-auto"><code>{`import { AudioAI } from '@auralforge/sdk';
const client = new AudioAI({ apiKey: process.env.AUDIOAI_API_KEY });
const audio = await client.tts.synthesize({ text: 'Hello', voiceId: 'en_female_a', format: 'mp3' });
`}</code></pre>
          </div>
          <div className="rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold">Python</h2>
            <pre className="mt-3 rounded bg-black/40 p-4 text-sm overflow-x-auto"><code>{`from auralforge import AudioAI
client = AudioAI(api_key=os.environ['AUDIOAI_API_KEY'])
audio = client.tts.synthesize(text='Hello', voice_id='en_female_a', format='mp3')
`}</code></pre>
          </div>
          <div className="rounded-lg border border-gray-700 p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">API Keys</h2>
              <button className="px-3 py-2 bg-brand-600 rounded" onClick={createKey} disabled={creating}>Create</button>
            </div>
            <ul className="mt-4 text-sm text-gray-300 space-y-2">
              {keys.map(k => (<li key={k.id} className="flex items-center justify-between"><span>{k.name}</span><span className="text-gray-400">{new Date(k.createdAt).toLocaleString()}</span></li>))}
              {keys.length === 0 && <li className="text-gray-400">No keys yet. Sign up and create one.</li>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
