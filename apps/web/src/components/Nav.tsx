"use client";
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Nav() {
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    setIsAuthed(!!localStorage.getItem('af_jwt'));
  }, []);
  return (
    <nav className="flex items-center justify-between py-4">
      <Link href="/" className="text-xl font-semibold">
        AuralForge
      </Link>
      <div className="hidden md:flex gap-6 text-sm text-gray-300">
        <Link href="/pricing">Pricing</Link>
        <Link href="/studio">Studio</Link>
        <Link href="/developers">API</Link>
        <Link href="/dashboard">Dashboard</Link>
      </div>
      <div className="md:hidden">
        <Menu />
      </div>
      <div className="hidden md:block">
        {!isAuthed ? (
          <Link href="/signup" className="px-3 py-2 bg-brand-600 rounded">Sign up</Link>
        ) : (
          <button className="text-sm text-gray-300" onClick={() => { localStorage.removeItem('af_jwt'); window.location.reload(); }}>Log out</button>
        )}
      </div>
    </nav>
  );
}
