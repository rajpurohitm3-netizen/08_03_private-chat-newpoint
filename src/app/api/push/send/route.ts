import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:admin@chatify.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, title, body, url, senderId, tag } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found", sent: 0 });
    }

    const payload = JSON.stringify({
      title: title || "Chatify",
      body: body || "You have a new message",
      url: url || "/",
      senderId,
      tag: tag || `chatify-${Date.now()}`
    });

    let sent = 0;
    const failures: string[] = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err: any) {
        console.error("Push send error:", err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
        failures.push(sub.endpoint);
      }
    }

    return NextResponse.json({ sent, failures: failures.length });
  } catch (error: any) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
