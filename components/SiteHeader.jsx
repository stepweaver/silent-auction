export default function SiteHeader() {
  return (
    <div className="navbar bg-primary text-primary-content shadow-lg">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
        <div className="flex-1">
          <a href="/" className="btn btn-ghost normal-case text-xl hover:bg-white/10">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold leading-tight">Silent Auction</span>
              <span className="text-xs opacity-80 leading-tight">PTO Fundraiser</span>
            </div>
          </a>
        </div>
        <div className="flex-none gap-1">
          <a href="/" className="btn btn-ghost btn-sm normal-case min-h-0 h-10 px-3">Catalog</a>
          <a href="/avatar" className="btn btn-ghost btn-sm normal-case min-h-0 h-10 px-3">Dashboard</a>
          <a href="/how-to-bid" className="btn btn-ghost btn-sm normal-case min-h-0 h-10 px-3">How to Bid</a>
        </div>
      </div>
    </div>
  );
}


