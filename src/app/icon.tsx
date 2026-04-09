import { ImageResponse } from "next/og"

export const contentType = "image/png"
export const size = {
  width: 512,
  height: 512,
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111111",
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(255,190,126,0.45), transparent 45%)",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 96,
            background: "#e8822a",
            color: "#111111",
            fontSize: 170,
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
