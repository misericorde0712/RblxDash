import { ImageResponse } from "next/og"

export const contentType = "image/png"
export const size = {
  width: 180,
  height: 180,
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
        }}
      >
        <div
          style={{
            width: 134,
            height: 134,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 34,
            background: "#e8822a",
            color: "#111111",
            fontSize: 54,
            fontWeight: 800,
            letterSpacing: "-0.08em",
          }}
        >
          RD
        </div>
      </div>
    ),
    size
  )
}
