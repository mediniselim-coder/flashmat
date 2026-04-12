import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import FlashAI from '../components/FlashAI'
import ProviderMap from '../components/ProviderMap'
import BookingModal from '../components/BookingModal'
import AddVehicleModal from '../components/AddVehicleModal'
import Marketplace from '../components/Marketplace'
import AppIcon from '../components/AppIcon'
import SellVehicleModal from '../components/SellVehicleModal'
import ClientProfileModal from '../components/ClientProfileModal'
import HelpSupportModal from '../components/HelpSupportModal'
import SecurityPrivacyModal from '../components/SecurityPrivacyModal'
import WalletModal from '../components/WalletModal'
import NotificationCenterModal from '../components/NotificationCenterModal'
import FloatingPanelBoundary from '../components/FloatingPanelBoundary'
import VehicleDoctor from '../components/VehicleDoctor'
import { useInboxSummary } from '../hooks/useInbox'
import { FLASHFIX_UPDATED_EVENT, createFlashFixRequest, getFlashFixStageProgress, getFlashFixStatusMeta, readFlashFixRequests } from '../lib/flashfix'
import { createBooking, fetchClientBookings, fetchClientNotifications } from '../lib/bookings'
import { fetchProviders } from '../lib/providerProfiles'
import { fetchSellerVehicleListings, normalizeMarketplaceListing } from '../lib/marketplace'
import {
  fetchClientVehicles,
  releaseVehicleFromOwner,
  deleteVehicle,
  saveVehicleRecord,
  removeVehicleExtras,
  removeVehicleRecord,
  mergeVehicleExtras,
} from '../lib/vehicles'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'dashboard',     icon: 'TB', label: 'Dashboard' },
  { id: 'vehicles',      icon: 'VH', label: 'My Vehicles' },
  { id: 'search',        icon: 'SV', label: 'Find a Service' },
  { id: 'bookings',      icon: 'RS', label: 'Bookings', badge: true },
  { id: 'maintenance',   icon: 'EN', label: 'Maintenance' },
  { id: 'doctor',        icon: 'DR', label: 'Docteur Automobile' },
  { id: 'flashfix',      icon: 'FX', label: 'FlashFix' },
  { id: 'marketplace',   icon: 'MP', label: 'Marketplace' },
  { id: 'flashscore',    icon: 'FS', label: 'FlashScore' },
  { id: 'notifications', icon: 'AL', label: 'Alerts', badge: true },
]

const NAV_SECTIONS = {
  core: ['dashboard', 'vehicles', 'search'],
  tools: ['bookings', 'maintenance', 'doctor', 'flashscore'],
  other: ['notifications', 'flashfix', 'marketplace'],
}

const SEARCH_CATS = [
  ['all', 'All'],
  ['mechanic', 'Mechanics'],
  ['wash', 'Car Wash'],
  ['tire', 'Tires'],
  ['body', 'Bodywork'],
  ['glass', 'Glass'],
  ['tow', 'Towing'],
  ['parts', 'Parts'],
  ['parking', 'Parking'],
]

const CLIENT_PANE_PATHS = {
  dashboard: '/app/client/dashboard',
  bookings: '/app/client/bookings',
  search: '/app/client/search',
  vehicles: '/app/client/vehicles',
  maintenance: '/app/client/maintenance',
  doctor: '/app/client/doctor',
  flashfix: '/app/client/flashfix',
  marketplace: '/app/client/marketplace',
  flashscore: '/app/client/flashscore',
  notifications: '/app/client/alerts',
}

const VALID_CLIENT_PANES = new Set(Object.keys(CLIENT_PANE_PATHS))

function getPaneFromClientPath(pathname) {
  const cleanPath = pathname.replace(/\/+$/, '')
  const segment = cleanPath.split('/')[3] || 'dashboard'

  if (segment === 'alerts') return 'notifications'
  return VALID_CLIENT_PANES.has(segment) ? segment : 'dashboard'
}

function getClientPathSegment(pathname) {
  return pathname.replace(/\/+$/, '').split('/')[3] || 'dashboard'
}

const FLASHFIX_QUICK_CASES = [
  'Besoin d un mecanicien a domicile',
  'Lavage auto a domicile',
  'Batterie morte a domicile',
  'Pneu creve sur le bord de la route',
  'Voiture qui ne demarre plus',
  'Surchauffe moteur',
  'Besoin de remorquage rapide',
]

