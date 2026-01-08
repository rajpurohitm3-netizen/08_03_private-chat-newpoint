import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword, requestId } = await request.json();

    if (!userId || !newPassword || !requestId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: requestError } = await supabaseAdmin
      .from("password_change_requests")
      .update({ 
        status: "approved", 
        admin_note: "Password changed successfully",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
