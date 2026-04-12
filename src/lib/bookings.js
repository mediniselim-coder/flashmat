import { supabase } from './supabase'

const STATUS_META = {
  pending: { label: 'Pending', cls: 'badge-amber' },
  confirmed: { label: 'Confirmed', cls: 'badge-green' },
  refused: { label: 'Refused', cls: 'badge-red' },
  canceled: { label: 'Canceled', cls: 'badge-gray' },
  cancelled: { label: 'Canceled', cls: 'badge-gray' },
}

function formatBookingDate(date, timeSlot) {
  if (!date && !timeSlot) return 'To confirm'

  const datePart = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('fr-CA', {
      month: 'short',
      day: 'numeric',
    })
    : 'Date to confirm'

  return `${datePart} · ${timeSlot || 'Time to confirm'}`
}

export function getBookingStatusMeta(status) {
  return STATUS_META[status] || { label: status || 'Pending', cls: 'badge-gray' }
}

export function normalizeBookingRecord(booking) {
  const clientProfile = booking.client_profile || booking.client || null
  const providerProfile = booking.provider_profile || booking.provider || null
  const vehicle = booking.vehicle || null
  const statusMeta = getBookingStatusMeta(booking.status)

  return {
    ...booking,
    clientName: clientProfile?.full_name || booking.clientName || 'FlashMat Client',
    providerName: providerProfile?.shop_name || providerProfile?.name || booking.providerName || 'FlashMat Shop',
    vehicleLabel: vehicle
      ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}${vehicle.plate ? ` · ${vehicle.plate}` : ''}`
      : booking.vehicleLabel || 'Vehicle to confirm',
    datetimeLabel: formatBookingDate(booking.date, booking.time_slot),
    priceLabel: booking.price || 'Price to confirm',
    statusLabel: statusMeta.label,
    statusClass: statusMeta.cls,
  }
}

export async function fetchClientBookings(clientId) {
  if (!clientId) return []

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      provider:providers!provider_id(id, shop_name, address, phone),
      vehicle:vehicles!vehicle_id(id, make, model, year, plate)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBookingRecord)
}

export async function fetchProviderBookings(providerId) {
  if (!providerId) return []

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      client:profiles!client_id(id, full_name, email, phone),
      vehicle:vehicles!vehicle_id(id, make, model, year, plate)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBookingRecord)
}

export async function createBooking(input) {
  const payload = {
    client_id: input.clientId,
    provider_id: input.providerId,
    vehicle_id: input.vehicleId || null,
    service: input.service,
    service_icon: input.serviceIcon || 'ME',
    date: input.date || null,
    time_slot: input.timeSlot || null,
    notes: input.notes || '',
    price: input.price || 'Price to confirm',
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select(`
      *,
      provider:providers!provider_id(id, shop_name, address, phone),
      vehicle:vehicles!vehicle_id(id, make, model, year, plate)
    `)
    .single()

  if (error) throw error
  return normalizeBookingRecord(data)
}

export async function updateBookingStatus(bookingId, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select(`
      *,
      client:profiles!client_id(id, full_name, email, phone),
      vehicle:vehicles!vehicle_id(id, make, model, year, plate)
    `)
    .single()

  if (error) throw error
  return normalizeBookingRecord(data)
}

export async function createNotification({ userId, title, body, icon = 'AL', type = 'info' }) {
  if (!userId) return

  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    icon,
    type,
    is_read: false,
  })
}

export async function fetchClientNotifications(userId) {
  if (!userId) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

