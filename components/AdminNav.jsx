'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();
  
  const isActive = (path) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="border-b border-gray-300 pb-3 mb-4 sm:mb-6">
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
        <Link 
          href="/admin" 
          className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive('/admin')
              ? 'bg-gray-200 text-gray-900 font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Dashboard
        </Link>
        <Link 
          href="/admin/items/new" 
          className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive('/admin/items/new')
              ? 'bg-gray-200 text-gray-900 font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          New Item
        </Link>
        <Link 
          href="/admin/vendor-admins" 
          className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive('/admin/vendor-admins')
              ? 'bg-gray-200 text-gray-900 font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Donors
        </Link>
      </div>
    </nav>
  );
}
