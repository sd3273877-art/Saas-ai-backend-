"use client";
import { Nav } from '@/components/Nav';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<{id:string; type:string; status:string}[]>([]);
  useEffect(() => {
    // Placeholder: in real app fetch from API
    setJobs([{ id: '1', type: 'tts', status: 'completed' }]);
  }, []);
  return (
    <main>
      <Nav />
      <section className="py-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Credits</h3>
            <p className="text-2xl mt-2">100,000</p>
            <p className="text-xs text-gray-400">resets Nov 1</p>
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Recent Jobs</h3>
            <ul className="mt-2 text-sm text-gray-300 space-y-1">
              {jobs.map(j => (<li key={j.id}>{j.type}: {j.status}</li>))}
            </ul>
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Projects</h3>
            <p className="text-sm text-gray-300 mt-2">2 active</p>
          </div>
        </div>
      </section>
    </main>
  );
}
