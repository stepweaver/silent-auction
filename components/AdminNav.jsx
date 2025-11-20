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
          className={`relative px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive('/admin')
              ? 'text-gray-900 font-semibold'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Dashboard
          {isActive('/admin') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 -mb-3"></span>
          )}
        </Link>
        <Link 
          href="/admin/items/new" 
          className={`relative px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive('/admin/items/new')
              ? 'text-gray-900 font-semibold'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          New Item
          {isActive('/admin/items/new') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 -mb-3"></span>
          )}
        </Link>
        <Link 
          href="/admin/vendor-admins" 
          className={`relative px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive('/admin/vendor-admins')
              ? 'text-gray-900 font-semibold'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Donors
          {isActive('/admin/vendor-admins') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 -mb-3"></span>
          )}
        </Link>
      </div>
    </nav>
  );
}
