"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !userId) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          await saveSubscription(existingSub, userId);
        }
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, [isSupported, userId]);

  const requestPermission = async () => {
    if (!isSupported || !userId) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.error("VAPID public key not found");
          return false;
        }

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        setSubscription(sub);
        await saveSubscription(sub, userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Push permission request failed:", error);
      return false;
    }
  };

  const saveSubscription = async (sub: PushSubscription, uid: string) => {
    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userId: uid
        })
      });
    } catch (error) {
      console.error("Failed to save subscription:", error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      setSubscription(null);
    } catch (error) {
      console.error("Unsubscribe failed:", error);
    }
  };

  return {
    isSupported,
    subscription,
    permission,
    requestPermission,
    unsubscribe
  };
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  senderId?: string
) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title,
        body,
        senderId,
        url: "/"
      })
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}
