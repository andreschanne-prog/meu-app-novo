import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPPORT_EMAIL = 'mishh.suport@gmail.com'
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'mishh.suport@gmail.com').split(',')