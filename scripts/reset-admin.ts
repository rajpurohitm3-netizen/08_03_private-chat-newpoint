import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetAdmin() {
  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', 'admin')
    .single()

  if (fetchError || !users) {
    console.error('Admin user not found in profiles', fetchError)
    process.exit(1)
  }

    const { data, error } = await supabase.auth.admin.updateUserById(
      users.id,
      { password: 'Admin#Secure$99Node!2024' }
    )

    if (error) {
      console.error('Error resetting password:', error)
    } else {
      console.log('Successfully reset password for admin to Admin#Secure$99Node!2024')
    }
}

resetAdmin()
