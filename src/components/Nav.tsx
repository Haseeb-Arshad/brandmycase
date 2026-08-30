/**
 * Sticky nav — 52px, hairline base, translucent white with a saturated blur.
 * Logo left, links centre, actions right, exactly as the reference lays it out.
 */
export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <a className="wordmark" href="#top">
          <span className="wordmark-mark" aria-hidden="true">
            C/0
          </span>
          Brand My Case
        </a>

        <div className="nav-links">
          <a href="#auction">Live auction</a>
          <a href="#how">How it works</a>
          <a href="#case-story">The case</a>
          <a href="#tour">The tour</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav-right">
          <a className="nav-cta" href="#inventory">
            Get a panel
          </a>
        </div>
      </div>
    </nav>
  );
}
