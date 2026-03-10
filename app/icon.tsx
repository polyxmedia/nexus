import { ImageResponse } from "next/og";
import { RADAR_PATHS, RADAR_CIRCLE } from "@/lib/icons/radar-paths";

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
          background: "transparent",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {RADAR_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
          <circle cx={RADAR_CIRCLE.cx} cy={RADAR_CIRCLE.cy} r={RADAR_CIRCLE.r} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
