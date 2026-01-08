import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  const adminUser = users.find(u => u.id === '33a67c28-f98d-4277-8cf5-0021e83be655');
  if (adminUser) {
    console.log('Admin Email:', adminUser.email);
    // Update password to admin123456
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: 'admin123456' }
    );
    if (updateError) {
      console.error('Update Error:', updateError);
    } else {
      console.log('Password updated to: admin123456');
    }
  } else {
    console.log('Admin user not found in Auth. Listing all users:');
    users.forEach(u => console.log(u.email, u.id));
  }
}

main();
