import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: "#06b6d4",
            letterSpacing: "-0.05em",
            fontFamily: "system-ui",
          }}
        >
          N
        </div>
      </div>
    ),
    { ...size }
  );
}
