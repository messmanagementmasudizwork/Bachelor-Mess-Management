// Supabase Edge Function: process-due-reminders
// Deploy: supabase functions deploy process-due-reminders
// Cron: run daily — pg_cron: "0 9 * * *" -> net.http_post(url => 'https://<project>.supabase.co/functions/v1/process-due-reminders')
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

    // Get all active messes with their settings from mess_settings table
    const { data: messes } = await supabase
      .from("messes")
      .select("id, name, mess_settings(due_reminder_days)");

    let totalNotifications = 0;

    for (const mess of messes ?? []) {
      const ms = (mess as any).mess_settings as { due_reminder_days?: number[] } | null;
      const reminderDays: number[] = ms?.due_reminder_days ?? [7, 3, 1];
      const month = new Date().toISOString().slice(0, 7);

      // Get active members
      const { data: members } = await supabase
        .from("mess_members")
        .select("id, user_id")
        .eq("mess_id", mess.id)
        .eq("status", "active");

      for (const member of members ?? []) {
        // Calculate balance
        const { data: deposits } = await supabase
          .from("deposits")
          .select("amount")
          .eq("mess_id", mess.id)
          .eq("member_id", member.id)
          .like("date", `${month}%`);

        const totalDeposit = (deposits ?? []).reduce((s: number, d: any) => s + (d.amount ?? 0), 0);

        // If deposit is 0 or negative, check reminder
        if (totalDeposit <= 0) {
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const daysRemaining = Math.ceil(
            (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (reminderDays.includes(daysRemaining)) {
            await supabase.from("notifications").insert({
              user_id: member.user_id,
              mess_id: mess.id,
              type: "due_reminder",
              title: "জমা দেওয়ার অনুরোধ",
              body: `এই মাসের মেস জমা এখনো দেওয়া হয়নি। মাস শেষ হতে ${daysRemaining} দিন বাকি।`,
              action_url: "/dashboard/deposits",
              is_read: false,
            });
            totalNotifications++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: totalNotifications }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
