import Link from 'next/link';
import { Nav } from '@/components/Nav';

const tiers = [
  { name: 'Free', price: '$0', credits: '10k', features: ['TTS & STT', 'Limited Studio', 'API low concurrency'] },
  { name: 'Starter', price: '$5', credits: '30k', features: ['Instant cloning', 'Dubbing Studio', '20 projects'] },
  { name: 'Creator', price: '$11', credits: '100k', features: ['Pro cloning', '192kbps audio', 'Usage billing'] },
  { name: 'Pro', price: '$99', credits: '500k', features: ['44.1kHz PCM', 'Advanced export', 'Priority support'] },
  { name: 'Scale', price: '$330', credits: '2M + 3 seats', features: ['Team workspace', 'Admin controls', 'Higher concurrency'] },
  { name: 'Business', price: '$1320', credits: '11M + 5 seats', features: ['Low-latency pricing', '3 pro clones', 'SLA support'] },
];

export default function PricingPage() {
  return (
    <main>
      <Nav />
      <section className="py-12">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="mt-3 text-gray-300">Simple plans for creators, teams, and enterprises.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className="rounded-lg border border-gray-700 p-6">
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <p className="mt-1 text-3xl font-bold">{t.price}<span className="text-base font-normal text-gray-400">/mo</span></p>
              <p className="mt-2 text-gray-400">Credits: {t.credits}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-300">
                {t.features.map((f) => (<li key={f}>• {f}</li>))}
              </ul>
              <Link href="/signup" className="mt-6 inline-block px-4 py-2 bg-brand-600 rounded-md">Get started</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
