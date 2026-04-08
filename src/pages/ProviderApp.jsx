import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import FlashAI from '../components/FlashAI'
import Marketplace from '../components/Marketplace'
import AppIcon from '../components/AppIcon'
import ProviderProfileModal from '../components/ProviderProfileModal'
import { FLASHFIX_UPDATED_EVENT, advanceFlashFixRequest, getFlashFixStageProgress, getFlashFixStatusMeta, providerRespondToFlashFix, readFlashFixRequests } from '../lib/flashfix'
import { createNotification, fetchProviderBookings, updateBookingStatus } from '../lib/bookings'
import { DEFAULT_PROVIDER_HOURS, PROVIDER_SERVICE_CATEGORY_ICONS, PROVIDER_SERVICE_CATEGORY_LABELS, PROVIDER_SERVICE_OPTIONS, hoursToDisplayMap, inferTypeMeta, mergeProviderProfile, saveProviderOverride, serializeProviderDescription } from '../lib/providerProfiles'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'p-dashboard',   icon: 'TB', label: 'Dashboard' },
  { id: 'p-tasks',       icon: 'TD', label: 'Today Tasks', badge: 5 },
  { id: 'p-bookings',    icon: 'RS', label: 'Bookings', badge: 8 },
  { id: 'p-schedule',    icon: 'CL', label: 'Schedule' },
  { id: 'p-clients',     icon: 'CT', label: 'Clients' },
  { id: 'p-services',    icon: 'SV', label: 'My Services' },
  { id: 'p-marketplace', icon: 'MP', label: 'Marketplace' },
  { id: 'p-promos',      icon: 'PM', label: 'Promotions' },
  { id: 'p-profile',     icon: 'AT', label: 'Shop Profile' },
]

const SERVICE_TYPE_ORDER = ['mechanic', 'wash', 'tire', 'body', 'glass', 'tow', 'parts', 'parking', 'tuning']
const PROVIDER_SERVICE_TYPE_OPTIONS = SERVICE_TYPE_ORDER.map((type) => ({
  id: type,
  label: PROVIDER_SERVICE_CATEGORY_LABELS[type] || type,
  icon: PROVIDER_SERVICE_CATEGORY_ICONS[type] || 'SV',
  services: PROVIDER_SERVICE_OPTIONS.filter((service) => service.category === type),
}))

function getProviderDraftStorageKey(user, profile) {
  return `flashmat-provider-profile-draft:${user?.id || profile?.email || 'anonymous'}`
}

function readProviderDraft(user, profile) {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getProviderDraftStorageKey(user, profile))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeProviderDraft(user, profile, payload) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getProviderDraftStorageKey(user, profile), JSON.stringify(payload))
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function formatFlashFixTime(value) {
  if (!value) return 'Now'

  try {
    return new Date(value).toLocaleString('fr-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function getTimelineLabel(step) {
  const labels = {
    pending: 'Requested',
    accepted: 'Accepted',
    en_route: 'On the way',
    onsite: 'On site',
    completed: 'Completed',
  }

  return labels[step] || step
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Impossible de charger l image'))
    image.src = src
  })
}

async function optimizeImageFile(file, { maxWidth = 1600, maxHeight = 1200, quality = 0.82 } = {}) {
  const rawDataUrl = await fileToDataUrl(file)
  const image = await loadImageElement(rawDataUrl)

  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const targetWidth = Math.max(1, Math.round(image.width * ratio))
  const targetHeight = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Impossible de preparer l image')
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  return canvas.toDataURL('image/jpeg', quality)
}

