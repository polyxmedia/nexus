import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            fontSize: 18,
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
