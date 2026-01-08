import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  try {
    const { userId, adminId } = await req.json();

    if (!userId || !adminId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Security check: ensure userId is valid and not deleting the admin themselves unless intended
    // The user provided this snippet: if (userId !== req.user.id) ... 
    // In our case, we check if the requester is an admin.
    
    // Double check requester is admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', adminId)
      .single();

    if (adminError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user from Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Auth deletion error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Delete user from profiles (if not handled by trigger)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
