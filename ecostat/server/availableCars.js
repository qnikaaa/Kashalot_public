import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60)
const AVAILABLE_CARS_API_URL = process.env.AVAILABLE_CARS_API_URL || 'https://ecoskat.bumerang.tech/api/v7/avaliableCars'
const AVAILABLE_CARS_AUTH_HEADER = process.env.AVAILABLE_CARS_AUTH_HEADER || 'x-api-key'

let cache = {
  data: null,
  expiresAt: 0,
  fetchedAt: null,
  source: null,
}

let colorLookupCache = null

export function getCacheInfo() {
  return {
    hasData: Array.isArray(cache.data),
    fetchedAt: cache.fetchedAt,
    source: cache.source,
    ttlSeconds: CACHE_TTL_SECONDS,
  }
}

export async function getScootersWithCache() {
  const now = Date.now()
  if (cache.data && cache.expiresAt > now) {
    return { data: cache.data, cacheStatus: 'HIT' }
  }

  const scooters = await fetchScootersFromAvailableCarsApi()
  cache = {
    data: scooters,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
    fetchedAt: new Date().toISOString(),
    source: 'availableCars',
  }

  return { data: scooters, cacheStatus: 'MISS' }
}

async function fetchScootersFromAvailableCarsApi() {
  const headers = {
    Accept: 'application/json',
  }

  const token = process.env.AVAILABLE_CARS_API_TOKEN
  if (token) {
    headers[AVAILABLE_CARS_AUTH_HEADER] = token
  }

  const response = await fetch(AVAILABLE_CARS_API_URL, { headers })
  if (!response.ok) {
    throw new Error(`availableCars request failed: ${response.status}`)
  }

  const payload = await response.json()
  if (payload?.code !== 0 || !Array.isArray(payload.cars)) {
    throw new Error('availableCars returned unexpected format')
  }

  const colorLookup = await getColorLookup()
  return payload.cars
    .map((car) => normalizeAvailableCar(car, colorLookup))
    .filter((scooter) =>
      scooter.id > 0 &&
      scooter.latitude !== 0 &&
      scooter.longitude !== 0
    )
}

function normalizeAvailableCar(car, colorLookup) {
  const qr = String(car?.gosnomer || '').trim()
  const brand = String(car?.model?.brand || '').trim()
  const modelName = String(car?.model?.model || '').trim()
  const model = [brand, modelName].filter(Boolean).join(' ')

  return {
    id: Number.parseInt(String(car?.id ?? '').replace(/[^0-9]/g, ''), 10) || 0,
    qr,
    model,
    fuelPercent: parsePercent(car?.fuel),
    online: true,
    speed: '',
    signalLevel: '',
    satellites: '',
    voltage: '',
    statusGroup: 'на линии',
    updated: '',
    latitude: parseNumber(car?.lat),
    longitude: parseNumber(car?.lon),
    geozone: '',
    company: '',
    color: colorLookup.get(normalizeQrKey(qr)) || '',
    roller: '',
    modification: '',
  }
}

function parseNumber(value) {
  if (value == null) return 0
  const normalized = String(value).replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parsePercent(value) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

async function getColorLookup() {
  if (colorLookupCache) return colorLookupCache

  try {
    const csv = await readFile(resolve(process.cwd(), 'public/scooters.csv'), 'utf8')
    colorLookupCache = parseColorLookupCsv(csv)
  } catch {
    colorLookupCache = new Map()
  }

  return colorLookupCache
}

function parseColorLookupCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean)
  const headers = parseCsvLine(lines[0] || '')
  const qrIndex = headers.indexOf('qr')
  const colorIndex = headers.indexOf('color')
  const lookup = new Map()

  if (qrIndex < 0 || colorIndex < 0) return lookup

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const qr = String(cells[qrIndex] || '').trim()
    const color = String(cells[colorIndex] || '').trim()
    if (qr && color) {
      lookup.set(normalizeQrKey(qr), color)
    }
  }

  return lookup
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

function normalizeQrKey(qr) {
  return String(qr || '').replace(/\s+/g, '').toUpperCase()
}
