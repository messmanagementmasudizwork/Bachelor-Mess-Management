// Supabase Edge Function: calculate-monthly-report
// Deploy: supabase functions deploy calculate-monthly-report
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

    const { mess_id, month } = await req.json();
    if (!mess_id || !month) {
      return new Response(JSON.stringify({ error: "mess_id and month required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch raw data
    const [{ data: members }, { data: meals }, { data: expenses }, { data: deposits }] =
      await Promise.all([
        supabase.from("mess_members").select("*").eq("mess_id", mess_id).eq("status", "active"),
        supabase.from("meals").select("*").eq("mess_id", mess_id).like("date", `${month}%`),
        supabase.from("expenses").select("*").eq("mess_id", mess_id).like("date", `${month}%`),
        supabase.from("deposits").select("*").eq("mess_id", mess_id).like("date", `${month}%`),
      ]);

    // Calculate total meals
    const totalMeals = (meals ?? []).reduce((sum: number, m: any) => {
      return sum + (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0);
    }, 0);

    const totalCost = (expenses ?? []).reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
    const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0;

    const memberReports = (members ?? []).map((member: any) => {
      const memberMeals = (meals ?? []).filter((m: any) => m.member_id === member.id);
      const memberMealCount = memberMeals.reduce((sum: number, m: any) => {
        return sum + (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0);
      }, 0);
      const memberDeposits = (deposits ?? [])
        .filter((d: any) => d.member_id === member.id)
        .reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);
      const mealCost = memberMealCount * mealRate;
      const balance = memberDeposits - mealCost;

      return {
        member_id: member.id,
        meal_count: memberMealCount,
        meal_cost: Math.round(mealCost * 100) / 100,
        deposit_total: memberDeposits,
        balance: Math.round(balance * 100) / 100,
      };
    });

    return new Response(
      JSON.stringify({ mess_id, month, meal_rate: Math.round(mealRate * 100) / 100, total_meals: totalMeals, total_cost: totalCost, members: memberReports }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
