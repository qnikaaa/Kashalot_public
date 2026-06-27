import { useState, useEffect } from 'react'
import type { LatLng } from '../types'

interface UseGeolocationResult {
  position: LatLng | null
  error: string | null
  loading: boolean
}

/** Хук для получения текущего местоположения пользователя */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<LatLng | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером')
      setLoading(false)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
        setError(null)
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Разрешите доступ к геолокации, чтобы видеть ближайшие кашалоты')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Не удаётся определить местоположение')
            break
          case err.TIMEOUT:
            setError('Превышено время ожидания геолокации')
            break
          default:
            setError('Ошибка геолокации')
        }
        setLoading(false)
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { position, error, loading }
}
