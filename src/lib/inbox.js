import { supabase } from './supabase'

const ATTACHMENT_START = '[flashmat-attachments]'
const ATTACHMENT_END = '[/flashmat-attachments]'

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function formatAttachmentSummary(count) {
  return count === 1 ? 'Sent 1 attachment' : `Sent ${count} attachments`
}

function normalizeAttachments(attachments = []) {
  return attachments
    .filter((attachment) => attachment?.url && attachment?.name)
    .map((attachment) => ({
      name: String(attachment.name).slice(0, 120),
      type: String(attachment.type || 'application/octet-stream').slice(0, 120),
      size: Number(attachment.size) || 0,
      url: attachment.url,
    }))
}

export function parseMessageBody(rawBody) {
  const body = String(rawBody || '')
  const markerStart = body.indexOf(ATTACHMENT_START)
  const markerEnd = body.indexOf(ATTACHMENT_END)

  if (markerStart === -1 || markerEnd === -1 || markerEnd < markerStart) {
    const plainText = body.trim()
    return {
      text: plainText,
      attachments: [],
      previewText: plainText,
    }
  }

  const visibleText = body.slice(0, markerStart).trim()
  const payloadRaw = body.slice(markerStart + ATTACHMENT_START.length, markerEnd).trim()

  try {
    const parsed = JSON.parse(payloadRaw)
    const attachments = normalizeAttachments(parsed?.attachments || [])
    const fallbackText = attachments.length ? formatAttachmentSummary(attachments.length) : ''
    return {
      text: visibleText,
      attachments,
      previewText: visibleText || fallbackText,
    }
  } catch {
    const plainText = body.trim()
    return {
      text: plainText,
      attachments: [],
      previewText: plainText,
    }
  }
}

function buildMessageBody({ body, attachments = [] }) {
  const text = String(body || '').trim()
  const normalizedAttachments = normalizeAttachments(attachments)

  if (!normalizedAttachments.length) return text

  const summaryText = text || formatAttachmentSummary(normalizedAttachments.length)
  const attachmentPayload = JSON.stringify({ attachments: normalizedAttachments })
  return `${summaryText}\n\n${ATTACHMENT_START}${attachmentPayload}${ATTACHMENT_END}`
}

function isMissingInboxRelation(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return (
    code === '42P01'
    || code === 'PGRST116'
    || code === 'PGRST205'
    || message.includes('does not exist')
    || message.includes('Could not find the table')
  )
}

export async function fetchNotificationsForUser(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (isMissingInboxRelation(error)) return []
    throw error
  }
  return data || []
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error && !isMissingInboxRelation(error)) throw error
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error && !isMissingInboxRelation(error)) throw error
}

export async function fetchUnreadInboxCounts(userId) {
  if (!userId) return { unreadMessages: 0, unreadNotifications: 0 }

  const [messageResult, notificationResult] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ])

  if (messageResult.error && !isMissingInboxRelation(messageResult.error)) throw messageResult.error
  if (notificationResult.error && !isMissingInboxRelation(notificationResult.error)) throw notificationResult.error

  return {
    unreadMessages: messageResult.count || 0,
    unreadNotifications: notificationResult.count || 0,
  }
}

