import Link from 'next/link';
import { Menu } from 'lucide-react';

export function Nav() {
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
    </nav>
  );
}
