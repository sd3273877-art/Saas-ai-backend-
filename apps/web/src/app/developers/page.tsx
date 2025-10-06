import { Nav } from '@/components/Nav';

export default function DevelopersPage() {
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
        </div>
      </section>
    </main>
  );
}
