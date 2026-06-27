// Тип кашалота — все поля из CSV + возможность добавить новые в будущем
export interface Scooter {
  id: number
  qr: string            // "QR 188"
  latitude: number
  longitude: number
  fuelPercent: number   // 0–100
  statusGroup: string   // "на линии" | "ремонт" | "-" | ...
  online: boolean       // "Да" / "Нет"
  color: string         // "Малиновый" | "Голубой" | "Салатовый" | ...
  company: string
  geozone: string
  updated: string       // "🟢 <5 min" | "🔴 >10 min"
  // Зарезервировано для будущих полей из API
  [key: string]: unknown
}

// Статус доступности кашалота
export type ScooterStatus = 'available' | 'unavailable'

// Координаты на карте
export interface LatLng {
  lat: number
  lng: number
}

// Маршрут
export interface Route {
  coordinates: LatLng[]
  distanceMeters: number
  durationSeconds: number
}
