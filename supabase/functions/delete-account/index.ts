import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!serviceRoleKey) {
      console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY not set')
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log('[delete-account] Auth error or no user:', authError?.message)
      return new Response(
        JSON.stringify({ success: true, already_deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('[delete-account] Deleting all data for user:', userId)

    // Delete from tables that use user_id column
    const userIdTables = [
      'inbound_emails',
      'sent_emails',
      'proxy_emails',
      'notifications',
      'payment_history',
      'user_push_tokens',
      'referrals',
    ]

    for (const table of userIdTables) {
      try {
        const { error } = await supabase.from(table).delete().eq('user_id', userId)
        if (error) {
          console.log(`[delete-account] ${table}: ${error.message}`)
        } else {
          console.log(`[delete-account] ${table}: deleted`)
        }
      } catch (e) {
        console.log(`[delete-account] ${table}: exception`, e)
      }
    }

    // Delete profile (uses 'id' column, not 'user_id')
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) {
        console.log('[delete-account] profiles:', error.message)
      } else {
        console.log('[delete-account] profiles: deleted')
      }
    } catch (e) {
      console.log('[delete-account] profiles: exception', e)
    }

    // Delete storage files
    try {
      const { data: avatars } = await supabase.storage.from('profile-pictures').list(userId)
      if (avatars?.length) {
        await supabase.storage.from('profile-pictures').remove(avatars.map(f => `${userId}/${f.name}`))
        console.log('[delete-account] Deleted', avatars.length, 'avatar files')
      }
    } catch (e) {
      console.log('[delete-account] Avatar cleanup error:', e)
    }

    try {
      const { data: resumes } = await supabase.storage.from('resumes').list(userId)
      if (resumes?.length) {
        await supabase.storage.from('resumes').remove(resumes.map(f => `${userId}/${f.name}`))
        console.log('[delete-account] Deleted', resumes.length, 'resume files')
      }
    } catch (e) {
      console.log('[delete-account] Resume cleanup error:', e)
    }

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-account] Auth delete error:', deleteError.message)
      // Still return success for data deletion — auth user can be cleaned up manually
      return new Response(
        JSON.stringify({ success: true, auth_delete_failed: true, error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[delete-account] Successfully deleted user:', userId)
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[delete-account] Unhandled error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
