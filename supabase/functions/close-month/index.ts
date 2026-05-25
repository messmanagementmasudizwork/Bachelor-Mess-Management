// Supabase Edge Function: close-month
// Deploy: supabase functions deploy close-month
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mess_id, month } = await req.json();
    if (!mess_id || !month) {
      return new Response(JSON.stringify({ error: "mess_id and month required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read frozen_months from mess_settings table
    const { data: ms, error: fetchError } = await supabase
      .from("mess_settings")
      .select("frozen_months")
      .eq("mess_id", mess_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const frozenMonths: string[] = (ms?.frozen_months as string[] | null) ?? [];
    if (!frozenMonths.includes(month)) frozenMonths.push(month);

    // Write frozen_months back to mess_settings table
    const { error: updateError } = await supabase
      .from("mess_settings")
      .update({ frozen_months: frozenMonths, updated_at: new Date().toISOString() })
      .eq("mess_id", mess_id);
    if (updateError) throw new Error(updateError.message);

    // Notify all active members
    const { data: members } = await supabase
      .from("mess_members")
      .select("user_id")
      .eq("mess_id", mess_id)
      .eq("status", "active");

    const notifs = (members ?? []).map((m: { user_id: string }) => ({
      user_id: m.user_id,
      mess_id,
      type: "system",
      title: `${month} মাস বন্ধ হয়েছে`,
      body: "এই মাসের হিসাব চূড়ান্ত করা হয়েছে।",
      action_url: "/dashboard/reports",
      is_read: false,
    }));

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    return new Response(JSON.stringify({ success: true, month, frozen_months: frozenMonths }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
