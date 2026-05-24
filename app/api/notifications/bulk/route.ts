import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notifications } = await req.json() as {
      notifications: Array<{
        user_id: string;
        mess_id?: string | null;
        type: string;
        title: string;
        body: string;
        action_url?: string | null;
        metadata?: Record<string, unknown> | null | undefined;
      }>;
    };

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    const admin = await createAdminClient();

    const rows = notifications.map((n) => ({
      user_id: n.user_id,
      mess_id: n.mess_id ?? null,
      type: n.type,
      title: n.title,
      body: n.body,
      action_url: n.action_url ?? null,
      metadata: (n.metadata ?? null) as import("@/lib/supabase/database.types").Json | null,
      is_read: false,
    }));

    const { error } = await admin.from("notifications").insert(rows);
    if (error) {
      console.error("[Notifications/bulk] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: rows.length });
  } catch (err) {
    console.error("[Notifications/bulk] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
