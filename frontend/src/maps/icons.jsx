import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapPin, TriangleAlert } from 'lucide-react'
import { FACILITY_CATEGORIES, SEVERITIES } from '../utils/constants'

const cache = new Map()

function build(key, { color, Icon, size, rounded = true, faded = false }) {
  if (cache.has(key)) return cache.get(key)
  const svg = renderToStaticMarkup(<Icon size={Math.round(size * 0.52)} color="#ffffff" strokeWidth={2.4} />)
  const html =
    `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;` +
    `border-radius:${rounded ? '50%' : '8px'};display:flex;align-items:center;justify-content:center;` +
    `box-shadow:0 2px 6px rgba(15,27,45,.4);opacity:${faded ? 0.5 : 1}">${svg}</div>`
  const icon = L.divIcon({ html, className: 'cl-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
  cache.set(key, icon)
  return icon
}

export function facilityIcon(category, status) {
  const c = FACILITY_CATEGORIES[category] ?? FACILITY_CATEGORIES.other
  return build(`f-${category}-${status}`, {
    color: status === 'closed' ? '#94a3b8' : c.color, Icon: c.icon, size: 28, faded: status === 'maintenance',
  })
}

export function incidentIcon(severity, status) {
  return build(`i-${severity}-${status}`, {
    color: SEVERITIES[severity]?.color ?? '#dc2626', Icon: TriangleAlert, size: 34,
    rounded: false, faded: status === 'resolved',
  })
}

export const pickIcon = () => build('pick', { color: '#0f1b2d', Icon: MapPin, size: 32 })