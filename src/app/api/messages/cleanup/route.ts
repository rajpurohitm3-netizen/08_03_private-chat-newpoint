import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const now = new Date().toISOString();

    // 1. Delete all viewed messages that have NO expiration (immediate delete)
    // or those that have reached their expiration
    const { data: messagesToDelete, error: fetchError } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("is_viewed", true)
      .or("is_saved.is.null,is_saved.eq.false")
      .or(`expires_at.is.null,expires_at.lt.${now}`);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const idsToDelete = messagesToDelete?.map(m => m.id) || [];
    const uniqueIds = [...new Set(idsToDelete)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ message: "No messages to delete", deleted: 0 });
    }

    const { error: deleteError, count } = await supabaseAdmin
      .from("messages")
      .delete()
      .in("id", uniqueIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Messages cleaned up", 
      deleted: count || uniqueIds.length 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
