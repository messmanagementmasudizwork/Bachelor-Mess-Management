import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient, createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  "mailto:admin@messpilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user_id, title, body, action_url, tag } = await req.json() as {
      user_id: string;
      title: string;
      body: string;
      action_url?: string;
      tag?: string;
    };

    if (!user_id || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data: subscriptions, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) throw new Error(error.message);
    if (!subscriptions?.length) {
      return NextResponse.json({ success: true, sent: 0, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({ title, body, action_url: action_url ?? "/dashboard", tag: tag ?? "messpilot" });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 }
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      const expiredEndpoints = (failed as PromiseRejectedResult[])
        .filter((f) => f.reason?.statusCode === 410)
        .map((_, i) => subscriptions[i]?.endpoint)
        .filter(Boolean);

      if (expiredEndpoints.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("endpoint", expiredEndpoints);
      }
    }

    return NextResponse.json({ success: true, sent, total: subscriptions.length });
  } catch (err) {
    console.error("[Push API] Send error:", err);
    return NextResponse.json({ error: "Failed to send push notification" }, { status: 500 });
  }
}
