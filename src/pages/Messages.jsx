import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../hooks/useAuth'
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

function formatMessageTime(value) {
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

function ConversationAvatar({ thread }) {
  if (thread?.counterpartAvatarUrl) {
    return <img src={thread.counterpartAvatarUrl} alt={thread.counterpartName} style={styles.threadAvatarImage} />
  }

  return <span style={styles.threadAvatarFallback}>{String(thread?.counterpartName || 'F').slice(0, 1).toUpperCase()}</span>
}

export default function Messages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedThreadId, setSelectedThreadId] = useState(searchParams.get('thread') || '')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [composer, setComposer] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  const role = profile?.role || 'client'
  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.id) === String(selectedThreadId)) || null,
    [selectedThreadId, threads],
  )
  const visibleThreads = useMemo(
    () => (filterUnread ? threads.filter((thread) => thread.unreadCount > 0) : threads),
    [filterUnread, threads],
  )

  useEffect(() => {
    if (!user?.id) return undefined
    let active = true

    async function loadThreadsAndContacts() {
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
          const queryThreadId = searchParams.get('thread')
          if (queryThreadId && nextThreads.some((thread) => String(thread.id) === String(queryThreadId))) {
            return String(queryThreadId)
          }
          if (current && nextThreads.some((thread) => String(thread.id) === String(current))) {
            return String(current)
          }
          return nextThreads[0]?.id ? String(nextThreads[0].id) : ''
        })
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load your inbox.', 'error')
      } finally {
        if (active) setLoadingThreads(false)
      }
    }

    loadThreadsAndContacts()
    const unsubscribe = subscribeToInbox(user.id, {
      onThreadsChange: loadThreadsAndContacts,
      onMessagesChange: async () => {
        const threadId = searchParams.get('thread') || selectedThreadId
        if (!threadId) return
        try {
          const nextMessages = await fetchThreadMessages(threadId)
          if (active) setMessages(nextMessages)
        } catch {
          // Keep current conversation visible.
        }
      },
      onNotificationsChange: loadThreadsAndContacts,
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [role, searchParams, selectedThreadId, toast, user?.id])

  useEffect(() => {
    if (!selectedThreadId || !user?.id) {
      setMessages([])
      return undefined
    }

    let active = true

    async function loadThreadMessages() {
      try {
        setLoadingMessages(true)
        const nextMessages = await fetchThreadMessages(selectedThreadId)
        if (!active) return
        setMessages(nextMessages)
        await markThreadMessagesRead(selectedThreadId, user.id)
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load the conversation.', 'error')
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    loadThreadMessages()
    return () => {
      active = false
    }
  }, [selectedThreadId, toast, user?.id])

  useEffect(() => {
    if (!selectedThreadId) return
    setSearchParams({ thread: selectedThreadId }, { replace: true })
  }, [selectedThreadId, setSearchParams])

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

      setSelectedThreadId(String(thread.id))
      setSelectedContactId('')
      const nextThreads = await fetchConversationThreads(user.id, role)
      setThreads(nextThreads)
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
      toast(error.message || 'Unable to send the message.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.page}>
      <NavBar activePage="messages" />
      <main style={styles.main}>
        <section style={styles.shell}>
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <div>
                <div style={styles.eyebrow}>FlashMat inbox</div>
                <h1 style={styles.heading}>Messages</h1>
              </div>
              <div style={styles.filterRow}>
                <button
                  type="button"
                  style={filterUnread ? styles.filterButtonGhost : styles.filterButton}
                  onClick={() => setFilterUnread(false)}
                >
                  All
                </button>
                <button
                  type="button"
                  style={filterUnread ? styles.filterButton : styles.filterButtonGhost}
                  onClick={() => setFilterUnread(true)}
                >
                  Unread
                </button>
              </div>
            </div>

            <div style={styles.startCard}>
              <div style={styles.startTitle}>Start a new conversation</div>
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
              {!loadingThreads && visibleThreads.length === 0 ? <div style={styles.emptyText}>No conversations yet.</div> : null}
              {visibleThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  style={{
                    ...styles.threadRow,
                    background: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.10)' : '#fff',
                    borderColor: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.22)' : 'rgba(120,171,218,0.12)',
                  }}
                  onClick={() => setSelectedThreadId(String(thread.id))}
                >
                  <div style={styles.threadAvatarWrap}>
                    <ConversationAvatar thread={thread} />
                  </div>
                  <div style={styles.threadBody}>
                    <div style={styles.threadTopLine}>
                      <strong style={styles.threadName}>{thread.counterpartName}</strong>
                      <span style={styles.threadDate}>{formatMessageTime(thread.last_message_at)}</span>
                    </div>
                    <div style={styles.threadSubtitle}>{thread.counterpartSubtitle || 'FlashMat conversation'}</div>
                    <div style={styles.threadPreviewLine}>
                      <span style={styles.threadPreview}>{thread.last_message_preview || 'Conversation ready to start.'}</span>
                      {thread.unreadCount > 0 ? <span style={styles.unreadBadge}>{thread.unreadCount}</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section style={styles.chatPane}>
            {selectedThread ? (
              <>
                <div style={styles.chatHeader}>
                  <div style={styles.chatHeaderMain}>
                    <div style={styles.chatHeaderAvatar}>
                      <ConversationAvatar thread={selectedThread} />
                    </div>
                    <div>
                      <div style={styles.chatName}>{selectedThread.counterpartName}</div>
                      <div style={styles.chatMeta}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                    </div>
                  </div>
                  <button type="button" style={styles.secondaryButton} onClick={() => navigate(-1)}>
                    Back
                  </button>
                </div>

                <div style={styles.chatFeed}>
                  {loadingMessages ? <div style={styles.emptyText}>Loading messages...</div> : null}
                  {!loadingMessages && messages.length === 0 ? <div style={styles.emptyText}>Say hello to start the conversation.</div> : null}
                  {messages.map((message) => {
                    const mine = String(message.sender_id) === String(user?.id)
                    return (
                      <div key={message.id} style={{ ...styles.messageWrap, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ ...styles.messageBubble, ...(mine ? styles.messageMine : styles.messageTheirs) }}>
                          <div>{message.body}</div>
                          <div style={styles.messageMeta}>{formatMessageTime(message.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={styles.composer}>
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
              <div style={styles.emptyPane}>
                <div style={styles.emptyPaneTitle}>Choose a conversation</div>
                <div style={styles.emptyPaneText}>Open a thread from the left to read messages and reply.</div>
              </div>
            )}
          </section>

          <aside style={styles.contextPane}>
            {selectedThread ? (
              <>
                <div style={styles.contextCard}>
                  <div style={styles.contextEyebrow}>Conversation details</div>
                  <div style={styles.contextTitle}>{selectedThread.counterpartName}</div>
                  <div style={styles.contextText}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                </div>
                <div style={styles.contextCard}>
                  <div style={styles.contextEyebrow}>Quick actions</div>
                  <button
                    type="button"
                    style={styles.contextButton}
                    onClick={() => {
                      if (role === 'client') navigate('/providers')
                      else navigate('/app/provider/bookings')
                    }}
                  >
                    {role === 'client' ? 'Open providers' : 'Open bookings'}
                  </button>
                  <button
                    type="button"
                    style={styles.contextButtonGhost}
                    onClick={() => navigator.clipboard.writeText(selectedThread.counterpartName || '')}
                  >
                    Copy contact name
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #edf4ff 0%, #f7fbff 100%)',
  },
  main: {
    paddingTop: 'var(--nav-h, 64px)',
    height: 'calc(100vh - var(--nav-h, 64px))',
  },
  shell: {
    width: '100%',
    height: 'calc(100vh - var(--nav-h, 64px))',
    display: 'grid',
    gridTemplateColumns: '360px minmax(0, 1fr) 300px',
    borderTop: '1px solid rgba(120,171,218,0.16)',
    background: '#ffffff',
    overflow: 'hidden',
  },
  sidebar: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    borderRight: '1px solid rgba(120,171,218,0.14)',
    minHeight: 0,
  },
  sidebarHeader: {
    padding: '24px 22px 18px',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    marginBottom: 6,
  },
  heading: {
    margin: 0,
    fontFamily: 'var(--display)',
    fontSize: 28,
    lineHeight: 1,
    color: '#15314f',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    marginTop: 16,
  },
  filterButton: {
    border: 'none',
    background: '#133453',
    color: '#fff',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  filterButtonGhost: {
    border: '1px solid rgba(120,171,218,0.18)',
    background: '#fff',
    color: '#325273',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  startCard: {
    margin: '16px 18px 0',
    padding: 16,
    borderRadius: 20,
    border: '1px solid rgba(120,171,218,0.14)',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%)',
    display: 'grid',
    gap: 10,
  },
  startTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#15314f',
  },
  select: {
    width: '100%',
    borderRadius: 14,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#fff',
    padding: '11px 12px',
    fontSize: 13,
    color: '#17314c',
    fontFamily: 'var(--font)',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #17355c 0%, #1c4d82 100%)',
    color: '#fff',
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#fff',
    color: '#1b3c5f',
    borderRadius: 14,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  threadList: {
    minHeight: 0,
    overflow: 'auto',
    padding: '14px 14px 18px',
    display: 'grid',
    gap: 10,
    alignContent: 'start',
  },
  emptyText: {
    fontSize: 13,
    color: '#8aa0b8',
    padding: '12px 6px',
  },
  threadRow: {
    display: 'grid',
    gridTemplateColumns: '58px minmax(0, 1fr)',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 20,
    border: '1px solid rgba(120,171,218,0.12)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  threadAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(23,53,92,0.98) 0%, rgba(59,159,216,0.92) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
  },
  threadAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  threadAvatarFallback: {
    color: '#fff',
    fontWeight: 800,
    fontSize: 18,
  },
  threadBody: {
    minWidth: 0,
    display: 'grid',
    gap: 4,
    alignContent: 'center',
  },
  threadTopLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
  },
  threadName: {
    fontSize: 15,
    color: '#18314d',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadDate: {
    fontSize: 10,
    color: '#90a6bd',
    flexShrink: 0,
  },
  threadSubtitle: {
    fontSize: 12,
    color: '#849cb4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadPreviewLine: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  threadPreview: {
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12.5,
    color: '#5a7895',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 999,
    background: 'var(--blue)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPane: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    minHeight: 0,
    borderRight: '1px solid rgba(120,171,218,0.14)',
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '22px 24px 18px',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
  },
  chatHeaderMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  chatHeaderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(23,53,92,0.98) 0%, rgba(59,159,216,0.92) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatName: {
    fontFamily: 'var(--display)',
    fontSize: 22,
    lineHeight: 1,
    color: '#15314f',
    marginBottom: 4,
  },
  chatMeta: {
    fontSize: 13,
    color: '#87a0b9',
  },
  chatFeed: {
    minHeight: 0,
    overflow: 'auto',
    padding: '24px 24px 18px',
    display: 'grid',
    gap: 12,
    alignContent: 'start',
  },
  messageWrap: {
    display: 'flex',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '12px 14px 10px',
    borderRadius: 20,
    fontSize: 14,
    lineHeight: 1.5,
  },
  messageMine: {
    background: 'linear-gradient(135deg, #18365b 0%, #24558c 100%)',
    color: '#fff',
    borderBottomRightRadius: 8,
  },
  messageTheirs: {
    background: '#eef4fb',
    color: '#17314d',
    border: '1px solid rgba(120,171,218,0.14)',
    borderBottomLeftRadius: 8,
  },
  messageMeta: {
    marginTop: 6,
    fontSize: 10,
    opacity: 0.7,
  },
  composer: {
    padding: '14px 18px 18px',
    borderTop: '1px solid rgba(120,171,218,0.12)',
    display: 'grid',
    gap: 10,
    background: '#fff',
  },
  textarea: {
    width: '100%',
    minHeight: 92,
    resize: 'vertical',
    borderRadius: 18,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#f5f9ff',
    padding: '14px 16px',
    fontFamily: 'var(--font)',
    fontSize: 14,
    color: '#17314c',
  },
  contextPane: {
    padding: 20,
    display: 'grid',
    alignContent: 'start',
    gap: 14,
    background: '#fbfdff',
  },
  contextCard: {
    borderRadius: 22,
    border: '1px solid rgba(120,171,218,0.12)',
    background: '#fff',
    padding: 18,
    boxShadow: '0 16px 40px rgba(13,30,50,0.06)',
  },
  contextEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    marginBottom: 8,
  },
  contextTitle: {
    fontFamily: 'var(--display)',
    fontSize: 22,
    lineHeight: 1,
    color: '#15314f',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#6f89a4',
    marginBottom: 14,
  },
  contextButton: {
    width: '100%',
    border: 'none',
    borderRadius: 14,
    background: '#18365b',
    color: '#fff',
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: 10,
  },
  contextButtonGhost: {
    width: '100%',
    border: '1px solid rgba(120,171,218,0.14)',
    borderRadius: 14,
    background: '#fff',
    color: '#18365b',
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyPane: {
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 32,
  },
  emptyPaneTitle: {
    fontFamily: 'var(--display)',
    fontSize: 22,
    color: '#15314f',
    marginBottom: 8,
  },
  emptyPaneText: {
    fontSize: 13,
    color: '#7790aa',
  },
}
