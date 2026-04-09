import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import {
  fetchNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToInbox,
} from '../lib/inbox'

export default function NotificationCenterModal({ open, onClose, user, onOpenMessages }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user?.id) return undefined
    let active = true

    async function loadNotifications() {
      try {
        setLoading(true)
        const nextNotifications = await fetchNotificationsForUser(user.id)
        if (!active) return
        setNotifications(nextNotifications)
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load your notifications.', 'error')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadNotifications()
    const unsubscribe = subscribeToInbox(user.id, { onNotificationsChange: loadNotifications })

    return () => {
      active = false
      unsubscribe()
    }
  }, [open, toast, user?.id])

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(user.id)
      const nextNotifications = await fetchNotificationsForUser(user.id)
      setNotifications(nextNotifications)
    } catch (error) {
      toast(error.message || 'Unable to mark notifications as read.', 'error')
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id)
      }
    } catch {
      // Keep the navigation behavior even if the read state cannot be saved.
    }

    if (notification.type === 'message' && notification.resource_id) {
      onClose()
      onOpenMessages?.(notification.resource_id)
      return
    }

    if (notification.action_url) {
      onClose()
      navigate(notification.action_url)
    }
  }

  if (!open) return null

  return (
    <div style={styles.scrim} onClick={onClose}>
      <div style={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>FlashMat alerts</div>
            <div style={styles.title}>Notifications</div>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.secondaryButton} onClick={handleMarkAllRead}>
              Mark all as read
            </button>
            <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close notifications">
              ×
            </button>
          </div>
        </div>

        <div style={styles.list}>
          {loading ? <div style={styles.emptyState}>Loading notifications...</div> : null}
          {!loading && notifications.length === 0 ? <div style={styles.emptyState}>No notifications yet.</div> : null}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              style={{
                ...styles.item,
                background: notification.is_read ? '#fff' : 'linear-gradient(180deg, #f4f9ff 0%, #edf6ff 100%)',
              }}
            >
              <div style={styles.itemTop}>
                <strong style={styles.itemTitle}>{notification.title || 'FlashMat update'}</strong>
                {!notification.is_read ? <span style={styles.newBadge}>New</span> : null}
              </div>
              <div style={styles.itemBody}>{notification.body || 'There is a new activity in your account.'}</div>
              <div style={styles.itemMeta}>
                {new Date(notification.created_at).toLocaleString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5,17,29,0.18)',
    zIndex: 1810,
  },
  panel: {
    position: 'absolute',
    top: 88,
    right: 20,
    width: 'min(380px, calc(100vw - 24px))',
    maxHeight: 'min(70vh, 640px)',
    background: '#f8fbff',
    borderRadius: 22,
    border: '1px solid rgba(120,171,218,0.18)',
    boxShadow: '0 30px 80px rgba(10,28,45,0.24)',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderBottom: '1px solid rgba(120,171,218,0.14)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'var(--display)',
    fontSize: 18,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    color: '#123052',
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    border: '1px solid rgba(120,171,218,0.18)',
    borderRadius: 999,
    padding: '8px 12px',
    background: '#fff',
    color: '#154779',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    color: '#7c96b3',
    cursor: 'pointer',
  },
  list: {
    padding: 12,
    overflow: 'auto',
    display: 'grid',
    gap: 10,
  },
  item: {
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 18,
    padding: '13px 14px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(10,28,45,0.05)',
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 14,
    color: '#123052',
  },
  newBadge: {
    padding: '5px 8px',
    borderRadius: 999,
    background: '#154779',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 1.55,
    color: '#425d7a',
    marginBottom: 8,
  },
  itemMeta: {
    fontSize: 11,
    color: '#7b92ac',
  },
  emptyState: {
    padding: 12,
    color: '#6b84a0',
    fontSize: 13,
  },
}
