import Link from 'next/link';

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    process.env.AUCTION_CONTACT_EMAIL ||
    'auction@stepweaver.dev';

  return (
    <footer className="no-print border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-3">
        <nav
          className="flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600"
          aria-label="Footer"
        >
          <p className="w-full text-center sm:w-auto sm:text-left">
            © {currentYear} Mary Frank PTO
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1">
            <Link
              className="font-medium text-gray-600 hover:text-gray-900"
              href="/terms"
            >
              Terms &amp; Privacy
            </Link>
            <a
              className="font-medium text-gray-600 hover:text-gray-900"
              href={`mailto:${contactEmail}`}
            >
              Contact
            </a>
            <a
              href="https://stepweaver.dev"
              className="font-medium text-gray-600 hover:text-gray-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Crafted by λstepweaver
            </a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
