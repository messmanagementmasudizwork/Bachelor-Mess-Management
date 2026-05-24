// Supabase Edge Function: validate-meal-cutoff
// Deploy: supabase functions deploy validate-meal-cutoff
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

    const { mess_id, meal_slot, override_role } = await req.json();
    if (!mess_id || !meal_slot) {
      return new Response(JSON.stringify({ error: "mess_id and meal_slot required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get mess settings
    const { data: mess, error } = await supabase
      .from("messes")
      .select("settings")
      .eq("id", mess_id)
      .single();
    if (error) throw new Error(error.message);

    const settings = (mess?.settings ?? {}) as Record<string, any>;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const CUTOFFS: Record<string, { hour: number; minute: number }> = {
      breakfast: { hour: settings.breakfast_cutoff_hour ?? 8, minute: 0 },
      lunch: { hour: settings.lunch_cutoff_hour ?? 12, minute: 0 },
      dinner: { hour: settings.dinner_cutoff_hour ?? 20, minute: 0 },
    };

    const cutoff = CUTOFFS[meal_slot];
    if (!cutoff) {
      return new Response(JSON.stringify({ error: "invalid meal_slot" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPastCutoff =
      currentHour > cutoff.hour ||
      (currentHour === cutoff.hour && currentMinute >= cutoff.minute);

    const BYPASS_ROLES = ["owner", "admin", "manager"];
    const canBypass = override_role && BYPASS_ROLES.includes(override_role);

    return new Response(
      JSON.stringify({
        allowed: !isPastCutoff || canBypass,
        past_cutoff: isPastCutoff,
        cutoff_time: `${cutoff.hour.toString().padStart(2, "0")}:${cutoff.minute.toString().padStart(2, "0")}`,
        bypassed: isPastCutoff && canBypass,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
