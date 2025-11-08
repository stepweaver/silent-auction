import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className='no-print mt-auto border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80'>
      <div className='max-w-7xl mx-auto px-4 py-3 sm:py-4'>
        <nav
          className='flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600'
          aria-label='Footer'
        >
          <p className='text-center sm:text-left'>
            © {new Date().getFullYear()} Mary Frank Elementary PTO
          </p>
          <div className='flex items-center gap-4'>
            <Link className='font-medium text-gray-600 hover:text-gray-900' href='/terms'>
              Terms &amp; Privacy
            </Link>
            <a
              className='font-medium text-gray-600 hover:text-gray-900'
              href='mailto:pto@maryfrankpto.org'
            >
              Contact
            </a>
            <a
              href='https://stepweaver.dev'
              className='font-medium text-gray-600 hover:text-gray-900'
              target='_blank'
              rel='noopener noreferrer'
            >
              Crafted by λstepweaver
            </a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