export async function fetchAvailableMessageContacts(userId, role) {
  if (!userId) return []

  if (role === 'provider') {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        client_id,
        client:profiles!client_id(id, full_name, email, city, avatar_url)
      `)
      .eq('provider_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingInboxRelation(error)) return []
      throw error
    }

    const seen = new Set()
    return (bookings || []).reduce((acc, booking) => {
      const client = booking.client
      if (!client?.id || seen.has(client.id)) return acc
      seen.add(client.id)
      acc.push({
        id: client.id,
        role: 'client',
        name: client.full_name || client.email || 'FlashMat client',
        subtitle: [client.city, client.email].filter(Boolean).join(' · '),
        avatarUrl: client.avatar_url || '',
      })
      return acc
    }, [])
  }

  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, shop_name, address, phone, rating, reviews')
    .order('shop_name', { ascending: true })
    .limit(100)

  if (error) {
    if (isMissingInboxRelation(error)) return []
    throw error
  }

  return (providers || []).map((provider) => ({
    id: provider.id,
    role: 'provider',
    name: provider.shop_name || 'FlashMat provider',
    subtitle: provider.address || provider.phone || 'Provider on FlashMat',
    avatarUrl: '',
    rating: provider.rating || 0,
    reviews: provider.reviews || 0,
  }))
}

export async function createOrGetThread({ clientId, providerId, bookingId = null, creatorId }) {
  if (!clientId || !providerId) throw new Error('Missing participants for the conversation.')

  const { data: existing, error: existingError } = await supabase
    .from('message_threads')
    .select('*')
    .eq('client_id', clientId)
    .eq('provider_id', providerId)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    if (isMissingInboxRelation(existingError)) {
      throw new Error('Messaging is not enabled in Supabase yet. Run the latest FlashMat SQL migration first.')
    }
    throw existingError
  }
  if (existing) return existing

  const { data, error } = await supabase
    .from('message_threads')
    .insert({
      client_id: clientId,
      provider_id: providerId,
      booking_id: bookingId,
      created_by: creatorId || clientId,
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingInboxRelation(error)) {
      throw new Error('Messaging is not enabled in Supabase yet. Run the latest FlashMat SQL migration first.')
    }
    throw error
  }
  return data
}

export async function fetchThreadMessages(threadId) {
  if (!threadId) return []

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingInboxRelation(error)) return []
    throw error
  }
  return (data || []).map((message) => {
    const parsed = parseMessageBody(message.body)
    return {
      ...message,
      body: parsed.text,
      attachments: parsed.attachments,
      preview_body: parsed.previewText,
      raw_body: message.body,
    }
  })
}

export async function markThreadMessagesRead(threadId, recipientId) {
  if (!threadId || !recipientId) return

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('recipient_id', recipientId)
    .eq('is_read', false)

  if (error && !isMissingInboxRelation(error)) throw error
}

export async function sendThreadMessage({ threadId, senderId, recipientId, body, attachments = [] }) {
  const payloadBody = buildMessageBody({ body, attachments })

  if (!threadId || !senderId || !recipientId || !payloadBody) {
    throw new Error('Missing data to send this message.')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      recipient_id: recipientId,
      body: payloadBody,
      is_read: false,
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingInboxRelation(error)) {
      throw new Error('Messaging is not enabled in Supabase yet. Run the latest FlashMat SQL migration first.')
    }
    throw error
  }
  return data
}

export async function fetchConversationThreads(userId, role) {
  if (!userId) return []

  const { data: threads, error } = await supabase
    .from('message_threads')
    .select('*')
    .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })

  if (error) {
    if (isMissingInboxRelation(error)) return []
    throw error
  }

  const safeThreads = threads || []
  const unreadByThread = {}

  const { data: unreadRows, error: unreadError } = await supabase
    .from('messages')
    .select('thread_id')
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (unreadError && !isMissingInboxRelation(unreadError)) throw unreadError

  ;(unreadRows || []).forEach((row) => {
    unreadByThread[row.thread_id] = (unreadByThread[row.thread_id] || 0) + 1
  })

  const providerIds = uniq(safeThreads.map((thread) => thread.provider_id))
  const clientIds = uniq(safeThreads.map((thread) => thread.client_id))

  const [{ data: providers = [], error: providersError }, { data: clients = [], error: clientsError }] = await Promise.all([
    providerIds.length
      ? supabase.from('providers').select('id, shop_name, address, phone, rating, reviews').in('id', providerIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? supabase.from('profiles').select('id, full_name, email, city, avatar_url').in('id', clientIds)
      : Promise.resolve({ data: [] }),
  ])

  if (providersError && !isMissingInboxRelation(providersError)) throw providersError
  if (clientsError && !isMissingInboxRelation(clientsError)) throw clientsError

  const providerMap = new Map((providers || []).map((provider) => [provider.id, provider]))
  const clientMap = new Map((clients || []).map((client) => [client.id, client]))

  return safeThreads.map((thread) => {
    const counterpartId = role === 'provider' ? thread.client_id : thread.provider_id
    const counterpart = role === 'provider' ? clientMap.get(counterpartId) : providerMap.get(counterpartId)
    const lastPreview = parseMessageBody(thread.last_message_preview || '').previewText

    return {
      ...thread,
      unreadCount: unreadByThread[thread.id] || 0,
      last_message_preview: lastPreview,
      counterpartId,
      counterpartRole: role === 'provider' ? 'client' : 'provider',
      counterpartName: role === 'provider'
        ? counterpart?.full_name || counterpart?.email || 'FlashMat client'
        : counterpart?.shop_name || 'FlashMat provider',
      counterpartSubtitle: role === 'provider'
        ? [counterpart?.city, counterpart?.email].filter(Boolean).join(' · ')
        : counterpart?.address || counterpart?.phone || 'Provider on FlashMat',
      counterpartAvatarUrl: role === 'provider' ? counterpart?.avatar_url || '' : '',
      counterpartRating: counterpart?.rating || 0,
      counterpartReviews: counterpart?.reviews || 0,
    }
  })
}

export function subscribeToInbox(userId, { onNotificationsChange, onThreadsChange, onMessagesChange } = {}) {
  if (!userId) return () => {}

  const channels = []

  function registerChannel(name, config, callback) {
    const channel = supabase.channel(name)
    channel.on('postgres_changes', config, () => {
      try {
        callback?.()
      } catch (error) {
        console.error(`Inbox callback failed for ${name}`, error)
      }
    })
    channels.push(channel.subscribe())
  }

  try {
    registerChannel(
      `flashmat-notifications-${userId}`,
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      onNotificationsChange,
    )
    registerChannel(
      `flashmat-messages-recipient-${userId}`,
      { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      () => {
        onMessagesChange?.()
        onThreadsChange?.()
        onNotificationsChange?.()
      },
    )
    registerChannel(
      `flashmat-messages-sender-${userId}`,
      { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
      () => {
        onMessagesChange?.()
        onThreadsChange?.()
      },
    )
    registerChannel(
      `flashmat-threads-client-${userId}`,
      { event: '*', schema: 'public', table: 'message_threads', filter: `client_id=eq.${userId}` },
      onThreadsChange,
    )
    registerChannel(
      `flashmat-threads-provider-${userId}`,
      { event: '*', schema: 'public', table: 'message_threads', filter: `provider_id=eq.${userId}` },
      onThreadsChange,
    )
  } catch (error) {
    console.error('Unable to subscribe to inbox channels', error)
    return () => {}
  }

  return () => {
    channels.forEach((channel) => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.error('Unable to remove inbox channel', error)
      }
    })
  }
}
