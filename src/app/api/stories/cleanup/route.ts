import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const now = new Date().toISOString();

    const { data: savedStoryIds } = await supabaseAdmin
      .from("story_saves")
      .select("story_id");

    const savedIds = savedStoryIds?.map(s => s.story_id) || [];

    let query = supabaseAdmin
      .from("stories")
      .select("id")
      .lt("expires_at", now);

    if (savedIds.length > 0) {
      query = query.not("id", "in", `(${savedIds.join(",")})`);
    }

    const { data: expiredStories, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredStories || expiredStories.length === 0) {
      return NextResponse.json({ message: "No expired stories to delete", deleted: 0 });
    }

    const expiredIds = expiredStories.map(s => s.id);

    await supabaseAdmin.from("story_views").delete().in("story_id", expiredIds);
    
    const { error: deleteError, count } = await supabaseAdmin
      .from("stories")
      .delete()
      .in("id", expiredIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Expired stories cleaned up", 
      deleted: count || expiredIds.length,
      skippedSaved: savedIds.length 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
