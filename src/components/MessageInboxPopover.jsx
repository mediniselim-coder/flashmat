import { useEffect, useMemo, useState } from 'react'
import { fetchConversationThreads, subscribeToInbox } from '../lib/inbox'

function formatPreviewTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function Avatar({ thread }) {
  if (thread?.counterpartAvatarUrl) {
    return <img src={thread.counterpartAvatarUrl} alt={thread.counterpartName} style={styles.avatarImage} />
  }

  return (
    <span style={styles.avatarFallback}>
      {String(thread?.counterpartName || 'F').trim().slice(0, 1).toUpperCase()}
    </span>
  )
}

export default function MessageInboxPopover({ open, onClose, onOpenThread, onOpenAll, user, profile }) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(false)
  const role = profile?.role || 'client'

  useEffect(() => {
    if (!open || !user?.id) return undefined
    let active = true

    async function loadThreads() {
      try {
        setLoading(true)
        const nextThreads = await fetchConversationThreads(user.id, role)
        if (!active) return
        setThreads(nextThreads)
      } catch {
        if (!active) return
        setThreads([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadThreads()
    const unsubscribe = subscribeToInbox(user.id, {
      onThreadsChange: loadThreads,
      onMessagesChange: loadThreads,
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [open, role, user?.id])

  const visibleThreads = useMemo(() => threads.slice(0, 8), [threads])

  if (!open) return null

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>FlashMat messages</div>
          <div style={styles.title}>Messages</div>
        </div>
        <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close messages">
          ×
        </button>
      </div>

      <div style={styles.searchHint}>Recent conversations, unread replies, and booking follow-ups.</div>

      <div style={styles.list}>
        {loading ? <div style={styles.empty}>Loading conversations...</div> : null}
        {!loading && visibleThreads.length === 0 ? <div style={styles.empty}>No messages yet.</div> : null}
        {visibleThreads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            style={styles.item}
            onClick={() => onOpenThread(thread.id)}
          >
            <div style={styles.avatarShell}>
              <Avatar thread={thread} />
            </div>
            <div style={styles.itemBody}>
              <div style={styles.itemTop}>
                <span style={styles.name}>{thread.counterpartName}</span>
                <span style={styles.time}>{formatPreviewTime(thread.last_message_at)}</span>
              </div>
              <div style={styles.subtitle}>{thread.counterpartSubtitle || 'FlashMat conversation'}</div>
              <div style={styles.previewRow}>
                <span style={styles.preview}>{thread.last_message_preview || 'Start the conversation'}</span>
                {thread.unreadCount > 0 ? <span style={styles.badge}>{thread.unreadCount}</span> : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={styles.footer}>
        <button type="button" style={styles.openAllButton} onClick={onOpenAll}>
          Open full inbox
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    width: 360,
    maxWidth: 'calc(100vw - 24px)',
    borderRadius: 22,
    background: '#ffffff',
    border: '1px solid rgba(120,171,218,0.18)',
    boxShadow: '0 28px 80px rgba(10,28,45,0.22)',
    overflow: 'hidden',
    zIndex: 40,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: '16px 16px 12px',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    fontWeight: 800,
    color: 'var(--blue)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'var(--display)',
    fontSize: 17,
    lineHeight: 1.05,
    color: '#15314f',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    color: '#7f97b2',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  },
  searchHint: {
    padding: '0 16px 10px',
    fontSize: 12,
    lineHeight: 1.45,
    color: '#7890a8',
  },
  list: {
    maxHeight: 420,
    overflow: 'auto',
    padding: '0 10px 10px',
    display: 'grid',
    gap: 6,
  },
  empty: {
    padding: '16px 10px',
    fontSize: 13,
    color: '#8aa0b9',
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '50px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
    border: '1px solid rgba(120,171,218,0.12)',
    background: '#f9fbff',
    borderRadius: 18,
    padding: '10px 12px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  avatarShell: {
    width: 50,
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(23,53,92,0.98) 0%, rgba(59,159,216,0.92) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    color: '#fff',
    fontWeight: 800,
    fontSize: 16,
  },
  itemBody: {
    minWidth: 0,
  },
  itemTop: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: 800,
    color: '#15314f',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: {
    flexShrink: 0,
    fontSize: 10,
    color: '#88a0b8',
  },
  subtitle: {
    fontSize: 11,
    color: '#84a0b9',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    fontSize: 12,
    color: '#55728f',
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    flexShrink: 0,
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 999,
    background: 'var(--blue)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
  },
  footer: {
    padding: '10px 12px 12px',
    borderTop: '1px solid rgba(120,171,218,0.12)',
    background: '#fcfdff',
  },
  openAllButton: {
    width: '100%',
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#fff',
    borderRadius: 14,
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#16314f',
    cursor: 'pointer',
  },
}
