import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { senderId, receiverId } = await request.json();
    
    if (!senderId || !receiverId) {
      return NextResponse.json({ error: "Both user IDs required" }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [user1, user2] = [senderId, receiverId].sort();
    
    const { data: existingStreak, error: fetchError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user1)
      .eq("partner_id", user2)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    let newStreakCount = 1;
    let userLastMessaged = senderId === user1 ? today : existingStreak?.user_last_messaged;
    let partnerLastMessaged = senderId === user2 ? today : existingStreak?.partner_last_messaged;

    if (existingStreak) {
      const lastInteraction = existingStreak.last_interaction_date;
      const userMsgDate = existingStreak.user_last_messaged;
      const partnerMsgDate = existingStreak.partner_last_messaged;

      if (senderId === user1) {
        userLastMessaged = today;
        partnerLastMessaged = existingStreak.partner_last_messaged;
      } else {
        partnerLastMessaged = today;
        userLastMessaged = existingStreak.user_last_messaged;
      }

      const bothMessaged = userLastMessaged && partnerLastMessaged;
      const bothToday = userLastMessaged === today && partnerLastMessaged === today;
      const bothYesterday = userLastMessaged === yesterdayStr && partnerLastMessaged === yesterdayStr;
      const todayAndYesterday = 
        (userLastMessaged === today && partnerLastMessaged === yesterdayStr) ||
        (userLastMessaged === yesterdayStr && partnerLastMessaged === today);

      if (bothMessaged) {
        if (lastInteraction === today) {
          newStreakCount = existingStreak.streak_count;
        } else if (lastInteraction === yesterdayStr || todayAndYesterday) {
          if (bothToday || todayAndYesterday) {
            newStreakCount = existingStreak.streak_count + 1;
          } else {
            newStreakCount = existingStreak.streak_count;
          }
        } else {
          if (bothToday) {
            newStreakCount = 1;
          } else {
            newStreakCount = 0;
          }
        }
      } else {
        newStreakCount = 0;
      }

      const { error: updateError } = await supabase
        .from("user_streaks")
        .update({
          streak_count: newStreakCount,
          last_interaction_date: bothToday ? today : existingStreak.last_interaction_date,
          user_last_messaged: userLastMessaged,
          partner_last_messaged: partnerLastMessaged,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingStreak.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_streaks")
        .insert({
          user_id: user1,
          partner_id: user2,
          streak_count: 0,
          user_last_messaged: senderId === user1 ? today : null,
          partner_last_messaged: senderId === user2 ? today : null,
          last_interaction_date: null
        });

      if (insertError) throw insertError;
      newStreakCount = 0;
    }

    await updateTotalStreakCount(senderId);
    await updateTotalStreakCount(receiverId);

    return NextResponse.json({ 
      success: true, 
      streak: newStreakCount
    });
  } catch (error: any) {
    console.error("Streak error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const partnerId = searchParams.get('partnerId');

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (partnerId) {
      const [user1, user2] = [userId, partnerId].sort();
      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user1)
        .eq("partner_id", user2)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return NextResponse.json({ streak: data?.streak_count || 0 });
    }

    const { data: streaks1 } = await supabase
      .from("user_streaks")
      .select(`
        *,
        partner:profiles!user_streaks_partner_id_fkey(id, username, full_name, avatar_data)
      `)
      .eq("user_id", userId)
      .gt("streak_count", 0);

    const { data: streaks2 } = await supabase
      .from("user_streaks")
      .select(`
        *,
        partner:profiles!user_streaks_user_id_fkey(id, username, full_name, avatar_data)
      `)
      .eq("partner_id", userId)
      .gt("streak_count", 0);

    const allStreaks = [
      ...(streaks1 || []).map(s => ({ ...s, partnerId: s.partner_id, partnerProfile: s.partner })),
      ...(streaks2 || []).map(s => ({ ...s, partnerId: s.user_id, partnerProfile: s.partner }))
    ].filter(s => s.partnerProfile);

    const totalStreak = allStreaks.reduce((sum, s) => sum + (s.streak_count || 0), 0);

    return NextResponse.json({ 
      streaks: allStreaks,
      totalStreak
    });
  } catch (error: any) {
    console.error("Get streaks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateTotalStreakCount(userId: string) {
  const { data: streaks1 } = await supabase
    .from("user_streaks")
    .select("streak_count")
    .eq("user_id", userId)
    .gt("streak_count", 0);

  const { data: streaks2 } = await supabase
    .from("user_streaks")
    .select("streak_count")
    .eq("partner_id", userId)
    .gt("streak_count", 0);

  const total = [...(streaks1 || []), ...(streaks2 || [])].reduce((sum, s) => sum + (s.streak_count || 0), 0);

  await supabase
    .from("profiles")
    .update({ total_streak_count: total })
    .eq("id", userId);
}
