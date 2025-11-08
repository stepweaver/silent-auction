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
    <header className='no-print border-b border-gray-200/70 bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/70'>
      <nav className='max-w-7xl mx-auto px-3 sm:px-4'>
        <div className='flex items-center justify-between gap-2 py-2.5 sm:py-3'>
          <Link
            href='/'
            className='flex items-center gap-2 hover:opacity-85 transition-opacity min-w-0 flex-1 pr-2 touch-manipulation'
          >
            <Image
              src='/logo-with-glow.png'
              alt='Mary Frank Elementary'
              width={32}
              height={32}
              className='object-contain shrink-0'
              priority
              loading='eager'
              style={{ width: '32px', height: '32px' }}
            />
            <div className='flex flex-col min-w-0'>
              <span className='font-semibold text-sm leading-tight text-gray-900'>
                Mary Frank Silent Auction
              </span>
              <span className='text-xs leading-tight text-gray-600 truncate'>
                PTO Fundraiser
              </span>
            </div>
          </Link>

          <div className='hidden xl:flex items-center gap-1'>
            <Link
              href='/'
              aria-current={
                isActive('/') &&
                pathname !== '/avatar' &&
                pathname !== '/how-to-bid'
                  ? 'page'
                  : undefined
              }
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/') &&
                pathname !== '/avatar' &&
                pathname !== '/how-to-bid'
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={
                isActive('/') &&
                pathname !== '/avatar' &&
                pathname !== '/how-to-bid'
                  ? {
                      backgroundColor: 'var(--primary-500)',
                    }
                  : {}
              }
            >
              Catalog
            </Link>
            <Link
              href='/avatar'
              aria-current={isActive('/avatar') ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/avatar')
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={
                isActive('/avatar')
                  ? {
                      backgroundColor: 'var(--primary-500)',
                    }
                  : {}
              }
            >
              Dashboard
            </Link>
            <Link
              href='/how-to-bid'
              aria-current={isActive('/how-to-bid') ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/how-to-bid')
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={
                isActive('/how-to-bid')
                  ? {
                      backgroundColor: 'var(--primary-500)',
                    }
                  : {}
              }
            >
              How to Bid
            </Link>
            <Link
              href='/admin'
              aria-current={isActive('/admin') ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={
                isActive('/admin')
                  ? {
                      backgroundColor: 'var(--primary-500)',
                    }
                  : {}
              }
            >
              Admin
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='xl:hidden shrink-0 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 active:bg-gray-100 transition-colors touch-manipulation'
            aria-label='Toggle menu'
            aria-expanded={mobileMenuOpen}
            aria-controls='mobile-navigation'
            type='button'
            style={{
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            {mobileMenuOpen ? (
              <svg
                className='w-6 h-6 text-gray-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            ) : (
              <svg
                className='w-6 h-6 text-gray-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            id='mobile-navigation'
            className='xl:hidden border-t border-gray-200 bg-white rounded-b-lg shadow-sm'
          >
            <div className='py-2 px-1'>
              <Link
                href='/'
                aria-current={
                  isActive('/') &&
                  pathname !== '/avatar' &&
                  pathname !== '/how-to-bid'
                    ? 'page'
                    : undefined
                }
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors mb-1 active:opacity-85 touch-manipulation ${
                  isActive('/') &&
                  pathname !== '/avatar' &&
                  pathname !== '/how-to-bid'
                    ? 'text-white'
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={
                  isActive('/') &&
                  pathname !== '/avatar' &&
                  pathname !== '/how-to-bid'
                    ? {
                        backgroundColor: 'var(--primary-500)',
                        minHeight: '48px',
                      }
                    : {
                        minHeight: '48px',
                      }
                }
              >
                Catalog
              </Link>
              <Link
                href='/avatar'
                aria-current={isActive('/avatar') ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors mb-1 active:opacity-85 touch-manipulation ${
                  isActive('/avatar')
                    ? 'text-white'
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={
                  isActive('/avatar')
                    ? {
                        backgroundColor: 'var(--primary-500)',
                        minHeight: '48px',
                      }
                    : {
                        minHeight: '48px',
                      }
                }
              >
                Dashboard
              </Link>
              <Link
                href='/how-to-bid'
                aria-current={isActive('/how-to-bid') ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors active:opacity-85 touch-manipulation ${
                  isActive('/how-to-bid')
                    ? 'text-white'
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={
                  isActive('/how-to-bid')
                    ? {
                        backgroundColor: 'var(--primary-500)',
                        minHeight: '48px',
                      }
                    : {
                        minHeight: '48px',
                      }
                }
              >
                How to Bid
              </Link>
              <Link
                href='/admin'
                aria-current={isActive('/admin') ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors active:opacity-85 touch-manipulation ${
                  isActive('/admin')
                    ? 'text-white'
                    : 'text-gray-700 active:bg-gray-100'
                }`}
                style={
                  isActive('/admin')
                    ? {
                        backgroundColor: 'var(--primary-500)',
                        minHeight: '48px',
                      }
                    : {
                        minHeight: '48px',
                      }
                }
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
