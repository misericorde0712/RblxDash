import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact & Support",
  description: "Get help with RblxDash — contact the team or report a bug.",
}

export default function ContactPage() {
  return (
    <div style={{ background: "#111111", minHeight: "100vh" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "18px", color: "#e8822a", textDecoration: "none" }}>
            RblxDash
          </Link>
          <Link href="/dashboard" style={{ fontSize: "14px", color: "#9ca3af", textDecoration: "none" }}>
            Dashboard →
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff", margin: "0 0 12px" }}>
          Contact &amp; Support
        </h1>
        <p style={{ fontSize: "16px", color: "#9ca3af", margin: "0 0 48px", lineHeight: "1.6" }}>
          Need help, found a bug, or have a question about your account? Here&apos;s how to reach us.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          {/* Email */}
          <div style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(232,130,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#e8822a" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>Email</p>
                <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.5" }}>
                  For billing questions, account issues, and general support. We reply within 24–48h.
                </p>
                <a
                  href="mailto:support@rblxdash.com"
                  style={{ fontSize: "14px", color: "#e8822a", textDecoration: "none", fontWeight: 500 }}
                >
                  support@rblxdash.com
                </a>
              </div>
            </div>
          </div>

          {/* GitHub */}
          <div style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(156,163,175,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" fill="#9ca3af" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>GitHub Issues</p>
                <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.5" }}>
                  Bug reports, feature requests, and open source contributions. Public and transparent.
                </p>
                <a
                  href="https://github.com/desgagneweb/rblxdash/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "14px", color: "#e8822a", textDecoration: "none", fontWeight: 500 }}
                >
                  Open an issue →
                </a>
              </div>
            </div>
          </div>

          {/* Dashboard help */}
          <div style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>Documentation &amp; Setup Guide</p>
                <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#9ca3af", lineHeight: "1.5" }}>
                  Step-by-step installation guide and full API reference inside the dashboard.
                </p>
                <div style={{ display: "flex", gap: "16px" }}>
                  <Link href="/dashboard/guide" style={{ fontSize: "14px", color: "#e8822a", textDecoration: "none", fontWeight: 500 }}>
                    Setup guide →
                  </Link>
                  <Link href="/dashboard/docs" style={{ fontSize: "14px", color: "#e8822a", textDecoration: "none", fontWeight: 500 }}>
                    API docs →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Response time note */}
        <div style={{ marginTop: "40px", padding: "20px 24px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#666666", lineHeight: "1.6" }}>
            <strong style={{ color: "#9ca3af" }}>Response times:</strong> Email support is handled by the core team — expect a reply within 1–2 business days.
            For urgent billing issues, mention it in the subject line.
            For security vulnerabilities, see our{" "}
            <a href="https://github.com/desgagneweb/rblxdash/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" style={{ color: "#e8822a" }}>
              security policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
