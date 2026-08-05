import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="ua-site-footer">
      <div className="ua-site-footer-inner">
        <span>© 2026 Urd Atlas.</span>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
          <Link href="/about" className="ua-vf-text-link" style={{ fontSize: "11px" }}>About</Link>
          <Link href="/legal" className="ua-vf-text-link" style={{ fontSize: "11px" }}>Legal</Link>
          <Link href="/terms" className="ua-vf-text-link" style={{ fontSize: "11px" }}>Terms</Link>
          <Link href="/privacy" className="ua-vf-text-link" style={{ fontSize: "11px" }}>Privacy</Link>
        </nav>

        <span>No price data · No forecasts · No recommendations</span>
      </div>
    </footer>
  );
}
