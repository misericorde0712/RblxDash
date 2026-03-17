import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "RblxDash — Game Operations for Roblox Studios"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111111",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#e8822a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            RD
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, color: "#e8822a" }}>
            RblxDash
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "880px",
          }}
        >
          Game Operations for{" "}
          <span style={{ color: "#e8822a" }}>Roblox Studios</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "#9ca3af",
            lineHeight: 1.5,
            maxWidth: "720px",
          }}
        >
          Live servers, player analytics, moderation, and economy tracking — all in one dashboard. Open source.
        </div>

        {/* Pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "48px",
          }}
        >
          {["Free plan", "7-day trial", "Open source"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                borderRadius: "999px",
                border: "1px solid #2a2a2a",
                background: "#1e1e1e",
                fontSize: "16px",
                color: "#9ca3af",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
