import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { registerDevice, unregisterDevice, getActiveDevices } from "@/lib/notifications/push";

export async function GET() {
  const check = await requireTier("free");
  if ("response" in check) return check.response;
  const { result } = check;

  const userId = result.username;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await getActiveDevices(userId);
  return NextResponse.json(devices);
}

export async function POST(request: NextRequest) {
  const check = await requireTier("free");
  if ("response" in check) return check.response;
  const { result } = check;

  const userId = result.username;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { deviceToken, platform, deviceName } = await request.json();
    if (!deviceToken) {
      return NextResponse.json({ error: "deviceToken required" }, { status: 400 });
    }
    if (platform && !["ios", "android", "web"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    await registerDevice(userId, deviceToken, platform || "ios", deviceName);
    return NextResponse.json({ registered: true });
  } catch (err) {
    console.error("[Push] Registration error:", err);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const check = await requireTier("free");
  if ("response" in check) return check.response;
  const { result } = check;

  const userId = result.username;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { deviceToken } = await request.json();
    if (!deviceToken) {
      return NextResponse.json({ error: "deviceToken required" }, { status: 400 });
    }

    await unregisterDevice(userId, deviceToken);
    return NextResponse.json({ unregistered: true });
  } catch (err) {
    console.error("[Push] Unregister error:", err);
    return NextResponse.json({ error: "Failed to unregister device" }, { status: 500 });
  }
}
