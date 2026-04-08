import { useEffect, useState } from 'react'
import { fetchUnreadInboxCounts, subscribeToInbox } from '../lib/inbox'

export function useInboxSummary(user, profile) {
  const [summary, setSummary] = useState({
    unreadMessages: 0,
    unreadNotifications: 0,
    loading: false,
  })

  useEffect(() => {
    if (!user?.id) {
      setSummary({ unreadMessages: 0, unreadNotifications: 0, loading: false })
      return
    }

    let active = true

    async function refresh() {
      try {
        if (active) setSummary((current) => ({ ...current, loading: true }))
        const counts = await fetchUnreadInboxCounts(user.id)
        if (!active) return
        setSummary({ ...counts, loading: false })
      } catch {
        if (!active) return
        setSummary((current) => ({ ...current, loading: false }))
      }
    }

    refresh()
    const unsubscribe = subscribeToInbox(user.id, {
      onNotificationsChange: refresh,
      onMessagesChange: refresh,
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [profile?.role, user?.id])

  return summary
}
