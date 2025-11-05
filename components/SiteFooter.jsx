export default function SiteFooter() {
  return (
    <footer className="footer footer-center p-6 bg-base-200 text-base-content border-t border-base-300 mt-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <p className="text-sm">
            © {new Date().getFullYear()} PTO Silent Auction
          </p>
          <p className="text-sm">
            Experience crafted by{' '}
            <a
              href="https://stepweaver.dev"
              className="link link-primary font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              λstepweaver LLC
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}


