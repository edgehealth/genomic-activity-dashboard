export default function Header() {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__dot" aria-hidden />
        <div>
          <div className="topbar__title">Genomic Testing Activity</div>
          <div className="topbar__sub">
            Regional variation across Genomic Laboratory Hubs · Q3 2025/26
          </div>
        </div>
      </div>
      <div className="topbar__meta">
        <div>
          <span className="topbar__metalabel">Source</span>
          NHS England · Genomic Testing Activity
        </div>
        <div>
          <span className="topbar__metalabel">Updated</span>
          Apr 2026
        </div>
        <div className="topbar__eh">Edge Health</div>
      </div>
    </header>
  )
}
