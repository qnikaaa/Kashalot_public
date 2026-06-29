import type { LatLng, Route } from '../types'

interface OsrmRouteResponse {
  code?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: {
      coordinates: Array<[number, number]>
    }
  }>
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/foot'

export async function buildWalkingRoute(from: LatLng, to: LatLng): Promise<Route> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  })

  const response = await fetch(`${OSRM_ROUTE_URL}/${coordinates}?${params}`)
  if (!response.ok) {
    throw new Error('Не получилось построить маршрут')
  }

  const payload = (await response.json()) as OsrmRouteResponse
  const osrmRoute = payload.routes?.[0]
  if (payload.code !== 'Ok' || !osrmRoute?.geometry?.coordinates?.length) {
    throw new Error('Маршрут не найден')
  }

  return {
    coordinates: osrmRoute.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceMeters: Math.round(osrmRoute.distance),
    durationSeconds: Math.round(osrmRoute.duration),
  }
}

export function calculateStraightDistance(from: LatLng, to: LatLng): number {
  const earthRadiusMeters = 6371000
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}
