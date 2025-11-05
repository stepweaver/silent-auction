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
    <nav className="bg-primary text-primary-content shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo and Title - Left Side */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity min-w-0 flex-1 pr-2">
            <div className="flex-shrink-0">
              <Image
                src="/logo-with-glow.png"
                alt="Mary Frank Elementary"
                width={40}
                height={40}
                className="object-contain w-10 h-10"
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-sm md:text-base lg:text-lg leading-tight">
                Mary Frank Elementary Silent Auction
              </span>
              <span className="text-xs sm:text-sm opacity-90 leading-tight">
                PTO Fundraiser
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Right Side */}
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            <Link 
              href="/" 
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') && pathname !== '/avatar' && pathname !== '/how-to-bid' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              Catalog
            </Link>
            <Link 
              href="/avatar" 
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/avatar') 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/how-to-bid" 
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/how-to-bid') 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              How to Bid
            </Link>
          </div>

          {/* Mobile Menu Button - Visible on screens smaller than md (768px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex-shrink-0 p-2.5 bg-white text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-white shadow-lg hover:bg-gray-100 active:bg-gray-200"
            aria-label="Toggle menu"
            type="button"
            style={{ 
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {mobileMenuOpen ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div 
            style={{
              display: 'block !important',
              width: '100%',
              paddingTop: '12px',
              paddingBottom: '16px',
              borderTop: '2px solid rgba(255, 255, 255, 0.5)',
              backgroundColor: '#00b140'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a 
                href="/" 
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  window.location.href = '/';
                }}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  textDecoration: 'none'
                }}
              >
                Catalog
              </a>
              <a 
                href="/avatar" 
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  window.location.href = '/avatar';
                }}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  textDecoration: 'none'
                }}
              >
                Dashboard
              </a>
              <a 
                href="/how-to-bid" 
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  window.location.href = '/how-to-bid';
                }}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  textDecoration: 'none'
                }}
              >
                How to Bid
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


