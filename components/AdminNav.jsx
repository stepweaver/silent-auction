import Link from 'next/link';

export default function AdminNav() {
  return (
    <nav className="border-b pb-4 mb-6">
      <div className="flex gap-4 items-center">
        <Link href="/admin" className="font-semibold hover:underline">
          Dashboard
        </Link>
        <Link href="/admin/items/new" className="hover:underline">
          New Item
        </Link>
        <Link href="/" className="hover:underline ml-auto">
          View Catalog
        </Link>
      </div>
    </nav>
  );
}
