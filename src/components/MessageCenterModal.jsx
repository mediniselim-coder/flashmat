import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../hooks/useToast'
import {
  createOrGetThread,
  fetchAvailableMessageContacts,
  fetchConversationThreads,
  fetchThreadMessages,
  markThreadMessagesRead,
  sendThreadMessage,
  subscribeToInbox,
} from '../lib/inbox'

export default function MessageCenterModal({ open, onClose, user, profile, initialThreadId = null }) {
  const { toast } = useToast()
  const [threads, setThreads] = useState([])
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId || '')
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [composer, setComposer] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  const role = profile?.role || 'client'
  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.id) === String(selectedThreadId)) || null,
    [selectedThreadId, threads],
  )

  useEffect(() => {
    if (!open) return
    setSelectedThreadId(initialThreadId || '')
  }, [initialThreadId, open])

  useEffect(() => {
    if (!open || !user?.id) return undefined
    let active = true

    async function loadInbox() {
      try {
        setLoadingThreads(true)
        const [nextThreads, nextContacts] = await Promise.all([
          fetchConversationThreads(user.id, role),
          fetchAvailableMessageContacts(user.id, role),
        ])
        if (!active) return
        setThreads(nextThreads)
        setContacts(nextContacts)
        setSelectedThreadId((current) => {
          if (initialThreadId && nextThreads.some((thread) => String(thread.id) === String(initialThreadId))) {
            return String(initialThreadId)
          }
          if (current && nextThreads.some((thread) => String(thread.id) === String(current))) {
            return String(current)
          }
          return nextThreads[0]?.id ? String(nextThreads[0].id) : ''
        })
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load your conversations.', 'error')
      } finally {
        if (active) setLoadingThreads(false)
      }
    }

    loadInbox()

    const unsubscribe = subscribeToInbox(user.id, {
      onThreadsChange: loadInbox,
      onMessagesChange: async () => {
        const targetThreadId = initialThreadId || selectedThreadId
        if (!targetThreadId) return
        try {
          const nextMessages = await fetchThreadMessages(targetThreadId)
          if (active) setMessages(nextMessages)
        } catch {
          // Keep the last stable thread contents visible.
        }
      },
      onNotificationsChange: loadInbox,
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [initialThreadId, open, role, selectedThreadId, toast, user?.id])

  useEffect(() => {
    if (!open || !selectedThreadId || !user?.id) {
      setMessages([])
      return undefined
    }

    let active = true

    async function loadMessages() {
      try {
        setLoadingMessages(true)
        const nextMessages = await fetchThreadMessages(selectedThreadId)
        if (!active) return
        setMessages(nextMessages)
        await markThreadMessagesRead(selectedThreadId, user.id)
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load this conversation.', 'error')
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    loadMessages()
    return () => {
      active = false
    }
  }, [open, selectedThreadId, toast, user?.id])

  async function handleStartConversation() {
    if (!selectedContactId || !user?.id) return

    try {
      const target = contacts.find((contact) => String(contact.id) === String(selectedContactId))
      if (!target) return

      const thread = await createOrGetThread({
        clientId: role === 'client' ? user.id : target.id,
        providerId: role === 'provider' ? user.id : target.id,
        creatorId: user.id,
      })

      const nextThreads = await fetchConversationThreads(user.id, role)
      setThreads(nextThreads)
      setSelectedThreadId(String(thread.id))
      setSelectedContactId('')
    } catch (error) {
      toast(error.message || 'Unable to start a conversation right now.', 'error')
    }
  }

  async function handleSend() {
    if (!selectedThread || !user?.id || !String(composer || '').trim()) return

    try {
      setSending(true)
      await sendThreadMessage({
        threadId: selectedThread.id,
        senderId: user.id,
        recipientId: selectedThread.counterpartId,
        body: composer,
      })
      setComposer('')
      const [nextThreads, nextMessages] = await Promise.all([
        fetchConversationThreads(user.id, role),
        fetchThreadMessages(selectedThread.id),
      ])
      setThreads(nextThreads)
      setMessages(nextMessages)
    } catch (error) {
      toast(error.message || 'Unable to send your message.', 'error')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div style={styles.scrim} onClick={onClose}>
      <aside style={styles.drawer} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>FlashMat messages</div>
            <div style={styles.title}>Inbox</div>
            <div style={styles.subtitle}>Talk with clients and providers without leaving FlashMat.</div>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close messages">
            ×
          </button>
        </div>

        <div style={styles.content}>
          <aside style={styles.sidebar}>
            <div style={styles.newConversationCard}>
              <div style={styles.sectionTitle}>New chat</div>
              <select
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
                style={styles.select}
              >
                <option value="">Choose a contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
              <button type="button" style={styles.primaryButton} onClick={handleStartConversation}>
                Start chat
              </button>
            </div>

            <div style={styles.threadList}>
              {loadingThreads ? <div style={styles.emptyText}>Loading conversations...</div> : null}
              {!loadingThreads && threads.length === 0 ? <div style={styles.emptyText}>No conversations yet.</div> : null}
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(String(thread.id))}
                  style={{
                    ...styles.threadButton,
                    background: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.12)' : '#fff',
                    borderColor: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.22)' : 'rgba(120,171,218,0.12)',
                  }}
                >
                  <div style={styles.threadTopRow}>
                    <strong style={styles.threadName}>{thread.counterpartName}</strong>
                    {thread.unreadCount > 0 ? <span style={styles.unreadBadge}>{thread.unreadCount}</span> : null}
                  </div>
                  <div style={styles.threadSubtitle}>{thread.counterpartSubtitle || 'FlashMat conversation'}</div>
                  <div style={styles.threadPreview}>{thread.last_message_preview || 'Conversation ready to start.'}</div>
                </button>
              ))}
            </div>
          </aside>

          <section style={styles.threadPanel}>
            {selectedThread ? (
              <>
                <div style={styles.threadHeader}>
                  <div style={styles.threadPanelTitle}>{selectedThread.counterpartName}</div>
                  <div style={styles.threadPanelSubtitle}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                </div>

                <div style={styles.messageFeed}>
                  {loadingMessages ? <div style={styles.emptyText}>Loading messages...</div> : null}
                  {!loadingMessages && messages.length === 0 ? (
                    <div style={styles.emptyText}>Say hello to start the conversation.</div>
                  ) : null}
                  {messages.map((message) => {
                    const mine = String(message.sender_id) === String(user?.id)
                    return (
                      <div
                        key={message.id}
                        style={{ ...styles.messageBubble, ...(mine ? styles.messageMine : styles.messageTheirs) }}
                      >
                        <div>{message.body}</div>
                        <div style={styles.messageMeta}>
                          {new Date(message.created_at).toLocaleString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={styles.composerRow}>
                  <textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    style={styles.textarea}
                    placeholder="Write a message..."
                  />
                  <button type="button" style={styles.primaryButton} onClick={handleSend} disabled={sending}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.emptyPanel}>Select a conversation or start a new one from the left.</div>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}

const styles = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5,17,29,0.42)',
    backdropFilter: 'blur(4px)',
    zIndex: 1800,
  },
  drawer: {
    position: 'absolute',
    top: 20,
    right: 20,
    bottom: 20,
    width: 'min(900px, calc(100vw - 40px))',
    background: '#f8fbff',
    borderRadius: 24,
    border: '1px solid rgba(120,171,218,0.18)',
    boxShadow: '0 30px 80px rgba(10,28,45,0.24)',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    padding: '16px 18px 14px',
    borderBottom: '1px solid rgba(120,171,218,0.14)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.14em',
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 1.45,
    color: '#6b84a0',
    maxWidth: 360,
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    color: '#7c96b3',
    cursor: 'pointer',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '280px minmax(0, 1fr)',
    minHeight: 0,
  },
  sidebar: {
    borderRight: '1px solid rgba(120,171,218,0.14)',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    minHeight: 0,
    background: '#ffffff',
  },
  newConversationCard: {
    padding: 14,
    borderBottom: '1px solid rgba(120,171,218,0.12)',
    display: 'grid',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'var(--display)',
    fontSize: 15,
    color: '#123052',
  },
  select: {
    width: '100%',
    borderRadius: 12,
    border: '1px solid rgba(120,171,218,0.18)',
    background: '#eef5ff',
    padding: '10px 12px',
    fontSize: 13,
    color: '#16314f',
    fontFamily: 'var(--font)',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  threadList: {
    padding: 10,
    overflow: 'auto',
    display: 'grid',
    gap: 8,
    alignContent: 'start',
  },
  threadButton: {
    border: '1px solid rgba(120,171,218,0.12)',
    borderRadius: 16,
    padding: '12px 12px 10px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  threadTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  threadName: {
    fontSize: 14,
    color: '#123052',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    padding: '0 7px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#154779',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
  },
  threadSubtitle: {
    fontSize: 11,
    color: '#6b84a0',
    marginBottom: 6,
  },
  threadPreview: {
    fontSize: 12,
    color: '#425d7a',
    lineHeight: 1.45,
  },
  threadPanel: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    minHeight: 0,
    background: 'linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%)',
  },
  threadHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
  },
  threadPanelTitle: {
    fontFamily: 'var(--display)',
    fontSize: 17,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: '#123052',
    marginBottom: 3,
  },
  threadPanelSubtitle: {
    fontSize: 12,
    color: '#6b84a0',
  },
  messageFeed: {
    padding: 16,
    overflow: 'auto',
    display: 'grid',
    gap: 10,
    alignContent: 'start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: '10px 12px 8px',
    fontSize: 13,
    lineHeight: 1.55,
    boxShadow: '0 12px 24px rgba(10,28,45,0.06)',
  },
  messageMine: {
    justifySelf: 'end',
    background: 'linear-gradient(135deg, #11304f 0%, #1f67a4 100%)',
    color: '#fff',
    borderBottomRightRadius: 6,
  },
  messageTheirs: {
    justifySelf: 'start',
    background: '#ffffff',
    color: '#17314f',
    border: '1px solid rgba(120,171,218,0.18)',
    borderBottomLeftRadius: 6,
  },
  messageMeta: {
    marginTop: 4,
    fontSize: 10,
    opacity: 0.72,
  },
  composerRow: {
    padding: 14,
    borderTop: '1px solid rgba(120,171,218,0.12)',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
    alignItems: 'end',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    minHeight: 72,
    borderRadius: 14,
    border: '1px solid rgba(120,171,218,0.18)',
    background: '#eef5ff',
    padding: '10px 12px',
    fontSize: 13,
    color: '#16314f',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'var(--font)',
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  emptyPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b84a0',
    fontSize: 14,
    padding: 24,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b84a0',
    fontSize: 12,
    lineHeight: 1.5,
    padding: 6,
  },
}
