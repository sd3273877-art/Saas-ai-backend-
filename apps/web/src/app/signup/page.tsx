import { Nav } from '@/components/Nav';

export default function SignupPage() {
  return (
    <main>
      <Nav />
      <section className="py-12 max-w-lg">
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-gray-300">Start your free trial in minutes.</p>
        <form className="mt-6 space-y-4">
          <input className="w-full rounded bg-black/30 p-3" placeholder="Email" />
          <input className="w-full rounded bg-black/30 p-3" placeholder="Password" type="password" />
          <button className="w-full px-4 py-2 bg-brand-600 rounded-md">Continue</button>
        </form>
      </section>
    </main>
  );
}
