// Supabase Edge Function: rotate-manager
// Deploy: supabase functions deploy rotate-manager
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mess_id } = await req.json();
    if (!mess_id) {
      return new Response(JSON.stringify({ error: "mess_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active members (excluding on_leave) sorted by join date
    const { data: members, error } = await supabase
      .from("mess_members")
      .select("id, user_id, role, joined_at")
      .eq("mess_id", mess_id)
      .in("status", ["active"])
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);

    const nonManagerRoles = ["member", "assistant_manager"];
    const eligible = (members ?? []).filter((m: any) => nonManagerRoles.includes(m.role));

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ success: false, reason: "no_eligible_members" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find current manager
    const currentManager = (members ?? []).find((m: any) => m.role === "manager");

    // Pick next eligible member (round-robin by join date)
    const currentManagerIdx = currentManager
      ? eligible.findIndex((m: any) => m.id === currentManager.id)
      : -1;
    const nextIdx = (currentManagerIdx + 1) % eligible.length;
    const nextManager = eligible[nextIdx];

    // Demote current manager to member
    if (currentManager) {
      await supabase
        .from("mess_members")
        .update({ role: "member" })
        .eq("id", currentManager.id);

      // Add to manager_history
      await supabase.from("manager_history").insert({
        mess_id,
        member_id: currentManager.id,
        ended_at: new Date().toISOString(),
      });
    }

    // Promote next manager
    await supabase
      .from("mess_members")
      .update({ role: "manager" })
      .eq("id", nextManager.id);

    await supabase.from("manager_history").insert({
      mess_id,
      member_id: nextManager.id,
      started_at: new Date().toISOString(),
    });

    // Notify all members
    const { data: allMembers } = await supabase
      .from("mess_members")
      .select("user_id")
      .eq("mess_id", mess_id)
      .eq("status", "active");

    const notifs = (allMembers ?? []).map((m: { user_id: string }) => ({
      user_id: m.user_id,
      mess_id,
      type: "system",
      title: "ম্যানেজার পরিবর্তন হয়েছে",
      body: "নতুন ম্যানেজার নিয়োগ দেওয়া হয়েছে।",
      action_url: "/dashboard/manager",
      is_read: false,
    }));

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    return new Response(
      JSON.stringify({ success: true, new_manager_id: nextManager.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
