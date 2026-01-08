
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egtehspqwudbhzbilvxg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndGVoc3Bxd3VkYmh6YmlsdnhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc0NzA5MywiZXhwIjoyMDgyMzIzMDkzfQ.gd9Hhq947V_XSyp2i28UeaIgqkw6pvcgWTOpfaksGKM'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser(email: string, username: string, isAdmin = false, isApproved = true) {
  console.log(`Creating user ${email}...`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { username }
  })

  if (error) {
    console.error(`Error creating ${email}:`, error.message)
    return null
  }

  console.log(`User created: ${data.user.id}`)
  
  // Wait a bit for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1000))

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      username, 
      is_admin: isAdmin, 
      is_approved: isApproved,
      full_name: username.charAt(0).toUpperCase() + username.slice(1)
    })
    .eq('id', data.user.id)
  
  if (profileError) {
    console.error(`Error updating profile for ${username}:`, profileError.message)
  } else {
    console.log(`Profile updated for ${username}`)
  }

  return data.user.id
}

async function addLocation(userId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from('locations')
    .upsert({
      user_id: userId,
      lat,
      lng,
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error(`Error adding location for ${userId}:`, error.message)
  } else {
    console.log(`Location added for ${userId}`)
  }
}

async function setup() {
  const users = [
    { email: 'admin@orchids.dev', username: 'admin', isAdmin: true },
    { email: 'user@orchids.dev', username: 'john_doe', isAdmin: false },
    { email: 'tester1@orchids.dev', username: 'alex_test', isAdmin: false },
    { email: 'tester2@orchids.dev', username: 'sarah_test', isAdmin: false },
    { email: 'tester3@orchids.dev', username: 'mike_test', isAdmin: false },
  ]

  for (const u of users) {
    const userId = await createUser(u.email, u.username, u.isAdmin)
    if (userId) {
      // Add some random locations around a city (e.g., London)
      const lat = 51.5074 + (Math.random() - 0.5) * 0.1
      const lng = -0.1278 + (Math.random() - 0.5) * 0.1
      await addLocation(userId, lat, lng)
    }
  }

  console.log('Setup complete!')
}

setup()
