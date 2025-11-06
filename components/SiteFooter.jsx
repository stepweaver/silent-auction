export default function SiteFooter() {
  return (
    <footer className='mt-auto bg-white border-t border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 py-3'>
        <div className='flex flex-col sm:flex-row items-center justify-between gap-2 w-full text-xs text-gray-600'>
          <p className='text-center sm:text-left'>
            © {new Date().getFullYear()} PTO Silent Auction
          </p>
          <p className='text-center sm:text-right'>
            Experience crafted by{' '}
            <a
              href='https://stepweaver.dev'
              className='inline-flex items-center gap-1 font-medium text-primary hover:text-primary-focus transition-colors duration-200 group'
              target='_blank'
              rel='noopener noreferrer'
            >
              <span>λstepweaver LLC</span>
              <svg
                className='w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                />
              </svg>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
