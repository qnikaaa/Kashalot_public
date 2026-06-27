import { useState, useCallback } from 'react'
import { Map, buildStraightRoute } from './components/Map'
import { BottomSheet } from './components/BottomSheet'
import { WhaleIcon } from './components/WhaleIcon'
import { useScooters } from './hooks/useScooters'
import { useGeolocation } from './hooks/useGeolocation'
import type { Scooter, Route } from './types'
import './index.css'

// Иконка геолокации через символ
function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      <circle cx="12" cy="12" r="8" strokeOpacity="0.3"/>
    </svg>
  )
}

export default function App() {
  const { scooters, loading, error, reload } = useScooters()
  const { position: userPosition } = useGeolocation()

  const [selectedScooter, setSelectedScooter] = useState<Scooter | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  // Показать уведомление на 4 секунды
  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Клик по маркеру кашалота
  const handleScooterClick = useCallback((scooter: Scooter) => {
    setSelectedScooter(scooter)
    setRoute(null) // сбросить предыдущий маршрут
  }, [])

  // Построить маршрут
  const handleRoute = useCallback(() => {
    if (!selectedScooter) return
    if (!userPosition) {
      showNotification('Разрешите доступ к геолокации, чтобы построить маршрут')
      return
    }
    const r = buildStraightRoute(userPosition, {
      lat: selectedScooter.latitude,
      lng: selectedScooter.longitude,
    })
    setRoute(r)
  }, [selectedScooter, userPosition, showNotification])

  // Закрыть карточку
  const handleClose = useCallback(() => {
    setSelectedScooter(null)
    setRoute(null)
  }, [])

  // Кнопка "найти меня"
  const handleLocate = useCallback(() => {
    if (!userPosition) {
      showNotification('Определяем ваше местоположение...')
      return
    }
    setLocating(true)
    setTimeout(() => setLocating(false), 1000)
    // Карта сама центрируется через useEffect в Map.tsx
    // Здесь просто триггерим ре-рендер
    window.dispatchEvent(new CustomEvent('locate-user'))
  }, [userPosition, showNotification])

  // Расстояние до выбранного кашалота
  const distanceToSelected = selectedScooter && userPosition
    ? buildStraightRoute(userPosition, { lat: selectedScooter.latitude, lng: selectedScooter.longitude }).distanceMeters
    : null

  // ── Экран загрузки ──────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="whale">🐋</div>
        <p>Ищем ближайших кашалотов...</p>
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
      />

      {/* Верхняя панель */}
      <div className="top-bar">
        <div className="app-logo">
          <WhaleIcon color="#4fd1c5" size={22} />
          <span>Экоскат</span>
        </div>
        <div className="scooter-count">
          <strong>{scooters.length}</strong> доступно
        </div>
      </div>

      {/* Кнопка геолокации */}
      <button
        className="locate-btn"
        onClick={handleLocate}
        aria-label="Моё местоположение"
        style={{ opacity: locating ? 0.7 : 1 }}
      >
        <LocateIcon />
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
          onClose={handleClose}
          onRoute={handleRoute}
        />
      )}
    </div>
  )
}
