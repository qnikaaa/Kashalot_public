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
    const params = new URLSearchParams(window.location.search)
    const testLat = Number(params.get('lat'))
    const testLng = Number(params.get('lng'))
    const demoWalk = params.has('demoWalk')

    if (Number.isFinite(testLat) && Number.isFinite(testLng)) {
      setPosition({ lat: testLat, lng: testLng })
      setError(null)
      setLoading(false)

      if (!demoWalk) {
        return undefined
      }

      let step = 0
      const intervalId = window.setInterval(() => {
        step += 1
        setPosition({
          lat: testLat + step * 0.000045,
          lng: testLng + step * 0.000075,
        })
      }, 1200)

      return () => window.clearInterval(intervalId)
    }

    if (demoWalk) {
      setPosition({ lat: 55.9167, lng: 37.8547 })
      setError(null)
      setLoading(false)

      let step = 0
      const intervalId = window.setInterval(() => {
        step += 1
        setPosition({
          lat: 55.9167 + step * 0.000045,
          lng: 37.8547 + step * 0.000075,
        })
      }, 1200)

      return () => window.clearInterval(intervalId)
    }

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
