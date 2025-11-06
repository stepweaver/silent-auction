'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo and Title - Left Side */}
          <Link href="/" className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity min-w-0 flex-1 pr-2 touch-manipulation">
            <div className="flex-shrink-0">
              <Image
                src="/logo-with-glow.png"
                alt="Mary Frank Elementary"
                width={36}
                height={36}
                className="object-contain"
                style={{ width: '36px', height: '36px' }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-tight text-gray-900">
                Mary Frank Elementary
              </span>
              <span className="text-xs leading-tight text-gray-600">
                PTO Silent Auction Fundraiser
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Right Side - Only show on very large screens */}
          <div className="hidden xl:flex items-center space-x-1 flex-shrink-0">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') && pathname !== '/avatar' && pathname !== '/how-to-bid' 
                  ? 'text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive('/') && pathname !== '/avatar' && pathname !== '/how-to-bid' ? {
                backgroundColor: '#00b140'
              } : {}}
            >
              Catalog
            </Link>
            <Link 
              href="/avatar" 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/avatar') 
                  ? 'text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive('/avatar') ? {
                backgroundColor: '#00b140'
              } : {}}
            >
              Dashboard
            </Link>
            <Link 
              href="/how-to-bid" 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/how-to-bid') 
                  ? 'text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive('/how-to-bid') ? {
                backgroundColor: '#00b140'
              } : {}}
            >
              How to Bid
            </Link>
          </div>

          {/* Mobile Menu Button - Show on all screens except xl */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden flex-shrink-0 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 active:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Toggle menu"
            type="button"
            style={{ 
              minWidth: '48px',
              minHeight: '48px',
            }}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown - Show on all screens except xl */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-200 bg-white">
            <div className="py-2 px-1">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3.5 rounded-lg text-base font-medium transition-colors mb-1 active:opacity-80 touch-manipulation ${
                  isActive('/') && pathname !== '/avatar' && pathname !== '/how-to-bid' 
                    ? 'text-white' 
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={isActive('/') && pathname !== '/avatar' && pathname !== '/how-to-bid' ? {
                  backgroundColor: '#00b140',
                  minHeight: '48px'
                } : {
                  minHeight: '48px'
                }}
              >
                Catalog
              </Link>
              <Link 
                href="/avatar" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3.5 rounded-lg text-base font-medium transition-colors mb-1 active:opacity-80 touch-manipulation ${
                  isActive('/avatar') 
                    ? 'text-white' 
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={isActive('/avatar') ? {
                  backgroundColor: '#00b140',
                  minHeight: '48px'
                } : {
                  minHeight: '48px'
                }}
              >
                Dashboard
              </Link>
              <Link 
                href="/how-to-bid" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3.5 rounded-lg text-base font-medium transition-colors active:opacity-80 touch-manipulation ${
                  isActive('/how-to-bid') 
                    ? 'text-white' 
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={isActive('/how-to-bid') ? {
                  backgroundColor: '#00b140',
                  minHeight: '48px'
                } : {
                  minHeight: '48px'
                }}
              >
                How to Bid
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


