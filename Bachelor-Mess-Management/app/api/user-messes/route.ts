import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const admin = await createAdminClient();

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token using admin client
    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 1: Check mess_members (normal path — might be empty due to missing entry)
    const { data: memberData } = await admin
      .from("mess_members")
      .select(`
        role, status, joining_date,
        mess:messes(
          id, name, address, mess_type, status, owner_id,
          invite_code, seat_capacity, avatar_url, current_month,
          is_month_closed, settings, created_at
        )
      `)
      .eq("user_id", user.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false });

    if (memberData && memberData.length > 0) {
      return NextResponse.json({ messes: memberData });
    }

    // Step 2: Fallback — owner_id check (admin bypasses RLS)
    const { data: ownedMesses, error: ownerError } = await admin
      .from("messes")
      .select(
        "id, name, address, mess_type, status, owner_id, invite_code, seat_capacity, avatar_url, current_month, is_month_closed, settings, created_at"
      )
      .eq("owner_id", user.id);

    if (ownerError) {
      return NextResponse.json({ error: ownerError.message }, { status: 500 });
    }

    if (!ownedMesses || ownedMesses.length === 0) {
      return NextResponse.json({ messes: [] });
    }

    // Step 3: Auto-create missing mess_members entries for owner
    for (const mess of ownedMesses) {
      const { data: existing } = await admin
        .from("mess_members")
        .select("id")
        .eq("mess_id", mess.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await admin.from("mess_members").insert({
          mess_id: mess.id,
          user_id: user.id,
          role: "owner",
          status: "active",
          joining_date: new Date().toISOString().split("T")[0],
          meal_default_breakfast: true,
          meal_default_lunch: true,
          meal_default_dinner: true,
        });
      }
    }

    const result = ownedMesses.map((mess) => ({
      role: "owner" as const,
      status: "active" as const,
      joining_date: mess.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      mess,
    }));

    return NextResponse.json({ messes: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
