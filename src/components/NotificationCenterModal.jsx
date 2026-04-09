import { useEffect, useMemo, useState } from 'react'
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

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

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
      // Navigation should still work even if the read state cannot be saved.
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
              Mark all read
            </button>
            <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close notifications">
              ×
            </button>
          </div>
        </div>

        <div style={styles.tabsRow}>
          <span style={styles.tabActive}>All</span>
          <span style={styles.tabMuted}>Unread {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
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
                background: notification.is_read ? '#ffffff' : 'linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%)',
              }}
            >
              <div style={styles.itemRow}>
                <div style={styles.iconWrap}>
                  <span style={styles.iconGlyph}>{notification.icon || 'AL'}</span>
                </div>

                <div style={styles.itemContent}>
                  <div style={styles.itemTop}>
                    <strong style={styles.itemTitle}>{notification.title || 'FlashMat update'}</strong>
                    {!notification.is_read ? <span style={styles.dotBadge} /> : null}
                  </div>

                  <div style={styles.itemBody}>
                    {notification.body || 'There is a new activity in your account.'}
                  </div>

                  <div style={styles.itemMeta}>
                    {new Date(notification.created_at).toLocaleString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
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
    background: 'rgba(5,17,29,0.16)',
    zIndex: 1810,
  },
  panel: {
    position: 'absolute',
    top: 88,
    right: 20,
    width: 'min(360px, calc(100vw - 24px))',
    maxHeight: 'min(72vh, 640px)',
    background: '#f9fbff',
    borderRadius: 16,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 22px 56px rgba(10,28,45,0.22)',
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px 10px',
    borderBottom: '1px solid rgba(120,171,218,0.14)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    marginBottom: 3,
  },
  title: {
    fontFamily: 'var(--display)',
    fontSize: 15,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    color: '#123052',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    border: '1px solid rgba(120,171,218,0.18)',
    borderRadius: 999,
    padding: '7px 11px',
    background: '#fff',
    color: '#154779',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#7c96b3',
    cursor: 'pointer',
  },
  tabsRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '10px 14px 8px',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
    background: '#fbfdff',
  },
  tabActive: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(27,95,173,0.12)',
    color: '#16497c',
    fontSize: 11,
    fontWeight: 800,
  },
  tabMuted: {
    color: '#7b92ac',
    fontSize: 11,
    fontWeight: 700,
  },
  list: {
    padding: 10,
    overflow: 'auto',
    display: 'grid',
    gap: 8,
  },
  item: {
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 12,
    padding: '10px 11px',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(10,28,45,0.04)',
  },
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    gap: 10,
    alignItems: 'start',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(180deg, #1a4f82 0%, #14385f 100%)',
    display: 'grid',
    placeItems: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
  },
  iconGlyph: {
    color: '#ecf5ff',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.08em',
  },
  itemContent: {
    minWidth: 0,
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 12,
    color: '#123052',
    lineHeight: 1.25,
  },
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#154779',
    flex: '0 0 auto',
  },
  itemBody: {
    fontSize: 11,
    lineHeight: 1.45,
    color: '#425d7a',
    marginBottom: 6,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  itemMeta: {
    fontSize: 10,
    color: '#7b92ac',
  },
  emptyState: {
    padding: 12,
    color: '#6b84a0',
    fontSize: 12,
  },
}
