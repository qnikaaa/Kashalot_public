import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60)
const DATA_TABLE_PAGE_SIZE = Number(process.env.DATA_TABLE_PAGE_SIZE || 500)
const DATA_TABLE_SEARCH_PATH = '/admin/car/search?'
const AVAILABLE_CARS_API_URL = process.env.AVAILABLE_CARS_API_URL || 'https://ecoskat.bumerang.tech/api/v7/avaliableCars'
const AVAILABLE_CARS_AUTH_HEADER = process.env.AVAILABLE_CARS_AUTH_HEADER || 'x-api-key'

let cache = {
  data: null,
  expiresAt: 0,
  fetchedAt: null,
  source: null,
}

let colorLookupCache = null

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function logStep(message) {
  console.log(`[proxy] ${message}`)
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

function isYes(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['да', 'yes', 'true', '1', 'online'].includes(normalized)
}

function normalizeHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

const FIELD_ALIASES = {
  id: ['id', 'ид', 'номер'],
  qr: ['qr', 'qr_код', 'qr-код'],
  model: ['model', 'модель'],
  latitude: ['latitude', 'lat', 'широта'],
  longitude: ['longitude', 'lng', 'lon', 'долгота'],
  fuel_percent: ['fuel_percent', 'battery', 'заряд', 'батарея'],
  speed: ['speed', 'скорость'],
  signal_level: ['signal_level', 'signal', 'сигнал'],
  satellites: ['satellites', 'satellite', 'спутники'],
  voltage: ['voltage', 'напряжение'],
  status_group: ['status_group', 'статус', 'группа_статуса'],
  online: ['online', 'онлайн', 'в_сети'],
  color: ['color', 'цвет'],
  roller: ['roller', 'роллер'],
  modification: ['modification', 'модификация'],
  company: ['company', 'компания'],
  geozone: ['geozone', 'геозона'],
  idle_time: ['idle_time', 'простой'],
  updated: ['updated', 'обновлено', 'последнее_обновление'],
}

const SAFE_DATATABLE_ARRAY_COLUMNS = new Map([
  [0, 'id'],
  [3, 'model'],
  [4, 'fuel_percent'],
  [5, 'online'],
  [12, 'speed'],
  [13, 'signal_level'],
  [14, 'satellites'],
  [15, 'voltage'],
  [18, 'qr'],
  [19, 'status_group'],
  [22, 'updated'],
  [24, 'latitude'],
  [25, 'longitude'],
  [35, 'idle_time'],
  [37, 'company'],
  [42, 'color'],
  [43, 'roller'],
  [44, 'modification'],
])

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

  const { scooters, source } = await fetchScootersPrimaryWithFallback()
  cache = {
    data: scooters,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
    fetchedAt: new Date().toISOString(),
    source,
  }

  return { data: scooters, cacheStatus: 'MISS' }
}

async function fetchScootersPrimaryWithFallback() {
  try {
    return {
      scooters: await fetchScootersFromAvailableCarsApi(),
      source: 'availableCars',
    }
  } catch (error) {
    console.error('availableCars API failed, falling back to admin proxy:', error.message)
    return {
      scooters: await fetchScootersFromAdmin(),
      source: 'adminProxyFallback',
    }
  }
}

async function fetchScootersFromAvailableCarsApi() {
  logStep('Requesting availableCars API')
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
  const scooters = payload.cars
    .map((car) => normalizeAvailableCar(car, colorLookup))
    .filter((scooter) =>
      scooter.id > 0 &&
      scooter.latitude !== 0 &&
      scooter.longitude !== 0
    )

  logStep(`Returning ${scooters.length} availableCars rows`)
  return scooters
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

export async function inspectColumns() {
  const username = requireEnv('ADMIN_USERNAME')
  const password = requireEnv('ADMIN_PASSWORD')
  const loginUrl = requireEnv('ADMIN_LOGIN_URL')
  const dataUrl = requireEnv('ADMIN_DATA_URL')

  const browser = await launchBrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(15000)

  try {
    await page.goto(loginUrl, { waitUntil: 'networkidle' })
    await loginIfNeeded(page, username, password)
    await page.goto(dataUrl, { waitUntil: 'networkidle' })
    await loginIfNeeded(page, username, password)

    const pageResult = await fetchDataTablePage(page, 1, 0, 1, {})
    const firstRow = Array.isArray(pageResult.data) ? pageResult.data[0] : null

    return {
      rowShape: Array.isArray(firstRow) ? 'array' : typeof firstRow,
      fieldsCount: Array.isArray(firstRow) ? firstRow.length : 0,
      columns: getSafeColumnPreview(firstRow),
    }
  } finally {
    await browser.close()
  }
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromiumPackage = await import('@sparticuz/chromium')
    const { chromium } = await import('playwright-core')
    const serverlessChromium = chromiumPackage.default

    return chromium.launch({
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      headless: serverlessChromium.headless,
    })
  }

  const { chromium } = await import('playwright')
  return chromium.launch({ headless: true })
}

