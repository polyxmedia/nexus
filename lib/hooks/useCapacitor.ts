"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface CapacitorState {
  isNative: boolean;
  platform: "ios" | "android" | "web";
  pushRegistered: boolean;
  registerPush: () => Promise<void>;
}

/**
 * Detects if running inside a Capacitor native shell
 * and handles push notification registration.
 */
export function useCapacitor(): CapacitorState {
  const { data: session } = useSession();
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  const [pushRegistered, setPushRegistered] = useState(false);

  useEffect(() => {
    // Capacitor sets window.Capacitor when running in native shell
    const cap = (window as unknown as Record<string, unknown>).Capacitor as
      | { isNativePlatform?: () => boolean; getPlatform?: () => string }
      | undefined;

    if (cap?.isNativePlatform?.()) {
      setIsNative(true);
      const plat = cap.getPlatform?.();
      if (plat === "ios" || plat === "android") {
        setPlatform(plat);
      }
    }
  }, []);

  const registerPush = useCallback(async () => {
    if (!isNative || !session?.user?.name || pushRegistered) return;

    try {
      // Dynamic import to avoid bundling Capacitor plugins in web builds
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Clear any existing listeners to prevent stacking on re-calls
      await PushNotifications.removeAllListeners();

      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        await fetch("/api/notifications/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceToken: token.value,
            platform,
          }),
        });
        setPushRegistered(true);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("[Capacitor] Push registration failed:", err);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Capacitor] Push received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        }
      });
    } catch (err) {
      console.error("[Capacitor] Push setup error:", err);
    }
  }, [isNative, session?.user?.name, platform, pushRegistered]);

  return { isNative, platform, pushRegistered, registerPush };
}
