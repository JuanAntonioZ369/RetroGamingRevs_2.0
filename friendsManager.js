/**
 * friendsManager.js — Amigos, presencia e invitaciones de juego
 */
const { supabase } = require('./supabase')

// ─── AMIGOS ────────────────────────────────────────────────────

/** Buscar usuario por username */
async function searchUser(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', username)
    .limit(10)
  if (error) return []
  return data
}

/** Enviar solicitud de amistad */
async function sendFriendRequest(toUserId) {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return { ok: false, error: 'No autenticado' }
  const { error } = await supabase.from('friendships').insert({
    requester_id: me.user.id,
    addressee_id: toUserId
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Aceptar solicitud de amistad */
async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Rechazar / eliminar amistad */
async function removeFriend(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Obtener lista de amigos del usuario actual
 * Retorna: [{ friendshipId, userId, username, status, presence }]
 */
async function getFriends() {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return []
  const uid = me.user.id

  // 1. Obtener relaciones
  const { data: fships, error } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)

  if (error || !fships) return []

  // 2. Obtener perfiles de los amigos
  const friendIds = fships.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', friendIds)

  const profileMap = {}
  if (profiles) profiles.forEach(p => { profileMap[p.id] = p })

  return fships.map(f => {
    const isMe = f.requester_id === uid
    const friendId = isMe ? f.addressee_id : f.requester_id
    const profile = profileMap[friendId]
    return {
      friendshipId: f.id,
      userId: friendId,
      username: profile?.username || '???',
      status: f.status,
      isSentByMe: isMe
    }
  })
}

/** Solicitudes pendientes recibidas */
async function getPendingRequests() {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return []

  const { data: pending } = await supabase
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', me.user.id)
    .eq('status', 'pending')
  if (!pending || !pending.length) return []

  const ids = pending.map(p => p.requester_id)
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
  const profileMap = {}
  if (profiles) profiles.forEach(p => { profileMap[p.id] = p })

  return pending.map(p => ({ id: p.id, requester: profileMap[p.requester_id] || { username: '???' } }))
}

// ─── PRESENCIA ─────────────────────────────────────────────────

/** Actualizar mi presencia (online + juego actual) */
async function updatePresence(currentGame = null) {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return
  await supabase.from('presence').upsert({
    user_id: me.user.id,
    status: 'online',
    current_game: currentGame,
    last_seen: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

/** Marcarme como offline */
async function setOffline() {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return
  await supabase.from('presence').upsert({
    user_id: me.user.id,
    status: 'offline',
    current_game: null,
    last_seen: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

/** Obtener presencia de una lista de user IDs */
async function getPresenceForUsers(userIds) {
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('presence')
    .select('user_id, status, current_game, last_seen')
    .in('user_id', userIds)
  if (!data) return {}
  const map = {}
  data.forEach(p => { map[p.user_id] = p })
  return map
}

// ─── INVITACIONES ──────────────────────────────────────────────

/**
 * Invitar a un amigo a jugar
 * @param {string} toUserId - ID del amigo
 * @param {string} gamePath - romPath del juego
 * @param {string} gameTitle
 * @param {string} gamekey - gamekey de mednafen (opcional)
 */
async function sendInvitation(toUserId, gamePath, gameTitle, gamekey = null) {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return { ok: false, error: 'No autenticado' }
  const { error } = await supabase.from('invitations').insert({
    from_user_id: me.user.id,
    to_user_id: toUserId,
    game_path: gamePath,
    game_title: gameTitle,
    gamekey
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Obtener invitaciones pendientes para mí */
async function getMyInvitations() {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return []
  const { data } = await supabase
    .from('invitations')
    .select('*, sender:profiles!invitations_from_user_id_fkey(username)')
    .eq('to_user_id', me.user.id)
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // últimos 5 min
  return data || []
}

/** Aceptar invitación */
async function acceptInvitation(invitationId) {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Declinar invitación */
async function declineInvitation(invitationId) {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Suscribirse a invitaciones en tiempo real
 * @param {function} onInvitation - callback({ id, sender, game_title, game_path, gamekey })
 * @returns unsubscribe function
 */
async function subscribeToInvitations(onInvitation) {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return () => {}

  const channel = supabase
    .channel('invitations-' + me.user.id)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'invitations',
      filter: `to_user_id=eq.${me.user.id}`
    }, async (payload) => {
      const inv = payload.new
      // Obtener nombre del que invita
      const { data: sender } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', inv.from_user_id)
        .single()
      onInvitation({ ...inv, senderName: sender?.username || '???' })
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/**
 * Suscribirse a presencia en tiempo real de una lista de amigos
 * @param {string[]} userIds
 * @param {function} onChange - callback(presenceMap)
 * @returns unsubscribe function
 */
async function subscribeToPresence(userIds, onChange) {
  if (!userIds.length) return () => {}

  const channel = supabase
    .channel('presence-friends')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'presence',
      filter: `user_id=in.(${userIds.join(',')})`
    }, async () => {
      const presenceMap = await getPresenceForUsers(userIds)
      onChange(presenceMap)
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

module.exports = {
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  updatePresence,
  setOffline,
  getPresenceForUsers,
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  subscribeToInvitations,
  subscribeToPresence
}
