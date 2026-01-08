import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser(email: string, password: string, username: string, fullName: string) {
  console.log(`Creating user: ${email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName }
  });

  if (error) {
    console.error(`Error creating ${email}:`, error.message);
    return;
  }

  // Create profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    username,
    full_name: fullName,
    is_approved: false, // Set to false to test the request panel
    is_admin: false,
    updated_at: new Date().toISOString()
  });

  if (profileError) {
    console.error(`Error creating profile for ${email}:`, profileError.message);
  } else {
    console.log(`Successfully created ${email} and pending profile.`);
  }
}

async function main() {
  await createTestUser('test-user@orchids.dev', 'TestPass123!', 'test_user', 'Test User');
  await createTestUser('normal-user@orchids.dev', 'NormalPass123!', 'normal_user', 'Normal User');
}

main();
