import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function HomePage() {
  return (
    <main>
      <Nav />
      <section className="py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Ultra‑realistic AI Voice Studio</h1>
        <p className="mt-4 text-lg text-gray-300">TTS, STT, dubbing, voice cloning, and conversational AI — in one platform.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/studio" className="px-5 py-3 bg-brand-600 rounded-md font-medium">
            Try Studio
          </Link>
          <Link
            href="/pricing"
            className="px-5 py-3 border border-gray-600 rounded-md font-medium"
          >
            View Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
