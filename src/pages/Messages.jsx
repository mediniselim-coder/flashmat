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

function formatMobileThreadTime(value) {
  if (!value) return ''
  try {
    const date = new Date(value)
    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    return sameDay
      ? date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
      : date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
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

function getThreadsCacheKey(userId, role) {
  return `flashmat-inbox-threads:${userId}:${role}`
}

function getMessagesCacheKey(threadId) {
  return `flashmat-inbox-messages:${threadId}`
}

function readCachedJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeCachedJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export default function Messages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [viewportWidth, setViewportWidth] = useState(typeof window === 'undefined' ? 1440 : window.innerWidth)
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedThreadId, setSelectedThreadId] = useState(searchParams.get('thread') || '')
  const [composer, setComposer] = useState('')
  const [attachments, setAttachments] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [mobileSearch, setMobileSearch] = useState('')
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
  const isMobile = viewportWidth < 900
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
  const mobileVisibleThreads = useMemo(() => {
    const query = String(mobileSearch || '').trim().toLowerCase()
    if (!query) return visibleThreads
    return visibleThreads.filter((thread) => {
      const haystack = [
        thread.counterpartName,
        getThreadListSubtitle(thread),
        thread.last_message_preview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [mobileSearch, visibleThreads])
  const mobileStoryThreads = useMemo(() => (
    threads
      .filter((thread) => !archivedThreadIds.includes(String(thread.id)))
      .slice(0, 8)
  ), [archivedThreadIds, threads])

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
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setThreads([])
      return
    }

    const cachedThreads = readCachedJson(getThreadsCacheKey(user.id, role), [])
    if (Array.isArray(cachedThreads) && cachedThreads.length > 0) {
      setThreads(cachedThreads)
      setSelectedThreadId((current) => {
        const queryThreadId = searchThreadParam
        if (queryThreadId && cachedThreads.some((thread) => String(thread.id) === String(queryThreadId))) {
          return String(queryThreadId)
        }
        if (current && cachedThreads.some((thread) => String(thread.id) === String(current))) {
          return String(current)
        }
        return cachedThreads[0]?.id ? String(cachedThreads[0].id) : current
      })
    }
  }, [role, searchThreadParam, user?.id])

  useEffect(() => {
    if (!user?.id) return
    writeCachedJson(getThreadsCacheKey(user.id, role), threads)
  }, [role, threads, user?.id])

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
    const cachedMessages = readCachedJson(getMessagesCacheKey(selectedThreadId), [])
    if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
      setMessages(cachedMessages)
    }

    async function loadThreadMessages() {
      try {
        setLoadingMessages(true)
        const nextMessages = await fetchThreadMessages(selectedThreadId)
        if (!active) return
        setMessages(nextMessages)
        writeCachedJson(getMessagesCacheKey(selectedThreadId), nextMessages)
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
      writeCachedJson(getThreadsCacheKey(user.id, role), nextThreads)
      writeCachedJson(getMessagesCacheKey(selectedThread.id), nextMessages)
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

  const threadActionsMenu = (thread, mobile = false) => (
    <div style={styles.threadActionsWrap} ref={menuThreadId === String(thread.id) ? actionsMenuRef : null}>
      <button
        type="button"
        style={mobile ? styles.mobileThreadMenuButton : styles.threadMenuButton}
        onClick={(event) => {
          event.stopPropagation()
          setMenuThreadId((current) => current === String(thread.id) ? '' : String(thread.id))
        }}
        aria-label={`Conversation actions for ${thread.counterpartName}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {menuThreadId === String(thread.id) ? (
        <div style={mobile ? { ...styles.threadMenu, right: 6, top: 42 } : styles.threadMenu}>
          <button type="button" style={styles.threadMenuItem} onClick={() => toggleArchiveThread(thread)}>
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
  )

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes flashmat-inbox-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <NavBar activePage="messages" />
      <main style={styles.main}>
        <section style={{ ...styles.shell, ...(isMobile ? styles.shellMobile : null) }}>
          {(!isMobile || !selectedThread) ? (
            isMobile ? (
              <aside style={styles.mobileInboxShell}>
                <div style={styles.mobileInboxHeader}>
                  <div style={styles.mobileInboxTitleRow}>
                    <div>
                      <div style={styles.mobileInboxTitle}>messages</div>
                      <div style={styles.mobileInboxSubtitle}>See who messaged you on FlashMat.</div>
                    </div>
                    <button type="button" style={styles.mobileComposeButton} onClick={() => navigate('/community')}>
                      +
                    </button>
                  </div>

                  <div style={styles.mobileSearchBar}>
                    <span style={styles.mobileSearchIcon}>⌕</span>
                    <input
                      value={mobileSearch}
                      onChange={(event) => setMobileSearch(event.target.value)}
                      placeholder="Search messages"
                      style={styles.mobileSearchInput}
                    />
                  </div>

                  <div style={styles.mobileFilterRow}>
                    <button type="button" style={activeFilter === 'all' ? styles.mobileFilterActive : styles.mobileFilterGhost} onClick={() => setActiveFilter('all')}>All</button>
                    <button type="button" style={activeFilter === 'unread' ? styles.mobileFilterActive : styles.mobileFilterGhost} onClick={() => setActiveFilter('unread')}>Unread</button>
                    <button type="button" style={activeFilter === 'archived' ? styles.mobileFilterActive : styles.mobileFilterGhost} onClick={() => setActiveFilter('archived')}>Archived</button>
                  </div>
                </div>

                {mobileStoryThreads.length > 0 ? (
                  <div style={styles.mobileStoriesRail}>
                    {mobileStoryThreads.map((thread) => (
                      <button key={`story-${thread.id}`} type="button" style={styles.mobileStoryButton} onClick={() => setSelectedThreadId(String(thread.id))}>
                        <div style={styles.mobileStoryAvatarRing}>
                          <div style={styles.mobileStoryAvatar}>
                            <ConversationAvatar thread={thread} />
                          </div>
                        </div>
                        <span style={styles.mobileStoryName}>{thread.counterpartName}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div style={styles.mobileThreadList}>
                  {loadingThreads && mobileVisibleThreads.length === 0 ? (
                    <>
                      <div style={styles.mobileThreadSkeleton} />
                      <div style={styles.mobileThreadSkeleton} />
                      <div style={styles.mobileThreadSkeleton} />
                    </>
                  ) : null}
                  {!loadingThreads && mobileVisibleThreads.length === 0 ? (
                    <div style={styles.mobileEmptyState}>
                      <div style={styles.mobileEmptyTitle}>No conversations yet</div>
                      <div style={styles.mobileEmptyText}>Your messages with providers will show up here.</div>
                    </div>
                  ) : null}
                  {mobileVisibleThreads.map((thread) => (
                    <div key={`mobile-${thread.id}`} style={styles.mobileThreadRow}>
                      <button
                        type="button"
                        style={styles.mobileThreadSelectButton}
                        onClick={() => {
                          setMenuThreadId('')
                          setSelectedThreadId(String(thread.id))
                        }}
                      >
                        <div style={styles.mobileThreadAvatarWrap}>
                          <ConversationAvatar thread={thread} />
                          {thread.unreadCount > 0 ? <span style={styles.mobileUnreadDot} /> : null}
                        </div>
                        <div style={styles.mobileThreadMain}>
                          <div style={styles.mobileThreadTopLine}>
                            <strong style={styles.mobileThreadName}>{thread.counterpartName}</strong>
                            <span style={styles.mobileThreadTime}>{formatMobileThreadTime(thread.last_message_at)}</span>
                          </div>
                          <div style={styles.mobileThreadPreviewRow}>
                            <span style={styles.mobileThreadPreview}>{thread.last_message_preview || 'Conversation ready to start.'}</span>
                            {thread.unreadCount > 0 ? <span style={styles.mobileUnreadCount}>{thread.unreadCount}</span> : null}
                          </div>
                        </div>
                      </button>
                      {threadActionsMenu(thread, true)}
                    </div>
                  ))}
                </div>
              </aside>
            ) : (
              <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                  <div>
                    <div style={styles.eyebrow}>FlashMat inbox</div>
                    <h1 style={styles.heading}>Messages</h1>
                  </div>
                  <div style={styles.filterRow}>
                    <button type="button" style={activeFilter === 'all' ? styles.filterButton : styles.filterButtonGhost} onClick={() => setActiveFilter('all')}>All</button>
                    <button type="button" style={activeFilter === 'unread' ? styles.filterButton : styles.filterButtonGhost} onClick={() => setActiveFilter('unread')}>Unread</button>
                    <button type="button" style={activeFilter === 'archived' ? styles.filterButton : styles.filterButtonGhost} onClick={() => setActiveFilter('archived')}>Archived</button>
                  </div>
                </div>

                <div style={styles.threadList}>
                  {loadingThreads && visibleThreads.length === 0 ? (
                    <>
                      <div style={styles.threadSkeleton} />
                      <div style={styles.threadSkeleton} />
                      <div style={styles.threadSkeleton} />
                    </>
                  ) : null}
                  {!loadingThreads && visibleThreads.length === 0 ? (
                    <div style={styles.emptyStateCard}>
                      <div style={styles.emptyStateTitle}>No conversations yet</div>
                      <div style={styles.emptyStateText}>Start a conversation from a provider profile by using the message action there.</div>
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
                      {threadActionsMenu(thread)}
                    </div>
                  ))}
                </div>
              </aside>
            )
          ) : null}

          {(!isMobile || selectedThread) ? (
          <section style={{ ...styles.chatPane, ...(isMobile ? styles.chatPaneMobile : null) }}>
            {selectedThread ? (
              <>
                <div style={{ ...styles.chatHeader, ...(isMobile ? styles.mobileChatHeader : null) }}>
                  <div style={styles.chatHeaderMain}>
                    {isMobile ? (
                      <button
                        type="button"
                        style={styles.mobileBackButton}
                        onClick={() => {
                          setSelectedThreadId('')
                          setMessages([])
                          setSearchParams({}, { replace: true })
                        }}
                      >
                        ‹
                      </button>
                    ) : null}
                    <div style={{ ...styles.chatHeaderAvatar, ...(isMobile ? styles.mobileChatHeaderAvatar : null) }}>
                      <ConversationAvatar thread={selectedThread} />
                    </div>
                    <div>
                      <div style={{ ...styles.chatName, ...(isMobile ? styles.mobileChatName : null) }}>{selectedThread.counterpartName}</div>
                      <div style={{ ...styles.chatMeta, ...(isMobile ? styles.mobileChatMeta : null) }}>{selectedThread.counterpartSubtitle || 'FlashMat conversation'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" style={isMobile ? styles.mobileProfileButton : styles.primaryButton} onClick={() => openCounterpartProfile(selectedThread)}>
                      View profile
                    </button>
                  </div>
                </div>

                <div style={{ ...styles.chatFeed, ...(isMobile ? styles.mobileChatFeed : null) }}>
                  {loadingMessages && messages.length === 0 ? (
                    <div style={styles.chatLoadingState}>
                      <div style={styles.messageSkeletonMine} />
                      <div style={styles.messageSkeletonTheirs} />
                      <div style={styles.messageSkeletonTheirsShort} />
                    </div>
                  ) : null}
                  {!loadingMessages && messages.length === 0 ? <div style={isMobile ? styles.mobileEmptyChatText : styles.emptyText}>Say hello to start the conversation.</div> : null}
                  {messages.map((message) => {
                    const mine = String(message.sender_id) === String(user?.id)
                    const parsedMessage = message.attachments ? message : parseMessageBody(message.body)
                    const visibleText = parsedMessage.body ?? parsedMessage.text
                    const visibleAttachments = parsedMessage.attachments || []
                    return (
                      <div key={message.id} style={{ ...styles.messageWrap, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ ...styles.messageBubble, ...(mine ? styles.messageMine : styles.messageTheirs), ...(isMobile ? (mine ? styles.mobileMessageMine : styles.mobileMessageTheirs) : null) }}>
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

                <div style={{ ...styles.composer, ...(isMobile ? styles.mobileMessengerComposer : null) }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    style={styles.hiddenInput}
                    onChange={handleAddAttachments}
                  />
                  {isMobile ? (
                    <button
                      type="button"
                      style={styles.mobileComposerIcon}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={preparingAttachments || sending}
                    >
                      +
                    </button>
                  ) : null}
                  <div style={{ ...styles.composerField, ...(isMobile ? styles.mobileComposerInputWrap : null) }}>
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
                      style={{ ...styles.textarea, ...(isMobile ? styles.mobileMessengerTextarea : null) }}
                      placeholder={isMobile ? 'Aa' : 'Write a message...'}
                    />
                  </div>
                  {!isMobile ? (
                    <button
                      type="button"
                      style={styles.attachButton}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={preparingAttachments || sending}
                    >
                      {preparingAttachments ? 'Adding...' : 'Add files'}
                    </button>
                  ) : null}
                  <button type="button" style={isMobile ? styles.mobileSendButton : styles.primaryButton} onClick={handleSend} disabled={sending || preparingAttachments}>
                    {sending ? (isMobile ? '...' : 'Sending...') : 'Send'}
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
          ) : null}

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
    gridTemplateColumns: '360px minmax(0, 1fr)',
    background: 'linear-gradient(180deg, #f5f9ff 0%, #eef5ff 100%)',
    overflow: 'hidden',
  },
  shellMobile: {
    display: 'block',
  },
  mobileInboxShell: {
    minHeight: '100%',
    background: '#050608',
    color: '#fff',
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
  },
  mobileInboxHeader: {
    padding: '18px 16px 12px',
    background: 'linear-gradient(180deg, rgba(7,8,10,0.98) 0%, rgba(7,8,10,0.92) 100%)',
  },
  mobileInboxTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mobileInboxTitle: {
    fontFamily: 'var(--display)',
    fontSize: 32,
    lineHeight: 1,
    color: '#fff',
    letterSpacing: '-0.04em',
    textTransform: 'lowercase',
  },
  mobileInboxSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.54)',
  },
  mobileComposeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  },
  mobileSearchBar: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: '18px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'center',
    borderRadius: 18,
    background: '#1e2024',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '13px 14px',
  },
  mobileSearchIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.52)',
  },
  mobileSearchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: 16,
    fontFamily: 'var(--font)',
  },
  mobileFilterRow: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
  },
  mobileFilterActive: {
    border: 'none',
    borderRadius: 999,
    background: '#0a84ff',
    color: '#fff',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  mobileFilterGhost: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999,
    background: '#121418',
    color: 'rgba(255,255,255,0.74)',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  mobileStoriesRail: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '76px',
    gap: 12,
    overflowX: 'auto',
    padding: '8px 16px 14px',
    background: '#050608',
  },
  mobileStoryButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: '#fff',
    display: 'grid',
    justifyItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  mobileStoryAvatarRing: {
    width: 70,
    height: 70,
    borderRadius: 999,
    padding: 3,
    background: 'linear-gradient(135deg, #0a84ff 0%, #2de06d 100%)',
  },
  mobileStoryAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    background: '#101318',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileStoryName: {
    width: '100%',
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileThreadList: {
    minHeight: 0,
    overflow: 'auto',
    padding: '6px 10px calc(18px + env(safe-area-inset-bottom, 0px))',
    display: 'grid',
    gap: 4,
    alignContent: 'start',
    background: '#050608',
  },
  mobileThreadRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 8,
    alignItems: 'center',
    padding: '10px 6px',
    borderRadius: 20,
  },
  mobileThreadSelectButton: {
    display: 'grid',
    gridTemplateColumns: '64px minmax(0, 1fr)',
    gap: 12,
    border: 'none',
    background: 'transparent',
    padding: 0,
    textAlign: 'left',
    color: '#fff',
    cursor: 'pointer',
  },
  mobileThreadAvatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 999,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(23,53,92,0.98) 0%, rgba(59,159,216,0.92) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileUnreadDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 999,
    background: '#2de06d',
    boxShadow: '0 0 0 2px #050608',
  },
  mobileThreadMain: {
    minWidth: 0,
    display: 'grid',
    gap: 6,
    alignContent: 'center',
  },
  mobileThreadTopLine: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    justifyContent: 'space-between',
  },
  mobileThreadName: {
    fontSize: 18,
    color: '#fff',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileThreadTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.48)',
    flexShrink: 0,
  },
  mobileThreadPreviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  mobileThreadPreview: {
    minWidth: 0,
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.64)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileUnreadCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    background: '#0a84ff',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
  },
  mobileThreadMenuButton: {
    width: 34,
    height: 34,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.58)',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  mobileThreadSkeleton: {
    height: 78,
    borderRadius: 18,
    background: 'linear-gradient(90deg, rgba(27,31,37,0.95) 0%, rgba(37,41,48,0.98) 50%, rgba(27,31,37,0.95) 100%)',
    backgroundSize: '200% 100%',
    animation: 'flashmat-inbox-shimmer 1.2s linear infinite',
  },
  mobileEmptyState: {
    borderRadius: 22,
    background: '#121418',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '22px 18px',
    textAlign: 'center',
    marginTop: 8,
  },
  mobileEmptyTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#fff',
    marginBottom: 8,
  },
  mobileEmptyText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.58)',
  },
  sidebar: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    borderRight: '1px solid rgba(120,171,218,0.22)',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f3f8ff 100%)',
    minHeight: 0,
    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.72)',
  },
  sidebarMobile: {
    width: '100%',
    minHeight: '100%',
    borderRight: 'none',
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
  threadSkeleton: {
    height: 86,
    borderRadius: 20,
    border: '1px solid rgba(120,171,218,0.12)',
    background: 'linear-gradient(90deg, rgba(244,248,253,0.96) 0%, rgba(231,240,250,0.96) 50%, rgba(244,248,253,0.96) 100%)',
    backgroundSize: '200% 100%',
    animation: 'flashmat-inbox-shimmer 1.2s linear infinite',
  },
  chatPane: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr auto',
    minHeight: 0,
    borderRight: '1px solid rgba(120,171,218,0.22)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f9fcff 100%)',
    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.72)',
  },
  chatPaneMobile: {
    gridTemplateRows: 'auto 1fr auto',
    height: '100%',
    borderRight: 'none',
    background: '#050608',
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
  chatHeaderMobile: {
    padding: '16px 16px 14px',
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  mobileChatHeader: {
    padding: '12px 12px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, #0a0c10 0%, #06080c 100%)',
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
  chatFeedMobile: {
    padding: '16px 14px 14px',
  },
  mobileChatFeed: {
    padding: '14px 12px',
    background: '#050608',
  },
  chatLoadingState: {
    display: 'grid',
    gap: 12,
    alignContent: 'start',
  },
  messageSkeletonMine: {
    width: '44%',
    height: 54,
    marginLeft: 'auto',
    borderRadius: 18,
    background: 'linear-gradient(90deg, rgba(225,235,246,0.92) 0%, rgba(238,245,252,0.96) 50%, rgba(225,235,246,0.92) 100%)',
    backgroundSize: '200% 100%',
    animation: 'flashmat-inbox-shimmer 1.2s linear infinite',
  },
  messageSkeletonTheirs: {
    width: '58%',
    height: 72,
    borderRadius: 18,
    background: 'linear-gradient(90deg, rgba(225,235,246,0.92) 0%, rgba(238,245,252,0.96) 50%, rgba(225,235,246,0.92) 100%)',
    backgroundSize: '200% 100%',
    animation: 'flashmat-inbox-shimmer 1.2s linear infinite',
  },
  messageSkeletonTheirsShort: {
    width: '34%',
    height: 48,
    borderRadius: 18,
    background: 'linear-gradient(90deg, rgba(225,235,246,0.92) 0%, rgba(238,245,252,0.96) 50%, rgba(225,235,246,0.92) 100%)',
    backgroundSize: '200% 100%',
    animation: 'flashmat-inbox-shimmer 1.2s linear infinite',
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
  mobileMessageMine: {
    maxWidth: '82%',
    background: 'linear-gradient(135deg, #1877f2 0%, #0a84ff 100%)',
    color: '#fff',
    borderBottomRightRadius: 10,
    fontSize: 16,
  },
  mobileMessageTheirs: {
    maxWidth: '82%',
    background: '#2a2c31',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 10,
    fontSize: 16,
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
  composerMobile: {
    gridTemplateColumns: '1fr',
    gap: 10,
    padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
  },
  mobileMessengerComposer: {
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: 10,
    padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
    alignItems: 'end',
    background: '#050608',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  composerField: {
    display: 'grid',
    gap: 10,
  },
  composerFieldMobile: {
    gap: 8,
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
  textareaMobile: {
    minHeight: 88,
    fontSize: 16,
    padding: '14px 14px',
  },
  mobileMessengerTextarea: {
    minHeight: 52,
    maxHeight: '22vh',
    borderRadius: 24,
    border: 'none',
    background: '#2a2c31',
    color: '#fff',
    padding: '14px 16px',
    fontSize: 16,
  },
  mobileComposerInputWrap: {
    gap: 8,
  },
  mobileComposerIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: 'none',
    background: '#1877f2',
    color: '#fff',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  },
  mobileSendButton: {
    minWidth: 56,
    height: 42,
    borderRadius: 999,
    border: 'none',
    background: '#1877f2',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    padding: '0 14px',
    cursor: 'pointer',
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
  composerActionMobile: {
    flex: 1,
    justifyContent: 'center',
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
  mobileBackButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: 28,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  mobileChatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
  },
  mobileChatName: {
    fontSize: 19,
    color: '#fff',
    marginBottom: 2,
  },
  mobileChatMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.58)',
  },
  mobileProfileButton: {
    border: 'none',
    background: 'linear-gradient(135deg, #17355c 0%, #1c4d82 100%)',
    color: '#fff',
    borderRadius: 999,
    padding: '9px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  mobileEmptyChatText: {
    padding: '18px 8px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
}