function pick(row, field) {
  const aliases = FIELD_ALIASES[field] ?? [field]
  for (const alias of aliases) {
    const direct = row[alias]
    if (direct != null && direct !== '') return direct
  }
  return ''
}

function sanitizeRow(row) {
  const latitude = parseNumber(pick(row, 'latitude'))
  const longitude = parseNumber(pick(row, 'longitude'))

  return {
    id: Number.parseInt(String(pick(row, 'id')).replace(/[^0-9]/g, ''), 10) || 0,
    qr: String(pick(row, 'qr') || '').trim(),
    model: String(pick(row, 'model') || '').trim(),
    fuelPercent: parsePercent(pick(row, 'fuel_percent')),
    online: isYes(pick(row, 'online')),
    speed: String(pick(row, 'speed') || '').trim(),
    signalLevel: String(pick(row, 'signal_level') || '').trim(),
    satellites: String(pick(row, 'satellites') || '').trim(),
    voltage: String(pick(row, 'voltage') || '').trim(),
    statusGroup: String(pick(row, 'status_group') || '').trim(),
    updated: String(pick(row, 'updated') || '').trim(),
    latitude,
    longitude,
    geozone: String(pick(row, 'geozone') || '').trim(),
    _idleTime: String(pick(row, 'idle_time') || '').trim(),
    company: String(pick(row, 'company') || '').trim(),
    color: String(pick(row, 'color') || '').trim(),
    roller: String(pick(row, 'roller') || '').trim(),
    modification: String(pick(row, 'modification') || '').trim(),
  }
}

function sanitizeRows(rows) {
  return rows
    .map(sanitizeRow)
    .filter(isRentableToday)
    .map(({ _idleTime, ...scooter }) => scooter)
}

function isRentableToday(scooter) {
  return (
    scooter.id > 0 &&
    scooter.latitude !== 0 &&
    scooter.longitude !== 0 &&
    scooter.statusGroup === 'на линии' &&
    scooter.online === true &&
    !isLongIdle(scooter._idleTime)
  )
}

function isLongIdle(idleTime) {
  const value = String(idleTime || '').toLowerCase()
  return /месяц|месяца|месяцев|год|года|лет/.test(value)
}

async function loginIfNeeded(page, username, password) {
  let passwordInput = page.locator('input[type="password"]:visible').first()

  if ((await passwordInput.count()) === 0) {
    const usernameInput = await findEditableInput(
      page,
      'input[type="email"], input[name="username"], input[name*="user" i], input[name*="login" i], input[type="text"]:not(.select2-input)'
    )
    if (!usernameInput) return

    await usernameInput.fill(username)
    await submitCurrentLoginStep(page, usernameInput)
    passwordInput = page.locator('input[type="password"]:visible').first()
  }

  if ((await passwordInput.count()) === 0) return

  await passwordInput.fill(password)
  await submitCurrentLoginStep(page, passwordInput)
}

async function findEditableInput(page, selector) {
  const inputs = await page.locator(selector).all()
  for (const input of inputs) {
    if (await input.isVisible().catch(() => false) && await input.isEditable().catch(() => false)) {
      return input
    }
  }
  return null
}

async function submitCurrentLoginStep(page, fallbackInput) {
  const submitButton = page
    .locator('button[type="submit"], input[type="submit"], button:has-text("Войти"), button:has-text("Login")')
    .first()

  if ((await submitButton.count()) > 0) {
    await submitButton.click()
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined)
  } else {
    await fallbackInput.press('Enter')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined)
  }
}

async function fetchScootersFromAdmin() {
  const username = requireEnv('ADMIN_USERNAME')
  const password = requireEnv('ADMIN_PASSWORD')
  const loginUrl = requireEnv('ADMIN_LOGIN_URL')
  const dataUrl = requireEnv('ADMIN_DATA_URL')

  const browser = await launchBrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(15000)

  try {
    logStep('Opening login page')
    await page.goto(loginUrl, { waitUntil: 'networkidle' })
    logStep('Submitting login form')
    await loginIfNeeded(page, username, password)

    logStep('Opening admin car page')
    let adminCarResponse = await page.goto(dataUrl, { waitUntil: 'networkidle' })
    await loginIfNeeded(page, username, password)

    const passwordInputPresent = (await page.locator('input[type="password"]').count()) > 0
    if (!passwordInputPresent && page.url() !== dataUrl) {
      adminCarResponse = await page.goto(dataUrl, { waitUntil: 'networkidle' })
    }

    const loginDiagnostic = await getSafePageDiagnostic(page, adminCarResponse)

    if (loginDiagnostic.passwordInputPresent || loginDiagnostic.adminCarStatus === 401) {
      const error = new Error('Login did not complete')
      error.diagnostics = loginDiagnostic
      throw error
    }

    logStep('Requesting DataTables rows')
    const rawRows = await fetchDataTableRows(page, loginDiagnostic)
    logSafeRowsShape(rawRows)
    const normalizedRows = normalizeRawRows(rawRows)
    const scooters = sanitizeRows(normalizedRows)
    logStep(`Returning ${scooters.length} sanitized rows`)
    return scooters
  } finally {
    await browser.close()
  }
}

