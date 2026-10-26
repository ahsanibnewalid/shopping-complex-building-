/** Oversized-type footer anchoring the marketplace pages. */
export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-[#111] bg-white">
      <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-16 sm:px-8">
        <p
          aria-hidden
          className="font-display -ml-[0.06em] select-none whitespace-nowrap text-[12vw] font-black leading-[0.85] tracking-tighter text-[#111]"
        >
          BAZARHUB
        </p>
        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-[#111] pt-6 sm:flex-row sm:items-end">
          <p className="micro-label text-[#777]">
            One address. Every shop in the building.
          </p>
          <div className="flex gap-6">
            <a href="/" className="nav-link micro-label text-[#111]">
              Directory
            </a>
            <a href="/sell" className="nav-link micro-label text-[#111]">
              Sell With Us
            </a>
            <a href="/track-order" className="nav-link micro-label text-[#111]">
              Track Order
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
