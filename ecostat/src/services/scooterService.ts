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

/**
 * Загружает и парсит CSV-файл с кашалотами.
 * Путь к файлу берётся из .env (VITE_SCOOTERS_CSV_URL),
 * по умолчанию — /scooters.csv в папке public.
 */
export async function fetchScooters(): Promise<Scooter[]> {
  const url = import.meta.env.VITE_SCOOTERS_CSV_URL ?? '/scooters.csv'

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить данные: ${response.status}`)
  }

  const text = await response.text()

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const scooters: Scooter[] = results.data.map((row) => ({
          id: parseInt(row['id'] ?? '0', 10),
          qr: row['qr']?.trim() ?? '',
          latitude: parseCoord(row['latitude']),
          longitude: parseCoord(row['longitude']),
          fuelPercent: parsePercent(row['fuel_percent']),
          statusGroup: row['status_group']?.trim() ?? '',
          online: row['online']?.trim() === 'Да',
          color: row['color']?.trim() ?? '',
          company: row['company']?.trim() ?? '',
          geozone: row['geozone']?.trim() ?? '',
          updated: row['updated']?.trim() ?? '',
          // Сохраняем все остальные поля на случай расширения API
          ...row,
        }))
        resolve(scooters)
      },
      error: (err: Error) => reject(err),
    })
  })
}
