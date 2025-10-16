"use client";
import { Nav } from '@/components/Nav';
import { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + '/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('af_jwt', data.token);
      window.location.href = '/dashboard';
    }
  }
  return (
    <main>
      <Nav />
      <section className="py-12 max-w-lg">
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-gray-300">Start your free trial in minutes.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input className="w-full rounded bg-black/30 p-3" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="w-full rounded bg-black/30 p-3" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button type="submit" className="w-full px-4 py-2 bg-brand-600 rounded-md">Continue</button>
        </form>
      </section>
    </main>
  );
}
