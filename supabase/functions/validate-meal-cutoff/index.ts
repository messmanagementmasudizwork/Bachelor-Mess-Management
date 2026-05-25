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

    // Get settings from dedicated mess_settings table
    const { data: settings, error } = await supabase
      .from("mess_settings")
      .select("cutoff_time_mode, cutoff_single_time, cutoff_days_before, meal_cutoff_breakfast, meal_cutoff_lunch, meal_cutoff_dinner")
      .eq("mess_id", mess_id)
      .single();
    if (error) throw new Error(error.message);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMins = currentHour * 60 + currentMinute;

    const mode = settings?.cutoff_time_mode ?? "per_meal";
    const daysBefore = settings?.cutoff_days_before ?? 0;

    // Resolve cutoff time for the requested slot
    let cutoffTime: string;
    if (mode === "single") {
      cutoffTime = settings?.cutoff_single_time ?? "22:00";
    } else {
      const perMeal: Record<string, string> = {
        breakfast: settings?.meal_cutoff_breakfast ?? "08:00",
        lunch:     settings?.meal_cutoff_lunch     ?? "10:00",
        dinner:    settings?.meal_cutoff_dinner    ?? "16:00",
      };
      cutoffTime = perMeal[meal_slot] ?? "22:00";
    }

    const [cutoffH, cutoffM] = cutoffTime.split(":").map(Number);
    const cutoffMins = (cutoffH ?? 0) * 60 + (cutoffM ?? 0);

    let isPastCutoff = false;
    if (daysBefore > 0) {
      // Advance mode: today is always past cutoff for same-day toggle
      isPastCutoff = true;
    } else {
      isPastCutoff = currentMins >= cutoffMins;
    }

    const BYPASS_ROLES = ["owner", "admin", "manager"];
    const canBypass = override_role && BYPASS_ROLES.includes(override_role);

    return new Response(
      JSON.stringify({
        allowed: !isPastCutoff || canBypass,
        past_cutoff: isPastCutoff,
        cutoff_time: cutoffTime,
        mode,
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
