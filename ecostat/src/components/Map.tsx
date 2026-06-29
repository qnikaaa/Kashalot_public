import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import 'leaflet-rotate'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Scooter, LatLng, Route } from '../types'
import { WhaleIcon } from './WhaleIcon'
import { getScooterColor } from '../utils/colors'

interface MapProps {
  scooters: Scooter[]
  userPosition: LatLng | null
  selectedScooter: Scooter | null
  route: Route | null
  onScooterClick: (scooter: Scooter) => void
  onVisibleCountChange?: (count: number) => void
}

type RotatableMap = L.Map & {
  setBearing?: (bearing: number) => void
}

// Иконка пользователя
const USER_ICON = L.divIcon({
  html: '<div class="user-location-marker"><span></span></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: '',
})

const ROUTE_START_ICON = L.divIcon({
  html: '<div class="route-start-marker"><span>Вы тут</span></div>',
  iconSize: [74, 34],
  iconAnchor: [37, 17],
  className: '',
})

function createRouteArrowIcon(bearing: number) {
  return L.divIcon({
    html: `<div class="route-arrow-marker" style="transform: rotate(${bearing}deg)"><span></span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    className: '',
  })
}

export function Map({
  scooters,
  userPosition,
  selectedScooter,
  route,
  onScooterClick,
  onVisibleCountChange,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const routeStartMarkerRef = useRef<L.Marker | null>(null)
  const routeFitEndKeyRef = useRef<string | null>(null)
  const previousRouteStartRef = useRef<LatLng | null>(null)
  const routeIsMovingRef = useRef(false)
  const markersRef = useRef<globalThis.Map<number, L.Marker>>(new globalThis.Map())
  const initialLocationFitRef = useRef(false)
  const initialNearestFitRef = useRef(false)

  const updateVisibleCount = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const bounds = map.getBounds()
    const visibleScooters = scooters.filter((scooter) =>
      bounds.contains([scooter.latitude, scooter.longitude])
    )
    onVisibleCountChange?.(visibleScooters.length)
  }, [scooters, onVisibleCountChange])

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [55.75, 37.61],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      touchZoom: true,
      touchRotate: true,
      shiftKeyRotate: true,
      rotate: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    } as L.MapOptions & { rotate: boolean; touchRotate: boolean; shiftKeyRotate: boolean })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Контрастная карта с локальными подписями, чаще показывает названия кириллицей.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    // Кластер маркеров
    const cluster = (L as unknown as { markerClusterGroup: (opts: object) => L.MarkerClusterGroup })
      .markerClusterGroup({
        maxClusterRadius: 34,
        disableClusteringAtZoom: 15,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (c: L.MarkerCluster) => {
          const count = c.getChildCount()
          const size = count > 50 ? 48 : count > 10 ? 42 : 36
          return L.divIcon({
            html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px">${count}</div>`,
            iconSize: [size, size],
            className: '',
          })
        },
      })

    map.addLayer(cluster)
    mapRef.current = map
    clusterRef.current = cluster
    initialLocationFitRef.current = false
    initialNearestFitRef.current = false

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Счётчик кашалотов именно в текущей области карты, а не всего парка.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.on('moveend zoomend', updateVisibleCount)
    updateVisibleCount()

    return () => {
      map.off('moveend zoomend', updateVisibleCount)
    }
  }, [updateVisibleCount])

  // Обновление маркеров кашалотов
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    cluster.clearLayers()
    markersRef.current.clear()

    scooters.forEach((scooter) => {
      const color = getScooterColor(scooter.color)
      const svgHtml = renderToStaticMarkup(<WhaleIcon color={color} size={34} />)

      const icon = L.divIcon({
        html: `<div class="whale-marker" style="background:${color}22;border-color:${color}55">${svgHtml}</div>`,
        iconSize: [54, 54],
        iconAnchor: [27, 27],
        className: '',
      })

      const marker = L.marker([scooter.latitude, scooter.longitude], { icon })
      marker.on('click', () => onScooterClick(scooter))
      cluster.addLayer(marker)
      markersRef.current.set(scooter.id, marker)
    })
  }, [scooters, onScooterClick])

  // Подсветка выбранного маркера
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement()?.querySelector('.whale-marker')
      if (el) {
        el.classList.toggle('active', id === selectedScooter?.id)
      }
    })

    if (selectedScooter && mapRef.current) {
      mapRef.current.panTo([selectedScooter.latitude, selectedScooter.longitude], {
        animate: true,
        duration: 0.5,
      })
    }
  }, [selectedScooter])

  // Позиция пользователя
  useEffect(() => {
    if (!mapRef.current || !userPosition) return

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: USER_ICON,
        zIndexOffset: 1000,
      }).addTo(mapRef.current)
    } else {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng])
    }

    if (!initialLocationFitRef.current) {
      initialLocationFitRef.current = true
      mapRef.current.setView([userPosition.lat, userPosition.lng], 16, { animate: false })
    }
  }, [userPosition])

  // Первый экран: пользователь + ближайший кашалот в одной области видимости.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPosition || scooters.length === 0 || initialNearestFitRef.current) return

    const nearestScooter = scooters.reduce((nearest, scooter) => {
      const currentDistance = getSquaredDistance(userPosition, {
        lat: scooter.latitude,
        lng: scooter.longitude,
      })
      const nearestDistance = getSquaredDistance(userPosition, {
        lat: nearest.latitude,
        lng: nearest.longitude,
      })

      return currentDistance < nearestDistance ? scooter : nearest
    }, scooters[0])

    initialNearestFitRef.current = true
    const bounds = L.latLngBounds([
      [userPosition.lat, userPosition.lng],
      [nearestScooter.latitude, nearestScooter.longitude],
    ])

    map.fitBounds(bounds, {
      paddingTopLeft: [72, 96],
      paddingBottomRight: [72, 260],
      maxZoom: 16,
      animate: false,
    })
  }, [userPosition, scooters])

  // Компас: вернуть север вверх и показать пользователя.
  useEffect(() => {
    const resetBearing = () => {
      const map = mapRef.current as RotatableMap | null
      if (!map || !userPosition) return

      map.setBearing?.(0)
      map.setView([userPosition.lat, userPosition.lng], Math.max(map.getZoom(), 16), {
        animate: true,
        duration: 0.35,
      })
    }

    window.addEventListener('reset-map-bearing', resetBearing)
    return () => window.removeEventListener('reset-map-bearing', resetBearing)
  }, [userPosition])

  // Маршрут
  useEffect(() => {
    if (!mapRef.current) return

    if (!route || route.coordinates.length <= 1) {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove()
        routeLayerRef.current = null
      }
      if (routeStartMarkerRef.current) {
        routeStartMarkerRef.current.remove()
        routeStartMarkerRef.current = null
      }
      routeFitEndKeyRef.current = null
      previousRouteStartRef.current = null
      routeIsMovingRef.current = false
      return
    }

    const latlngs = route.coordinates.map((c) => [c.lat, c.lng] as L.LatLngTuple)
    const start = route.coordinates[0]
    const end = route.coordinates[route.coordinates.length - 1]
    const endKey = `${end.lat.toFixed(6)},${end.lng.toFixed(6)}`
    const shouldFitRoute = routeFitEndKeyRef.current !== endKey
    const previousStart = previousRouteStartRef.current
    const movedMeters = previousStart ? getApproxDistanceMeters(previousStart, start) : 0
    routeIsMovingRef.current = routeIsMovingRef.current || movedMeters > 2
    previousRouteStartRef.current = start
    const startIcon = routeIsMovingRef.current && route.coordinates[1]
      ? createRouteArrowIcon(getBearing(start, route.coordinates[1]))
      : ROUTE_START_ICON

    if (routeLayerRef.current) {
      routeLayerRef.current.setLatLngs(latlngs)
    } else {
      routeLayerRef.current = L.polyline(latlngs, {
        color: '#4fd1c5',
        weight: 5,
        opacity: 0.95,
      }).addTo(mapRef.current)
    }

    if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.setLatLng([start.lat, start.lng])
      routeStartMarkerRef.current.setIcon(startIcon)
    } else {
      routeStartMarkerRef.current = L.marker([start.lat, start.lng], {
        icon: startIcon,
        interactive: false,
        zIndexOffset: 1100,
      }).addTo(mapRef.current)
    }

    if (shouldFitRoute) {
      routeFitEndKeyRef.current = endKey
      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] })
    }
  }, [route])

  return <div ref={containerRef} className="map-container" />
}

function getSquaredDistance(from: LatLng, to: LatLng) {
  const latDiff = to.lat - from.lat
  const lngDiff = to.lng - from.lng
  return latDiff * latDiff + lngDiff * lngDiff
}

function getApproxDistanceMeters(from: LatLng, to: LatLng) {
  const latMeters = (to.lat - from.lat) * 111_320
  const lngMeters = (to.lng - from.lng) * 111_320 * Math.cos((from.lat * Math.PI) / 180)
  return Math.sqrt(latMeters * latMeters + lngMeters * lngMeters)
}

function getBearing(from: LatLng, to: LatLng) {
  const fromLat = (from.lat * Math.PI) / 180
  const toLat = (to.lat * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng)

  return (Math.atan2(y, x) * 180) / Math.PI
}
