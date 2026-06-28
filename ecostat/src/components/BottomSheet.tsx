import { useState } from 'react'
import type { Scooter, LatLng } from '../types'
import { WhaleIcon } from './WhaleIcon'
import { getScooterColor, getScooterColorLight } from '../utils/colors'
import { batteryIcon, formatBattery, isChildModeOnly, walkingTime } from '../utils/scooter'

interface BottomSheetProps {
  scooter: Scooter
  userPosition: LatLng | null
  distanceMeters: number | null
  onClose: () => void
  onRoute: () => void
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

export function BottomSheet({ scooter, distanceMeters, onClose, onRoute }: BottomSheetProps) {
  const color = getScooterColor(scooter.color)
  const colorLight = getScooterColorLight(scooter.color)
  const childMode = isChildModeOnly(scooter)
  const [showMapChoices, setShowMapChoices] = useState(false)
  const rentalUrl = getRentalUrl(scooter.qr)

  return (
    <div className="bottom-sheet-overlay">
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="Закрыть">✕</button>

        {/* Заголовок */}
        <div className="sheet-header">
          <div
            className="sheet-whale-icon"
            style={{ background: colorLight, border: `1.5px solid ${color}40` }}
          >
            <WhaleIcon color={color} size={32} />
          </div>
          <div>
            <div className="sheet-title">{scooter.qr}</div>
            <div className="sheet-subtitle">{scooter.color} · {scooter.company.split('[')[0].trim()}</div>
          </div>
        </div>

        {/* Инфо */}
        <div className="sheet-info">
          <div className="info-chip">
            <span className="info-chip-label">Заряд</span>
            <span className="info-chip-value">
              {batteryIcon(scooter.fuelPercent)} {formatBattery(scooter.fuelPercent)}
            </span>
          </div>
          <div className="info-chip">
            <span className="info-chip-label">До кашалота</span>
            <span className="info-chip-value">
              {distanceMeters !== null ? walkingTime(distanceMeters) : '—'}
            </span>
          </div>
        </div>

        {/* Предупреждение о детском режиме */}
        {childMode && (
          <div className="child-mode-warning">
            <span>⚠️</span>
            <span>Доступен только детский режим.</span>
          </div>
        )}

        {/* QR для аренды */}
        <div className="qr-block">
          <span className="qr-block-label">Главное для старта</span>
          <strong>Отсканируйте QR-код на кашалоте</strong>
          <span>{scooter.qr}</span>
        </div>

        {/* Кнопки */}
        <div className="sheet-actions">
          <button className="btn-primary" onClick={onRoute}>
            🗺 Построить маршрут
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowMapChoices((visible) => !visible)}
          >
            Открыть в картах
          </button>

          <a className="btn-link" href={rentalUrl} target="_blank" rel="noreferrer">
            Если QR-код поврежден, открыть оплату по номеру
          </a>

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
      </div>
    </div>
  )
}
