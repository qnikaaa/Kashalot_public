import { useRef, useState, type PointerEvent } from 'react'
import type { Scooter, LatLng } from '../types'
import { WhaleIcon } from './WhaleIcon'
import { getScooterColor, getScooterColorLight } from '../utils/colors'
import { formatBattery, isChildModeOnly, walkingTime } from '../utils/scooter'

interface BottomSheetProps {
  scooter: Scooter
  userPosition: LatLng | null
  distanceMeters: number | null
  collapsed: boolean
  routeLoading: boolean
  onClose: () => void
  onRoute: () => void
  onCollapse: () => void
  onExpand: () => void
}

/** Открывает маршрут во внешнем приложении */
function openExternalRoute(app: 'google' | 'yandex' | '2gis', lat: number, lng: number) {
  const urls = {
    google:  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    yandex:  `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=pd`,
    '2gis':  `https://2gis.ru/routeSearch/rsType/foot/to/${lng},${lat}`,
  }
  window.open(urls[app], '_blank')
}

function getRentalUrl(qr: string) {
  const qrNumber = qr.replace(/\D/g, '')
  return `https://k-s.app/qr/${qrNumber}`
}

function getBatteryColor(percent: number) {
  if (percent >= 70) return '#20c933'
  if (percent >= 30) return '#f4c542'
  return '#ef4444'
}

function BatteryBadge({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, percent))
  const fillWidth = Math.max(3, Math.round((safePercent / 100) * 23))
  const fillColor = getBatteryColor(safePercent)

  return (
    <span className="battery-badge" aria-label={`Заряд ${safePercent}%`}>
      <svg width="34" height="18" viewBox="0 0 34 18" aria-hidden="true">
        <rect x="1" y="3" width="28" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="30" y="7" width="3" height="4" rx="1.2" fill="currentColor" />
        <rect x="4" y="6" width={fillWidth} height="6" rx="2" fill={fillColor} />
      </svg>
      <span>{formatBattery(safePercent)}</span>
    </span>
  )
}

export function BottomSheet({
  scooter,
  distanceMeters,
  collapsed,
  routeLoading,
  onClose,
  onRoute,
  onCollapse,
  onExpand,
}: BottomSheetProps) {
  const color = getScooterColor(scooter.color)
  const colorLight = getScooterColorLight(scooter.color)
  const childMode = isChildModeOnly(scooter)
  const [showMapChoices, setShowMapChoices] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const rentalUrl = getRentalUrl(scooter.qr)
  const distanceText = distanceMeters !== null ? walkingTime(distanceMeters) : '—'

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return
    const nextDragY = Math.max(0, event.clientY - dragStartY.current)
    setDragY(nextDragY)
  }

  const finishDrag = () => {
    if (dragY > 80) {
      onCollapse()
    }
    dragStartY.current = null
    setDragY(0)
  }

  if (collapsed) {
    return (
      <div className="bottom-sheet-overlay">
        <button className="route-pill" onClick={onExpand} aria-label="Развернуть карточку">
          <span className="route-pill-title">{scooter.qr}</span>
          <span className="route-pill-meta">{distanceText} до кашалота</span>
          <span className="route-pill-action">Развернуть</span>
        </button>
      </div>
    )
  }

  return (
      <div className="bottom-sheet-overlay">
      <div
        className="bottom-sheet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
      >
        <button className="sheet-handle" onClick={onCollapse} aria-label="Свернуть карточку" />
        <button className="sheet-close" onClick={onClose} aria-label="Закрыть">✕</button>

        {/* Заголовок */}
        <div className="sheet-header">
          <div
            className="sheet-whale-icon"
            style={{ background: colorLight, border: `1.5px solid ${color}40` }}
          >
            <WhaleIcon color={color} size={32} />
          </div>
          <div className="sheet-heading">
            <div className="sheet-title-row">
              <div className="sheet-title">{scooter.qr}</div>
              <BatteryBadge percent={scooter.fuelPercent} />
            </div>
            <div className="sheet-subtitle">
              <span>{scooter.color}</span>
            </div>
          </div>
        </div>

        {/* Инфо */}
        <div className="sheet-info sheet-info-single">
          <div className="info-chip">
            <span className="info-chip-label">До кашалота</span>
            <span className="info-chip-value">
              {distanceText}
            </span>
          </div>
        </div>

        {/* Предупреждение о детском режиме */}
        {childMode && (
          <div className="child-mode-warning">
            <span>Доступен только детский режим.</span>
          </div>
        )}

        {/* Кнопки */}
        <div className="sheet-actions">
          <button className="btn-primary" onClick={onRoute} disabled={routeLoading}>
            {routeLoading ? 'Строим маршрут...' : '🗺 Построить маршрут'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowMapChoices((visible) => !visible)}
          >
            Открыть в картах
          </button>

          {showMapChoices && (
            <div className="nav-apps">
              <button
                className="btn-secondary"
                onClick={() => openExternalRoute('yandex', scooter.latitude, scooter.longitude)}
              >
                Яндекс
              </button>
              <button
                className="btn-secondary"
                onClick={() => openExternalRoute('google', scooter.latitude, scooter.longitude)}
              >
                Google
              </button>
              <button
                className="btn-secondary"
                onClick={() => openExternalRoute('2gis', scooter.latitude, scooter.longitude)}
              >
                2ГИС
              </button>
            </div>
          )}
        </div>

        {/* QR для аренды */}
        <div className="qr-block">
          <span className="qr-block-label">Начать аренду просто</span>
          <strong>Отсканируйте QR-код на кашалоте {scooter.qr.replace(/\s+/g, '')}</strong>
        </div>

        <div className="rental-help">
          <span>Проблемы с кодом?</span>
          <a href={rentalUrl} target="_blank" rel="noreferrer">
            Перейти на страницу аренды
          </a>
        </div>
      </div>
    </div>
  )
}
