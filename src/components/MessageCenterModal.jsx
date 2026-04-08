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
  const [loading, setLoading] = useState(false)
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
    if (!open || !user?.id) return
    let active = true

    async function loadInbox() {
      try {
        setLoading(true)
        const [nextThreads, nextContacts] = await Promise.all([
          fetchConversationThreads(user.id, role),
          fetchAvailableMessageContacts(user.id, role),
        ])
        if (!active) return
        setThreads(nextThreads)
        setContacts(nextContacts)
        setSelectedThreadId((current) => {
          if (initialThreadId && nextThreads.some((thread) => String(thread.id) === String(initialThreadId))) return initialThreadId
          if (current && nextThreads.some((thread) => String(thread.id) === String(current))) return current
          return nextThreads[0]?.id || ''
        })
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load your conversations.', 'error')
      } finally {
        if (active) setLoading(false)
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
          // Ignore realtime refresh failures and keep the current thread visible.
        }
      },
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [initialThreadId, open, role, selectedThreadId, toast, user?.id])

  useEffect(() => {
    if (!open || !selectedThreadId || !user?.id) {
      setMessages([])
      return
    }

    let active = true
    async function loadMessages() {
      try {
        const nextMessages = await fetchThreadMessages(selectedThreadId)
        if (!active) return
        setMessages(nextMessages)
        await markThreadMessagesRead(selectedThreadId, user.id)
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load this conversation.', 'error')
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
      setSelectedThreadId(thread.id)
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
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>FlashMat Messages</div>
            <div style={styles.title}>Live conversations</div>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <aside style={styles.sidebar}>
            <div style={styles.newConversationCard}>
              <div style={styles.sectionTitle}>New conversation</div>
              <select value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)} style={styles.select}>
                <option value="">Choose a contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.name}</option>
                ))}
              </select>
              <button type="button" style={styles.primaryButton} onClick={handleStartConversation}>
                Start chat
              </button>
            </div>

            <div style={styles.threadList}>
              {loading ? <div style={styles.emptyText}>Loading conversations...</div> : null}
              {!loading && threads.length === 0 ? <div style={styles.emptyText}>No conversations yet.</div> : null}
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
                  style={{
                    ...styles.threadButton,
                    background: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.12)' : 'transparent',
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
                  <div>
                    <div style={styles.threadPanelTitle}>{selectedThread.counterpartName}</div>
                    <div style={styles.threadPanelSubtitle}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                  </div>
                </div>

                <div style={styles.messageFeed}>
                  {messages.length === 0 ? <div style={styles.emptyText}>Say hello to start the conversation.</div> : null}
                  {messages.map((message) => {
                    const mine = String(message.sender_id) === String(user?.id)
                    return (
                      <div key={message.id} style={{ ...styles.messageBubble, ...(mine ? styles.messageMine : styles.messageTheirs) }}>
                        <div>{message.body}</div>
                        <div style={styles.messageMeta}>
                          {new Date(message.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
              <div style={styles.emptyPanel}>
                Select a conversation or start a new one from the left.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

const styles = {
  scrim: { position: 'fixed', inset: 0, background: 'rgba(5,17,29,0.46)', backdropFilter: 'blur(4px)', zIndex: 1800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: 'min(1120px, calc(100vw - 32px))', height: 'min(78vh, 760px)', background: '#f8fbff', borderRadius: 28, border: '1px solid rgba(120,171,218,0.18)', boxShadow: '0 30px 80px rgba(10,28,45,0.24)', display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px', borderBottom: '1px solid rgba(120,171,218,0.14)', background: 'linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)' },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 6 },
  title: { fontFamily: 'var(--display)', fontSize: 30, lineHeight: 1, letterSpacing: '-0.05em', color: '#123052' },
  closeButton: { border: 'none', background: 'transparent', fontSize: 30, lineHeight: 1, color: '#7c96b3', cursor: 'pointer' },
  content: { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: 0 },
  sidebar: { borderRight: '1px solid rgba(120,171,218,0.14)', display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0, background: '#ffffff' },
  newConversationCard: { padding: 18, borderBottom: '1px solid rgba(120,171,218,0.12)', display: 'grid', gap: 10 },
  sectionTitle: { fontFamily: 'var(--display)', fontSize: 18, color: '#123052' },
  select: { width: '100%', borderRadius: 14, border: '1px solid rgba(120,171,218,0.18)', background: '#eef5ff', padding: '12px 13px', fontSize: 14, color: '#16314f', fontFamily: 'var(--font)' },
  primaryButton: { border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)', color: '#fff', fontSize: 14, fontWeight: 800, padding: '12px 16px', cursor: 'pointer' },
  threadList: { padding: 12, overflow: 'auto', display: 'grid', gap: 10, alignContent: 'start' },
  threadButton: { border: '1px solid rgba(120,171,218,0.12)', borderRadius: 18, padding: '14px 14px 12px', textAlign: 'left', background: 'transparent', cursor: 'pointer' },
  threadTopRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 },
  threadName: { fontSize: 15, color: '#123052' },
  unreadBadge: { minWidth: 24, height: 24, borderRadius: 999, padding: '0 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#154779', color: '#fff', fontSize: 12, fontWeight: 800 },
  threadSubtitle: { fontSize: 12, color: '#6b84a0', marginBottom: 7 },
  threadPreview: { fontSize: 13, color: '#425d7a', lineHeight: 1.5 },
  threadPanel: { display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0, background: 'linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%)' },
  threadHeader: { padding: '18px 22px', borderBottom: '1px solid rgba(120,171,218,0.12)' },
  threadPanelTitle: { fontFamily: 'var(--display)', fontSize: 24, lineHeight: 1, letterSpacing: '-0.04em', color: '#123052', marginBottom: 4 },
  threadPanelSubtitle: { fontSize: 13, color: '#6b84a0' },
  messageFeed: { padding: 20, overflow: 'auto', display: 'grid', gap: 12, alignContent: 'start' },
  messageBubble: { maxWidth: '80%', borderRadius: 18, padding: '12px 14px 10px', fontSize: 14, lineHeight: 1.65, boxShadow: '0 12px 24px rgba(10,28,45,0.06)' },
  messageMine: { justifySelf: 'end', background: 'linear-gradient(135deg, #11304f 0%, #1f67a4 100%)', color: '#fff', borderBottomRightRadius: 6 },
  messageTheirs: { justifySelf: 'start', background: '#ffffff', color: '#17314f', border: '1px solid rgba(120,171,218,0.18)', borderBottomLeftRadius: 6 },
  messageMeta: { marginTop: 6, fontSize: 11, opacity: 0.72 },
  composerRow: { padding: 18, borderTop: '1px solid rgba(120,171,218,0.12)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', background: '#fff' },
  textarea: { width: '100%', minHeight: 80, borderRadius: 16, border: '1px solid rgba(120,171,218,0.18)', background: '#eef5ff', padding: '12px 14px', fontSize: 14, color: '#16314f', outline: 'none', resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.6, boxSizing: 'border-box' },
  emptyPanel: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b84a0', fontSize: 15, padding: 24, textAlign: 'center' },
  emptyText: { color: '#6b84a0', fontSize: 13, lineHeight: 1.6, padding: 8 },
}
