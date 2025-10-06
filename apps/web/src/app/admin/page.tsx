import { Nav } from '@/components/Nav';

export default function AdminPage() {
  return (
    <main>
      <Nav />
      <section className="py-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Users</h3>
            <p className="text-sm text-gray-300 mt-2">Manage seats and roles</p>
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Usage</h3>
            <p className="text-sm text-gray-300 mt-2">Credits, overage, and logs</p>
          </div>
          <div className="rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold">Billing</h3>
            <p className="text-sm text-gray-300 mt-2">Plans, invoices, coupons</p>
          </div>
        </div>
      </section>
    </main>
  );
}
