/**
 * supabase.js — Cliente único de Supabase para toda la app
 * Usar: const { supabase } = require('./supabase')  (desde raíz)
 *       const { supabase } = require('../supabase') (desde html/)
 */
const { createClient } = require('@supabase/supabase-js')
const { SUPABASE_URL, SUPABASE_ANON } = require('./supabaseConfig')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false  // no hay OAuth redirect en Electron
  }
})

module.exports = { supabase }
