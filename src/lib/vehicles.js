import { supabase } from './supabase'

const VEHICLE_EXTRAS_STORAGE_KEY = 'flashmat-vehicle-extras'
const VEHICLE_RECORDS_STORAGE_KEY = 'flashmat-vehicle-records'

function getVehicleExtrasStorageKey(userId) {
  return `${VEHICLE_EXTRAS_STORAGE_KEY}:${userId || 'anonymous'}`
}

function getVehicleRecordsStorageKey(userId) {
  return `${VEHICLE_RECORDS_STORAGE_KEY}:${userId || 'anonymous'}`
}

function readVehicleExtrasMap(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(getVehicleExtrasStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function readVehicleRecordsMap(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(getVehicleRecordsStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

export function saveVehicleRecord(userId, vehicle) {
  if (!userId || !vehicle?.id) return
  const current = readVehicleRecordsMap(userId)
  current[vehicle.id] = vehicle
  window.localStorage.setItem(getVehicleRecordsStorageKey(userId), JSON.stringify(current))
}

export function removeVehicleExtras(userId, vehicleId) {
  if (!vehicleId) return
  const current = readVehicleExtrasMap(userId)
  if (!current[vehicleId]) return
  delete current[vehicleId]
  window.localStorage.setItem(getVehicleExtrasStorageKey(userId), JSON.stringify(current))
}

export function removeVehicleRecord(userId, vehicleId) {
  if (!vehicleId) return
  const current = readVehicleRecordsMap(userId)
  if (!current[vehicleId]) return
  delete current[vehicleId]
  window.localStorage.setItem(getVehicleRecordsStorageKey(userId), JSON.stringify(current))
}

export function mergeVehicleExtras(vehicle, userId) {
  const extrasMap = readVehicleExtrasMap(userId)
  const extras = extrasMap[vehicle?.id] || {}
  return {
    ...vehicle,
    vin: vehicle?.vin || vehicle?.serial_number || extras.vin || extras.serial_number || '',
    serial_number: vehicle?.serial_number || vehicle?.vin || extras.serial_number || extras.vin || '',
    mileage: vehicle?.mileage ?? extras.mileage ?? '',
    image_url: vehicle?.image_url || vehicle?.photo_url || extras.image_url || extras.photo_url || '',
    photo_url: vehicle?.photo_url || vehicle?.image_url || extras.photo_url || extras.image_url || '',
  }
}

export async function fetchClientVehicles(userId) {
  const { data } = await supabase.from('vehicles').select('*').eq('owner_id', userId)

  const ownedVehicles = (data || []).filter((vehicle) => String(vehicle.owner_id || '') === String(userId))
  const localVehicles = Object.values(readVehicleRecordsMap(userId))
    .filter((vehicle) => String(vehicle?.owner_id || '') === String(userId))
    .map((vehicle) => mergeVehicleExtras(vehicle, userId))

  const mergedVehicles = new Map()

  ownedVehicles
    .map((vehicle) => mergeVehicleExtras(vehicle, userId))
    .forEach((vehicle) => { mergedVehicles.set(String(vehicle.id), vehicle) })

  localVehicles.forEach((vehicle) => {
    if (!mergedVehicles.has(String(vehicle.id))) {
      mergedVehicles.set(String(vehicle.id), vehicle)
    }
  })

  return Array.from(mergedVehicles.values())
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
}

export async function releaseVehicleFromOwner(vehicleId, userId) {
  const { error } = await supabase
    .from('vehicles')
    .update({ owner_id: null })
    .eq('id', vehicleId)
    .eq('owner_id', userId)
  return { error }
}

export async function deleteVehicle(vehicleId, userId) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('owner_id', userId)
  return { error }
}
