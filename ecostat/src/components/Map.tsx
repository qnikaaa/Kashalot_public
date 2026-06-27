import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
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
}

// Иконка пользователя
const USER_ICON = L.divIcon({
  html: `<div style="
    width:18px;height:18px;
    background:#4fd1c5;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(79,209,197,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: '',
})

export function Map({ scooters, userPosition, selectedScooter, route, onScooterClick }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [55.75, 37.61], // Москва по умолчанию
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })

    // Тёмная тема карты (OpenStreetMap через CartoDB)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Кластер маркеров
    const cluster = (L as unknown as { markerClusterGroup: (opts: object) => L.MarkerClusterGroup })
      .markerClusterGroup({
        maxClusterRadius: 60,
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

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Обновление маркеров кашалотов
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    cluster.clearLayers()
    markersRef.current.clear()

    scooters.forEach((scooter) => {
      const color = getScooterColor(scooter.color)
      const svgHtml = renderToStaticMarkup(<WhaleIcon color={color} size={26} />)

      const icon = L.divIcon({
        html: `<div class="whale-marker" style="background:${color}22;border-color:${color}55">${svgHtml}</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
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
      // При первом определении — центрируем карту
      mapRef.current.setView([userPosition.lat, userPosition.lng], 15, { animate: true })
    } else {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng])
    }
  }, [userPosition])

  // Маршрут
  useEffect(() => {
    if (!mapRef.current) return

    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    if (route && route.coordinates.length > 1) {
      const latlngs = route.coordinates.map((c) => [c.lat, c.lng] as L.LatLngTuple)
      routeLayerRef.current = L.polyline(latlngs, {
        color: '#4fd1c5',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 6',
      }).addTo(mapRef.current)

      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] })
    }
  }, [route])

  return <div ref={containerRef} className="map-container" />
}

/** Вычисляет прямой маршрут между двумя точками (прямая линия) */
export function buildStraightRoute(from: LatLng, to: LatLng): Route {
  // Расстояние по формуле Гаверсинуса
  const R = 6371000
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return {
    coordinates: [from, to],
    distanceMeters: Math.round(distance),
    durationSeconds: Math.round(distance / 1.4), // 1.4 м/с — средняя скорость пешехода
  }
}
