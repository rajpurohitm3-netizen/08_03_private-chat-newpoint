import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("streak_count, last_streak_date")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = profile?.last_streak_date;

    if (lastStreakDate === today) {
      return NextResponse.json({ 
        success: true, 
        streak: profile.streak_count,
        message: "Streak already updated today" 
      });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    
    if (lastStreakDate === yesterdayStr) {
      newStreak = (profile?.streak_count || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        streak_count: newStreak,
        last_streak_date: today,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      streak: newStreak,
      message: newStreak > 1 ? `Streak continued! ${newStreak} days` : "New streak started!"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
