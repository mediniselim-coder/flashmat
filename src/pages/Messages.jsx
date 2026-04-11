import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import {
  deleteConversationThread,
  fetchConversationThreads,
  fetchThreadMessages,
  markThreadMessagesRead,
  parseMessageBody,
  sendThreadMessage,
  subscribeToInbox,
} from '../lib/inbox'

function getArchivedStorageKey(userId) {
  return `flashmat-archived-threads:${userId}`
}

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

function getThreadListSubtitle(thread) {
  if (thread?.counterpartRole === 'provider') return 'FlashMat provider'
  return thread?.counterpartSubtitle || 'FlashMat conversation'
}

function slugifyProviderName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function formatAttachmentSize(size) {
  const value = Number(size) || 0
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

function isImageAttachment(attachment) {
  return String(attachment?.type || '').startsWith('image/')
}

function isPdfAttachment(attachment) {
  return String(attachment?.type || '') === 'application/pdf'
}

export default function Messages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedThreadId, setSelectedThreadId] = useState(searchParams.get('thread') || '')
  const [composer, setComposer] = useState('')
  const [attachments, setAttachments] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [preparingAttachments, setPreparingAttachments] = useState(false)
  const [deletingThreadId, setDeletingThreadId] = useState('')
  const [archivedThreadIds, setArchivedThreadIds] = useState([])
  const [menuThreadId, setMenuThreadId] = useState('')
  const [confirmState, setConfirmState] = useState({ open: false, thread: null })
  const fileInputRef = useRef(null)
  const actionsMenuRef = useRef(null)
  const selectedThreadIdRef = useRef(selectedThreadId)
  const archivedThreadIdsRef = useRef(archivedThreadIds)

  const role = profile?.role || 'client'
  const searchThreadParam = searchParams.get('thread') || ''
  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.id) === String(selectedThreadId)) || null,
    [selectedThreadId, threads],
  )
  const visibleThreads = useMemo(() => {
    const archivedSet = new Set(archivedThreadIds.map(String))
    const baseThreads = activeFilter === 'archived'
      ? threads.filter((thread) => archivedSet.has(String(thread.id)))
      : threads.filter((thread) => !archivedSet.has(String(thread.id)))

    if (activeFilter === 'unread') {
      return baseThreads.filter((thread) => thread.unreadCount > 0)
    }

    return baseThreads
  }, [activeFilter, archivedThreadIds, threads])

  useEffect(() => {
    if (!user?.id) {
      setArchivedThreadIds([])
      return
    }

    try {
      const stored = JSON.parse(window.localStorage.getItem(getArchivedStorageKey(user.id)) || '[]')
      setArchivedThreadIds(Array.isArray(stored) ? stored.map(String) : [])
    } catch {
      setArchivedThreadIds([])
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    window.localStorage.setItem(getArchivedStorageKey(user.id), JSON.stringify(archivedThreadIds))
  }, [archivedThreadIds, user?.id])

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId
  }, [selectedThreadId])

  useEffect(() => {
    archivedThreadIdsRef.current = archivedThreadIds
  }, [archivedThreadIds])

  useEffect(() => {
    function handleWindowClick(event) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setMenuThreadId('')
      }
    }

    window.addEventListener('mousedown', handleWindowClick)
    return () => window.removeEventListener('mousedown', handleWindowClick)
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined
    let active = true

    async function loadThreads() {
      try {
        setLoadingThreads(true)
        const nextThreads = await fetchConversationThreads(user.id, role)
        if (!active) return
        setThreads(nextThreads)
        setSelectedThreadId((current) => {
          const queryThreadId = searchThreadParam
          const archivedSet = new Set(archivedThreadIdsRef.current.map(String))
          const defaultThread = nextThreads.find((thread) => !archivedSet.has(String(thread.id))) || nextThreads[0]
          if (queryThreadId && nextThreads.some((thread) => String(thread.id) === String(queryThreadId))) {
            return String(queryThreadId)
          }
          if (current && nextThreads.some((thread) => String(thread.id) === String(current))) {
            return String(current)
          }
          return defaultThread?.id ? String(defaultThread.id) : ''
        })
      } catch (error) {
        if (!active) return
        toast(error.message || 'Unable to load your inbox.', 'error')
      } finally {
        if (active) setLoadingThreads(false)
      }
    }

    loadThreads()
    const unsubscribe = subscribeToInbox(user.id, {
      onThreadsChange: loadThreads,
      onMessagesChange: async () => {
        const threadId = selectedThreadIdRef.current
        if (!threadId) return
        try {
          const nextMessages = await fetchThreadMessages(threadId)
          if (active) setMessages(nextMessages)
        } catch {
          // Keep current conversation visible.
        }
      },
      onNotificationsChange: loadThreads,
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [role, searchThreadParam, toast, user?.id])

  useEffect(() => {
    if (!searchThreadParam || !threads.some((thread) => String(thread.id) === String(searchThreadParam))) return
    setSelectedThreadId((current) => (String(current) === String(searchThreadParam) ? current : String(searchThreadParam)))
  }, [searchThreadParam, threads])

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
        setThreads((current) => current.map((thread) => (
          String(thread.id) === String(selectedThreadId) ? { ...thread, unreadCount: 0 } : thread
        )))
        void markThreadMessagesRead(selectedThreadId, user.id)
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
    if (!selectedThreadId || searchThreadParam === String(selectedThreadId)) return
    setSearchParams({ thread: selectedThreadId }, { replace: true })
  }, [searchThreadParam, selectedThreadId, setSearchParams])

  async function handleAddAttachments(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    if (attachments.length + files.length > 4) {
      toast('You can attach up to 4 files per message.', 'error')
      return
    }

    const invalidFile = files.find((file) => !(file.type.startsWith('image/') || file.type === 'application/pdf'))
    if (invalidFile) {
      toast('Only photos and PDF files are supported right now.', 'error')
      return
    }

    const oversizeFile = files.find((file) => file.size > 2 * 1024 * 1024)
    if (oversizeFile) {
      toast(`${oversizeFile.name} is too large. Keep files under 2 MB each.`, 'error')
      return
    }

    try {
      setPreparingAttachments(true)
      const nextAttachments = await Promise.all(files.map(async (file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: await readFileAsDataUrl(file),
      })))
      setAttachments((current) => [...current, ...nextAttachments])
    } catch (error) {
      toast(error.message || 'Unable to prepare your files.', 'error')
    } finally {
      setPreparingAttachments(false)
    }
  }

  function removeAttachment(attachmentId) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
  }

  async function handleSend() {
    if (!selectedThread || !user?.id || (!String(composer || '').trim() && attachments.length === 0)) return

    try {
      setSending(true)
      await sendThreadMessage({
        threadId: selectedThread.id,
        senderId: user.id,
        recipientId: selectedThread.counterpartId,
        body: composer,
        attachments,
      })
      setComposer('')
      setAttachments([])
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

  async function handleDeleteThread(thread) {
    if (!thread?.id || !user?.id) return
    setConfirmState({ open: true, thread })
  }

  async function confirmDeleteThread() {
    const thread = confirmState.thread
    if (!thread?.id || !user?.id) return
    try {
      setDeletingThreadId(String(thread.id))
      await deleteConversationThread(thread.id, user.id)
      setArchivedThreadIds((current) => current.filter((id) => String(id) !== String(thread.id)))
      const nextThreads = await fetchConversationThreads(user.id, role)
      setThreads(nextThreads)
      setMessages([])
      setSelectedThreadId((current) => {
        if (String(current) !== String(thread.id)) return current
        return nextThreads[0]?.id ? String(nextThreads[0].id) : ''
      })
      if (String(searchParams.get('thread') || '') === String(thread.id)) {
        setSearchParams(nextThreads[0]?.id ? { thread: String(nextThreads[0].id) } : {}, { replace: true })
      }
      toast('Conversation deleted.', 'success')
    } catch (error) {
      toast(error.message || 'Unable to delete this conversation.', 'error')
    } finally {
      setDeletingThreadId('')
      setConfirmState({ open: false, thread: null })
      setMenuThreadId('')
    }
  }

  function toggleArchiveThread(thread) {
    if (!thread?.id) return
    const threadId = String(thread.id)
    const isArchived = archivedThreadIds.includes(threadId)
    setArchivedThreadIds((current) => (
      isArchived ? current.filter((id) => id !== threadId) : [...current, threadId]
    ))
    setMenuThreadId('')
    if (!isArchived && String(selectedThreadId) === threadId) {
      const nextVisibleThread = threads.find((entry) => String(entry.id) !== threadId && !archivedThreadIds.includes(String(entry.id)))
      setSelectedThreadId(nextVisibleThread?.id ? String(nextVisibleThread.id) : '')
      setMessages([])
      setActiveFilter('all')
    }
    toast(isArchived ? 'Conversation moved back to inbox.' : 'Conversation archived.', 'success')
  }

  function openCounterpartProfile(thread) {
    if (!thread) return
    if (thread.counterpartRole === 'provider') {
      const providerName = encodeURIComponent(thread.counterpartName || '')
      navigate(`/provider/${slugifyProviderName(thread.counterpartName)}?n=${providerName}`)
      return
    }

    navigate('/app/provider/bookings')
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
                  style={activeFilter === 'all' ? styles.filterButton : styles.filterButtonGhost}
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  style={activeFilter === 'unread' ? styles.filterButton : styles.filterButtonGhost}
                  onClick={() => setActiveFilter('unread')}
                >
                  Unread
                </button>
                <button
                  type="button"
                  style={activeFilter === 'archived' ? styles.filterButton : styles.filterButtonGhost}
                  onClick={() => setActiveFilter('archived')}
                >
                  Archived
                </button>
              </div>
            </div>

            <div style={styles.threadList}>
              {loadingThreads ? <div style={styles.emptyText}>Loading conversations...</div> : null}
              {!loadingThreads && visibleThreads.length === 0 ? (
                <div style={styles.emptyStateCard}>
                  <div style={styles.emptyStateTitle}>No conversations yet</div>
                  <div style={styles.emptyStateText}>
                    Start a conversation from a provider profile by using the message action there.
                  </div>
                </div>
              ) : null}
              {visibleThreads.map((thread) => (
                <div
                  key={thread.id}
                  style={{
                    ...styles.threadRow,
                    background: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.10)' : '#fff',
                    borderColor: String(thread.id) === String(selectedThreadId) ? 'rgba(59,159,216,0.22)' : 'rgba(120,171,218,0.12)',
                  }}
                >
                  <button
                    type="button"
                    style={styles.threadSelectButton}
                    onClick={() => {
                      setMenuThreadId('')
                      setSelectedThreadId(String(thread.id))
                    }}
                  >
                    <div style={styles.threadAvatarWrap}>
                      <ConversationAvatar thread={thread} />
                    </div>
                    <div style={styles.threadBody}>
                      <div style={styles.threadTopLine}>
                        <strong style={styles.threadName}>{thread.counterpartName}</strong>
                        <span style={styles.threadDate}>{formatMessageTime(thread.last_message_at)}</span>
                      </div>
                      <div style={styles.threadSubtitle}>{getThreadListSubtitle(thread)}</div>
                      <div style={styles.threadPreviewLine}>
                        <span style={styles.threadPreview}>{thread.last_message_preview || 'Conversation ready to start.'}</span>
                        {thread.unreadCount > 0 ? <span style={styles.unreadBadge}>{thread.unreadCount}</span> : null}
                      </div>
                    </div>
                  </button>
                  <div style={styles.threadActionsWrap} ref={menuThreadId === String(thread.id) ? actionsMenuRef : null}>
                    <button
                      type="button"
                      style={styles.threadMenuButton}
                      onClick={(event) => {
                        event.stopPropagation()
                        setMenuThreadId((current) => current === String(thread.id) ? '' : String(thread.id))
                      }}
                      aria-label={`Conversation actions for ${thread.counterpartName}`}
                      title="Conversation actions"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {menuThreadId === String(thread.id) ? (
                      <div style={styles.threadMenu}>
                        <button
                          type="button"
                          style={styles.threadMenuItem}
                          onClick={() => toggleArchiveThread(thread)}
                        >
                          {archivedThreadIds.includes(String(thread.id)) ? 'Move to inbox' : 'Archive conversation'}
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.threadMenuItem, ...styles.threadMenuItemDanger }}
                          onClick={() => handleDeleteThread(thread)}
                          disabled={deletingThreadId === String(thread.id)}
                        >
                          Delete conversation
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
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
                    const parsedMessage = message.attachments ? message : parseMessageBody(message.body)
                    const visibleText = parsedMessage.body ?? parsedMessage.text
                    const visibleAttachments = parsedMessage.attachments || []
                    return (
                      <div key={message.id} style={{ ...styles.messageWrap, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ ...styles.messageBubble, ...(mine ? styles.messageMine : styles.messageTheirs) }}>
                          {visibleText ? <div>{visibleText}</div> : null}
                          {visibleAttachments.length > 0 ? (
                            <div style={styles.attachmentStack}>
                              {visibleAttachments.map((attachment) => (
                                <div key={`${message.id}-${attachment.name}`} style={styles.attachmentCard}>
                                  {isImageAttachment(attachment) ? (
                                    <a href={attachment.url} target="_blank" rel="noreferrer" style={styles.attachmentPreviewLink}>
                                      <img src={attachment.url} alt={attachment.name} style={styles.attachmentImage} />
                                    </a>
                                  ) : (
                                    <div style={styles.attachmentDocIcon}>{isPdfAttachment(attachment) ? 'PDF' : 'FILE'}</div>
                                  )}
                                  <div style={styles.attachmentBody}>
                                    <div style={styles.attachmentName}>{attachment.name}</div>
                                    <div style={styles.attachmentMetaLine}>{formatAttachmentSize(attachment.size)}</div>
                                  </div>
                                  <a href={attachment.url} target="_blank" rel="noreferrer" style={styles.attachmentAction}>
                                    Open
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div style={styles.messageMeta}>{formatMessageTime(message.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={styles.composer}>
                  <div style={styles.composerField}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      style={styles.hiddenInput}
                      onChange={handleAddAttachments}
                    />
                    {attachments.length > 0 ? (
                      <div style={styles.pendingAttachments}>
                        {attachments.map((attachment) => (
                          <div key={attachment.id} style={styles.pendingAttachmentCard}>
                            <div style={styles.pendingAttachmentMain}>
                              <div style={styles.pendingAttachmentName}>{attachment.name}</div>
                              <div style={styles.pendingAttachmentMeta}>{formatAttachmentSize(attachment.size)}</div>
                            </div>
                            <button
                              type="button"
                              style={styles.pendingAttachmentRemove}
                              onClick={() => removeAttachment(attachment.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      style={styles.textarea}
                      placeholder="Write a message..."
                    />
                  </div>
                  <button
                    type="button"
                    style={styles.attachButton}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={preparingAttachments || sending}
                  >
                    {preparingAttachments ? 'Adding...' : 'Add files'}
                  </button>
                  <button type="button" style={styles.primaryButton} onClick={handleSend} disabled={sending || preparingAttachments}>
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
                  <div style={styles.contextAvatarWrap}>
                    <ConversationAvatar thread={selectedThread} />
                  </div>
                  <div style={styles.contextTitle}>{selectedThread.counterpartName}</div>
                  <div style={styles.contextText}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                </div>
                <div style={styles.contextCard}>
                  <div style={styles.contextEyebrow}>Quick actions</div>
                  <button
                    type="button"
                    style={styles.contextButton}
                    onClick={() => openCounterpartProfile(selectedThread)}
                  >
                    {selectedThread.counterpartRole === 'provider' ? 'View profile' : 'Open bookings'}
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
      {confirmState.open ? (
        <div style={styles.confirmOverlay} onClick={() => setConfirmState({ open: false, thread: null })}>
          <div style={styles.confirmDialog} onClick={(event) => event.stopPropagation()}>
            <div style={styles.confirmEyebrow}>Delete conversation</div>
            <div style={styles.confirmTitle}>Remove this thread from FlashMat inbox?</div>
            <div style={styles.confirmText}>
              This will permanently delete the conversation with {confirmState.thread?.counterpartName || 'this contact'} and all its messages.
            </div>
            <div style={styles.confirmActions}>
              <button type="button" style={styles.secondaryButton} onClick={() => setConfirmState({ open: false, thread: null })}>
                Cancel
              </button>
              <button type="button" style={styles.dangerButton} onClick={confirmDeleteThread} disabled={deletingThreadId === String(confirmState.thread?.id || '')}>
                {deletingThreadId === String(confirmState.thread?.id || '') ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #edf4ff 0%, #f7fbff 100%)',
  },
  main: {
    height: 'calc(100vh - var(--nav-h, 64px))',
    overflow: 'hidden',
  },
  shell: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '360px minmax(0, 1fr) 300px',
    background: 'linear-gradient(180deg, #f5f9ff 0%, #eef5ff 100%)',
    overflow: 'hidden',
  },
  sidebar: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    borderRight: '1px solid rgba(120,171,218,0.22)',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f3f8ff 100%)',
    minHeight: 0,
    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.72)',
  },
  sidebarHeader: {
    padding: '24px 22px 18px',
    borderBottom: '1px solid rgba(120,171,218,0.2)',
    background: 'rgba(255,255,255,0.75)',
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
  dangerButton: {
    border: '1px solid rgba(211,70,70,0.14)',
    background: '#fff5f5',
    color: '#b83a3a',
    borderRadius: 14,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  threadList: {
    minHeight: 0,
    overflow: 'auto',
    padding: '18px 14px 18px',
    display: 'grid',
    gap: 10,
    alignContent: 'start',
  },
  emptyText: {
    fontSize: 13,
    color: '#8aa0b8',
    padding: '12px 6px',
  },
  emptyStateCard: {
    borderRadius: 20,
    border: '1px solid rgba(120,171,218,0.18)',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%)',
    padding: '18px 16px',
    boxShadow: '0 8px 20px rgba(19,52,83,0.04)',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#15314f',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: '#6f88a4',
  },
  threadRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 20,
    border: '1px solid rgba(120,171,218,0.18)',
    textAlign: 'left',
    boxShadow: '0 8px 20px rgba(19,52,83,0.04)',
  },
  threadSelectButton: {
    display: 'grid',
    gridTemplateColumns: '58px minmax(0, 1fr)',
    gap: 12,
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    minWidth: 0,
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
  threadDeleteButton: {
    alignSelf: 'flex-start',
    border: '1px solid rgba(211,70,70,0.14)',
    background: '#fff5f5',
    color: '#b83a3a',
    borderRadius: 999,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },
  threadActionsWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  threadMenuButton: {
    width: 34,
    height: 34,
    border: '1px solid rgba(120,171,218,0.14)',
    background: '#fff',
    color: '#6d85a0',
    borderRadius: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  threadMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 190,
    borderRadius: 16,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#fff',
    boxShadow: '0 20px 40px rgba(19,52,83,0.12)',
    padding: 8,
    display: 'grid',
    gap: 4,
    zIndex: 8,
  },
  threadMenuItem: {
    border: 'none',
    background: 'transparent',
    color: '#17314d',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 12.5,
    fontWeight: 700,
    textAlign: 'left',
    cursor: 'pointer',
  },
  threadMenuItemDanger: {
    color: '#b83a3a',
    background: '#fff5f5',
  },
  chatPane: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr auto',
    minHeight: 0,
    borderRight: '1px solid rgba(120,171,218,0.22)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f9fcff 100%)',
    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.72)',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '22px 24px 18px',
    borderBottom: '1px solid rgba(120,171,218,0.18)',
    background: 'rgba(255,255,255,0.72)',
  },
  confirmOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11, 27, 46, 0.42)',
    backdropFilter: 'blur(6px)',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    zIndex: 30,
  },
  confirmDialog: {
    width: 'min(100%, 420px)',
    borderRadius: 24,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#fff',
    boxShadow: '0 28px 60px rgba(15,30,61,0.20)',
    padding: 24,
  },
  confirmEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: '#b83a3a',
    marginBottom: 10,
  },
  confirmTitle: {
    fontFamily: 'var(--display)',
    fontSize: 26,
    lineHeight: 1,
    color: '#15314f',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#5f7893',
    marginBottom: 18,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
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
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(248,252,255,0.96) 100%)',
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
    borderTop: '1px solid rgba(120,171,218,0.18)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
    gap: 12,
    alignItems: 'end',
    background: 'rgba(255,255,255,0.94)',
  },
  composerField: {
    display: 'grid',
    gap: 10,
  },
  hiddenInput: {
    display: 'none',
  },
  pendingAttachments: {
    display: 'grid',
    gap: 8,
  },
  pendingAttachmentCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#f7fbff',
    padding: '10px 12px',
  },
  pendingAttachmentMain: {
    minWidth: 0,
  },
  pendingAttachmentName: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#17314d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  pendingAttachmentMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#83a0bc',
  },
  pendingAttachmentRemove: {
    border: 'none',
    background: 'transparent',
    color: '#c53a3a',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: 72,
    maxHeight: '18vh',
    resize: 'none',
    borderRadius: 18,
    border: '1px solid rgba(120,171,218,0.16)',
    background: '#f5f9ff',
    padding: '14px 16px',
    fontFamily: 'var(--font)',
    fontSize: 14,
    color: '#17314c',
  },
  attachButton: {
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 14,
    background: '#fff',
    color: '#1b3c5f',
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  attachmentStack: {
    display: 'grid',
    gap: 10,
    marginTop: 10,
  },
  attachmentCard: {
    display: 'grid',
    gridTemplateColumns: '72px minmax(0, 1fr) auto',
    gap: 10,
    alignItems: 'center',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.16)',
    padding: 10,
  },
  attachmentPreviewLink: {
    display: 'block',
    lineHeight: 0,
  },
  attachmentImage: {
    width: 72,
    height: 72,
    objectFit: 'cover',
    borderRadius: 12,
    display: 'block',
  },
  attachmentDocIcon: {
    width: 72,
    height: 72,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: '.08em',
  },
  attachmentBody: {
    minWidth: 0,
  },
  attachmentName: {
    fontSize: 12.5,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  attachmentMetaLine: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.76,
  },
  attachmentAction: {
    color: 'inherit',
    fontSize: 12,
    fontWeight: 800,
    textDecoration: 'none',
    borderRadius: 999,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.18)',
  },
  contextPane: {
    padding: 20,
    display: 'grid',
    alignContent: 'start',
    gap: 14,
    background: 'linear-gradient(180deg, #f9fcff 0%, #f1f7ff 100%)',
    boxShadow: 'inset 1px 0 0 rgba(120,171,218,0.18)',
  },
  contextCard: {
    borderRadius: 22,
    border: '1px solid rgba(120,171,218,0.18)',
    background: '#fff',
    padding: 18,
    boxShadow: '0 14px 34px rgba(13,30,50,0.05)',
  },
  contextAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 14,
    background: 'linear-gradient(135deg, rgba(23,53,92,0.98) 0%, rgba(59,159,216,0.92) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 28px rgba(13,30,50,0.08)',
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
