import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('--- Starting Security Update ---');

  // 1. Reset Admin Password
  const { data: adminUser, error: adminFetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', 'admin')
    .single();

  if (adminFetchError || !adminUser) {
    console.error('Admin user not found in profiles', adminFetchError);
  } else {
    const { error: adminResetError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: 'Admin#Secure$99Node!2024' }
    );
    if (adminResetError) console.error('Error resetting admin password:', adminResetError);
    else console.log('Successfully reset password for admin to Admin#Secure$99Node!2024');
  }

  // 2. Reset Standard User Password
  const { data: standardUser, error: userFetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', 'user')
    .single();

  if (userFetchError || !standardUser) {
    console.error('Standard user not found in profiles', userFetchError);
  } else {
    const { error: userResetError } = await supabase.auth.admin.updateUserById(
      standardUser.id,
      { password: 'User#Secure$88Node!2024' }
    );
    if (userResetError) console.error('Error resetting user password:', userResetError);
    else console.log('Successfully reset password for user to User#Secure$88Node!2024');
  }

  // 3. Disable Global Firewall
  const { error: firewallError } = await supabase
    .from('system_config')
    .update({ value: 'false' })
    .eq('key', 'firewall_status');

  if (firewallError) console.error('Error disabling firewall:', firewallError);
  else console.log('Successfully disabled global firewall');

  console.log('--- Security Update Complete ---');
}

main();
