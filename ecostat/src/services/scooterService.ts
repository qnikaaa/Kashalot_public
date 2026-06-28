import Papa from 'papaparse'
import type { Scooter } from '../types'

/** Парсит число из строки вроде "31 %" → 31 */
function parsePercent(val: string): number {
  return parseInt(val?.replace(/[^0-9]/g, '') ?? '0', 10) || 0
}

/** Парсит координату — если 0 или пустая строка, возвращает 0 */
function parseCoord(val: string): number {
  const n = parseFloat(val?.replace(',', '.') ?? '0')
  return isNaN(n) ? 0 : n
}

/** Нормализует QR-номер: "QR 188" → "QR188" для краткости */
export function normalizeQr(qr: string): string {
  return qr?.replace(/\s+/g, '') ?? ''
}

export async function fetchScooters(): Promise<Scooter[]> {
  const apiUrl = import.meta.env.VITE_SCOOTERS_API_URL ?? (
    import.meta.env.PROD ? '/api/scooters' : 'http://127.0.0.1:3001/api/scooters'
  )

  try {
    return await fetchScootersJson(apiUrl)
  } catch (error) {
    console.warn('Live scooters API failed, falling back to CSV:', error)
    return fetchScootersCsv()
  }
}

async function fetchScootersJson(url: string): Promise<Scooter[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить онлайн-данные: ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Онлайн-данные пришли в неправильном формате')
  }

  return data
    .map((row) => ({
      ...row,
      id: Number(row.id) || 0,
      qr: String(row.qr ?? '').trim(),
      model: String(row.model ?? '').trim(),
      latitude: Number(row.latitude) || 0,
      longitude: Number(row.longitude) || 0,
      fuelPercent: Number(row.fuelPercent) || 0,
      statusGroup: String(row.statusGroup ?? '').trim(),
      online: Boolean(row.online),
      color: String(row.color ?? '').trim(),
      company: String(row.company ?? '').trim(),
      geozone: String(row.geozone ?? '').trim(),
      updated: String(row.updated ?? '').trim(),
    } as Scooter))
    .filter((scooter) =>
      scooter.id > 0 &&
      scooter.latitude !== 0 &&
      scooter.longitude !== 0
    )
}

async function fetchScootersCsv(): Promise<Scooter[]> {
  const url = import.meta.env.VITE_SCOOTERS_CSV_URL ?? '/scooters.csv'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить CSV: ${response.status}`)
  }

  const text = await response.text()
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const scooters: Scooter[] = results.data
          .map((row) => {
            const latitude = parseCoord(row['latitude'])
            const longitude = parseCoord(row['longitude'])

            return {
              // Сначала сохраняем сырые поля
              ...row,

              // Потом поверх них кладём нормализованные поля для приложения
              id: parseInt(row['id'] ?? '0', 10) || 0,
              qr: row['qr']?.trim() ?? '',
              model: row['model']?.trim() ?? '',
              latitude,
              longitude,
              fuelPercent: parsePercent(row['fuel_percent']),
              statusGroup: row['status_group']?.trim() ?? '',
              online: row['online']?.trim() === 'Да',
              color: row['color']?.trim() ?? '',
              company: row['company']?.trim() ?? '',
              geozone: row['geozone']?.trim() ?? '',
              updated: row['updated']?.trim() ?? '',
            } as Scooter
          })
          .filter((scooter) =>
            scooter.id > 0 &&
            scooter.latitude !== 0 &&
            scooter.longitude !== 0
          )

        console.log(`Loaded scooters with coordinates: ${scooters.length}`)
        resolve(scooters)
      },
      error: (err: Error) => reject(err),
    })
  })
}
