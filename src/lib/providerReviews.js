import { supabase } from './supabase'

function normalizeReview(review) {
  return {
    ...review,
    user: review.client_name || 'FlashMat client',
    avatar_url: review.client_avatar_url || '',
    rating: Number(review.rating || 0),
    comment: String(review.comment || '').trim(),
    date: review.created_at
      ? new Date(review.created_at).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      : '',
  }
}

export async function fetchProviderReviews(providerId) {
  if (!providerId) return []

  const { data, error } = await supabase
    .from('provider_reviews')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeReview)
}

export async function upsertProviderReview({
  providerId,
  clientId,
  clientName,
  clientAvatarUrl,
  rating,
  comment,
}) {
  const payload = {
    provider_id: providerId,
    client_id: clientId,
    client_name: clientName || 'FlashMat client',
    client_avatar_url: clientAvatarUrl || '',
    rating,
    comment: String(comment || '').trim(),
  }

  const { data, error } = await supabase
    .from('provider_reviews')
    .upsert(payload, { onConflict: 'provider_id,client_id' })
    .select('*')
    .single()

  if (error) throw error
  return normalizeReview(data)
}
