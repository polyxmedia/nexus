import { ImageResponse } from "next/og";
import { RADAR_PATHS, RADAR_CIRCLE } from "@/lib/icons/radar-paths";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: 32,
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.5"
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
