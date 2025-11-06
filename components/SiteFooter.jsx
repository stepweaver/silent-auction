export default function SiteFooter() {
  return (
    <footer className='mt-auto'>
      <div className='max-w-7xl mx-auto px-4 py-1.5'>
        <div className='flex items-center justify-center w-full'>
          <a
            href='https://stepweaver.dev'
            className='text-xs text-gray-400 hover:text-primary transition-colors duration-200'
            target='_blank'
            rel='noopener noreferrer'
          >
            crafted by λstepweaver
          </a>
        </div>
      </div>
    </footer>
  );
}
