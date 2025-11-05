export default function SiteHeader() {
  return (
    <div className="navbar bg-primary text-primary-content shadow-lg">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
        <div className="flex-1">
          <a href="/" className="btn btn-ghost normal-case text-xl">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mr-2">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold">Silent Auction</span>
              <span className="text-xs opacity-80">PTO Fundraiser</span>
            </div>
          </a>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1 gap-2">
            <li>
              <a href="/" className="btn btn-ghost btn-sm">Catalog</a>
            </li>
            <li>
              <a href="/how-to-bid" className="btn btn-ghost btn-sm">How to Bid</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


