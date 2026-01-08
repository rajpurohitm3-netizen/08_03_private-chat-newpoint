import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUsers() {
  const users = [
    { email: 'admin@orchids.dev', password: 'adminpassword123', username: 'Admin_Core', is_admin: true, is_approved: true, full_name: 'System Administrator' },
    { email: 'user1@orchids.dev', password: 'userpassword123', username: 'Alex_Pro', is_admin: false, is_approved: true, full_name: 'Alex Johnson' },
    { email: 'user2@orchids.dev', password: 'userpassword123', username: 'Sophia_Dev', is_admin: false, is_approved: true, full_name: 'Sophia Chen' },
    { email: 'user3@orchids.dev', password: 'userpassword123', username: 'Marcus_Ops', is_admin: false, is_approved: true, full_name: 'Marcus Thorne' },
  ];

  console.log('Creating test users...');

  for (const user of users) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    });

    if (authError) {
      console.error(`Error creating auth user ${user.email}:`, authError.message);
      continue;
    }

    if (authUser.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          username: user.username,
          full_name: user.full_name,
          is_admin: user.is_admin,
          is_approved: user.is_approved,
          bio: user.is_admin ? 'Primary Intelligence Node' : 'Field Operator - Secure Comms Active',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
        });

      if (profileError) {
        console.error(`Error creating profile for ${user.username}:`, profileError.message);
      } else {
        console.log(`Successfully created ${user.username}`);
        
        // Add a dummy location for visibility on map
        await supabase.from('locations').upsert({
          user_id: authUser.user.id,
          lat: 40.7128 + (Math.random() - 0.5) * 2,
          lng: -74.0060 + (Math.random() - 0.5) * 2
        });
      }
    }
  }
}

createTestUsers();
