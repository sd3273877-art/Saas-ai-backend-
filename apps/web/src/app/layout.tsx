import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuralForge — AI Audio Studio',
  description: 'Ultra-realistic TTS/STT, dubbing, cloning, and studio tools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="container-max py-6">{children}</div>
      </body>
    </html>
  );
}