async function getSafePageDiagnostic(page, adminCarResponse = null) {
  const passwordInputPresent = (await page.locator('input[type="password"]').count()) > 0
  const csrfPresent = await page
    .locator('meta[name="csrf-token"]')
    .count()
    .then((count) => count > 0)
  const cookiesCount = (await page.context().cookies()).length

  return {
    currentUrl: page.url(),
    pageTitle: await page.title().catch(() => ''),
    passwordInputPresent,
    adminCarStatus: adminCarResponse?.status?.() ?? null,
    csrfPresent,
    cookiesCount,
  }
}

async function fetchDataTableRows(page, baseDiagnostic) {
  const firstPage = await fetchDataTablePage(page, 1, 0, 1, baseDiagnostic)
  const total = Number(firstPage.recordsTotal ?? firstPage.recordsFiltered ?? 0)
  if (!Number.isFinite(total) || total < 1) return []

  const allRows = []
  let draw = 2
  for (let start = 0; start < total; start += DATA_TABLE_PAGE_SIZE) {
    const length = Math.min(DATA_TABLE_PAGE_SIZE, total - start)
    const pageResult = await fetchDataTablePage(page, draw, start, length, baseDiagnostic)
    allRows.push(...(Array.isArray(pageResult.data) ? pageResult.data : []))
    draw += 1
  }

  return allRows
}

async function fetchDataTablePage(page, draw, start, length, baseDiagnostic) {
  const result = await page.evaluate(
    async ({ path, draw, start, length }) => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      const headers = {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      }

      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const body = new URLSearchParams({
        draw: String(draw),
        start: String(start),
        length: String(length),
        'search[value]': '',
        'search[regex]': 'false',
      })

      if (csrfToken) {
        body.set('_token', csrfToken)
      }

      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body,
      })

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          csrfPresent: Boolean(csrfToken),
        }
      }

      return {
        ok: true,
        data: await response.json(),
      }
    },
    { path: DATA_TABLE_SEARCH_PATH, draw, start, length }
  )

  if (!result.ok) {
    const currentDiagnostic = await getSafePageDiagnostic(page)
    const error = new Error(`DataTables request failed: ${result.status}`)
    error.diagnostics = {
      ...baseDiagnostic,
      ...currentDiagnostic,
      csrfPresent: result.csrfPresent,
    }
    throw error
  }

  return result.data
}

function normalizeRawRows(rawRows) {
  return rawRows.map((row) => {
    if (Array.isArray(row)) return normalizeArrayRow(row)
    return normalizeObjectRow(row)
  })
}

function logSafeRowsShape(rawRows) {
  const first = rawRows[0]
  const shape = Array.isArray(first) ? 'array' : typeof first
  const size = Array.isArray(first) ? first.length : first && typeof first === 'object' ? Object.keys(first).length : 0
  const safeKeys = first && !Array.isArray(first) && typeof first === 'object'
    ? Object.keys(first).filter((key) => {
        const normalized = normalizeHeader(key)
        return Object.values(FIELD_ALIASES).some((aliases) => aliases.includes(normalized))
      })
    : []

  logStep(`Raw rows: ${rawRows.length}, first row shape: ${shape}, fields count: ${size}`)
  if (safeKeys.length > 0) {
    logStep(`Safe-looking keys: ${safeKeys.join(', ')}`)
  }
}

function normalizeArrayRow(row) {
  return Object.fromEntries(
    Array.from(SAFE_DATATABLE_ARRAY_COLUMNS, ([index, key]) => [key, cleanCell(row[index])])
  )
}

function normalizeObjectRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), cleanCell(value)])
  )
}

function cleanCell(value) {
  if (value == null) return ''
  const withoutHtml = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  return withoutHtml.replace(/\s+/g, ' ').trim()
}

function looksSensitiveValue(value) {
  const text = String(value ?? '').trim()
  const digits = text.replace(/\D/g, '')
  return digits.length >= 11 || /cookie|token|bearer|password|парол/i.test(text)
}

function getSafeColumnPreview(row) {
  if (!Array.isArray(row)) return []

  return row
    .map((value, index) => ({ index, value: cleanCell(value) }))
    .filter((item) => item.value && !looksSensitiveValue(item.value))
    .map((item) => ({
      index: item.index,
      value: item.value.length > 80 ? `${item.value.slice(0, 80)}...` : item.value,
    }))
}
