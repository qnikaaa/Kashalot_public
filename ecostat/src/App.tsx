import { useState, useCallback, useEffect, useRef } from 'react'
import { Map } from './components/Map'
import { BottomSheet } from './components/BottomSheet'
import { useScooters } from './hooks/useScooters'
import { useGeolocation } from './hooks/useGeolocation'
import { buildWalkingRoute, calculateStraightDistance } from './services/routeService'
import { WhaleIcon } from './components/WhaleIcon'
import type { Scooter, Route } from './types'
import './index.css'

// Иконка компаса
function CompassIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="14.5" fill="#fff" stroke="#151827" strokeWidth="2.4" />
      <path d="M17 4.8l7.2 23.2-7.2-5.2-7.2 5.2L17 4.8z" fill="#151827" />
      <path d="M17 4.8l3.2 14.7-3.2-2.1-3.2 2.1L17 4.8z" fill="#fff" opacity="0.92" />
      <text x="17" y="15.2" textAnchor="middle" fontSize="7.8" fontWeight="900" fill="#151827">N</text>
    </svg>
  )
}

export default function App() {
  const { scooters, loading, error, reload } = useScooters()
  const { position: realUserPosition } = useGeolocation()
  const searchParams = new URLSearchParams(window.location.search)
  const forceLoadingScreen = searchParams.has('loading')
  const demoRouteTo = searchParams.get('demoRouteTo')

  const [selectedScooter, setSelectedScooter] = useState<Scooter | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [simulatedPosition, setSimulatedPosition] = useState<typeof realUserPosition>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [visibleScooterCount, setVisibleScooterCount] = useState<number | null>(null)
  const [sheetCollapsed, setSheetCollapsed] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const demoStartedRef = useRef(false)
  const userPosition = simulatedPosition ?? realUserPosition

  // Показать уведомление на 4 секунды
  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Клик по маркеру кашалота
  const handleScooterClick = useCallback((scooter: Scooter) => {
    setSelectedScooter(scooter)
    setRoute(null) // сбросить предыдущий маршрут
    setSheetCollapsed(false)
  }, [])

  // Построить маршрут
  const handleRoute = useCallback(async () => {
    if (!selectedScooter) return
    if (!userPosition) {
      showNotification('Разрешите доступ к геолокации, чтобы построить маршрут')
      return
    }

    setRouteLoading(true)
    try {
      const r = await buildWalkingRoute(userPosition, {
        lat: selectedScooter.latitude,
        lng: selectedScooter.longitude,
      })
      setRoute(r)
      setSheetCollapsed(true)
    } catch {
      showNotification('Не получилось построить маршрут. Попробуйте открыть внешние карты')
    } finally {
      setRouteLoading(false)
    }
  }, [selectedScooter, userPosition, showNotification])

  // Тестовый режим: симуляция прогулки от стартовой точки до конкретного кашалота.
  useEffect(() => {
    if (!demoRouteTo || loading || scooters.length === 0 || demoStartedRef.current) return

    const params = new URLSearchParams(window.location.search)
    const startLat = Number(params.get('lat')) || 55.9167
    const startLng = Number(params.get('lng')) || 37.8547
    const start = { lat: startLat, lng: startLng }
    const target = scooters.find((scooter) => {
      const qrNumber = String(scooter.qr).replace(/\D/g, '')
      return qrNumber === demoRouteTo || String(scooter.id) === demoRouteTo
    })

    if (!target) {
      showNotification(`Кашалот QR ${demoRouteTo} сейчас не найден среди доступных`)
      return
    }

    demoStartedRef.current = true
    setSelectedScooter(target)
    setSheetCollapsed(true)
    setSimulatedPosition(start)

    let intervalId: number | undefined

    buildWalkingRoute(start, { lat: target.latitude, lng: target.longitude })
      .then((demoRoute) => {
        const coordinates = demoRoute.coordinates
        setRoute(demoRoute)

        let index = 0
        intervalId = window.setInterval(() => {
          index = Math.min(index + 1, coordinates.length - 1)
          const current = coordinates[index]
          const remainingCoordinates = [current, ...coordinates.slice(index + 1)]

          setSimulatedPosition(current)
          setRoute({
            ...demoRoute,
            coordinates: remainingCoordinates.length > 1 ? remainingCoordinates : [current, current],
          })

          if (index >= coordinates.length - 1 && intervalId) {
            window.clearInterval(intervalId)
          }
        }, 1200)
      })
      .catch(() => {
        showNotification('Не получилось запустить тестовую прогулку')
      })

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [demoRouteTo, loading, scooters, showNotification])

  // Закрыть карточку
  const handleClose = useCallback(() => {
    setSelectedScooter(null)
    setRoute(null)
    setSheetCollapsed(false)
  }, [])

  // Кнопка компаса: вернуть север вверх и центрироваться на пользователе
  const handleCompass = useCallback(() => {
    if (!userPosition) {
      showNotification('Определяем ваше местоположение...')
      return
    }
    window.dispatchEvent(new CustomEvent('reset-map-bearing'))
  }, [userPosition, showNotification])

  // Расстояние до выбранного кашалота
  const distanceToSelected = selectedScooter && userPosition
    ? calculateStraightDistance(userPosition, { lat: selectedScooter.latitude, lng: selectedScooter.longitude })
    : null

  // ── Экран загрузки ──────────────────────────────────────
  if (loading || forceLoadingScreen) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-logo">
            <img src="/logo.png" alt="" />
            <span>Экоскат</span>
          </div>
          <div className="loading-map" aria-hidden="true">
            <span className="loading-path" />
            <span className="loading-dot dot-one" />
            <span className="loading-dot dot-two" />
            <span className="loading-dot dot-three" />
            <span className="loading-kashalot">
              <WhaleIcon color="#4fd1c5" size={84} />
            </span>
          </div>
          <div className="loading-copy">
            <strong>Ищем кашалота для катания ✨</strong>
            <span>Смотрим, кто свободен рядом и готов катать</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Экран ошибки ────────────────────────────────────────
  if (error) {
    return (
      <div className="error-screen">
        <div style={{ fontSize: 48 }}>😢</div>
        <p>{error}</p>
        <button className="btn-primary" onClick={reload}>Попробовать снова</button>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Карта */}
      <Map
        scooters={scooters}
        userPosition={userPosition}
        selectedScooter={selectedScooter}
        route={route}
        onScooterClick={handleScooterClick}
        onVisibleCountChange={setVisibleScooterCount}
      />

      {/* Верхняя панель */}
      <div className="top-bar">
        <div className="app-logo">
          <img src="/logo.png" alt="" />
          <span>Экоскат</span>
        </div>
        <div className="scooter-count">
          <strong>{visibleScooterCount ?? 0}</strong> рядом
        </div>
      </div>

      {/* Кнопка геолокации */}
      <button
        className="locate-btn"
        onClick={handleCompass}
        aria-label="Север вверх"
      >
        <CompassIcon />
      </button>

      {/* Уведомление */}
      {notification && (
        <div className="notification">
          <span className="notification-icon">ℹ️</span>
          <span className="notification-text">{notification}</span>
        </div>
      )}

      {/* Карточка выбранного кашалота */}
      {selectedScooter && (
        <BottomSheet
          scooter={selectedScooter}
          userPosition={userPosition}
          distanceMeters={distanceToSelected}
          collapsed={sheetCollapsed}
          routeLoading={routeLoading}
          onClose={handleClose}
          onRoute={handleRoute}
          onCollapse={() => setSheetCollapsed(true)}
          onExpand={() => setSheetCollapsed(false)}
        />
      )}
    </div>
  )
}