export default function ProviderApp() {
  const { profile, user, fetchProfile, signOut } = useAuth()
  const { toast }            = useToast()
  const navigate             = useNavigate()

  const [pane, setPane]         = useState('p-dashboard')
  const [sidebarOpen, setSidebar] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [providerProfileModalOpen, setProviderProfileModalOpen] = useState(false)
  const [tasks, setTasks]       = useState([
    { title: 'Vidange - Sarah K. (Honda Fit)', meta: 'ME Mecanique · Baie 2', time: '10h30', done: false },
    { title: 'Rotation + equilibrage - Marc D. (BMW)', meta: 'PN Pneus · Baie 1', time: '11h00', done: false },
    { title: 'Commander liquide de frein - stock bas', meta: 'IV Inventaire', time: 'Avant 15h', done: false },
    { title: 'Plaquettes - Alex M. (Honda Civic)', meta: 'OK Complete', time: '09h00', done: true },
    { title: 'Ouverture + inspection matinale', meta: 'OK Fait a 8h05', time: '08h00', done: true },
  ])
  const [promoSvc, setPromoSvc] = useState('Vidange')
  const [promoVal, setPromoVal] = useState('20%')
  const [clientQ, setClientQ]   = useState('')
  const [providerBookings, setProviderBookings] = useState([])
  const [flashFixRequests, setFlashFixRequests] = useState([])
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveNotice, setProfileSaveNotice] = useState('')
  const [providerProfileForm, setProviderProfileForm] = useState({
    name: profile?.full_name || 'Garage Los Santos',
    address: '7999 14e Avenue, Montreal, QC',
    phone: '(514) 374-2829',
    email: profile?.email || user?.email || '',
    description: 'Mecaniciens certifies ASE. Specialistes toutes marques. Devis gratuit.',
    serviceTypes: ['mechanic'],
    services: ['Mecanique generale', 'Vidange', 'Freins'],
    editableHours: DEFAULT_PROVIDER_HOURS,
    coverPhoto: '',
    galleryPhotos: [],
  })

  const name = providerProfileForm.name || profile?.full_name || 'Garage Los Santos'
  const providerLogo = profile?.avatar_url || ''
  const flashFixQueue = flashFixRequests.filter((request) => request.channel === 'flashfix')
  const pendingFlashFix = flashFixQueue.filter((request) => request.status === 'pending')
  const bookingsDoneCount = providerBookings.filter((booking) => booking.status === 'done').length
  const bookingsPendingCount = providerBookings.filter((booking) => booking.status !== 'done').length
  const monthlyRevenue = providerBookings.reduce((sum, booking) => {
    const amount = Number(String(booking.priceLabel || '').replace(/[^0-9.]/g, ''))
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
  const averageRating = 4.9
  const providerClients = providerBookings.reduce((acc, booking) => {
    if (!booking.client_id || acc.some((entry) => entry.id === booking.client_id)) return acc
    acc.push({
      id: booking.client_id,
      name: booking.clientName,
      email: booking.client?.email || '',
      vehicles: [booking.vehicleLabel],
      last: booking.datetimeLabel,
      total: booking.priceLabel,
      status: 'Active',
      cls: 'badge-green',
    })
    return acc
  }, [])
  const operationalQueue = providerBookings.slice(0, 5).map((booking) => ({
    id: booking.id,
    time: booking.timeSlot || booking.date || 'A confirmer',
    client: booking.clientName,
    service: booking.service,
    cls: booking.statusClass,
    label: booking.statusLabel,
    done: booking.status === 'done',
  }))
  function go(id) { setPane(id); setSidebar(false) }
  function goHome() { setSidebar(false); navigate('/') }
  function goFromProfileMenu(id) { setProfileMenuOpen(false); go(id) }
  async function handleSignOut() { setProfileMenuOpen(false); await signOut(); navigate('/') }

  const filteredClients = providerClients.filter((c) => !clientQ || c.name.toLowerCase().includes(clientQ.toLowerCase()))
  const selectedServiceTypeSet = new Set(providerProfileForm.serviceTypes || [])
  const availableServiceGroups = PROVIDER_SERVICE_TYPE_OPTIONS.filter((group) => selectedServiceTypeSet.has(group.id))
  const selectedServiceTotal = providerProfileForm.services.length
  const selectedTypeTotal = providerProfileForm.serviceTypes.length
  const servicesCompletion = Math.min(100, Math.round((selectedServiceTotal / Math.max(1, selectedTypeTotal * 3)) * 100))

  useEffect(() => {
    function syncFlashFixRequests() {
      setFlashFixRequests(readFlashFixRequests())
    }

    syncFlashFixRequests()
    window.addEventListener('storage', syncFlashFixRequests)
    window.addEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests)
    return () => {
      window.removeEventListener('storage', syncFlashFixRequests)
      window.removeEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests)
    }
  }, [])

  useEffect(() => {
    async function loadProviderBookings() {
      if (!user?.id) return

      try {
        const nextBookings = await fetchProviderBookings(user.id)
        setProviderBookings(nextBookings)
      } catch {
        setProviderBookings([])
      }
    }

    loadProviderBookings()
  }, [user?.id])

  useEffect(() => {
    async function loadProviderProfile() {
      const baseIdentity = { email: profile?.email || user?.email, name: profile?.full_name || 'Garage Los Santos' }
      let nextForm = mergeProviderProfile({
        ...providerProfileForm,
        ...baseIdentity,
      })

      const { data } = user?.id
        ? await supabase
          .from('providers')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        : { data: null }

      if (data) {
        nextForm = mergeProviderProfile({
          ...data,
          name: data.shop_name,
          providerEmail: profile?.email || user?.email,
        })
      }

      const localDraft = readProviderDraft(user, profile)
      if (localDraft) {
        nextForm = mergeProviderProfile({
          ...nextForm,
          ...localDraft,
          providerEmail: profile?.email || user?.email,
        })
      }

      setProviderProfileForm({
        name: nextForm.name || profile?.full_name || 'Garage Los Santos',
        address: nextForm.address || '',
        phone: nextForm.phone || '',
        email: nextForm.email || profile?.email || user?.email || '',
        description: nextForm.description || '',
        serviceTypes: nextForm.serviceTypes || inferTypeMeta(nextForm.services || []).serviceTypes || [],
        services: nextForm.services || [],
        editableHours: nextForm.editableHours || DEFAULT_PROVIDER_HOURS,
        coverPhoto: nextForm.coverPhoto || nextForm.cover || '',
        galleryPhotos: nextForm.galleryPhotos || [],
      })
    }

    loadProviderProfile()
  }, [profile?.email, profile?.full_name, user?.email, user?.id])

  function setProfileField(field, value) {
    setProviderProfileForm((current) => ({ ...current, [field]: value }))
  }

  async function updateCoverPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const photoUrl = await optimizeImageFile(file, { maxWidth: 1600, maxHeight: 900, quality: 0.84 })
      setProviderProfileForm((current) => ({ ...current, coverPhoto: photoUrl }))
      toast('Photo couverture ajoutee', 'success')
    } catch (error) {
      toast(error.message || 'Impossible de televerser la photo', 'error')
    } finally {
      event.target.value = ''
    }
  }

  async function updateGalleryPhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, 4)
    if (files.length === 0) return

    try {
      const photos = await Promise.all(
        files.map((file) => optimizeImageFile(file, { maxWidth: 1400, maxHeight: 1000, quality: 0.8 })),
      )
      setProviderProfileForm((current) => ({
        ...current,
        galleryPhotos: [...current.galleryPhotos, ...photos].slice(0, 6),
      }))
      toast('Galerie atelier mise a jour', 'success')
    } catch (error) {
      toast(error.message || 'Impossible de televerser la galerie', 'error')
    } finally {
      event.target.value = ''
    }
  }

  function removeCoverPhoto() {
    setProviderProfileForm((current) => ({ ...current, coverPhoto: '' }))
  }

  function removeGalleryPhoto(index) {
    setProviderProfileForm((current) => ({
      ...current,
      galleryPhotos: current.galleryPhotos.filter((_, photoIndex) => photoIndex !== index),
    }))
  }

  function toggleService(serviceLabel) {
    setProviderProfileForm((current) => {
      const exists = current.services.includes(serviceLabel)
      return {
        ...current,
        services: exists
          ? current.services.filter((service) => service !== serviceLabel)
          : [...current.services, serviceLabel],
      }
    })
  }

  function toggleServiceType(typeId) {
    setProviderProfileForm((current) => {
      const selectedTypes = new Set(current.serviceTypes || [])
      if (selectedTypes.has(typeId)) {
        selectedTypes.delete(typeId)
      } else {
        selectedTypes.add(typeId)
      }

      const nextTypes = SERVICE_TYPE_ORDER.filter((type) => selectedTypes.has(type))
      const allowedServices = new Set(
        PROVIDER_SERVICE_OPTIONS
          .filter((service) => nextTypes.includes(service.category))
          .map((service) => service.label),
      )

      return {
        ...current,
        serviceTypes: nextTypes,
        services: current.services.filter((service) => allowedServices.has(service)),
      }
    })
  }

  function updateHour(day, field, value) {
    setProviderProfileForm((current) => ({
      ...current,
      editableHours: {
        ...current.editableHours,
        [day]: {
          ...current.editableHours[day],
          [field]: value,
        },
      },
    }))
  }

  function toggleClosed(day) {
    setProviderProfileForm((current) => ({
      ...current,
      editableHours: {
        ...current.editableHours,
        [day]: {
          ...current.editableHours[day],
          closed: !current.editableHours[day].closed,
        },
      },
    }))
  }

  async function saveProviderProfileChanges() {
    if (isSavingProfile) return

    if (!providerProfileForm.name || !providerProfileForm.address || !providerProfileForm.phone || !providerProfileForm.description || providerProfileForm.serviceTypes.length === 0 || providerProfileForm.services.length === 0) {
      setProfileSaveNotice('Completez tous les champs obligatoires avant de sauvegarder.')
      toast('Completez le nom, l adresse, le telephone, la description, au moins un type et au moins un service', 'error')
      return
    }

    const typeMeta = inferTypeMeta(providerProfileForm.services)
    const publicHours = hoursToDisplayMap(providerProfileForm.editableHours)
    const currentMerged = mergeProviderProfile({
      ...providerProfileForm,
      name: providerProfileForm.name,
      providerEmail: providerProfileForm.email,
      logoImageUrl: profile?.avatar_url || '',
    })
    const payload = {
      name: providerProfileForm.name,
      address: providerProfileForm.address,
      phone: providerProfileForm.phone,
      email: providerProfileForm.email,
      description: providerProfileForm.description,
      serviceTypes: providerProfileForm.serviceTypes,
      services: providerProfileForm.services,
      editableHours: providerProfileForm.editableHours,
      hours: publicHours,
      coverPhoto: providerProfileForm.coverPhoto,
      galleryPhotos: providerProfileForm.galleryPhotos,
      logoImageUrl: currentMerged.logoImageUrl || profile?.avatar_url || '',
      staffMembers: currentMerged.staffMembers || [],
      ...typeMeta,
    }

    saveProviderOverride({ id: user?.id, email: providerProfileForm.email, name: providerProfileForm.name }, payload)
    saveProviderOverride({ id: user?.id, email: profile?.email || user?.email, name: profile?.full_name || providerProfileForm.name }, payload)
    writeProviderDraft(user, profile, payload)
    setProviderProfileForm((current) => ({ ...current, ...payload }))

    try {
      setIsSavingProfile(true)
      setProfileSaveNotice('Sauvegarde en cours...')
      const matchEmail = providerProfileForm.email || profile?.email || user?.email

      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: providerProfileForm.name,
            email: providerProfileForm.email || profile?.email || user?.email,
          })
          .eq('id', user.id)

        if (profileError) throw profileError
        await fetchProfile(user.id)
      }

      const providerRecord = {
        id: user?.id,
        shop_name: providerProfileForm.name,
        address: providerProfileForm.address,
        phone: providerProfileForm.phone,
        description: serializeProviderDescription(providerProfileForm.description, {
          serviceTypes: providerProfileForm.serviceTypes,
          editableHours: providerProfileForm.editableHours,
          hours: publicHours,
          coverPhoto: providerProfileForm.coverPhoto,
          galleryPhotos: providerProfileForm.galleryPhotos,
          logoImageUrl: currentMerged.logoImageUrl || profile?.avatar_url || '',
          staffMembers: currentMerged.staffMembers || [],
        }),
        services: providerProfileForm.services,
        rating: 5,
        reviews: 0,
        is_open: true,
      }

      if (!user?.id) {
        throw new Error('Utilisateur provider introuvable')
      }

      const { error: providerUpsertError } = await supabase
        .from('providers')
        .upsert(providerRecord, { onConflict: 'id' })

      if (providerUpsertError) throw providerUpsertError

      window.dispatchEvent(new CustomEvent('flashmat-provider-profile-updated'))
      setProfileSaveNotice('Profil atelier sauvegarde.')
      toast('Profil atelier sauvegarde', 'success')
    } catch (error) {
      setProfileSaveNotice('Profil garde localement. La synchronisation distante a echoue.')
      toast(error.message || 'Profil sauvegarde localement, mais la synchronisation distante a echoue', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  function acceptFlashFixRequest(requestId) {
    providerRespondToFlashFix(requestId, 'accept', name, {
      title: 'Mecano mobile certifie',
      vehicle: 'Ford Transit FlashFix',
      rating: '4.9',
      phone: '(514) 555-0199',
      arrivalWindow: '15-25 min',
    })
    toast('FlashFix request accepted', 'success')
  }

  function refuseFlashFixRequest(requestId) {
    providerRespondToFlashFix(requestId, 'refuse', name)
    toast('FlashFix request declined', 'success')
  }

  function advanceFlashFixStatus(requestId, nextStatus) {
    advanceFlashFixRequest(requestId, nextStatus, name, {
      title: 'Mecano mobile certifie',
      vehicle: 'Ford Transit FlashFix',
      rating: '4.9',
      phone: '(514) 555-0199',
      arrivalWindow: nextStatus === 'completed' ? 'Arrivee completee' : '15-25 min',
    })
    const labels = {
      en_route: 'Le provider est maintenant en route',
      onsite: 'The provider has arrived on site',
      completed: 'FlashFix intervention completed',
    }
    toast(labels[nextStatus] || 'Update sent', 'success')
  }

  async function markBookingDone(booking) {
    try {
      const updated = await updateBookingStatus(booking.id, 'done')
      setProviderBookings((current) => current.map((entry) => entry.id === updated.id ? updated : entry))

      try {
        await createNotification({
          userId: booking.client_id,
          title: 'Votre vehicule est pret',
          body: `${name} a termine le service ${booking.service}.`,
          icon: 'OK',
          type: 'booking',
        })
      } catch {
        // Notification cross-user may be blocked by RLS; the booking itself still stays updated.
      }

      toast(`${booking.clientName} notifie: voiture prete`, 'success')
    } catch (error) {
      toast(error.message || 'Impossible de mettre a jour la reservation', 'error')
    }
  }

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}
      {profileMenuOpen && <div className={styles.overlay} onClick={() => setProfileMenuOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sbHeader}>
          <div className={styles.sbLogo} onClick={goHome} style={{ cursor: 'pointer' }}>
            <img src="/logo-dark.png" alt="FlashMat" style={{ height: 36, objectFit: 'contain' }} />
          </div>
          <span className={`${styles.sbMode} ${styles.modeProvider}`}>PROVIDER</span>
        </div>
        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Operations</div>
            {NAV.slice(0,4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
                {n.badge && <span className={styles.nBadge}>{n.badge}</span>}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Business</div>
            {NAV.slice(4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
              </button>
            ))}
          </div>
        </nav>
        <div className={styles.sbBottom}>
          <div className={styles.profileMenuWrap}>
            {profileMenuOpen && (
              <div className={styles.profileMenu}>
                <div className={styles.profileMenuHeader}>
                  <div className={styles.profileMenuName}>{name}</div>
                  <div className={styles.profileMenuRole}>Provider Profile</div>
                </div>
                <button className={styles.profileMenuItem} onClick={goHome}><span><AppIcon code="AC" /></span><span>Home</span></button>
                <button className={styles.profileMenuItem} onClick={() => { setProfileMenuOpen(false); setProviderProfileModalOpen(true) }}><span><AppIcon code="AT" /></span><span>Edit Profile</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('p-bookings')}><span><AppIcon code="RS" /></span><span>Bookings</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('p-services')}><span><AppIcon code="SV" /></span><span>My Services</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('p-marketplace')}><span><AppIcon code="MP" /></span><span>Marketplace</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('p-profile')}><span><AppIcon code="AT" /></span><span>Shop Profile</span></button>
                <button className={styles.profileMenuItem} onClick={() => setProfileMenuOpen(false)}><span><AppIcon code="AI" /></span><span>Help & Support</span></button>
                <div className={styles.profileMenuDivider} />
                <button className={`${styles.profileMenuItem} ${styles.profileMenuDanger}`} onClick={handleSignOut}><span><AppIcon code="SO" /></span><span>Sign Out</span></button>
              </div>
            )}
          <button type="button" className={styles.userChip} onClick={() => setProfileMenuOpen((open) => !open)}>
            <div className={`${styles.avatar} ${styles.avatarBlue}`} style={{ overflow:'hidden' }}>
              {providerLogo ? (
                <img src={providerLogo} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                name.slice(0,2).toUpperCase()
              )}
            </div>
            <div><div className={styles.userName}>{name}</div><div className={styles.userRole}>provider · montreal</div></div>
            <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 11 }}>←</span>
          </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        <div className={styles.mobileTopbar}>
          <button className={styles.menuBtn} onClick={() => setSidebar(true)}>≡</button>
          <img src="/logo-dark.png" alt="FlashMat" onClick={goHome} style={{ height: 28, objectFit: 'contain', cursor: 'pointer' }} />
          <button className="btn btn-blue" style={{fontSize:11,padding:'7px 12px'}} onClick={() => go('p-bookings')}>+ Jobs</button>
        </div>

        {/* â”€â”€ DASHBOARD â”€â”€ */}
        {pane === 'p-dashboard' && (
          <div>
            <div className={styles.pageHdr}>
              <div><div className={styles.pageTitle}>Hello</div><div className={styles.pageSub}>{providerBookings.length} active booking(s) · {pendingFlashFix.length} FlashFix urgent job(s)</div></div>
              <button className="btn btn-green" onClick={() => go('p-bookings')}>View bookings</button>
            </div>
            <div className={styles.pad}>
              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Recorded Revenue</div><div className="stat-val">$<span style={{fontSize:22}}>{monthlyRevenue || 0}</span></div><div className="stat-sub">{bookingsDoneCount} completed job(s)</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">Active Jobs</div><div className="stat-val">{providerBookings.length}</div><div className="stat-sub">bookings synced with FlashMat</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">Pending</div><div className="stat-val">{bookingsPendingCount}</div><div className="stat-sub">booking(s) to handle</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">Average Rating</div><div className="stat-val">{averageRating}</div><div className="stat-sub">public shop profile</div></div>
              </div>

              <div className={styles.g2}>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">FL Queue today</div></div>
                  <div style={{overflowX:'auto'}}>
                    <table>
                      <thead><tr><th>Heure</th><th>Client</th><th>Service</th><th>Statut</th><th></th></tr></thead>
                      <tbody>
                        {operationalQueue.map((q) => (
                          <tr key={q.id}>
                            <td style={{fontFamily:'var(--mono)',color:'var(--blue)',fontSize:11}}>{q.time}</td>
                            <td style={{fontWeight:600}}>{q.client}</td>
                            <td>{q.service}</td>
                            <td><span className={`badge ${q.cls}`}>{q.label}</span></td>
                            <td><button className={`btn ${q.done ? 'btn-green' : ''}`} style={{ fontSize:10, opacity:q.label === 'Planifie' ? .4 : 1 }} disabled={q.label === 'Planifie'} onClick={() => toast(`${q.client} notified: vehicle ready`, 'success')}>Notify</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {operationalQueue.length === 0 && (
                    <div style={{padding:18,color:'var(--ink3)',fontSize:12}}>
                      No live booking is feeding the queue yet.
                    </div>
                  )}
                </div>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">RV Weekly revenue</div></div>
                    <div className="panel-body">
                      {[['Bookings', providerBookings.length], ['Unique clients', providerClients.length], ['Completed services', bookingsDoneCount], ['FlashFix urgent jobs', flashFixQueue.length]].map(([label, value]) => (
                        <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                          <span style={{color:'var(--ink2)'}}>{label}</span>
                          <strong style={{color:'var(--ink)',fontFamily:'var(--mono)'}}>{value}</strong>
                        </div>
                      ))}
                      <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:11,color:'var(--ink2)'}}>Recorded total</span>
                        <span style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,color:'var(--green)'}}>${monthlyRevenue || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">BT Work bays</div></div>
                    {[1, 2, 3, 4].map((bayNumber) => {
                      const booking = providerBookings[bayNumber - 1]
                      const occupied = Boolean(booking && booking.status !== 'done')
                      return (
                      <div key={bayNumber} style={{display:'flex',alignItems:'center',gap:9,padding:'11px 14px',borderBottom:'1px solid var(--border)'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:occupied ? 'var(--amber)' : 'var(--green)',flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:12}}>Baie {bayNumber}</div>
                          <div style={{fontSize:10,color:'var(--ink2)'}}>{occupied ? `${booking.clientName} - ${booking.service}` : 'Available'}</div>
                        </div>
                        <span className={`badge ${occupied ? 'badge-amber' : 'badge-green'}`}>{occupied ? 'Occupied' : 'Free'}</span>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ TASKS â”€â”€ */}
        {pane === 'p-tasks' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Today Tasks</div><div className={styles.pageSub}>{tasks.filter(t=>!t.done).length} in progress</div></div><button className="btn btn-green" onClick={() => { setTasks(t => [{title:'New task',meta:'General',time:'Now',done:false},...t]); toast('Task added', 'success') }}>+ Add</button></div>
            <div className={styles.pad}>
              {tasks.map((t,i) => (
                <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start',padding:9,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:7,marginBottom:6,opacity:t.done?.55:1}}>
                  <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${t.done?'var(--green)':'var(--ink3)'}`,background:t.done?'var(--green)':'transparent',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:9,color:'#fff'}}
                    onClick={() => setTasks(prev => prev.map((x,j) => j===i?{...x,done:!x.done}:x))}>
                    {t.done?'OK':''}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:1,textDecoration:t.done?'line-through':'none',color:t.done?'var(--ink3)':'var(--ink)'}}>{t.title}</div>
                    <div style={{fontSize:10,color:'var(--ink3)'}}>{t.meta}</div>
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',whiteSpace:'nowrap'}}>{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* â”€â”€ BOOKINGS â”€â”€ */}
        {pane === 'p-bookings' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Bookings</div><div className={styles.pageSub}>{providerBookings.length} booking(s) · {pendingFlashFix.length} pending FlashFix urgent job(s)</div></div></div>
            <div className={styles.pad}>
              {pendingFlashFix.length > 0 && (
                <div style={{background:'linear-gradient(135deg,#111827 0%, #7c2d12 100%)',borderRadius:18,padding:18,marginBottom:16,color:'#fff',boxShadow:'var(--shadow)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:11,letterSpacing:1.4,textTransform:'uppercase',color:'rgba(255,255,255,.72)',marginBottom:6}}>Emergency dispatch</div>
                      <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,lineHeight:1.1}}>{pendingFlashFix.length} job(s) to handle</div>
                    </div>
                    <span className="badge badge-amber">Live emergency</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:10}}>
                    <div style={{background:'rgba(255,255,255,.08)',borderRadius:14,padding:12}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginBottom:4}}>Closest job</div>
                      <div style={{fontWeight:700,fontSize:14}}>{pendingFlashFix[0].location || 'Montreal'}</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,.08)',borderRadius:14,padding:12}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginBottom:4}}>Service</div>
                      <div style={{fontWeight:700,fontSize:14}}>{pendingFlashFix[0].selectedOption?.title || 'FlashFix'}</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,.08)',borderRadius:14,padding:12}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginBottom:4}}>Prix</div>
                      <div style={{fontWeight:700,fontSize:14}}>{pendingFlashFix[0].selectedOption?.price || 'To confirm'}</div>
                    </div>
                  </div>
                </div>
              )}
              {flashFixQueue.length > 0 && (
                <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                  {flashFixQueue.map((request) => {
                    const meta = getFlashFixStatusMeta(request.status)
                    const latestEvent = request.events?.[request.events.length - 1]
                    const timeline = getFlashFixStageProgress(request.status)
                    return (
                      <div key={request.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:10}}>
                          <div>
                            <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,marginBottom:4}}>{request.issueLabel}</div>
                            <div style={{fontSize:12,color:'var(--ink2)',lineHeight:1.6}}>{request.description}</div>
                          </div>
                          <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                          <span className="badge badge-gray">{request.customerName || 'Client FlashMat'}</span>
                          <span className="badge badge-blue">{request.location || 'Location to confirm'}</span>
                          <span className="badge badge-green">{request.selectedOption?.title || 'Service FlashFix'}</span>
                          <span className="badge badge-amber">{request.selectedOption?.price || 'Price to confirm'}</span>
                          <span className="badge badge-gray">ETA {request.selectedOption?.eta || 'to confirm'}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',fontSize:11,color:'var(--ink2)',marginBottom:12}}>
                          <span>{request.providerName ? `Assigned to ${request.providerName}` : 'No provider assigned yet'}</span>
                          <span style={{fontFamily:'var(--mono)'}}>{formatFlashFixTime(latestEvent?.at || request.createdAt)}</span>
                        </div>
                        {request.providerProfile && (
                          <div style={{marginBottom:12,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:12,display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,alignItems:'center'}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>{request.providerProfile.title}</div>
                              <div style={{fontSize:11,color:'var(--ink2)'}}>{request.providerProfile.vehicle} · ★ {request.providerProfile.rating}</div>
                            </div>
                            <span className="badge badge-blue">{request.providerProfile.arrivalWindow}</span>
                            <span className="badge badge-gray">{request.providerProfile.phone}</span>
                          </div>
                        )}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {request.status === 'pending' && (
                            <>
                              <button className="btn btn-green" onClick={() => acceptFlashFixRequest(request.id)}>Accept</button>
                              <button className="btn" onClick={() => refuseFlashFixRequest(request.id)}>Decline</button>
                            </>
                          )}
                          {request.status === 'accepted' && (
                            <button className="btn btn-blue" onClick={() => advanceFlashFixStatus(request.id, 'en_route')}>Leave now</button>
                          )}
                          {request.status === 'en_route' && (
                            <button className="btn btn-amber" onClick={() => advanceFlashFixStatus(request.id, 'onsite')}>I am on site</button>
                          )}
                          {request.status === 'onsite' && (
                            <button className="btn btn-green" onClick={() => advanceFlashFixStatus(request.id, 'completed')}>Complete job</button>
                          )}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(0,1fr))',gap:8,marginTop:12}}>
                          {timeline.map((item) => (
                            <div key={item.step} style={{textAlign:'center'}}>
                              <div style={{
                                width:28,
                                height:28,
                                borderRadius:999,
                                margin:'0 auto 6px',
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                fontSize:11,
                                fontWeight:800,
                                color:item.done ? '#fff' : 'var(--ink3)',
                                background:item.current ? 'var(--blue)' : item.done ? 'var(--green)' : 'var(--bg3)',
                                border:item.current ? 'none' : '1px solid var(--border)',
                              }}>
                                {item.done ? '•' : ''}
                              </div>
                              <div style={{fontSize:10,color:item.current ? 'var(--ink)' : 'var(--ink3)',fontWeight:item.current ? 700 : 500}}>{getTimelineLabel(item.step)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="panel" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Client</th><th>Service</th><th>Vehicle</th><th>Date & Time</th><th>Price</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {providerBookings.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.clientName}</strong></td>
                        <td>{b.service}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{b.vehicleLabel}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{b.datetimeLabel}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--green)'}}>{b.priceLabel}</td>
                        <td><span className={`badge ${b.statusClass}`}>{b.statusLabel}</span></td>
                        <td style={{display:'flex',gap:4}}>
                          <button className="btn btn-green" style={{fontSize:10,opacity:b.status==='done'?.4:1}} disabled={b.status==='done'} onClick={() => markBookingDone(b)}>Ready</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {providerBookings.length === 0 && (
                <div style={{textAlign:'center',padding:28,color:'var(--ink3)'}}>
                  No bookings recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* â”€â”€ CLIENTS â”€â”€ */}
        {pane === 'p-clients' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Clients</div><div className={styles.pageSub}>{filteredClients.length} clients</div></div></div>
            <div className={styles.pad}>
              <input className="form-input" placeholder="Search a client..." value={clientQ} onChange={e => setClientQ(e.target.value)} style={{marginBottom:14}} />
              <div className="panel" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Name</th><th>Vehicles</th><th>Last visit</th><th>Total</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filteredClients.map((c,i) => (
                      <tr key={i}>
                        <td><strong>{c.name}</strong><br/><span style={{fontSize:9,color:'var(--ink3)'}}>{c.email}</span></td>
                        <td>{c.vehicles.map(v => <span key={v} className="badge badge-gray" style={{marginRight:3}}>{v}</span>)}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{c.last}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--green)'}}>{c.total}</td>
                        <td><span className={`badge ${c.cls}`}>{c.status}</span></td>
                        <td><button className="btn" style={{fontSize:10}} onClick={() => go('p-bookings')}>View bookings</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredClients.length === 0 && (
                <div style={{textAlign:'center',padding:28,color:'var(--ink3)'}}>
                  No live clients appear yet. Clients will show here after the first bookings.
                </div>
              )}
            </div>
          </div>
        )}

        {/* â”€â”€ PROMOS â”€â”€ */}
        {pane === 'p-promos' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Promotions</div><div className={styles.pageSub}>Manage your client offers</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                <div>
                  <div style={{background:'linear-gradient(135deg,var(--green-bg),var(--blue-bg))',border:'1px solid var(--border)',borderRadius:10,padding:18}}>
                    <div style={{fontFamily:'var(--display)',fontSize:24,fontWeight:800,color:'var(--ink)',marginBottom:8}}>Promotions ready to connect</div>
                    <div style={{fontSize:12,color:'var(--ink2)',lineHeight:1.7}}>
                      This area no longer shows invented campaigns. Create a real offer, then attach it to your clients or your FlashMat bookings.
                    </div>
                    <div style={{marginTop:12,display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span className="badge badge-blue">No demo data</span>
                      <span className="badge badge-gray">Ready for the promo module</span>
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">PM New promotion</div></div>
                  <div className="panel-body">
                    <div className="form-group"><label className="form-label">Service</label><input className="form-input" value={promoSvc} onChange={e => setPromoSvc(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Discount</label><input className="form-input" value={promoVal} onChange={e => setPromoVal(e.target.value)} placeholder="Example: 20% or $15"/></div>
                    <div className="form-group"><label className="form-label">End date</label><input className="form-input" type="date" /></div>
                    <div className="form-group"><label className="form-label">Message</label><input className="form-input" placeholder="Custom message..."/></div>
                    <button className="btn btn-green" style={{width:'100%',justifyContent:'center'}} onClick={() => go('p-clients')}>
                      Manage clients →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ MY SERVICES â”€â”€ */}
        {pane === 'p-services' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>My Services</div>
                <div className={styles.pageSub}>Build your provider offer step by step so FlashMat shows the right services to the right clients.</div>
              </div>
              <button type="button" className="btn btn-green" onClick={() => { void saveProviderProfileChanges() }} disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Services'}
              </button>
            </div>
            <div className={styles.pad}>
              {profileSaveNotice && (
                <div style={{marginBottom:14,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',fontSize:12,color:'var(--ink2)'}}>
                  {profileSaveNotice}
                </div>
              )}
              <div className={styles.providerServicesHero}>
                <div className={styles.providerServicesHeroMain}>
                  <div className={styles.providerServicesHeroEyebrow}>FlashMat service builder</div>
                  <div className={styles.providerServicesHeroTitle}>Start with your shop type, then fine-tune what you really offer.</div>
                  <div className={styles.providerServicesHeroText}>
                    A mechanic should not appear for detailing, and a car wash should not appear for brake repair. FlashMat uses this setup to keep search and bookings accurate.
                  </div>
                  <div className={styles.providerServicesHeroTags}>
                    <span className={styles.providerServicesHeroTag}>Provider types: {selectedTypeTotal}</span>
                    <span className={styles.providerServicesHeroTag}>Active services: {selectedServiceTotal}</span>
                    <span className={styles.providerServicesHeroTag}>Profile ready: {servicesCompletion}%</span>
                  </div>
                </div>
                <div className={styles.providerServicesHeroAside}>
                  <div className={styles.providerServicesProgressCard}>
                    <div className={styles.providerServicesProgressLabel}>Service setup progress</div>
                    <div className={styles.providerServicesProgressValue}>{servicesCompletion}%</div>
                    <div className={styles.providerServicesProgressTrack}>
                      <span style={{ width: `${servicesCompletion}%` }} />
                    </div>
                    <div className={styles.providerServicesProgressHint}>
                      Select one or more provider types, then activate the exact sub-services you want to publish.
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.providerServicesLayout}>
                <div className={`panel ${styles.providerServicesSummaryCard}`}>
                  <div className="panel-hd">
                    <div className="panel-title">Provider Types</div>
                  </div>
                  <div className="panel-body">
                    <div className={styles.providerServicesIntro}>
                      Choose the big categories that define your business. The interface will instantly narrow the matching sub-services on the right.
                    </div>
                    <div className={styles.providerTypeGrid}>
                      {PROVIDER_SERVICE_TYPE_OPTIONS.map((type) => {
                        const active = selectedServiceTypeSet.has(type.id)
                        return (
                          <button
                            key={type.id}
                            type="button"
                            className={`${styles.providerTypeCard} ${active ? styles.providerTypeCardActive : ''}`}
                            onClick={() => toggleServiceType(type.id)}
                          >
                            <span className={styles.providerTypeIcon}><AppIcon code={type.icon} /></span>
                            <span>
                              <strong>{type.label}</strong>
                              <small>{type.services.length} services</small>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-hd">
                    <div className="panel-title">Sub-services</div>
                  </div>
                  <div className="panel-body">
                    {availableServiceGroups.length === 0 ? (
                      <div className={styles.providerServicesEmpty}>
                        Start by choosing at least one provider type. Your available sub-services will appear here automatically.
                      </div>
                    ) : (
                      <div className={styles.providerServiceGroups}>
                        {availableServiceGroups.map((group) => (
                          <div key={group.id} className={styles.providerServiceGroupCard}>
                            <div className={styles.providerServiceGroupHeader}>
                              <div className={styles.providerServiceGroupIdentity}>
                                <span className={styles.providerServiceGroupIcon}><AppIcon code={group.icon} /></span>
                                <div>
                                  <div className={styles.providerServiceGroupTitle}>{group.label}</div>
                                  <div className={styles.providerServiceGroupMeta}>Only services from this provider type appear in the public profile and search filters.</div>
                                </div>
                              </div>
                              <div className={styles.providerServiceGroupBadge}>{group.services.filter((service) => providerProfileForm.services.includes(service.label)).length}/{group.services.length} selected</div>
                            </div>
                            <div className={styles.providerServiceOptionGrid}>
                              {group.services.map((service) => {
                                const active = providerProfileForm.services.includes(service.label)
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
                                    className={`${styles.providerServiceOption} ${active ? styles.providerServiceOptionActive : ''}`}
                                    onClick={() => toggleService(service.label)}
                                  >
                                    <span className={styles.providerServiceOptionIcon}><AppIcon code={service.icon} /></span>
                                    <span>{service.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.providerServicesFooter}>
                      <div className={styles.providerServicesCounter}>
                        {providerProfileForm.services.length} active sub-service{providerProfileForm.services.length > 1 ? 's' : ''} across {providerProfileForm.serviceTypes.length} provider type{providerProfileForm.serviceTypes.length > 1 ? 's' : ''}
                      </div>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        <button type="button" className="btn" onClick={() => go('p-profile')}>
                          Back to Shop Profile
                        </button>
                        <button type="button" className="btn btn-blue" onClick={() => { void saveProviderProfileChanges() }} disabled={isSavingProfile}>
                          {isSavingProfile ? 'Saving...' : 'Publish my services'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ MARKETPLACE â”€â”€ */}
        {pane === 'p-marketplace' && <Marketplace portal="provider" />}

        {/* â”€â”€ PROFILE â”€â”€ */}
        {pane === 'p-profile' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Shop Profile</div><div className={styles.pageSub}>Your public FlashMat page</div></div><button type="button" className="btn btn-green" onClick={() => { void saveProviderProfileChanges() }} disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save'}</button></div>
            <div className={styles.pad}>
              {profileSaveNotice && (
                <div style={{marginBottom:14,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',fontSize:12,color:'var(--ink2)'}}>
                  {profileSaveNotice}
                </div>
              )}
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
                <button
                  type="button"
                  className="btn btn-green"
                  style={{minWidth:160,justifyContent:'center'}}
                  onClick={() => { void saveProviderProfileChanges() }}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              <div className={styles.g2}>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">Shop Information</div></div>
                    <div className="panel-body">
                      <div className="form-group"><label className="form-label">Shop Name</label><input className="form-input" value={providerProfileForm.name} onChange={e => setProfileField('name', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={providerProfileForm.address} onChange={e => setProfileField('address', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={providerProfileForm.phone} onChange={e => setProfileField('phone', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={providerProfileForm.email} onChange={e => setProfileField('email', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={providerProfileForm.description} onChange={e => setProfileField('description', e.target.value)} style={{resize:'vertical'}} /></div>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">Shop Photos</div></div>
                    <div className="panel-body">
                      <div className="form-group">
                        <label className="form-label">Cover Photo</label>
                        <input className="form-input" type="file" accept="image/*" onChange={updateCoverPhoto} />
                      </div>
                      {providerProfileForm.coverPhoto && (
                        <div style={{marginBottom:14}}>
                          <img src={providerProfileForm.coverPhoto} alt="Shop cover" style={{width:'100%',height:160,objectFit:'cover',borderRadius:12,border:'1px solid var(--border)'}} />
                          <button type="button" className="btn" style={{marginTop:8,fontSize:11}} onClick={removeCoverPhoto}>Remove cover</button>
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">Gallery</label>
                        <input className="form-input" type="file" accept="image/*" multiple onChange={updateGalleryPhotos} />
                      </div>
                      {providerProfileForm.galleryPhotos.length > 0 && (
                        <div style={{display:'grid',gridTemplateColumns:'repeat(2, minmax(0, 1fr))',gap:10}}>
                          {providerProfileForm.galleryPhotos.map((photo, index) => (
                            <div key={index} style={{position:'relative'}}>
                              <img src={photo} alt={`Shop ${index + 1}`} style={{width:'100%',height:110,objectFit:'cover',borderRadius:12,border:'1px solid var(--border)'}} />
                              <button type="button" className="btn" style={{position:'absolute',right:8,bottom:8,fontSize:10,padding:'4px 8px'}} onClick={() => removeGalleryPhoto(index)}>Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{marginTop:12,fontSize:11,color:'var(--ink3)'}}>Photos saved here will be visible to clients on your provider page.</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">Hours</div></div>
                    <div className="panel-body">
                      {[['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']].map(([key, label]) => (
                        <div key={key} style={{display:'grid',gridTemplateColumns:'110px 1fr 1fr auto',gap:8,alignItems:'center',marginBottom:8}}>
                          <span style={{fontSize:11,color:'var(--ink2)'}}>{label}</span>
                          <input className="form-input" type="time" value={providerProfileForm.editableHours[key]?.open || ''} disabled={providerProfileForm.editableHours[key]?.closed} onChange={e => updateHour(key, 'open', e.target.value)} style={providerProfileForm.editableHours[key]?.closed ? { opacity:.4 } : undefined} />
                          <input className="form-input" type="time" value={providerProfileForm.editableHours[key]?.close || ''} disabled={providerProfileForm.editableHours[key]?.closed} onChange={e => updateHour(key, 'close', e.target.value)} style={providerProfileForm.editableHours[key]?.closed ? { opacity:.4 } : undefined} />
                          <button type="button" className="btn" style={{fontSize:10}} onClick={() => toggleClosed(key)}>{providerProfileForm.editableHours[key]?.closed ? 'Closed' : 'Open'}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">Services Offered</div></div>
                    <div className="panel-body">
                      <div className={styles.providerServicesSummaryHead}>
                        <div>
                          <div className={styles.providerServicesSummaryTitle}>Your selected services</div>
                          <div className={styles.providerServicesSummaryText}>Manage provider types and sub-services from a dedicated workspace so your public profile stays clean and accurate.</div>
                        </div>
                        <button type="button" className="btn btn-blue" onClick={() => go('p-services')}>
                          Open My Services
                        </button>
                      </div>
                      <div className={styles.providerServicesSummaryPills}>
                        {providerProfileForm.services.length > 0 ? (
                          providerProfileForm.services.map((service) => (
                            <span key={service} className={styles.providerServicesSummaryPill}>{service}</span>
                          ))
                        ) : (
                          <span className={styles.providerServicesSummaryText}>No services selected yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:18}}>
                <button
                  type="button"
                  className="btn btn-green"
                  style={{minWidth:180,justifyContent:'center'}}
                  onClick={() => { void saveProviderProfileChanges() }}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM NAV */}
        <nav className={styles.bottomNav}>
          {[['p-dashboard','TB','Home'],['p-tasks','TD','Tasks'],['p-bookings','RS','Bookings'],['p-clients','CT','Clients'],['p-promos','PM','Promos']].map(([id,icon,label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{display:'inline-flex'}}><AppIcon code={icon} size={18} /></span><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {providerProfileModalOpen && (
        <ProviderProfileModal
          onClose={() => setProviderProfileModalOpen(false)}
          onSaved={() => {
            void fetchProfile(user?.id)
          }}
        />
      )}

      {pane !== 'p-profile' && pane !== 'p-services' && <FlashAI portal="provider" userName={name} />}
    </div>
  )
}


