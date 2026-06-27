import type { Scooter } from '../types'

/**
 * Кашалот доступен для аренды если:
 * 1. Статус "на линии"
 * 2. Устройство онлайн
 * 3. Есть координаты
 */
export function isAvailable(scooter: Scooter): boolean {
  return (
    scooter.statusGroup === 'на линии' &&
    scooter.online === true &&
    scooter.latitude !== 0 &&
    scooter.longitude !== 0
  )
}

/** Показывать предупреждение о детском режиме при заряде < 30% */
export function isChildModeOnly(scooter: Scooter): boolean {
  return scooter.fuelPercent < 30
}

/** Форматирует заряд для отображения */
export function formatBattery(percent: number): string {
  return `${percent}%`
}

/** Иконка заряда батареи */
export function batteryIcon(percent: number): string {
  if (percent >= 70) return '🟢'
  if (percent >= 30) return '🟡'
  return '🔴'
}

/** Расстояние в метрах → читаемый текст */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(1)} км`
}

/** Время пешком (средняя скорость 5 км/ч = 83 м/мин) */
export function walkingTime(meters: number): string {
  const minutes = Math.round(meters / 83)
  if (minutes < 1) return 'меньше минуты'
  if (minutes === 1) return '1 минута'
  if (minutes < 5) return `${minutes} минуты`
  return `${minutes} минут`
}
