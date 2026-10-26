import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";

/** Marketplace chrome header — strict monochrome, mono micro-labels. */
export function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header className="border-b border-[#111] bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" className="font-display text-lg font-800 tracking-tight text-[#111]">
          <span className="font-black">BAZARHUB</span>
          <span className="micro-label ml-2 hidden text-[#777] sm:inline">
            Shopping Complex
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-7">
          <Link to="/" className="nav-link micro-label text-[#111]">
            Directory
          </Link>
          <Link to="/products" className="nav-link micro-label hidden text-[#111] sm:inline">
            All Products
          </Link>
          <Link to="/track-order" className="nav-link micro-label hidden text-[#111] md:inline">
            Track Order
          </Link>
          <Link to="/sell" className="nav-link micro-label text-[#111]">
            Sell With Us
          </Link>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="nav-link micro-label text-[#111]">
                  Complex Admin
                </Link>
              )}
              <Link to="/dashboard" className="micro-label border border-[#111] px-3 py-2 text-[#111] transition-colors hover:bg-[#111] hover:text-white">
                My Shops
              </Link>
              <button
                onClick={() => logout()}
                className="micro-label cursor-pointer text-[#777] transition-colors hover:text-[#111]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="micro-label border border-[#111] bg-[#111] px-3 py-2 text-white transition-colors hover:bg-white hover:text-[#111]">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
