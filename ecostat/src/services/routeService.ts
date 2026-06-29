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

const OSRM_ROUTE_URLS = [
  'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  'https://router.project-osrm.org/route/v1/foot',
]

export async function buildWalkingRoute(from: LatLng, to: LatLng): Promise<Route> {
  let lastError: unknown = null

  for (const routeUrl of OSRM_ROUTE_URLS) {
    try {
      return await fetchWalkingRoute(routeUrl, from, to)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Не получилось построить маршрут')
}

async function fetchWalkingRoute(routeUrl: string, from: LatLng, to: LatLng): Promise<Route> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  })

  const response = await fetch(`${routeUrl}/${coordinates}?${params}`)
  if (!response.ok) {
    throw new Error('Не получилось построить маршрут')
  }

  const payload = (await response.json()) as OsrmRouteResponse
  const osrmRoute = payload.routes?.[0]
  if (payload.code !== 'Ok' || !osrmRoute?.geometry?.coordinates?.length) {
    throw new Error('Маршрут не найден')
  }

  const routeCoordinates = osrmRoute.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))

  return {
    coordinates: connectExactRoutePoints(routeCoordinates, from, to),
    distanceMeters: Math.round(osrmRoute.distance),
    durationSeconds: Math.round(osrmRoute.duration),
  }
}

function connectExactRoutePoints(routeCoordinates: LatLng[], from: LatLng, to: LatLng): LatLng[] {
  const coordinates = [...routeCoordinates]
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]

  if (!first || calculateStraightDistance(from, first) > 5) {
    coordinates.unshift(from)
  }

  if (!last || calculateStraightDistance(last, to) > 5) {
    coordinates.push(to)
  }

  return coordinates
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