const FLASHFIX_CASES = [
  {
    id: 'mobile-mechanic',
    label: 'Besoin d un mecanicien a domicile',
    keywords: ['mecanicien', 'mecanique', 'diagnostic', 'inspection', 'reparation'],
    summary: 'Demande de mecanicien mobile pour verifier un probleme general ou effectuer une petite reparation sur place.',
    options: [
      { id: 'mechanic-home-diagnostic', title: 'Diagnostic mecanique a domicile', eta: '20-30 min', price: '60-95$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'mechanic-home-repair', title: 'Petite reparation sur place', eta: '25-40 min', price: '90$+', providerType: 'Mecano mobile', category: 'mechanic' },
    ],
  },
  {
    id: 'mobile-wash',
    label: 'Lavage auto a domicile',
    keywords: ['lavage', 'wash', 'nettoyage', 'detailing'],
    summary: 'Service mobile de lavage ou detailing leger directement a domicile ou au travail.',
    options: [
      { id: 'wash-exterior', title: 'Lavage exterieur mobile', eta: '20-30 min', price: '35-55$', providerType: 'Lavage mobile', category: 'wash' },
      { id: 'wash-full', title: 'Lavage interieur + exterieur', eta: '35-60 min', price: '65-110$', providerType: 'Detailing mobile', category: 'wash' },
    ],
  },
  {
    id: 'battery-home',
    label: 'Batterie morte a domicile',
    keywords: ['batterie', 'booster', 'boost', 'ne demarre pas', 'demarre plus'],
    summary: 'Intervention mobile pour booster, tester la batterie ou verifier l alimentation principale.',
    options: [
      { id: 'battery-boost', title: 'Boost batterie mobile', eta: '15-25 min', price: '40-60$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'battery-diagnostic', title: 'Diagnostic batterie + boost', eta: '20-30 min', price: '55-75$', providerType: 'Mecano mobile', category: 'mechanic' },
    ],
  },
  {
    id: 'flat-tire',
    label: 'Pneu creve sur le bord de la route',
    keywords: ['pneu', 'creve', 'air', 'pression'],
    summary: 'Aide rapide pour remise en route, changement de roue ou remorquage securitaire si necessaire.',
    options: [
      { id: 'tire-roadside', title: 'Aide pneu mobile', eta: '20-30 min', price: '50-80$', providerType: 'Service routier', category: 'tire' },
      { id: 'tire-tow', title: 'Remorquage vers garage partenaire', eta: '25-35 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'no-start',
    label: 'Voiture qui ne demarre plus',
    keywords: ['ne demarre pas', 'demarre plus', 'starter', 'clic'],
    summary: 'Verification sur place pour distinguer batterie, alimentation, demarreur ou besoin de remorquage.',
    options: [
      { id: 'nostart-diagnostic', title: 'Diagnostic demarrage sur place', eta: '20-30 min', price: '60-95$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'nostart-tow', title: 'Remorquage intelligent', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'overheat',
    label: 'Surchauffe moteur',
    keywords: ['chauffe', 'temperature', 'surchauffe', 'radiateur'],
    summary: 'Intervention de securite si le moteur chauffe, avec verification du circuit de refroidissement ou remorquage.',
    options: [
      { id: 'overheat-check', title: 'Inspection refroidissement sur place', eta: '20-30 min', price: '70-110$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'overheat-tow', title: 'Remorquage securitaire', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'urgent-tow',
    label: 'Besoin de remorquage rapide',
    keywords: ['remorquage', 'remorquer', 'tow'],
    summary: 'Prise en charge directe pour transporter le vehicule vers un garage partenaire ou un lieu securitaire.',
    options: [
      { id: 'urgent-tow-dispatch', title: 'Remorquage prioritaire', eta: '20-35 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
]

function normalizeFlashFixValue(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function resolveFlashFixCase(description, quickCase) {
  if (quickCase) return FLASHFIX_CASES.find((item) => item.label === quickCase) || null
  const normalized = normalizeFlashFixValue(description)
  if (!normalized.trim()) return null
  const scored = FLASHFIX_CASES
    .map((item) => ({
      item,
      score: item.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score)
  return scored[0]?.score > 0 ? scored[0].item : null
}

function parseDistanceKm(value) {
  const normalized = String(value || '').replace(',', '.')
  const match = normalized.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 99
}

function providerSupportsCategory(provider, category) {
  const terms = [
    normalizeFlashFixValue(provider.type),
    normalizeFlashFixValue(provider.type_label),
    ...(Array.isArray(provider.services) ? provider.services.map((service) => normalizeFlashFixValue(service)) : []),
  ]

  const categoryTerms = {
    mechanic: ['mecanique', 'mechanic', 'diagnostic', 'freins', 'vidange', 'suspension', 'climatisation'],
    wash: ['lave-auto', 'lavage', 'wash', 'detailing', 'nettoyage'],
    tow: ['remorquage', 'tow', 'depannage', 'assistance routiere'],
    tire: ['pneu', 'pneus', 'tire', 'alignement', 'balancement'],
  }

  const wantedTerms = categoryTerms[category] || [category]
  return terms.some((term) => wantedTerms.some((wanted) => term.includes(wanted)))
}

function buildFlashFixProviderProfile(provider, option, slugify) {
  const distanceKm = parseDistanceKm(provider.distance)
  return {
    title: provider.type_label || option.providerType || 'Provider FlashFix',
    vehicle: option.providerType === 'Remorquage' ? 'Camion de service FlashFix' : 'Unite mobile FlashFix',
    rating: provider.rating || '4.8',
    phone: provider.phone || '(514) 555-0100',
    arrivalWindow: option.eta || (distanceKm <= 1 ? '10-15 min' : distanceKm <= 2.5 ? '15-25 min' : '25-40 min'),
    distance: provider.distance || `${distanceKm} km`,
    address: provider.address || 'Montreal',
    providerId: provider.id || null,
    providerSlug: provider.slug || slugify(provider.name || 'provider'),
  }
}

function readPendingServiceSearch() {
  try {
    const raw = window.sessionStorage.getItem('flashmat-pending-service-search')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.cat ? parsed : null
  } catch {
    return null
  }
}

function clearPendingServiceSearch() {
  window.sessionStorage.removeItem('flashmat-pending-service-search')
}

function formatFlashFixTime(value) {
  if (!value) return 'Now'
  try {
    return new Date(value).toLocaleString('fr-CA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return value }
}

function getTimelineLabel(step) {
  const labels = { pending: 'Requested', accepted: 'Accepted', en_route: 'On the way', onsite: 'On site', completed: 'Completed' }
  return labels[step] || step
}

function getClientSafeFlashFixEventLabel(eventLabel, status) {
  if (status === 'accepted') return 'A FlashFix provider accepted your request'
  if (status === 'en_route') return 'Your FlashFix provider is on the way'
  if (status === 'onsite') return 'Your FlashFix provider arrived on site'
  if (status === 'completed') return 'FlashFix service completed'
  if (status === 'refused') return 'The request is being reassigned'
  return eventLabel
}

function formatActivityTime(value) {
  if (!value) return 'Recent'
  try {
    return new Date(value).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recent'
  }
}

function getProviderKey(provider, fallback = '') {
  return String(provider?.id || provider?.name || fallback)
}


export default function ClientApp() {
  const { profile, user, signOut } = useAuth()
  const [myVehicles, setMyVehicles] = useState([])
  const [notifications, setNotifications] = useState([])
  const [vehicleModalState, setVehicleModalState] = useState({ open: false, mode: 'create', vehicle: null })
  const [sellVehicleState, setSellVehicleState] = useState({ open: false, vehicle: null, listing: null })
  useEffect(() => {
    if (!user?.id) {
      setMyVehicles([])
      return
    }

    setMyVehicles([])
    fetchClientVehicles(user.id).then(setMyVehicles)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || myVehicles.length === 0) return

    async function attachVehicleListings() {
      const vehicleListings = await fetchSellerVehicleListings(user.id)
      setMyVehicles((current) => current.map((vehicle) => {
        const matchedListing = vehicleListings.find((listing) => String(listing.vehicle_id) === String(vehicle.id))
        return matchedListing ? { ...vehicle, sale_listing: matchedListing } : { ...vehicle, sale_listing: null }
      }))
    }

    attachVehicleListings()
  }, [myVehicles.length, user?.id])

  useEffect(() => {
    if (myVehicles.length === 0) {
      setSelectedMaintenanceVehicleId('')
      return
    }

    setSelectedMaintenanceVehicleId((current) => (
      myVehicles.some((vehicle) => String(vehicle.id) === String(current))
        ? current
        : String(myVehicles[0].id)
    ))
  }, [myVehicles])

  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const routeParams = new URLSearchParams(location.search)
  const routeCat = routeParams.get('cat')
  const pendingSearch = readPendingServiceSearch()
  const initialSearchCat = routeCat || pendingSearch?.cat || location.state?.searchCat || 'all'
  const [sidebarOpen, setSidebar] = useState(false)
  const [bookingModal, setBookingModal] = useState(false)
  const [selectedBookingProvider, setSelectedBookingProvider] = useState(null)
  const [providers, setProviders] = useState([])
  const [bookings, setBookings] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState(initialSearchCat)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [clientProfileModalOpen, setClientProfileModalOpen] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [helpSupportModalOpen, setHelpSupportModalOpen] = useState(false)
  const [securityModalOpen, setSecurityModalOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [flashFixRequests, setFlashFixRequests] = useState([])
  const [selectedMaintenanceVehicleId, setSelectedMaintenanceVehicleId] = useState('')
  const [visibleProviderKeys, setVisibleProviderKeys] = useState(null)
  const [selectedSearchProviderId, setSelectedSearchProviderId] = useState(null)
  const [flashFixQuickCase, setFlashFixQuickCase] = useState('')
  const [flashFixDescription, setFlashFixDescription] = useState('')
  const [flashFixLocation, setFlashFixLocation] = useState('Montreal')
  const [flashFixLocationDetails, setFlashFixLocationDetails] = useState('')
  const [selectedFlashFixOptionId, setSelectedFlashFixOptionId] = useState('')
  const [flashFixGeoLabel, setFlashFixGeoLabel] = useState('Recherche de votre position...')
  const [flashFixGeoStatus, setFlashFixGeoStatus] = useState('loading')
  const rawPaneSegment = getClientPathSegment(location.pathname)
  const pane = getPaneFromClientPath(location.pathname)

  const name = profile?.full_name || 'Alex'
  const profileAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || ''
  const { unreadMessages, unreadNotifications } = useInboxSummary(user, profile)
  const activeFlashFixRequests = flashFixRequests.filter((r) => r.channel === 'flashfix' && r.status !== 'completed')
  const resolvedFlashFixCase = useMemo(
    () => resolveFlashFixCase(flashFixDescription, flashFixQuickCase),
    [flashFixDescription, flashFixQuickCase],
  )
  const selectedFlashFixOption = resolvedFlashFixCase?.options.find((option) => option.id === selectedFlashFixOptionId) || null
  const matchedFlashFixProvider = useMemo(() => {
    if (!selectedFlashFixOption) return null
    const openProviders = providers.filter((provider) => provider.is_open === true || provider.is_open === 'true')
    const categoryMatches = openProviders.filter((provider) => providerSupportsCategory(provider, selectedFlashFixOption.category))
    const pool = categoryMatches.length > 0 ? categoryMatches : (openProviders.length > 0 ? openProviders : providers)
    if (pool.length === 0) return null
    return [...pool].sort((left, right) => parseDistanceKm(left.distance) - parseDistanceKm(right.distance))[0]
  }, [providers, selectedFlashFixOption])
  const latestFlashFixEvents = flashFixRequests
    .filter((r) => r.channel === 'flashfix')
    .flatMap((r) => (r.events || []).map((e) => ({ ...e, requestId: r.id, issueLabel: r.issueLabel, status: r.status, providerName: r.providerName })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)

  useEffect(() => { loadProviders() }, [])
  useEffect(() => { if (!user?.id) return; fetchMyBookings() }, [user?.id])

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setFlashFixGeoStatus('unavailable')
      setFlashFixGeoLabel('Localisation automatique non disponible')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFlashFixLocation(`Position GPS (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`)
        setFlashFixGeoStatus('ready')
        setFlashFixGeoLabel('Position GPS detectee automatiquement en arriere-plan')
      },
      () => {
        setFlashFixGeoStatus('denied')
        setFlashFixGeoLabel('Autorisez la localisation pour une position exacte, puis ajoutez un complement si besoin')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    )
  }, [])

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id) return
      try {
        setNotifications(await fetchClientNotifications(user.id))
      } catch { setNotifications([]) }
    }
    fetchNotifications()
  }, [user?.id])

  useEffect(() => {
    function syncFlashFixRequests() { setFlashFixRequests(readFlashFixRequests()) }
    syncFlashFixRequests()
    window.addEventListener('storage', syncFlashFixRequests)
    window.addEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests)
    return () => { window.removeEventListener('storage', syncFlashFixRequests); window.removeEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests) }
  }, [])

  useEffect(() => {
    if (routeCat) {
      setSearchCat(routeCat)
      clearPendingServiceSearch()
      return
    }

    if (location.pathname.startsWith('/app/client') && pendingSearch?.cat) {
      const targetPane = pendingSearch.pane && VALID_CLIENT_PANES.has(pendingSearch.pane) ? pendingSearch.pane : 'search'
      setSearchCat(pendingSearch.cat)
      clearPendingServiceSearch()
      navigate(`${CLIENT_PANE_PATHS[targetPane]}?cat=${encodeURIComponent(pendingSearch.cat)}`, { replace: true })
      return
    }

    if (location.pathname.startsWith('/app/client') && rawPaneSegment !== 'alerts' && !VALID_CLIENT_PANES.has(rawPaneSegment)) {
      navigate(CLIENT_PANE_PATHS.dashboard, { replace: true })
    }
  }, [location.pathname, navigate, pendingSearch, rawPaneSegment, routeCat])

  async function loadProviders() {
    setProvLoading(true)
    setProviders(await fetchProviders())
    setProvLoading(false)
  }

  async function fetchMyBookings() {
    try { const b = await fetchClientBookings(user.id); setBookings(b) } catch { setBookings([]) }
  }

  const filtered = useMemo(() => {
    return providers.filter((provider) => {
      const matchCat = searchCat === 'all' || provider.serviceCategories?.includes(searchCat)
      const query = searchQ.toLowerCase()
      const matchQ = !query
        || provider.name?.toLowerCase().includes(query)
        || provider.type_label?.toLowerCase().includes(query)
        || provider.address?.toLowerCase().includes(query)
        || provider.services?.some((service) => service.toLowerCase().includes(query))
      return matchCat && matchQ
    })
  }, [providers, searchCat, searchQ])

  const displayedProviders = useMemo(() => {
    if (!Array.isArray(visibleProviderKeys)) return filtered
    const visibleSet = new Set(visibleProviderKeys)
    return filtered.filter((provider, index) => visibleSet.has(getProviderKey(provider, index)))
  }, [filtered, visibleProviderKeys])

  useEffect(() => {
    if (!displayedProviders.length) {
      setSelectedSearchProviderId(null)
      return
    }

    const hasSelectedProvider = displayedProviders.some((provider, index) => (
      getProviderKey(provider, index) === selectedSearchProviderId
    ))

    if (!hasSelectedProvider) {
      setSelectedSearchProviderId(getProviderKey(displayedProviders[0], 0))
    }
  }, [displayedProviders, selectedSearchProviderId])

  function go(id, options = {}) {
    const nextPath = CLIENT_PANE_PATHS[id] || CLIENT_PANE_PATHS.dashboard
    setSidebar(false)
    navigate(nextPath, options)
  }

  function openAddVehicleModal() {
    setVehicleModalState({ open: true, mode: 'create', vehicle: null })
  }

  function openEditVehicleModal(vehicle) {
    setVehicleModalState({ open: true, mode: 'edit', vehicle })
  }

  function closeVehicleModal() {
    setVehicleModalState({ open: false, mode: 'create', vehicle: null })
  }

  function openSellVehicleModal(vehicle) {
    setSellVehicleState({
      open: true,
      vehicle,
      listing: vehicle?.sale_listing || null,
    })
  }

  function closeSellVehicleModal() {
    setSellVehicleState({ open: false, vehicle: null, listing: null })
  }

  function goToVehicle(vehicleId) {
    if (!vehicleId) return
    setSidebar(false)
    navigate(`/app/client/vehicles/${vehicleId}`)
  }
  function openBooking(provider = null) {
    if (!myVehicles.length) { toast('Add a vehicle first to book a service', 'error'); openAddVehicleModal(); return }
    setSelectedBookingProvider(provider); setBookingModal(true)
  }
  function goHome() { setSidebar(false); navigate('/') }
  function goFromProfileMenu(id) { setProfileMenuOpen(false); go(id) }
  async function handleSignOut() {
    setProfileMenuOpen(false)
    setNotificationCenterOpen(false)
    await signOut()
    navigate('/')
    toast('You have been logged off.', 'success')
  }
  function openClientProfileModal() { setProfileMenuOpen(false); setClientProfileModalOpen(true) }
  function openWalletModal() { setProfileMenuOpen(false); setWalletModalOpen(true) }
  function openHelpSupportModal() { setProfileMenuOpen(false); setHelpSupportModalOpen(true) }
  function openSecurityModal() { setProfileMenuOpen(false); setSecurityModalOpen(true) }
  function openMessageCenter(threadId = '') {
    setProfileMenuOpen(false)
    setNotificationCenterOpen(false)
    navigate(threadId ? `/messages?thread=${threadId}` : '/messages')
  }
  function openNotificationCenter() {
    setProfileMenuOpen(false)
    setNotificationCenterOpen(true)
  }

  function chooseFlashFixQuickCase(label) {
    setFlashFixQuickCase(label)
    setFlashFixDescription(label)
    const matchedCase = FLASHFIX_CASES.find((item) => item.label === label)
    setSelectedFlashFixOptionId(matchedCase?.options[0]?.id || '')
  }

  function launchFlashFixFromPane() {
    if (!resolvedFlashFixCase || !selectedFlashFixOption) {
      toast('Choose a FlashFix case and a service option first.', 'error')
      return
    }

    const providerProfile = matchedFlashFixProvider
      ? buildFlashFixProviderProfile(matchedFlashFixProvider, selectedFlashFixOption, slugify)
      : null

    createFlashFixRequest({
      channel: 'flashfix',
      issueLabel: resolvedFlashFixCase.label,
      description: flashFixDescription || resolvedFlashFixCase.label,
      location: [flashFixLocation, flashFixLocationDetails].filter(Boolean).join(' · ') || 'Position a confirmer',
      selectedOption: selectedFlashFixOption,
      providerName: matchedFlashFixProvider?.name || null,
      providerProfile,
      providerId: matchedFlashFixProvider?.id || null,
      providerSlug: matchedFlashFixProvider?.slug || slugify(matchedFlashFixProvider?.name || 'provider'),
      customerName: profile?.full_name || user?.email?.split('@')[0] || 'Client FlashMat',
    })

    setFlashFixRequests(readFlashFixRequests())
    toast('FlashFix request sent. You can track it from bookings and alerts.', 'success')
    go('bookings')
  }

  function handleVehicleAdded(nextVehicle) {
    saveVehicleRecord(user?.id, nextVehicle)
    setMyVehicles((prev) => [
      mergeVehicleExtras(nextVehicle, user?.id),
      ...prev.filter((item) => String(item.owner_id || '') === String(user?.id || '')),
    ])
    closeVehicleModal()
    toast('Vehicle added to your profile', 'success')
  }

  function handleVehicleSaved(nextVehicle) {
    saveVehicleRecord(user?.id, nextVehicle)
    setMyVehicles((prev) => prev.map((item) => (
      String(item.id) === String(nextVehicle.id) ? mergeVehicleExtras(nextVehicle, user?.id) : item
    )))
    closeVehicleModal()
    toast('Vehicle profile updated', 'success')
  }

  function handleVehicleListed(nextListing) {
    const normalizedListing = normalizeMarketplaceListing(nextListing)
    setMyVehicles((prev) => prev.map((item) => (
      String(item.id) === String(normalizedListing.vehicle_id)
        ? { ...item, sale_listing: normalizedListing }
        : item
    )))
    closeSellVehicleModal()
    toast('Vehicle published to the marketplace', 'success')
  }

  function handleVehicleListingRemoved(listingId) {
    setMyVehicles((prev) => prev.map((item) => (
      item.sale_listing?.id === listingId ? { ...item, sale_listing: null } : item
    )))
    closeSellVehicleModal()
    toast('Vehicle removed from the marketplace', 'success')
  }

  async function handleVehicleDelete(vehicle) {
    if (!user?.id || !vehicle?.id) return

    const normalizedVin = String(vehicle.vin || vehicle.serial_number || '').trim().toUpperCase()
    const hasTrackedVin = Boolean(normalizedVin)
    const confirmMessage = hasTrackedVin
      ? `Remove ${vehicle.make} ${vehicle.model} ${vehicle.year} from your profile? FlashMat will keep the vehicle lifecycle tied to VIN ${normalizedVin}.`
      : `Delete ${vehicle.make} ${vehicle.model} ${vehicle.year} from your profile and database? This vehicle has no VIN, so FlashMat will remove it completely.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    const { error } = hasTrackedVin
      ? await releaseVehicleFromOwner(vehicle.id, user.id)
      : await deleteVehicle(vehicle.id, user.id)

    if (error) {
      toast(
        error.message || (hasTrackedVin
          ? 'Unable to remove the vehicle from your profile'
          : 'Unable to delete the vehicle from the database'),
        'error',
      )
      return
    }

    removeVehicleExtras(user.id, vehicle.id)
    removeVehicleRecord(user.id, vehicle.id)
    setMyVehicles((prev) => prev.filter((item) => String(item.id) !== String(vehicle.id)))
    toast(hasTrackedVin ? 'Vehicle removed from your profile' : 'Vehicle deleted from FlashMat', 'success')
  }

  async function handleBookingConfirm(payload) {
    if (!user?.id) throw new Error('Client login required')
    const createdBooking = await createBooking({ clientId: user.id, providerId: payload.provider.id, vehicleId: payload.vehicle?.id, service: payload.service, serviceIcon: payload.serviceIcon, date: payload.date, timeSlot: payload.timeSlot, notes: payload.notes, price: payload.price })
    setBookings((current) => [createdBooking, ...current]); setSelectedBookingProvider(null); go('bookings'); toast('Booking confirmed', 'success')
  }

  const averageFlashScore = myVehicles.length ? Math.round(myVehicles.reduce((sum, v) => sum + Number(v.flash_score || 0), 0) / myVehicles.length) : 0
  const nextServiceLabel = myVehicles[0] ? 'Recommended soon' : 'Add a vehicle'
  const selectedMaintenanceVehicle = myVehicles.find((vehicle) => String(vehicle.id) === String(selectedMaintenanceVehicleId)) || myVehicles[0] || null
  const selectedMaintenanceVehicleLabel = selectedMaintenanceVehicle
    ? `${selectedMaintenanceVehicle.make} ${selectedMaintenanceVehicle.model}${selectedMaintenanceVehicle.year ? ` ${selectedMaintenanceVehicle.year}` : ''}`
    : ''
  const maintenanceItems = selectedMaintenanceVehicle
    ? [
        {
          icon: 'VG',
          title: 'Fluids and oil checkpoint',
          meta: selectedMaintenanceVehicle.mileage
            ? `${Number(selectedMaintenanceVehicle.mileage).toLocaleString()} km currently logged on ${selectedMaintenanceVehicle.make} ${selectedMaintenanceVehicle.model}`
            : selectedMaintenanceVehicleLabel,
          detail: 'Review oil life, coolant condition, washer fluid, and brake fluid before the next appointment.',
        },
        {
          icon: 'PN',
          title: 'Tires, pressure, and alignment',
          meta: selectedMaintenanceVehicleLabel,
          detail: 'Recommended before long drives, after seasonal tire swaps, or when the car feels slightly off-center.',
        },
        {
          icon: 'BT',
          title: 'Battery and charging health',
          meta: selectedMaintenanceVehicleLabel,
          detail: 'A smart seasonal checkpoint to avoid weak starts, voltage drops, and accessory power issues.',
        },
        {
          icon: 'FR',
          title: 'Brake wear review',
          meta: selectedMaintenanceVehicleLabel,
          detail: 'Pads, rotors, and braking response should be checked proactively before noise or vibration shows up.',
        },
      ]
    : []
  const vehicleServiceHistory = bookings
    .filter((booking) => {
      if (!selectedMaintenanceVehicle) return true
      return String(booking.vehicle_id || booking.vehicle?.id || '') === String(selectedMaintenanceVehicle.id)
    })
    .map((booking) => ({
      id: booking.id,
      icon: booking.service_icon || 'RS',
      title: booking.service,
      meta: `${booking.providerName} • ${booking.vehicleLabel}`,
      detail: `${booking.datetimeLabel} • ${booking.priceLabel}`,
      statusLabel: booking.statusLabel,
      statusClass: booking.statusClass,
    }))
    .slice(0, 8)
  const flashScoreCards = myVehicles.map((v) => {
    const score = Number(v.flash_score || 80)
    return {
      make: v.make,
      model: v.model,
      year: v.year,
      image: v.image_url || v.photo_url || '/vehicle-fallback.svg',
      plate: v.plate || '',
      mileage: v.mileage || '',
      score,
      items: [
        ['Engine', Math.min(99, score + 6), 'green'],
        ['Brakes', Math.min(98, score + 3), score >= 80 ? 'green' : 'amber'],
        ['Tires', Math.max(55, score - 4), score >= 75 ? 'blue' : 'amber'],
        ['Battery', Math.min(97, score + 2), 'blue'],
        ['Oil', Math.max(40, score - 8), score >= 85 ? 'green' : 'amber'],
      ],
    }
  })
  const vehicleActivity = [
    ...myVehicles.map((vehicle) => ({
      id: `vehicle-${vehicle.id}`,
      icon: 'VH',
      title: `${vehicle.make} ${vehicle.model} added`,
      meta: vehicle.vin
        ? `VIN ${vehicle.vin.slice(0, 8)}… saved to your garage`
        : `${vehicle.year} vehicle saved to your profile`,
      at: vehicle.created_at,
    })),
    ...bookings.slice(0, 4).map((booking) => ({
      id: `booking-${booking.id}`,
      icon: 'RS',
      title: booking.service,
      meta: `${booking.providerName} • ${booking.statusLabel}`,
      at: booking.created_at || booking.updated_at || booking.date,
    })),
    ...latestFlashFixEvents.slice(0, 4).map((event) => ({
      id: `flashfix-${event.id}`,
      icon: 'AL',
      title: event.issueLabel || 'FlashFix update',
      meta: getClientSafeFlashFixEventLabel(event.label, event.status),
      at: event.at,
    })),
    ...notifications.slice(0, 4).map((notification) => ({
      id: `notification-${notification.id}`,
      icon: notification.icon || 'AI',
      title: notification.title || 'FlashMat update',
      meta: notification.body || 'New activity in your account',
      at: notification.created_at,
    })),
  ]
    .sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime())
    .slice(0, 8)

  function slugify(name) {
    return name.toLowerCase().replace(/[àáâã]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u').replace(/ç/g,'c').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim()
  }

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}
      {profileMenuOpen && <div className={styles.overlay} onClick={() => setProfileMenuOpen(false)} />}

          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sbHeader} style={{ gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={goHome}
              aria-label="Back to home"
              title="Back to home"
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,.08)',
                background: 'rgba(255,255,255,.04)',
                color: '#f7fbff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.sbLogo} onClick={goHome} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
              <img src="/logo-dark.png" alt="FlashMat" style={{ height: 34, width: '100%', maxWidth: 120, objectFit: 'contain', objectPosition: 'left center' }} />
            </div>
            <span className={`${styles.sbMode} ${styles.modeClient}`} style={{ flexShrink: 0, fontSize: 9, padding: '5px 8px' }}>CLIENT</span>
          </div>
        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Core</div>
            {NAV.filter((n) => NAV_SECTIONS.core.includes(n.id)).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Tools</div>
            {NAV.filter((n) => NAV_SECTIONS.tools.includes(n.id)).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Other</div>
            {NAV.filter((n) => NAV_SECTIONS.other.includes(n.id)).map(n => (
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
                  <div className={styles.profileMenuRole}>Client Profile</div>
                </div>
                <button className={styles.profileMenuItem} onClick={openClientProfileModal}><span><AppIcon code="PP" /></span><span>Edit Profile</span></button>
                <button className={styles.profileMenuItem} onClick={openWalletModal}><span><AppIcon code="WL" /></span><span>Wallet</span></button>
                <button className={styles.profileMenuItem} onClick={() => openMessageCenter()}><span><AppIcon code="RS" /></span><span>Messages {unreadMessages > 0 ? `(${unreadMessages})` : ''}</span></button>
                <button className={styles.profileMenuItem} onClick={openNotificationCenter}><span><AppIcon code="AL" /></span><span>Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</span></button>
                <button className={styles.profileMenuItem} onClick={openSecurityModal}><span><AppIcon code="AL" /></span><span>Security & Privacy</span></button>
                <button className={styles.profileMenuItem} onClick={openHelpSupportModal}><span><AppIcon code="AI" /></span><span>Help & Support</span></button>
                <div className={styles.profileMenuDivider} />
                <button className={`${styles.profileMenuItem} ${styles.profileMenuDanger}`} onClick={handleSignOut}><span><AppIcon code="SO" /></span><span>Sign Out</span></button>
              </div>
            )}
            <button type="button" className={styles.userChip} onClick={() => setProfileMenuOpen(open => !open)}>
              <div className={`${styles.avatar} ${styles.avatarGreen}`} style={{ overflow: 'hidden' }}>
                {profileAvatar ? (
                  <img src={profileAvatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  name.slice(0,2).toUpperCase()
                )}
              </div>
              <div><div className={styles.userName}>{name}</div><div className={styles.userRole}>client · montreal</div></div>
              <span style={{marginLeft:'auto',color:'var(--ink3)',fontSize:11}}>{profileMenuOpen ? '↓' : '←'}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
          <div className={styles.mobileTopbar}>
            <button className={styles.menuBtn} onClick={() => setSidebar(true)}>☰</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={goHome}
                aria-label="Back to home"
                title="Back to home"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.08)',
                  background: 'rgba(255,255,255,.04)',
                  color: '#f7fbff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
              <img src="/logo-dark.png" alt="FlashMat" onClick={goHome} style={{ height: 28, objectFit: 'contain', cursor: 'pointer' }} />
            </div>
            <button className="btn btn-green" style={{fontSize:11,padding:'7px 12px'}} onClick={() => openBooking()}>+ Book</button>
          </div>

        {pane === 'dashboard' && (
          <div>
            {/* HERO CAR BANNER */}
            <div style={{ position:'relative', height: myVehicles.length === 0 ? 340 : 220, overflow:'hidden', background:'linear-gradient(135deg, #0f1e3d 0%, #1a3a8f 60%, #2563eb 100%)' }}>
              <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,159,216,.2), transparent 65%)', top:-100, right:-50, pointerEvents:'none' }} />
              <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax meet" style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:860, pointerEvents:'none' }}>
                <defs>
                  <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.08)"/>
                    <stop offset="50%" stopColor="rgba(255,255,255,0.18)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.06)"/>
                  </linearGradient>
                </defs>
                <path fill="url(#carGrad)" d="M 60,300 L 60,278 C 65,268 80,258 105,254 L 160,250 C 178,248 200,244 222,236 C 248,226 268,212 290,196 C 312,180 334,162 358,148 C 382,134 414,122 452,116 L 548,110 C 598,108 648,110 692,116 C 730,122 758,132 776,144 C 792,155 800,168 804,180 C 808,192 808,206 806,218 L 840,222 C 868,226 900,232 928,240 C 952,247 970,255 982,262 C 990,268 994,276 994,284 L 994,300 Z"/>
                <path fill="rgba(15,30,77,0.55)" d="M 358,148 C 382,134 414,122 452,116 L 510,112 L 500,136 C 468,140 438,148 412,160 C 390,170 372,184 360,196 Z"/>
                <path fill="rgba(15,30,77,0.45)" d="M 364,192 C 382,178 408,166 440,158 L 540,150 L 536,170 C 504,172 470,176 444,184 C 420,191 400,202 386,214 Z"/>
                <path fill="rgba(15,30,77,0.4)" d="M 544,150 L 596,146 C 622,145 648,148 666,154 C 676,158 682,164 682,172 L 680,186 C 660,184 632,180 604,178 L 540,174 Z"/>
                <circle cx="250" cy="300" r="78" fill="#0f1e3d"/>
                <circle cx="840" cy="300" r="86" fill="#0f1e3d"/>
                <circle cx="250" cy="300" r="74" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                <circle cx="250" cy="300" r="50" fill="rgba(255,255,255,0.07)"/>
                <circle cx="250" cy="300" r="18" fill="rgba(255,255,255,0.2)"/>
                {[0,60,120,180,240,300].map(a => (<line key={a} x1={250} y1={300} x2={250+48*Math.cos(a*Math.PI/180)} y2={300+48*Math.sin(a*Math.PI/180)} stroke="rgba(255,255,255,0.18)" strokeWidth="4"/>))}
                <circle cx="840" cy="300" r="82" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                <circle cx="840" cy="300" r="56" fill="rgba(255,255,255,0.07)"/>
                <circle cx="840" cy="300" r="20" fill="rgba(255,255,255,0.2)"/>
                {[0,60,120,180,240,300].map(a => (<line key={a} x1={840} y1={300} x2={840+54*Math.cos(a*Math.PI/180)} y2={300+54*Math.sin(a*Math.PI/180)} stroke="rgba(255,255,255,0.18)" strokeWidth="4"/>))}
                <rect x="988" y="172" width="42" height="6" rx="2" fill="rgba(255,255,255,0.18)"/>
                <rect x="1026" y="172" width="4" height="28" rx="2" fill="rgba(255,255,255,0.15)"/>
                <ellipse cx="80" cy="262" rx="16" ry="8" fill="rgba(255,255,255,0.35)"/>
                <rect x="988" y="252" width="6" height="28" rx="2" fill="rgba(59,159,216,0.7)"/>
                <line x1="60" y1="300" x2="994" y2="300" stroke="rgba(59,159,216,0.35)" strokeWidth="1"/>
                <ellipse cx="527" cy="308" rx="460" ry="10" fill="rgba(0,0,0,0.3)"/>
              </svg>
              <div style={{ position:'relative', zIndex:2, padding:'32px 28px 28px', height:'100%', display:'flex', flexDirection:'column', justifyContent: myVehicles.length === 0 ? 'space-between' : 'flex-end' }}>
                {myVehicles.length === 0 ? (
                  <>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'rgba(59,159,216,.9)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>● FlashMat · Montreal</div>
                      <div style={{ fontFamily:'var(--display)', fontSize:28, fontWeight:800, color:'#fff', lineHeight:1.1, letterSpacing:'-.5px', marginBottom:8 }}>Welcome, {name}</div>
                      <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', lineHeight:1.6, maxWidth:320 }}>Start by adding your vehicle to unlock your services, diagnosis, and bookings.</div>
                    </div>
                    <button className="btn btn-green btn-lg" style={{ alignSelf:'flex-start', fontSize:15, padding:'14px 28px' }} onClick={openAddVehicleModal}>Add My Vehicle →</button>
                  </>
                ) : (
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'rgba(59,159,216,.9)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>● My vehicles</div>
                      <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>{myVehicles[0].make} {myVehicles[0].model} {myVehicles[0].year}</div>
                      {myVehicles[0].plate && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'rgba(255,255,255,.5)', marginTop:4 }}>{myVehicles[0].plate}</div>}
                      {myVehicles[0].mileage ? <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4 }}>{Number(myVehicles[0].mileage).toLocaleString()} km</div> : null}
                    </div>
                    <button className="btn" style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', fontSize:12 }} onClick={openAddVehicleModal}>+ Add</button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.pad}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:20 }}>
                {[
                  { icon:'RS', label:'Book', sub:'a service', action: () => openBooking(), color:'var(--green)' },
                  { icon:'SV', label:'Find', sub:'a provider', action: () => go('search'), color:'var(--blue)' },
                  { icon:'MP', label:'Marketplace', sub:'auto parts', action: () => go('marketplace'), color:'var(--amber)' },
                ].map(q => (
                  <button key={q.label} onClick={q.action}
                    style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'left', transition:'all .18s', boxShadow:'var(--shadow)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = q.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ color:q.color, marginBottom:8, display:'inline-flex' }}><AppIcon code={q.icon} size={22} /></div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--ink)' }}>{q.label}</div>
                    <div style={{ fontSize:11, color:'var(--ink3)' }}>{q.sub}</div>
                  </button>
                ))}
              </div>
              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Montreal Providers</div><div className="stat-val">{providers.length}</div><div className="stat-sub">available now</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">FlashScore™</div><div className="stat-val">{myVehicles.length ? averageFlashScore : '—'}{myVehicles.length ? <span style={{fontSize:14}}>%</span> : null}</div><div className="stat-sub">{myVehicles[0] ? `${myVehicles[0].make} ${myVehicles[0].model}` : 'Add a vehicle'}</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">Next Service</div><div className="stat-val">{myVehicles.length ? `${Math.max(3, 14 - myVehicles.length)}d` : '—'}</div><div className="stat-sub">{nextServiceLabel}</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">My Vehicles</div><div className="stat-val">{myVehicles.length}</div><div className="stat-sub">{myVehicles.length === 0 ? 'No vehicles yet' : myVehicles.slice(0,2).map(v => v.model).join(' · ')}</div></div>
              </div>
            </div>
          </div>
        )}

        {pane === 'search' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>Find a Service</div>
                <div className={styles.pageSub}>{provLoading ? 'Loading...' : `${displayedProviders.length} provider${displayedProviders.length!==1?'s':''} found in this map view`}</div>
              </div>
            </div>
            <div className={styles.pad}>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input className="form-input" placeholder="Search for a service or neighborhood..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{flex:1,fontSize:14}} />
                {searchQ && <button className="btn" onClick={() => setSearchQ('')}>✕</button>}
              </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
                  {SEARCH_CATS.map(([c,l]) => (<button key={c} className={`btn ${searchCat===c?'btn-green':''}`} onClick={() => setSearchCat(c)}>{l}</button>))}
                </div>
              {!provLoading && filtered.length > 0 && (
                <ProviderMap
                  providers={filtered}
                  selectedProviderId={selectedSearchProviderId}
                  onSelect={(provider) => setSelectedSearchProviderId(getProviderKey(provider))}
                  onBook={(provider) => openBooking(provider)}
                  onVisitProfile={(provider) => navigate(`/provider/${slugify(provider.name)}`)}
                  onVisibleProvidersChange={(visibleProviders) => {
                    const nextKeys = visibleProviders.map((provider) => getProviderKey(provider))
                    setVisibleProviderKeys((current) => {
                      if (Array.isArray(current) && current.length === nextKeys.length && current.every((value, index) => value === nextKeys[index])) {
                        return current
                      }
                      return nextKeys
                    })
                  }}
                />
              )}
                {provLoading ? (
                  <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:32,height:32,margin:'0 auto 12px'}}/><div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink3)'}}>Loading providers...</div></div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {displayedProviders.map((p,i) => (
                      <div
                        key={p.id||i}
                        style={{
                          background:'var(--bg2)',
                          border:selectedSearchProviderId === getProviderKey(p, i) ? '1px solid rgba(47,125,225,.42)' : '1px solid var(--border)',
                          borderRadius:10,
                          padding:'10px 12px',
                          display:'flex',
                          gap:10,
                          alignItems:'center',
                          cursor:'pointer',
                          boxShadow:selectedSearchProviderId === getProviderKey(p, i) ? '0 14px 24px rgba(47,125,225,.10)' : 'var(--shadow)',
                        }}
                        onClick={() => setSelectedSearchProviderId(getProviderKey(p, i))}
                      >
                        <div style={{width:40,height:40,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--blue)'}}><AppIcon code={p.icon || 'ME'} size={18} /></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:13,marginBottom:1,lineHeight:1.15}}>{p.name}</div>
                        <div style={{fontSize:10.5,color:'var(--ink2)',marginBottom:5,lineHeight:1.45}}>{p.type_label} · {p.address} · {p.rating} stars ({p.reviews} reviews) · {p.phone}</div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(p.services||[]).slice(0,3).map(s => <span key={s} className="badge badge-gray" style={{fontSize:9,padding:'3px 7px'}}>{s}</span>)}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end',flexShrink:0}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)'}}>{p.distance}</span>
                        <span className={`badge ${p.is_open?'badge-green':'badge-amber'}`} style={{fontSize:9,padding:'3px 7px'}}>{p.is_open ? 'Open' : 'Closed'}</span>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <button className="btn" style={{fontSize:10,padding:'4px 10px',minWidth:84}} onClick={e=>{e.stopPropagation();navigate(`/provider/${slugify(p.name)}`)}}>Visit profile</button>
                          <button className="btn btn-green" style={{fontSize:10,padding:'4px 10px',minWidth:56}} onClick={e=>{e.stopPropagation();openBooking(p)}}>Book</button>
                        </div>
                        </div>
                      </div>
                    ))}
                    {displayedProviders.length===0 && (
                      <div style={{textAlign:'center',color:'var(--ink3)',padding:60}}>
                        <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:6}}>No providers in this map view</div>
                        <div style={{fontSize:12,lineHeight:1.7}}>Zoom out, move the map, or reset your filters to see more providers.</div>
                        <button className="btn" style={{marginTop:12}} onClick={() => {setSearchQ('');setSearchCat('all')}}>Reset</button>
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        )}

        {pane === 'vehicles' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>My Vehicles</div><div className={styles.pageSub}>Your saved vehicles</div></div><button className="btn btn-green" onClick={openAddVehicleModal}>+ Add Vehicle</button></div>
            <div className={styles.pad}>
              <div className={styles.vehicleSplit}>
                <div className={styles.vehicleColumn}>
                  {myVehicles.length === 0 ? (
                    <div className={styles.vehicleCard} style={{textAlign:'center',padding:24}}>
                      <img src="/vehicle-fallback.svg" alt="Abstract vehicle placeholder" className={styles.vehicleMedia} />
                      <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:18,marginBottom:8,color:'var(--ink)'}}>No vehicles yet</div>
                      <div style={{fontSize:13,marginBottom:16,color:'var(--ink3)'}}>Add your first vehicle to start building your FlashMat garage.</div>
                      <button className="btn btn-green btn-lg" onClick={openAddVehicleModal}>+ Add Vehicle</button>
                    </div>
                    ) : (
                      <div className={styles.vehicleGrid}>
                        {myVehicles.map(v => (
                          <div key={v.id} className={styles.vehicleCard} onClick={() => goToVehicle(v.id)} style={{cursor:'pointer'}}>
                          <img
                            src={v.image_url || '/vehicle-fallback.svg'}
                            alt={`${v.make} ${v.model}`}
                            className={styles.vehicleMedia}
                          />
                          <div className={styles.vehicleTop}>
                            <div className={styles.vehicleTitle}>{v.make} {v.model} {v.year}</div>
                            <span className="badge badge-green">My vehicle</span>
                          </div>
                            <div className={styles.vehicleMeta}>
                              {v.plate ? <span className={styles.vehicleMetaPill}>{v.plate}</span> : null}
                              {v.color ? (
                                <span className={styles.vehicleMetaPill} style={{display:'inline-flex',alignItems:'center',gap:6}}>
                                  <span style={{width:10,height:10,borderRadius:999,background:v.color,border:'1px solid rgba(15, 30, 61, 0.12)',boxShadow:'inset 0 0 0 1px rgba(255,255,255,.32)'}} />
                                  {v.color}
                                </span>
                              ) : null}
                              {v.mileage ? <span className={styles.vehicleMetaPill}>{Number(v.mileage).toLocaleString()} km</span> : null}
                            </div>
                            <div className={styles.vehicleInfoList}>
                              <div className={styles.vehicleInfoRow}>
                                <span>Brand</span>
                              <strong>{v.make}</strong>
                            </div>
                            <div className={styles.vehicleInfoRow}>
                              <span>Year</span>
                              <strong>{v.year}</strong>
                            </div>
                            <div className={styles.vehicleInfoRow}>
                              <span>VIN</span>
                              <strong style={{fontFamily:'var(--mono)',fontSize:11}}>{v.vin || 'Not added yet'}</strong>
                            </div>
                          </div>
                          <div style={{marginBottom:10}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                              <span style={{color:'var(--ink2)'}}>FlashScore™</span>
                                <span style={{color:'var(--green)',fontFamily:'var(--mono)'}}>{v.flash_score}%</span>
                              </div>
                              <div className="prog-bar"><div className="prog-fill" style={{width:`${v.flash_score}%`,background:'var(--green)'}}/></div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                              <button className="btn" style={{justifyContent:'center'}} onClick={(event) => { event.stopPropagation(); openEditVehicleModal(v) }}>Edit</button>
                              <button className="btn" style={{justifyContent:'center',color:'var(--red)',borderColor:'rgba(239,68,68,.18)'}} onClick={(event) => { event.stopPropagation(); handleVehicleDelete(v) }}>Delete</button>
                            </div>
                            <button className={`btn ${v.sale_listing ? '' : 'btn-green'}`} style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={(event) => { event.stopPropagation(); openSellVehicleModal(v) }}>
                              {v.sale_listing ? 'Manage marketplace listing' : 'Sell this vehicle'}
                            </button>
                            <button className="btn btn-green" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={(event) => { event.stopPropagation(); openBooking() }}>Book a Service</button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className={styles.vehicleColumn}>
                  <div className={styles.historyCard}>
                    <div className={styles.historyHeader}>
                      <div className={styles.historyEyebrow}>FlashMat Activity</div>
                      <div className={styles.historyTitle}>Recent activity</div>
                      <div className={styles.historySub}>A quieter view of bookings, garage updates, and saved vehicles.</div>
                    </div>

                    {vehicleActivity.length > 0 ? (
                      <div className={styles.historyList}>
                        {vehicleActivity.map((item) => (
                          <div key={item.id} className={styles.historyItem}>
                            <div className={styles.historyIcon}><AppIcon code={item.icon} size={18} /></div>
                            <div>
                              <div className={styles.historyItemTitle}>{item.title}</div>
                              <div className={styles.historyItemMeta}>{item.meta}</div>
                              <div className={styles.historyItemTime}>{formatActivityTime(item.at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.historyEmpty}>
                        <div style={{color:'var(--blue)',marginBottom:10,display:'flex',justifyContent:'center'}}><AppIcon code="AI" size={26} /></div>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:18,color:'var(--ink)',marginBottom:8}}>No history yet</div>
                        <div style={{fontSize:13,lineHeight:1.7}}>Once you add vehicles, book services, or receive alerts, your FlashMat timeline will appear here.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {pane === 'maintenance' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>Maintenance</div>
                <div className={styles.pageSub}>Choose a vehicle first, then review FlashMat suggestions and service history tailored to it.</div>
              </div>
            </div>
            <div className={styles.pad}>
              <div className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-hd">
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Step 1</div>
                    <div className="panel-title" style={{ fontSize: 22 }}>Choose a vehicle</div>
                    <div className={styles.muted} style={{ fontSize: 12 }}>FlashMat will focus maintenance guidance on the exact vehicle you want to review.</div>
                  </div>
                </div>
                <div className="panel-body">
                  {myVehicles.length > 0 ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                        {myVehicles.map((vehicle) => {
                          const isSelected = String(vehicle.id) === String(selectedMaintenanceVehicle?.id || '')
                          const vehicleImage = vehicle.image_url || vehicle.photo_url || '/vehicle-fallback.svg'
                          return (
                            <button
                              key={vehicle.id}
                              type="button"
                              onClick={() => setSelectedMaintenanceVehicleId(String(vehicle.id))}
                              style={{
                                textAlign: 'left',
                                borderRadius: 16,
                                border: `1px solid ${isSelected ? 'rgba(37,99,235,.32)' : 'var(--border)'}`,
                                background: isSelected ? 'linear-gradient(180deg, rgba(59,130,246,.12), rgba(59,130,246,.04))' : 'var(--bg3)',
                                padding: 12,
                                display: 'grid',
                                gap: 10,
                                boxShadow: isSelected ? '0 12px 28px rgba(28, 76, 167, .12)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                                  <span style={{ width: 84, height: 62, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(37,99,235,.14)', background: 'rgba(37,99,235,.06)', flexShrink: 0 }}>
                                    <img
                                      src={vehicleImage}
                                      alt={`${vehicle.make} ${vehicle.model}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  </span>
                                  <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.08 }}>
                                      {vehicle.make} {vehicle.model}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink2)', marginTop: 4 }}>
                                      {vehicle.year}{vehicle.plate ? ` • ${vehicle.plate}` : ''}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink3)', marginTop: 6, lineHeight: 1.5 }}>
                                      {vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km tracked` : 'Mileage not added yet'}{vehicle.flash_score ? ` • ${vehicle.flash_score}% FlashScore` : ''}
                                    </span>
                                  </span>
                                </span>
                                {isSelected ? <span className="badge badge-blue">Active</span> : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className={styles.historyEmpty}>
                      <div style={{ color: 'var(--blue)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}><AppIcon code="VH" size={26} /></div>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>Add a vehicle to begin</div>
                      <div style={{ fontSize: 14, lineHeight: 1.7 }}>Maintenance is organized vehicle by vehicle so FlashMat can track recommendations and history accurately.</div>
                      <button className="btn btn-blue" style={{ marginTop: 16 }} onClick={openAddVehicleModal}>Add vehicle</button>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.g2} style={{alignItems:'start'}}>
                  <div className="panel">
                    <div className="panel-hd">
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap', width:'100%' }}>
                        <div>
                        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Step 2</div>
                        <div className="panel-title" style={{ fontSize: 21 }}>Maintenance suggestions</div>
                        <div className={styles.muted}>
                          {selectedMaintenanceVehicle
                            ? `Recommendations tuned for ${selectedMaintenanceVehicle.make} ${selectedMaintenanceVehicle.model}.`
                            : 'FlashMat builds recommendations from your garage, mileage, and recent activity.'}
                        </div>
                        </div>
                        {selectedMaintenanceVehicle ? (
                          <button className="btn btn-blue" onClick={() => openBooking()}>Book now</button>
                        ) : null}
                      </div>
                    </div>
                    <div className="panel-body">
                      {(maintenanceItems.length > 0 ? maintenanceItems : [{icon:'ME',title:'Add a vehicle to unlock maintenance intelligence',meta:'FlashMat will personalize reminders per vehicle.',detail:'Mileage, model, and service activity help generate better recommendations.'}]).map(item => (
                        <div key={item.title} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:16,padding:14,display:'flex',gap:12,marginBottom:10,alignItems:'flex-start'}}>
                          <span style={{color:'var(--blue)',display:'inline-flex',marginTop:2}}><AppIcon code={item.icon} size={20} /></span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:5}}>{item.title}</div>
                          <div style={{fontSize:12,color:'var(--ink2)',marginBottom:5}}>{item.meta}</div>
                          <div style={{fontSize:11,color:'var(--ink3)',lineHeight:1.65}}>{item.detail}</div>
                        </div>
                        <button className="btn" style={{fontSize:12}} onClick={() => myVehicles.length ? openBooking() : openAddVehicleModal()}>{myVehicles.length ? 'Book' : 'Add vehicle'}</button>
                      </div>
                    ))}
                  </div>
                </div>
                  <div className={styles.historyCard}>
                    <div className={styles.historyHeader}>
                      <div className={styles.historyEyebrow}>FlashMat activity</div>
                      <div className={styles.historyTitle}>Service history</div>
                      <div className={styles.historySub}>
                        {selectedMaintenanceVehicle
                          ? `Completed and upcoming work for ${selectedMaintenanceVehicle.make} ${selectedMaintenanceVehicle.model}.`
                          : 'Track completed and upcoming work across the vehicles in your client profile.'}
                      </div>
                    </div>

                    {vehicleServiceHistory.length > 0 ? (
                      <div className={styles.historyList}>
                        {vehicleServiceHistory.map((entry) => (
                          <div key={entry.id} className={styles.historyItem}>
                            <div className={styles.historyIcon}><AppIcon code={entry.icon} size={18} /></div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                                <div className={styles.historyItemTitle}>{entry.title}</div>
                                <span className={`badge ${entry.statusClass}`}>{entry.statusLabel}</span>
                              </div>
                              <div className={styles.historyItemMeta}>{entry.meta}</div>
                              <div className={styles.historyItemTime}>{entry.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.historyEmpty}>
                        <div style={{color:'var(--blue)',marginBottom:10,display:'flex',justifyContent:'center'}}><AppIcon code="RS" size={24} /></div>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:18,color:'var(--ink)',marginBottom:8}}>No service history yet</div>
                        <div style={{fontSize:13,lineHeight:1.7}}>
                          {selectedMaintenanceVehicle
                            ? `Your booked services for ${selectedMaintenanceVehicle.make} ${selectedMaintenanceVehicle.model} will appear here once you schedule maintenance or roadside work through FlashMat.`
                            : 'Your booked services will appear here once you schedule maintenance or roadside work through FlashMat.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {pane === 'doctor' && (
          <div style={{ flex: 1, minHeight: 'calc(100vh - 74px)' }}>
            <VehicleDoctor fullBleed userName={name} />
          </div>
        )}

        {pane === 'flashfix' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>FlashFix</div>
                <div className={styles.pageSub}>Create an urgent request without leaving the client dashboard, then follow it from bookings and alerts.</div>
              </div>
              <button className="btn btn-green" onClick={launchFlashFixFromPane}>Send request</button>
            </div>
            <div className={styles.pad}>
              <div className={styles.g2} style={{ alignItems:'start' }}>
                <div className="panel">
                  <div className="panel-hd">
                    <div>
                      <div style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink3)', marginBottom:6 }}>Step 1</div>
                      <div className="panel-title" style={{ fontSize:21 }}>What is happening?</div>
                      <div className={styles.muted}>Pick a quick case or describe the issue, then confirm the location details.</div>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                      {FLASHFIX_QUICK_CASES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="btn"
                          style={{
                            background: flashFixQuickCase === item ? 'var(--blue-bg)' : 'var(--bg2)',
                            borderColor: flashFixQuickCase === item ? 'rgba(37,99,235,.28)' : 'var(--border)',
                            color: 'var(--ink)',
                          }}
                          onClick={() => chooseFlashFixQuickCase(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <div style={{ display:'grid', gap:10 }}>
                      <textarea
                        value={flashFixDescription}
                        onChange={(event) => setFlashFixDescription(event.target.value)}
                        placeholder="Ex: the car does not start and I am in my building parking lot in Montreal"
                        style={{ width:'100%', minHeight:130, borderRadius:18, border:'1px solid var(--border)', padding:16, fontSize:14, lineHeight:1.6, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', color:'var(--ink)', background:'var(--bg2)' }}
                      />
                      <input
                        className="form-input"
                        value={flashFixLocation}
                        onChange={(event) => setFlashFixLocation(event.target.value)}
                        placeholder="Location"
                      />
                      <input
                        className="form-input"
                        value={flashFixLocationDetails}
                        onChange={(event) => setFlashFixLocationDetails(event.target.value)}
                        placeholder="Extra details: parking level, door code, apartment, landmark..."
                      />
                    </div>
                    <div style={{ marginTop:10, fontSize:12, color: flashFixGeoStatus === 'ready' ? 'var(--green)' : 'var(--ink2)', lineHeight:1.6 }}>
                      {flashFixGeoLabel}
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-hd">
                    <div>
                      <div style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink3)', marginBottom:6 }}>Step 2</div>
                      <div className="panel-title" style={{ fontSize:21 }}>Suggested FlashFix service</div>
                      <div className={styles.muted}>FlashMat chooses the most relevant intervention and the nearest available provider type.</div>
                    </div>
                  </div>
                  <div className="panel-body">
                    {!resolvedFlashFixCase ? (
                      <div className={styles.historyEmpty}>
                        <div style={{ color:'var(--blue)', marginBottom:10, display:'flex', justifyContent:'center' }}><AppIcon code="FX" size={26} /></div>
                        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)', marginBottom:8 }}>Ready to dispatch</div>
                        <div style={{ fontSize:12, lineHeight:1.7 }}>Choose a quick case or describe the issue and FlashMat will suggest the right urgent service here.</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom:14 }}>
                          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)', marginBottom:6 }}>{resolvedFlashFixCase.label}</div>
                          <div style={{ fontSize:12, color:'var(--ink2)', lineHeight:1.7 }}>{resolvedFlashFixCase.summary}</div>
                        </div>
                        <div style={{ display:'grid', gap:10 }}>
                          {resolvedFlashFixCase.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedFlashFixOptionId(option.id)}
                              style={{
                                textAlign:'left',
                                borderRadius:16,
                                border: selectedFlashFixOptionId === option.id ? '2px solid rgba(37,99,235,.32)' : '1px solid var(--border)',
                                background: selectedFlashFixOptionId === option.id ? 'var(--blue-bg)' : 'var(--bg2)',
                                padding:14,
                                cursor:'pointer',
                              }}
                            >
                              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', marginBottom:6 }}>
                                <div style={{ fontWeight:800, color:'var(--ink)', fontSize:14 }}>{option.title}</div>
                                <span className="badge badge-blue">{option.price}</span>
                              </div>
                              <div style={{ fontSize:12, color:'var(--ink2)' }}>{option.providerType} · ETA {option.eta}</div>
                            </button>
                          ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10, marginTop:14 }}>
                          <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:14, padding:12 }}>
                            <div style={{ fontSize:11, color:'var(--ink3)', marginBottom:4 }}>Matched provider</div>
                            <div style={{ fontWeight:800, color:'var(--ink)' }}>{matchedFlashFixProvider?.name || 'Dispatching through FlashMat'}</div>
                          </div>
                          <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:14, padding:12 }}>
                            <div style={{ fontSize:11, color:'var(--ink3)', marginBottom:4 }}>Estimated arrival</div>
                            <div style={{ fontWeight:800, color:'var(--ink)' }}>{selectedFlashFixOption?.eta || 'To confirm'}</div>
                          </div>
                        </div>
                        {activeFlashFixRequests.length > 0 ? (
                          <div style={{ marginTop:14, background:'linear-gradient(135deg, rgba(37,99,235,.10), rgba(37,99,235,.03))', border:'1px solid rgba(37,99,235,.16)', borderRadius:16, padding:14 }}>
                            <div style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink3)', marginBottom:6 }}>Live request</div>
                            <div style={{ fontFamily:'var(--display)', fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>{activeFlashFixRequests[0].issueLabel}</div>
                            <div style={{ fontSize:12, color:'var(--ink2)' }}>Current status: {getFlashFixStatusMeta(activeFlashFixRequests[0].status).label}</div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {pane === 'marketplace' && <Marketplace portal="client" />}

        {pane === 'flashscore' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>FlashScore™</div>
                <div className={styles.pageSub}>A clearer health snapshot for every vehicle, with the strongest and weakest parameters highlighted first.</div>
              </div>
            </div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {(flashScoreCards.length > 0 ? flashScoreCards : [{make:'Add',model:'a vehicle',year:'',score:0,items:[],image:'/vehicle-fallback.svg',plate:'',mileage:''}]).map(v => (
                  <div key={`${v.make}-${v.model}-${v.year}`} className="panel">
                    <div className="panel-hd">
                      <div className="panel-title">FS {v.make} {v.model} {v.year}</div>
                      <span className="badge badge-green">{v.score || '—'}{v.score ? '%' : ''}</span>
                    </div>
                    <div className="panel-body">
                      <div style={{display:'grid',gridTemplateColumns:'88px minmax(0, 1fr) auto',gap:14,alignItems:'center',marginBottom:14}}>
                        <div style={{width:88,height:64,borderRadius:16,overflow:'hidden',border:'1px solid rgba(37,99,235,.10)',background:'rgba(37,99,235,.04)'}}>
                          <img src={v.image} alt={`${v.make} ${v.model}`} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:10,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--ink3)',marginBottom:4}}>Vehicle health</div>
                          <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,color:'var(--ink)',lineHeight:1.05}}>{v.make} {v.model}</div>
                          <div style={{fontSize:11,color:'var(--ink2)',marginTop:4}}>
                            {[v.year, v.plate, v.mileage ? `${Number(v.mileage).toLocaleString()} km` : null].filter(Boolean).join(' • ') || 'Add more vehicle details for richer scoring.'}
                          </div>
                        </div>
                        <div style={{display:'grid',justifyItems:'end',gap:8}}>
                          <div style={{width:64,height:64,borderRadius:'50%',border:'4px solid rgba(37,99,235,.95)',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',boxShadow:'0 10px 18px rgba(37,99,235,.08)'}}>
                            <span style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,color:'var(--blue)'}}>{v.score || '—'}</span>
                          </div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
                            <span style={{padding:'6px 10px',borderRadius:999,background:'rgba(34,197,94,.08)',color:'var(--green)',fontSize:11,fontWeight:800}}>
                              {v.items[0]?.[0] || '—'} {v.items[0]?.[1] ? `${v.items[0][1]}%` : ''}
                            </span>
                            <span style={{padding:'6px 10px',borderRadius:999,background:'rgba(245,158,11,.10)',color:'var(--amber)',fontSize:11,fontWeight:800}}>
                              {v.items[v.items.length - 1]?.[0] || '—'} {v.items[v.items.length - 1]?.[1] ? `${v.items[v.items.length - 1][1]}%` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'grid',gap:8}}>
                        {v.items.map(([l,val,c]) => (
                          <div key={l} style={{background:'rgba(255,255,255,.76)',border:'1px solid rgba(120,171,218,0.14)',borderRadius:14,padding:'10px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:6}}>
                              <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                                <span style={{width:8,height:8,borderRadius:'50%',background:`var(--${c})`,flexShrink:0}} />
                                <span style={{fontWeight:700,color:'var(--ink)',fontSize:13}}>{l}</span>
                              </div>
                              <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:800,color:`var(--${c})`}}>{val}%</span>
                            </div>
                            <div className="prog-bar" style={{height:8,borderRadius:999,background:'rgba(15,30,61,.06)'}}>
                              <div className="prog-fill" style={{width:`${val}%`,background:`var(--${c})`,borderRadius:999}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      {v.items.length === 0 && <div style={{textAlign:'center',fontSize:12,color:'var(--ink3)'}}>Add a vehicle to calculate your FlashScore.</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'notifications' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Alerts</div></div></div>
            <div className={styles.pad}>
              {latestFlashFixEvents.length > 0 && (
                <div className="panel" style={{ marginBottom: 14 }}>
                  {latestFlashFixEvents.map((event, index, arr) => {
                    const meta = getFlashFixStatusMeta(event.status)
                    return (
                      <div key={event.id} style={{display:'flex',gap:10,padding:'12px 14px',borderBottom:index<arr.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                        <div style={{width:34,height:34,borderRadius:8,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🚨</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{getClientSafeFlashFixEventLabel(event.label, event.status)}</div>
                          <div style={{fontSize:11,color:'var(--ink2)'}}>{event.issueLabel}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',marginTop:3}}>{formatFlashFixTime(event.at)}</div>
                        </div>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="panel">
                {notifications.map((n,i,arr) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'12px 14px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                    <div style={{width:34,height:34,borderRadius:8,background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--blue)'}}>{typeof n.icon === 'string' && n.icon.length <= 3 ? <AppIcon code={n.icon} size={16} /> : (n.icon || <AppIcon code="AL" size={16} />)}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{n.title}</div><div style={{fontSize:11,color:'var(--ink2)'}}>{n.body}</div><div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',marginTop:3}}>{formatFlashFixTime(n.created_at)}</div></div>
                    <span className="badge badge-blue">{n.type || 'Info'}</span>
                  </div>
                ))}
                {notifications.length === 0 && latestFlashFixEvents.length === 0 && (
                  <div style={{padding:'16px 14px',fontSize:12,color:'var(--ink3)'}}>No alerts right now.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {pane === 'bookings' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>My Bookings</div></div><button className="btn btn-green" onClick={() => openBooking()}>+ New</button></div>
            <div className={styles.pad}>
              {bookings.length > 0 && (
                <div style={{ display:'grid', gap:12, marginBottom:16 }}>
                  {bookings.map((booking) => (
                    <div key={booking.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:4}}>{booking.service}</div>
                          <div style={{fontSize:12,color:'var(--ink2)'}}>{booking.providerName}</div>
                        </div>
                        <span className={`badge ${booking.statusClass}`}>{booking.statusLabel}</span>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <span className="badge badge-gray">{booking.vehicleLabel}</span>
                        <span className="badge badge-blue">{booking.datetimeLabel}</span>
                        <span className="badge badge-green">{booking.priceLabel}</span>
                      </div>
                      {booking.notes && <div style={{marginTop:10,fontSize:11,color:'var(--ink2)'}}>📝 {booking.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
              {activeFlashFixRequests.length > 0 && (
                <div style={{background:'linear-gradient(135deg,#0f1e3d 0%, #1a3a8f 100%)',borderRadius:18,padding:18,marginBottom:16,color:'#fff',boxShadow:'var(--shadow)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:11,letterSpacing:1.4,textTransform:'uppercase',color:'rgba(255,255,255,.72)',marginBottom:6}}>Live FlashFix</div>
                      <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,lineHeight:1.1}}>{activeFlashFixRequests[0].issueLabel}</div>
                    </div>
                    <span className={`badge ${getFlashFixStatusMeta(activeFlashFixRequests[0].status).cls}`}>{getFlashFixStatusMeta(activeFlashFixRequests[0].status).label}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:10}}>
                    {[['Provider', activeFlashFixRequests[0].status==='pending' ? 'Matching in progress' : 'Assigned by FlashMat'],['Option',activeFlashFixRequests[0].selectedOption?.title||'FlashFix'],['ETA',activeFlashFixRequests[0].selectedOption?.eta||'to be confirmed']].map(([label,val]) => (
                      <div key={label} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:12}}>
                        <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginBottom:4}}>{label}</div>
                        <div style={{fontWeight:700,fontSize:14}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {flashFixRequests.filter(r => r.channel==='flashfix').length > 0 && (
                <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
                  {flashFixRequests.filter(r => r.channel==='flashfix').map((request) => {
                    const meta = getFlashFixStatusMeta(request.status)
                    const latestEvent = request.events?.[request.events.length - 1]
                    const timeline = getFlashFixStageProgress(request.status)
                    return (
                      <div key={request.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:10}}>
                          <div>
                            <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:4}}>{request.issueLabel}</div>
                            <div style={{fontSize:12,color:'var(--ink2)',lineHeight:1.6}}>{request.description}</div>
                          </div>
                          <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                          <span className="badge badge-gray">{request.location||'Location to be confirmed'}</span>
                          <span className="badge badge-blue">{request.selectedOption?.title||'Option FlashFix'}</span>
                          <span className="badge badge-green">{request.selectedOption?.price||'Price to be confirmed'}</span>
                          <span className="badge badge-amber">ETA {request.selectedOption?.eta||'to be confirmed'}</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(0,1fr))',gap:8,marginTop:12}}>
                          {timeline.map((item) => (
                            <div key={item.step} style={{textAlign:'center'}}>
                              <div style={{width:28,height:28,borderRadius:999,margin:'0 auto 6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:item.done?'#fff':'var(--ink3)',background:item.current?'var(--blue)':item.done?'var(--green)':'var(--bg3)',border:item.current?'none':'1px solid var(--border)'}}>
                                {item.done ? '•' : ''}
                              </div>
                              <div style={{fontSize:10,color:item.current?'var(--ink)':'var(--ink3)',fontWeight:item.current?700:500}}>{getTimelineLabel(item.step)}</div>
                            </div>
                          ))}
                        </div>
                        {latestEvent && (
                          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--ink2)'}}>
                            Latest update: {getClientSafeFlashFixEventLabel(latestEvent.label, request.status)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {flashFixRequests.length === 0 && bookings.length === 0 && (
                <div style={{textAlign:'center',padding:40,color:'var(--ink3)'}}>
                  <div style={{color:'var(--blue)',marginBottom:12,display:'flex',justifyContent:'center'}}><AppIcon code="RS" size={40} /></div>
                  <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:8}}>No bookings yet</div>
                  <button className="btn btn-green btn-lg" onClick={() => go('search')}>Find a provider →</button>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className={styles.bottomNav}>
          {[['dashboard','TB','Home'],['bookings','RS','Bookings'],['search','SV','Services'],['vehicles','VH','Cars'],['notifications','AL','Alerts']].map(([id,icon,label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{display:'inline-flex'}}><AppIcon code={icon} size={18} /></span><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {bookingModal && (
        <BookingModal providers={providers} vehicles={myVehicles} initialProvider={selectedBookingProvider}
          onClose={() => { setBookingModal(false); setSelectedBookingProvider(null) }}
          onConfirm={handleBookingConfirm}
        />
      )}
      <FlashAI portal="client" userName={name} />
      {vehicleModalState.open && (
        <AddVehicleModal
          mode={vehicleModalState.mode}
          vehicle={vehicleModalState.vehicle}
          onClose={closeVehicleModal}
          onAdd={handleVehicleAdded}
          onSave={handleVehicleSaved}
        />
      )}
      {sellVehicleState.open && (
        <SellVehicleModal
          vehicle={sellVehicleState.vehicle}
          existingListing={sellVehicleState.listing}
          onClose={closeSellVehicleModal}
          onCreated={handleVehicleListed}
          onRemoved={handleVehicleListingRemoved}
        />
      )}
      {clientProfileModalOpen && <ClientProfileModal onClose={() => setClientProfileModalOpen(false)} />}
      {walletModalOpen && <WalletModal onClose={() => setWalletModalOpen(false)} />}
      {helpSupportModalOpen && <HelpSupportModal onClose={() => setHelpSupportModalOpen(false)} />}
      {securityModalOpen && <SecurityPrivacyModal onClose={() => setSecurityModalOpen(false)} />}
      {notificationCenterOpen && user && (
        <FloatingPanelBoundary onClose={() => setNotificationCenterOpen(false)}>
          <NotificationCenterModal
            open={notificationCenterOpen}
            onClose={() => setNotificationCenterOpen(false)}
            user={user}
            onOpenMessages={(threadId) => openMessageCenter(threadId)}
          />
        </FloatingPanelBoundary>
      )}
    </div>
  )
}
