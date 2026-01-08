'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function confirmUserEmail(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error confirming email:', error.message);
    return { success: false, error: error.message };
  }
}
