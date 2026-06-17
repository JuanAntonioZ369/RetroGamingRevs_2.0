/**
 * supabaseAuth.js — Login, registro, logout, sesión
 */
const { supabase } = require('./supabase')

/** Iniciar sesión con email + contraseña — lanza Error si falla */
async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

/** Registrar cuenta nueva — lanza Error si falla */
async function registerUser(username, email, password) {
  if (!username || username.length < 3 || username.length > 20) {
    throw new Error('El username debe tener entre 3 y 20 caracteres')
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
    throw new Error('Username: solo letras, números, guión y underscore')
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  })
  if (error) throw new Error(error.message)
  return data
}

/** Cerrar sesión */
async function logoutUser() {
  await supabase.auth.signOut()
}

/** Obtener sesión activa (null si no hay) */
async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Obtener usuario actual */
async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

/** Obtener perfil completo del usuario actual */
async function getMyProfile() {
  const user = await getCurrentUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return data
}

/** Actualizar username en el perfil */
async function updateUsername(newUsername) {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'No autenticado' }
  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

module.exports = { loginUser, registerUser, logoutUser, getSession, getCurrentUser, getMyProfile, updateUsername }
