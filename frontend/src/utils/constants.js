import {
  Droplets, Headset, HeartPulse, LogIn, LogOut, MapPin, SquareParking, Toilet,
} from 'lucide-react'

export const FACILITY_CATEGORIES = {
  parking: { label: 'Parking', color: '#2563eb', icon: SquareParking },
  toilet: { label: 'Public Toilet', color: '#7c3aed', icon: Toilet },
  medical_post: { label: 'Medical Post', color: '#dc2626', icon: HeartPulse },
  help_desk: { label: 'Help Desk', color: '#0891b2', icon: Headset },
  water_station: { label: 'Water Station', color: '#0ea5e9', icon: Droplets },
  entrance: { label: 'Entrance', color: '#16a34a', icon: LogIn },
  exit: { label: 'Exit', color: '#ea580c', icon: LogOut },
  other: { label: 'Other', color: '#64748b', icon: MapPin },
}

export const FACILITY_STATUSES = {
  operational: { label: 'Operational', tone: 'green' },
  maintenance: { label: 'Maintenance', tone: 'amber' },
  closed: { label: 'Closed', tone: 'red' },
}

export const INCIDENT_CATEGORIES = {
  medical_emergency: 'Medical emergency',
  infrastructure_issue: 'Infrastructure issue',
  road_blockage: 'Road blockage',
  safety_concern: 'Safety concern',
  other: 'Other',
}

export const SEVERITIES = {
  low: { label: 'Low', color: '#16a34a', tone: 'green' },
  medium: { label: 'Medium', color: '#f59e0b', tone: 'amber' },
  high: { label: 'High', color: '#ea580c', tone: 'orange' },
  critical: { label: 'Critical', color: '#dc2626', tone: 'red' },
}

export const INCIDENT_STATUSES = {
  open: { label: 'Open', tone: 'red' },
  acknowledged: { label: 'Acknowledged', tone: 'amber' },
  resolved: { label: 'Resolved', tone: 'green' },
}

export const CROWD_LEVELS = {
  low: { label: 'Low', color: '#16a34a' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  high: { label: 'High', color: '#ea580c' },
  critical: { label: 'Critical', color: '#dc2626' },
}

export const ROUTE_TYPES = {
  walking: { label: 'Walking route', color: '#0d9488', dash: '8 6' },
  vehicle: { label: 'Vehicle access', color: '#f97316', dash: null },
}

// Centre of the simulated demo festival ground [lat, lon]
export const MAP_CENTER = [12.9505, 77.5855]
export const MAP_ZOOM = 17

// OpenStreetMap tiles: the attribution text is REQUIRED by OSM's tile policy.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'