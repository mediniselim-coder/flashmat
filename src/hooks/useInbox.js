import { useEffect, useState } from 'react'
import { FLASHMAT_INBOX_COUNTS_UPDATED_EVENT, fetchUnreadInboxCounts, subscribeToInbox } from '../lib/inbox'

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
    function handleCountsUpdated(event) {
      if (String(event?.detail?.userId || '') !== String(user.id)) return
      refresh()
    }
    window.addEventListener(FLASHMAT_INBOX_COUNTS_UPDATED_EVENT, handleCountsUpdated)

    return () => {
      active = false
      window.removeEventListener(FLASHMAT_INBOX_COUNTS_UPDATED_EVENT, handleCountsUpdated)
      unsubscribe()
    }
  }, [profile?.role, user?.id])

  return summary
}
