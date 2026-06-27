import { useState, useEffect, useCallback } from 'react'
import type { Scooter } from '../types'
import { fetchScooters } from '../services/scooterService'
import { isAvailable } from '../utils/scooter'

interface UseScootersResult {
  scooters: Scooter[]       // только доступные
  allScooters: Scooter[]    // все (для отладки)
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Хук загружает кашалоты и фильтрует только доступные.
 * Интервал обновления: каждые 60 секунд.
 */
export function useScooters(): UseScootersResult {
  const [allScooters, setAllScooters] = useState<Scooter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchScooters()
      setAllScooters(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Периодическое обновление (когда подключим живой API)
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const scooters = allScooters.filter(isAvailable)

  return { scooters, allScooters, loading, error, reload: load }
}
