import { ImageResponse } from "next/og";
import { RADAR_PATHS, RADAR_CIRCLE } from "@/lib/icons/radar-paths";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: 80,
        }}
      >
        <svg
          width="380"
          height="380"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.2"
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
