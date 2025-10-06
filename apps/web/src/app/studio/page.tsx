import { Nav } from '@/components/Nav';

export default function StudioPage() {
  return (
    <main>
      <Nav />
      <section className="py-6">
        <h1 className="text-3xl font-bold">Studio</h1>
        <p className="mt-2 text-gray-300">Project-based multi-track editor. (Scaffold)</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Text Editor</h3>
            <textarea className="mt-2 w-full h-40 bg-black/30 rounded p-2" placeholder="Type your script..." />
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Timeline</h3>
            <div className="mt-2 h-40 bg-black/30 rounded" />
          </div>
        </div>
      </section>
    </main>
  );
}
